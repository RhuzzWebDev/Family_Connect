-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create type for answer format if it doesn't exist
DO $$ BEGIN
    CREATE TYPE answer_format AS ENUM (
        'text',
        'number',
        'array',
        'json'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create type for question type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE question_type AS ENUM (
        'multiple-choice',
        'rating-scale',
        'likert-scale',
        'matrix',
        'dropdown',
        'open-ended',
        'image-choice',
        'slider',
        'dichotomous',
        'ranking'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id uuid NOT NULL,
    user_id uuid NOT NULL,
    answer_format answer_format NOT NULL DEFAULT 'text',
    answer_data jsonb NOT NULL, -- Stores the answer in a flexible format
    question_type question_type NOT NULL,
    metadata jsonb, -- Additional metadata specific to question types
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at);

-- Temporarily disable RLS for testing
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;

-- Add foreign key constraints if the referenced tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
        ALTER TABLE answers ADD CONSTRAINT fk_answers_question_id FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE answers ADD CONSTRAINT fk_answers_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Foreign key constraints could not be added. This is expected if referenced tables do not exist yet.';
END $$;
