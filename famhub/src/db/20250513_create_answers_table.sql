-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create type for answer format
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

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer_format answer_format NOT NULL DEFAULT 'text',
    answer_data jsonb NOT NULL, -- Stores the answer in a flexible format
    question_type question_type NOT NULL,
    metadata jsonb, -- Additional metadata specific to question types
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_answer_format CHECK (
        CASE
            WHEN question_type = 'multiple-choice' THEN answer_format = 'array'
            WHEN question_type = 'rating-scale' THEN answer_format = 'number'
            WHEN question_type = 'likert-scale' THEN answer_format = 'number'
            WHEN question_type = 'matrix' THEN answer_format = 'json'
            WHEN question_type = 'dropdown' THEN answer_format = 'text'
            WHEN question_type = 'open-ended' THEN answer_format = 'text'
            WHEN question_type = 'image-choice' THEN answer_format = 'array'
            WHEN question_type = 'slider' THEN answer_format = 'number'
            WHEN question_type = 'dichotomous' THEN answer_format = 'text'
            WHEN question_type = 'ranking' THEN answer_format = 'array'
            ELSE false
        END
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at);

-- Enable Row Level Security
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins have full access" ON answers;
DROP POLICY IF EXISTS "Users can view family answers" ON answers;
DROP POLICY IF EXISTS "Users can insert their own answers" ON answers;
DROP POLICY IF EXISTS "Users can update their own answers" ON answers;
DROP POLICY IF EXISTS "Users can delete their own answers" ON answers;

-- Create RLS policies

-- Admin policies
CREATE POLICY "Admins have full access" ON answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE admins.email = auth.email()
            AND (admins.role = 'Admin' OR admins.role = 'sysAdmin')
            AND admins.status = 'active'
        )
    );

-- User policies for viewing
CREATE POLICY "Users can view family answers" ON answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u1
            JOIN users u2 ON u1.family_id = u2.family_id
            WHERE u1.id = answers.user_id
            AND u2.id = auth.uid()
        )
    );

-- User policies for inserting (simplified to allow all inserts)
CREATE POLICY "Allow all inserts" ON answers
    FOR INSERT WITH CHECK (true);
    
-- Alternative policy using custom auth system (if the above doesn't work)
CREATE POLICY "Users can insert with custom auth" ON answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = answers.user_id
            AND users.email = current_setting('app.user_email', true)::text
        )
    );

-- User policies for updating
CREATE POLICY "Users can update their own answers" ON answers
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- User policies for deleting
CREATE POLICY "Users can delete their own answers" ON answers
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS answers_updated_at ON answers;
CREATE TRIGGER answers_updated_at
    BEFORE UPDATE ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_answers_updated_at();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON answers TO authenticated;
