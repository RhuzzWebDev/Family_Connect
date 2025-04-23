-- Create question_set table
CREATE TABLE question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add question_set_id to questions table
ALTER TABLE questions 
ADD COLUMN question_set_id UUID REFERENCES question_sets(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_questions_question_set_id ON questions(question_set_id);

-- Enable RLS on question_sets table
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for question_sets

-- Admin can do all operations on question_sets
CREATE POLICY "Admins can do all operations on question_sets"
    ON question_sets
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE email = current_setting('app.user_email', true)
        )
    );

-- Users can view question_sets
CREATE POLICY "Users can view question_sets"
    ON question_sets
    FOR SELECT
    USING (true);

-- Create a function to count questions in a question set
CREATE OR REPLACE FUNCTION get_question_count(question_set_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count FROM questions WHERE questions.question_set_id = $1;
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update updated_at when question_set is modified
CREATE OR REPLACE FUNCTION update_question_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_set_timestamp
BEFORE UPDATE ON question_sets
FOR EACH ROW
EXECUTE FUNCTION update_question_set_timestamp();
