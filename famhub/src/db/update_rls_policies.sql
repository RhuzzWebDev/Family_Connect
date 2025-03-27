-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own questions" ON questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON questions;

-- Create updated policies with admin bypass
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
