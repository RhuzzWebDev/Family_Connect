-- Script to recreate the questions table with demographic type included
-- This is a last resort approach to fix the enum issue

-- First, backup existing data
CREATE TABLE IF NOT EXISTS questions_backup AS SELECT * FROM questions;

-- Drop dependent tables first (make sure to recreate these later)
-- You may need to adjust this list based on your actual schema
DROP TABLE IF EXISTS question_multiple_choice_option CASCADE;
DROP TABLE IF EXISTS question_likert_scale CASCADE;
DROP TABLE IF EXISTS question_rating_scale CASCADE;
DROP TABLE IF EXISTS question_matrix CASCADE;
DROP TABLE IF EXISTS question_matrix_option CASCADE;
DROP TABLE IF EXISTS question_dropdown_option CASCADE;
DROP TABLE IF EXISTS question_open_ended CASCADE;
DROP TABLE IF EXISTS question_image_choice_option CASCADE;
DROP TABLE IF EXISTS question_slider CASCADE;
DROP TABLE IF EXISTS question_dichotomous CASCADE;
DROP TABLE IF EXISTS question_ranking_option CASCADE;
DROP TABLE IF EXISTS question_demographic CASCADE;
DROP TABLE IF EXISTS question_demographic_option CASCADE;

-- Drop the questions table
DROP TABLE IF EXISTS questions CASCADE;

-- Recreate the question_type enum with all values including demographic
DROP TYPE IF EXISTS question_type CASCADE;
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
  'ranking',
  'demographic'
);

-- Recreate the questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  question TEXT NOT NULL,
  type question_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_required BOOLEAN DEFAULT FALSE,
  has_other_option BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  media_type TEXT
);

-- Add RLS policies for questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own questions"
  ON questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questions"
  ON questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
  ON questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON questions FOR DELETE
  USING (auth.uid() = user_id);

-- Recreate dependent tables
-- You'll need to add the CREATE TABLE statements for all dependent tables here
-- For brevity, I'm only including the demographic tables as an example

-- Create question_demographic table
CREATE TABLE question_demographic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  has_other_option BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for question_demographic
ALTER TABLE question_demographic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own demographic questions"
  ON question_demographic FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = question_demographic.question_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own demographic questions"
  ON question_demographic FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = question_demographic.question_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own demographic questions"
  ON question_demographic FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = question_demographic.question_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own demographic questions"
  ON question_demographic FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = question_demographic.question_id
      AND questions.user_id = auth.uid()
    )
  );

-- Create question_demographic_option table
CREATE TABLE question_demographic_option (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_demographic_id UUID NOT NULL REFERENCES question_demographic(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for question_demographic_option
ALTER TABLE question_demographic_option ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own demographic options"
  ON question_demographic_option FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM question_demographic
      JOIN questions ON questions.id = question_demographic.question_id
      WHERE question_demographic.id = question_demographic_option.question_demographic_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own demographic options"
  ON question_demographic_option FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_demographic
      JOIN questions ON questions.id = question_demographic.question_id
      WHERE question_demographic.id = question_demographic_option.question_demographic_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own demographic options"
  ON question_demographic_option FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM question_demographic
      JOIN questions ON questions.id = question_demographic.question_id
      WHERE question_demographic.id = question_demographic_option.question_demographic_id
      AND questions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own demographic options"
  ON question_demographic_option FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM question_demographic
      JOIN questions ON questions.id = question_demographic.question_id
      WHERE question_demographic.id = question_demographic_option.question_demographic_id
      AND questions.user_id = auth.uid()
    )
  );

-- Restore data from backup (except for new records that would violate the constraint)
INSERT INTO questions
SELECT * FROM questions_backup
WHERE type::text != 'demographic';  -- Skip any problematic records

-- You would need to restore data for all dependent tables as well
-- This is just a placeholder for that process

-- Verify the enum values
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
ORDER BY enumsortorder;

-- Check the constraint definition
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'questions_type_check';
