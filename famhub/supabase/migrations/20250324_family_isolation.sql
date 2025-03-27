-- Create families table
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add family_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);

-- Create index for faster family lookups
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- Enable Row Level Security on families table
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Allow public registration and login" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Create new policies for users table
CREATE POLICY "Allow public registration and login"
    ON public.users
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public registration"
    ON public.users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own data"
    ON public.users
    FOR UPDATE
    USING (email = current_setting('app.user_email', true));

-- Update RLS policies for questions table
DROP POLICY IF EXISTS "Users can view questions from their family" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- Create new policy for questions table to enforce family isolation
CREATE POLICY "Users can view questions from their family"
    ON public.questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u1
            JOIN public.users question_user ON u1.family_id = question_user.family_id
            WHERE u1.email = current_setting('app.user_email', true)
            AND question_user.id = questions.user_id
        )
    );

-- Update RLS policies for comments table
DROP POLICY IF EXISTS "Users can view comments from their family" ON public.comments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.comments;

-- Create new policy for comments table to enforce family isolation
CREATE POLICY "Users can view comments from their family"
    ON public.comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u1
            JOIN public.users comment_user ON u1.family_id = comment_user.family_id
            WHERE u1.email = current_setting('app.user_email', true)
            AND comment_user.id = comments.user_id
        )
    );

-- Create RLS policies for families table
DROP POLICY IF EXISTS "Users can view their own family" ON public.families;
DROP POLICY IF EXISTS "Users can update their own family" ON public.families;

CREATE POLICY "Users can view their own family"
    ON public.families
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u1
            WHERE u1.email = current_setting('app.user_email', true)
            AND u1.family_id = families.id
        )
    );

CREATE POLICY "Users can update their own family"
    ON public.families
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u1
            WHERE u1.email = current_setting('app.user_email', true)
            AND u1.family_id = families.id
        )
    );

-- Create functions to manage families
DROP FUNCTION IF EXISTS get_or_create_family;
CREATE OR REPLACE FUNCTION get_or_create_family(p_family_name TEXT, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Check if family exists
    SELECT id INTO v_family_id FROM public.families WHERE family_name = p_family_name LIMIT 1;
    
    -- Create family if it doesn't exist
    IF v_family_id IS NULL THEN
        INSERT INTO public.families (family_name, created_by)
        VALUES (p_family_name, p_user_id)
        RETURNING id INTO v_family_id;
    END IF;
    
    RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure to get family members
DROP FUNCTION IF EXISTS public.get_family_members;
CREATE OR REPLACE FUNCTION public.get_family_members(p_user_email TEXT)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Get the family_id for the current user
    SELECT family_id INTO v_family_id
    FROM public.users
    WHERE email = p_user_email;
    
    -- Return all users with the same family_id
    RETURN QUERY
    SELECT * FROM public.users
    WHERE family_id = v_family_id
    ORDER BY created_at ASC;
END;
$$;

-- Create stored procedure to create a family with a member in a single transaction
DROP FUNCTION IF EXISTS public.create_family_with_member;
CREATE OR REPLACE FUNCTION public.create_family_with_member(
    p_family_name TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_persona TEXT,
    p_status TEXT
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_family_id UUID;
    v_user_id UUID;
BEGIN
    -- Create the family
    INSERT INTO public.families (family_name)
    VALUES (p_family_name)
    RETURNING id INTO v_family_id;
    
    -- Create the user with the family_id
    INSERT INTO public.users (
        first_name,
        last_name,
        email,
        password,
        role,
        persona,
        status,
        family_id
    )
    VALUES (
        p_first_name,
        p_last_name,
        p_email,
        p_password,
        p_role::user_role,
        p_persona::user_persona,
        p_status::user_status,
        v_family_id
    )
    RETURNING id INTO v_user_id;
    
    -- Update the family with the created_by user
    UPDATE public.families
    SET created_by = v_user_id
    WHERE id = v_family_id;
    
    -- Return the created user
    RETURN QUERY
    SELECT * FROM public.users
    WHERE id = v_user_id;
END;
$$;

-- Create admin policy to bypass RLS for families table
DROP POLICY IF EXISTS "Admin bypass for families" ON public.families;
CREATE POLICY "Admin bypass for families"
    ON public.families
    USING (current_setting('app.is_admin', true)::boolean = true);

-- Create admin policy to bypass RLS for users table
DROP POLICY IF EXISTS "Admin bypass for users" ON public.users;
CREATE POLICY "Admin bypass for users"
    ON public.users
    USING (current_setting('app.is_admin', true)::boolean = true);

-- Create admin policy to bypass RLS for questions table
DROP POLICY IF EXISTS "Admin bypass for questions" ON public.questions;
CREATE POLICY "Admin bypass for questions"
    ON public.questions
    USING (current_setting('app.is_admin', true)::boolean = true);

-- Create admin policy to bypass RLS for comments table
DROP POLICY IF EXISTS "Admin bypass for comments" ON public.comments;
CREATE POLICY "Admin bypass for comments"
    ON public.comments
    USING (current_setting('app.is_admin', true)::boolean = true);

-- Create function to set admin flag for bypassing RLS
CREATE OR REPLACE FUNCTION public.set_admin_flag(admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.is_admin', admin::TEXT, false);
END;
$$;
