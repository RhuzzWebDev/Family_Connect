-- Create a more comprehensive admin policy for questions table
DROP POLICY IF EXISTS "Admin full access to questions" ON questions;
CREATE POLICY "Admin full access to questions"
    ON questions
    FOR ALL
    USING (
        -- Admin flag is set
        current_setting('app.is_admin', true)::boolean = true
        OR
        -- User is an admin based on email
        EXISTS (
            SELECT 1 FROM admins
            WHERE email = current_setting('app.user_email', true)
            AND status = 'active'
        )
    )
    WITH CHECK (
        -- Admin flag is set
        current_setting('app.is_admin', true)::boolean = true
        OR
        -- User is an admin based on email
        EXISTS (
            SELECT 1 FROM admins
            WHERE email = current_setting('app.user_email', true)
            AND status = 'active'
        )
    );

-- Create a function to set both admin email and flag in one call
CREATE OR REPLACE FUNCTION set_admin_session(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  -- Set the user email
  PERFORM set_config('app.user_email', admin_email, FALSE);
  -- Set the admin flag
  PERFORM set_config('app.is_admin', 'true', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set admin flag only
CREATE OR REPLACE FUNCTION set_admin_flag(admin BOOLEAN)
RETURNS VOID AS $$
BEGIN
  -- Set the admin flag
  PERFORM set_config('app.is_admin', admin::text, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
