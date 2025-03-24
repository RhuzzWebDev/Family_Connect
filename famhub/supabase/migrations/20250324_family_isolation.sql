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
