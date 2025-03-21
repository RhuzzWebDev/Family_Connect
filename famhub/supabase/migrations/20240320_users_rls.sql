-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public access for registration and login
CREATE POLICY "Allow public registration and login"
    ON users
    FOR SELECT
    USING (true);

-- Allow public to insert new users during registration
CREATE POLICY "Allow public registration"
    ON users
    FOR INSERT
    WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (email = current_setting('app.user_email', true));

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
    ON users
    FOR DELETE
    USING (email = current_setting('app.user_email', true));
