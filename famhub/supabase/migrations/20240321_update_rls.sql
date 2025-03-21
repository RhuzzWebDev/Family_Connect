-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Users can insert their own questions" ON questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON questions;
DROP POLICY IF EXISTS "Allow public registration and login" ON users;
DROP POLICY IF EXISTS "Allow public registration" ON users;

-- Make sure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

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
