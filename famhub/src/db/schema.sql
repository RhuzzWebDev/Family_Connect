-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to set user context for RLS policies
CREATE OR REPLACE FUNCTION set_app_user(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.user_email', p_email, false);
END;
$$;

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('Active', 'Validating', 'Not Active');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Father', 'Mother', 'Grandfather', 'Grandmother', 'Older Brother', 'Older Sister', 'Middle Brother', 'Middle Sister', 'Youngest Brother', 'Youngest Sister');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_persona AS ENUM ('Parent', 'Children');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('image', 'video', 'audio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Stores bcrypt hashed passwords
    status user_status DEFAULT 'Validating', -- 'Validating', 'Active', or 'Not Active'
    role user_role NOT NULL,
    persona user_persona NOT NULL,
    bio TEXT DEFAULT '',
    phone_number TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    family_id UUID,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_ref UUID
);

-- Create questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    file_url TEXT,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    media_type media_type,
    folder_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    file_url TEXT,
    media_type media_type,
    folder_path TEXT,
    like_count INTEGER DEFAULT 0,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comment_likes table for tracking which users liked which comments
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id)
);

-- Create question_likes table for tracking which users liked which questions
CREATE TABLE question_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Row Level Security for question_likes
ALTER TABLE question_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can like questions" ON question_likes;
CREATE POLICY "Users can like questions"
  ON question_likes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('app.user_email', true)
      AND status = 'Active'
      AND users.id = question_likes.user_id
    )
    OR current_setting('app.is_admin', true)::boolean = true
  );

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
ALTER TABLE families ADD CONSTRAINT fk_user_ref FOREIGN KEY (user_ref) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster user lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_families_user_ref ON families(user_ref);

-- Create indexes for faster comment lookups
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_question_id ON comments(question_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Users can insert their own questions" ON questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON questions;
DROP POLICY IF EXISTS "Allow public registration and login" ON users;
DROP POLICY IF EXISTS "Allow public registration" ON users;
DROP POLICY IF EXISTS "Allow family access" ON families;
DROP POLICY IF EXISTS "Allow admin access to families" ON families;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies for native authentication
CREATE POLICY "Allow public registration and login"
    ON users
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public registration"
    ON users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own data"
    ON users
    FOR UPDATE
    USING (email = current_setting('app.user_email', true));
    
-- Allow users to delete their own data
CREATE POLICY "Users can delete their own data"
    ON users
    FOR DELETE
    USING (email = current_setting('app.user_email', true));
    
-- Allow users to delete members in their family
CREATE POLICY "Users can delete members in their family"
    ON users
    FOR DELETE
    USING (
      email = current_setting('app.user_email', true)
      OR 
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.email = current_setting('app.user_email', true)
        AND u.family_id = users.family_id
      )
    );
    
-- Allow users to update members in their family
CREATE POLICY "Users can update members in their family"
    ON users
    FOR UPDATE
    USING (
      email = current_setting('app.user_email', true)
      OR 
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.email = current_setting('app.user_email', true)
        AND u.family_id = users.family_id
      )
    );

-- Questions policies for native authentication
CREATE POLICY "Anyone can view questions"
    ON questions
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own questions"
    ON questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = questions.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

CREATE POLICY "Users can update their own questions"
    ON questions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = questions.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

CREATE POLICY "Users can delete their own questions"
    ON questions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = questions.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

-- Enable RLS on families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Families policies
DROP POLICY IF EXISTS "Allow family access" ON families;
DROP POLICY IF EXISTS "Allow admin access to families" ON families;
DROP POLICY IF EXISTS "Allow public family creation" ON families;
DROP POLICY IF EXISTS "Allow users to update their own families" ON families;
DROP POLICY IF EXISTS "Public access to families" ON families;

-- Allow full public access to families table for now (for testing)
CREATE POLICY "Public access to families"
    ON families
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow users to view families they belong to
CREATE POLICY "Allow family access"
    ON families
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND users.family_id = families.id
        ) OR 
        current_setting('app.is_admin', true)::boolean = true
    );

-- Allow users to update families they created
CREATE POLICY "Allow users to update their own families"
    ON families
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND users.id = families.user_ref
        )
    );

