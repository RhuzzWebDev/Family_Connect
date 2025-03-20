-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile and other users' basic info
CREATE POLICY "Users can read their own profile"
    ON users
    FOR SELECT
    USING (
        auth.uid() = id 
        OR auth.role() = 'authenticated'
    );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow service role to create new user profiles during registration
CREATE POLICY "Service role can create profiles"
    ON users
    FOR INSERT
    WITH CHECK (
        -- Only allow service role or if the user is creating their own profile
        (auth.jwt() ->> 'role' = 'service_role') OR
        (auth.uid() = id)
    );

-- Allow service role to manage all user profiles
CREATE POLICY "Service role can manage all profiles"
    ON users
    USING (auth.jwt() ->> 'role' = 'service_role');
