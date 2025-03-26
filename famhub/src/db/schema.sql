-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    password TEXT NOT NULL,
    status user_status DEFAULT 'Validating',
    role user_role NOT NULL,
    persona user_persona NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    family_id UUID,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_id UUID,
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

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
ALTER TABLE families ADD CONSTRAINT fk_admin_id FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE families ADD CONSTRAINT fk_user_ref FOREIGN KEY (user_ref) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster user lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_families_admin_id ON families(admin_id);
CREATE INDEX idx_families_user_ref ON families(user_ref);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

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
    );

-- Families policies
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

CREATE POLICY "Allow admin access to families"
    ON families
    FOR ALL
    USING (current_setting('app.is_admin', true)::boolean = true);

-- Create admin function to bypass RLS
CREATE OR REPLACE FUNCTION set_admin_flag(admin BOOLEAN)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.is_admin', admin::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;
