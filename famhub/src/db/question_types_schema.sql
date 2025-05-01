-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Media type enum is defined in schema.sql with values: 'image', 'video', 'audio'
-- We're not supporting 'document' type to match the enum constraint

-- Create question_type enum
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

-- Add question_type column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS type question_type DEFAULT 'open-ended';

-- Create separate tables for each question type

-- 1. Multiple choice questions
CREATE TABLE IF NOT EXISTS question_multiple_choice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rating scale questions
CREATE TABLE IF NOT EXISTS question_rating_scale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    min_value INTEGER NOT NULL,
    max_value INTEGER NOT NULL,
    step_value INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Likert scale questions
CREATE TABLE IF NOT EXISTS question_likert_scale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Matrix questions
CREATE TABLE IF NOT EXISTS question_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    is_row BOOLEAN NOT NULL, -- true for row, false for column
    content TEXT NOT NULL,
    item_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Dropdown questions
CREATE TABLE IF NOT EXISTS question_dropdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Open-ended questions
CREATE TABLE IF NOT EXISTS question_open_ended (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_format TEXT DEFAULT 'text', -- text, paragraph, number, date, email
    character_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Image choice questions
CREATE TABLE IF NOT EXISTS question_image_choice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    image_url TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Slider questions
CREATE TABLE IF NOT EXISTS question_slider (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    min_value INTEGER NOT NULL,
    max_value INTEGER NOT NULL,
    step_value INTEGER DEFAULT 1,
    default_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Dichotomous questions
CREATE TABLE IF NOT EXISTS question_dichotomous (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    positive_option TEXT NOT NULL DEFAULT 'Yes',
    negative_option TEXT NOT NULL DEFAULT 'No',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Ranking questions
CREATE TABLE IF NOT EXISTS question_ranking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    item_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_question_multiple_choice_question_id ON question_multiple_choice(question_id);
CREATE INDEX IF NOT EXISTS idx_question_rating_scale_question_id ON question_rating_scale(question_id);
CREATE INDEX IF NOT EXISTS idx_question_likert_scale_question_id ON question_likert_scale(question_id);
CREATE INDEX IF NOT EXISTS idx_question_matrix_question_id ON question_matrix(question_id);
CREATE INDEX IF NOT EXISTS idx_question_dropdown_question_id ON question_dropdown(question_id);
CREATE INDEX IF NOT EXISTS idx_question_open_ended_question_id ON question_open_ended(question_id);
CREATE INDEX IF NOT EXISTS idx_question_image_choice_question_id ON question_image_choice(question_id);
CREATE INDEX IF NOT EXISTS idx_question_slider_question_id ON question_slider(question_id);
CREATE INDEX IF NOT EXISTS idx_question_dichotomous_question_id ON question_dichotomous(question_id);
CREATE INDEX IF NOT EXISTS idx_question_ranking_question_id ON question_ranking(question_id);

-- Enable RLS on all tables
ALTER TABLE question_multiple_choice ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_rating_scale ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_likert_scale ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_dropdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_open_ended ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_image_choice ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_slider ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_dichotomous ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_ranking ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user has access to a question
CREATE OR REPLACE FUNCTION check_question_access(question_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM questions q
        WHERE q.id = question_id AND 
              (q.user_id = auth.uid() OR 
               EXISTS (SELECT 1 FROM app_users WHERE email = current_setting('app.current_user', TRUE) AND role = 'admin'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for each question type table
-- We'll use a macro-like approach to create similar policies for all tables

-- 1. Multiple Choice Questions
CREATE POLICY question_multiple_choice_select_policy ON question_multiple_choice FOR SELECT USING (TRUE);
CREATE POLICY question_multiple_choice_insert_policy ON question_multiple_choice FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_multiple_choice_update_policy ON question_multiple_choice FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_multiple_choice_delete_policy ON question_multiple_choice FOR DELETE USING (check_question_access(question_id));

-- 2. Rating Scale Questions
CREATE POLICY question_rating_scale_select_policy ON question_rating_scale FOR SELECT USING (TRUE);
CREATE POLICY question_rating_scale_insert_policy ON question_rating_scale FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_rating_scale_update_policy ON question_rating_scale FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_rating_scale_delete_policy ON question_rating_scale FOR DELETE USING (check_question_access(question_id));

-- 3. Likert Scale Questions
CREATE POLICY question_likert_scale_select_policy ON question_likert_scale FOR SELECT USING (TRUE);
CREATE POLICY question_likert_scale_insert_policy ON question_likert_scale FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_likert_scale_update_policy ON question_likert_scale FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_likert_scale_delete_policy ON question_likert_scale FOR DELETE USING (check_question_access(question_id));

-- 4. Matrix Questions
CREATE POLICY question_matrix_select_policy ON question_matrix FOR SELECT USING (TRUE);
CREATE POLICY question_matrix_insert_policy ON question_matrix FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_matrix_update_policy ON question_matrix FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_matrix_delete_policy ON question_matrix FOR DELETE USING (check_question_access(question_id));

-- 5. Dropdown Questions
CREATE POLICY question_dropdown_select_policy ON question_dropdown FOR SELECT USING (TRUE);
CREATE POLICY question_dropdown_insert_policy ON question_dropdown FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_dropdown_update_policy ON question_dropdown FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_dropdown_delete_policy ON question_dropdown FOR DELETE USING (check_question_access(question_id));

-- 6. Open-ended Questions
CREATE POLICY question_open_ended_select_policy ON question_open_ended FOR SELECT USING (TRUE);
CREATE POLICY question_open_ended_insert_policy ON question_open_ended FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_open_ended_update_policy ON question_open_ended FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_open_ended_delete_policy ON question_open_ended FOR DELETE USING (check_question_access(question_id));

-- 7. Image Choice Questions
CREATE POLICY question_image_choice_select_policy ON question_image_choice FOR SELECT USING (TRUE);
CREATE POLICY question_image_choice_insert_policy ON question_image_choice FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_image_choice_update_policy ON question_image_choice FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_image_choice_delete_policy ON question_image_choice FOR DELETE USING (check_question_access(question_id));

-- 8. Slider Questions
CREATE POLICY question_slider_select_policy ON question_slider FOR SELECT USING (TRUE);
CREATE POLICY question_slider_insert_policy ON question_slider FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_slider_update_policy ON question_slider FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_slider_delete_policy ON question_slider FOR DELETE USING (check_question_access(question_id));

-- 9. Dichotomous Questions
CREATE POLICY question_dichotomous_select_policy ON question_dichotomous FOR SELECT USING (TRUE);
CREATE POLICY question_dichotomous_insert_policy ON question_dichotomous FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_dichotomous_update_policy ON question_dichotomous FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_dichotomous_delete_policy ON question_dichotomous FOR DELETE USING (check_question_access(question_id));

-- 10. Ranking Questions
CREATE POLICY question_ranking_select_policy ON question_ranking FOR SELECT USING (TRUE);
CREATE POLICY question_ranking_insert_policy ON question_ranking FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_ranking_update_policy ON question_ranking FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_ranking_delete_policy ON question_ranking FOR DELETE USING (check_question_access(question_id));
