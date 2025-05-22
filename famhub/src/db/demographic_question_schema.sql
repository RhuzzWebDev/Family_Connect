-- Add demographic question type to the enum
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'demographic';

-- Create demographic questions table
CREATE TABLE IF NOT EXISTS question_demographic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    field_type TEXT NOT NULL, -- age, gender, education, income, location, ethnicity, etc.
    is_required BOOLEAN DEFAULT TRUE,
    has_other_option BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for demographic options (for fields that have predefined options)
CREATE TABLE IF NOT EXISTS question_demographic_option (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demographic_id UUID NOT NULL REFERENCES question_demographic(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_question_demographic_question_id ON question_demographic(question_id);
CREATE INDEX IF NOT EXISTS idx_question_demographic_option_demographic_id ON question_demographic_option(demographic_id);

-- Enable RLS on the tables
ALTER TABLE question_demographic ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_demographic_option ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for demographic questions
CREATE POLICY question_demographic_select_policy ON question_demographic FOR SELECT USING (TRUE);
CREATE POLICY question_demographic_insert_policy ON question_demographic FOR INSERT WITH CHECK (check_question_access(question_id));
CREATE POLICY question_demographic_update_policy ON question_demographic FOR UPDATE USING (check_question_access(question_id));
CREATE POLICY question_demographic_delete_policy ON question_demographic FOR DELETE USING (check_question_access(question_id));

-- Create RLS policies for demographic options
CREATE POLICY question_demographic_option_select_policy ON question_demographic_option FOR SELECT USING (TRUE);
CREATE POLICY question_demographic_option_insert_policy ON question_demographic_option FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM question_demographic qd
        WHERE qd.id = demographic_id AND check_question_access(qd.question_id)
    )
);
CREATE POLICY question_demographic_option_update_policy ON question_demographic_option FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM question_demographic qd
        WHERE qd.id = demographic_id AND check_question_access(qd.question_id)
    )
);
CREATE POLICY question_demographic_option_delete_policy ON question_demographic_option FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM question_demographic qd
        WHERE qd.id = demographic_id AND check_question_access(qd.question_id)
    )
);