-- Allow admin access to all families
CREATE POLICY "Allow admin access to families"
    ON families
    FOR ALL
    USING (current_setting('app.is_admin', true)::boolean = true)
    WITH CHECK (current_setting('app.is_admin', true)::boolean = true);

-- Comments policies for native authentication
CREATE POLICY "Anyone can view comments"
    ON comments
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own comments"
    ON comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = comments.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

CREATE POLICY "Users can update their own comments"
    ON comments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = comments.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

CREATE POLICY "Users can delete their own comments"
    ON comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = comments.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

-- Comment Likes policies
CREATE POLICY "Anyone can view comment likes"
    ON comment_likes
    FOR SELECT
    USING (true);

CREATE POLICY "Users can like comments"
    ON comment_likes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = comment_likes.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

CREATE POLICY "Users can unlike comments"
    ON comment_likes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_setting('app.user_email', true)
            AND status = 'Active'
            AND users.id = comment_likes.user_id
        )
        OR current_setting('app.is_admin', true)::boolean = true
    );

-- Create admin function to bypass RLS
CREATE OR REPLACE FUNCTION set_admin_flag(admin BOOLEAN)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.is_admin', admin::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update comment_count in questions table
CREATE OR REPLACE FUNCTION update_question_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE questions
        SET comment_count = comment_count + 1
        WHERE id = NEW.question_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE questions
        SET comment_count = comment_count - 1
        WHERE id = OLD.question_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update comment_count
CREATE TRIGGER update_question_comment_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_question_comment_count();

-- Create trigger function to update like_count in comments table
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments
        SET like_count = like_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments
        SET like_count = like_count - 1
        WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update like_count
CREATE TRIGGER update_comment_like_count_trigger
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- Create function to delete family members safely
CREATE OR REPLACE FUNCTION delete_family_member(member_id UUID, current_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_family_id UUID;
  member_family_id UUID;
BEGIN
  -- Get the current user's family_id
  SELECT family_id INTO user_family_id
  FROM users
  WHERE email = current_user_email;
  
  -- Get the member's family_id
  SELECT family_id INTO member_family_id
  FROM users
  WHERE id = member_id;
  
  -- Check if they're in the same family
  IF user_family_id IS NULL OR member_family_id IS NULL OR user_family_id != member_family_id THEN
    RAISE EXCEPTION 'Cannot delete member from different family';
  END IF;
  
  -- Delete the member
  DELETE FROM users WHERE id = member_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to update family members safely with proper type casting
CREATE OR REPLACE FUNCTION update_family_member(member_id UUID, current_user_email TEXT, update_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_family_id UUID;
  member_family_id UUID;
  result JSONB;
BEGIN
  -- Get the current user's family_id
  SELECT family_id INTO user_family_id
  FROM users
  WHERE email = current_user_email;
  
  -- Get the member's family_id
  SELECT family_id INTO member_family_id
  FROM users
  WHERE id = member_id;
  
  -- Check if they're in the same family or it's the user's own profile
  IF (user_family_id IS NULL OR member_family_id IS NULL OR user_family_id != member_family_id) 
     AND NOT EXISTS (SELECT 1 FROM users WHERE id = member_id AND email = current_user_email) THEN
    RAISE EXCEPTION 'Cannot update member from different family';
  END IF;
  
  -- Update the member and return the updated data
  UPDATE users
  SET 
    first_name = COALESCE(update_data->>'first_name', first_name),
    last_name = COALESCE(update_data->>'last_name', last_name),
    email = COALESCE(update_data->>'email', email),
    role = CASE 
             WHEN update_data->>'role' IS NOT NULL 
             THEN (update_data->>'role')::user_role 
             ELSE role 
           END,
    persona = CASE 
                WHEN update_data->>'persona' IS NOT NULL 
                THEN (update_data->>'persona')::user_persona 
                ELSE persona 
              END,
    status = CASE 
               WHEN update_data->>'status' IS NOT NULL 
               THEN (update_data->>'status')::user_status 
               ELSE status 
             END,
    bio = COALESCE(update_data->>'bio', bio),
    phone_number = COALESCE(update_data->>'phone_number', phone_number),
    password = CASE WHEN update_data->>'password' IS NOT NULL THEN update_data->>'password' ELSE password END
  WHERE id = member_id
  RETURNING to_jsonb(users.*) INTO result;
  
  RETURN result;
END;
$$;

