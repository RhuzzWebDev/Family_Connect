-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin role enum
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('Admin', 'sysAdmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role admin_role NOT NULL,
    status TEXT DEFAULT 'active',
    CONSTRAINT admin_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster admin lookups
CREATE INDEX idx_admins_email ON admins(email);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin self-access" ON admins;
DROP POLICY IF EXISTS "Allow admin registration" ON admins;
DROP POLICY IF EXISTS "Allow sysadmin full access" ON admins;
DROP POLICY IF EXISTS "Allow public read for authentication" ON admins;

-- Create admin policies
CREATE POLICY "Allow public read for authentication"
    ON admins
    FOR SELECT
    USING (true);

CREATE POLICY "Allow admin registration"
    ON admins
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins
            WHERE email = current_setting('app.user_email', true)
            AND role = 'sysAdmin'
            AND status = 'active'
        )
    );

CREATE POLICY "Allow sysadmin full access"
    ON admins
    FOR ALL
    USING (
        current_setting('app.user_email', true) = email
        AND role = 'sysAdmin'
        AND status = 'active'
    );

CREATE POLICY "Allow admin self-access"
    ON admins
    FOR SELECT
    USING (
        current_setting('app.user_email', true) = email
        AND status = 'active'
    );

-- Function to create default admin accounts
CREATE OR REPLACE FUNCTION create_default_admins()
RETURNS void AS $$
BEGIN
    -- Create sysAdmin if none exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE role = 'sysAdmin') THEN
        INSERT INTO admins (
            email,
            password,
            first_name,
            last_name,
            role,
            status
        ) VALUES (
            'sysadmin@familyconnect.com',
            crypt('sysadmin123', gen_salt('bf')), -- Default password: sysadmin123
            'System',
            'Admin',
            'sysAdmin',
            'active'
        );
    END IF;

    -- Create regular Admin if none exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE role = 'Admin') THEN
        INSERT INTO admins (
            email,
            password,
            first_name,
            last_name,
            role,
            status
        ) VALUES (
            'admin@familyconnect.com',
            crypt('admin123', gen_salt('bf')), -- Default password: admin123
            'Regular',
            'Admin',
            'Admin',
            'active'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the default admin accounts
SELECT create_default_admins();

-- Drop existing verify_admin_password function if it exists
DROP FUNCTION IF EXISTS verify_admin_password(TEXT, TEXT);

-- Function to verify admin password
CREATE OR REPLACE FUNCTION verify_admin_password(
    admin_email TEXT,
    input_password TEXT
) RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role admin_role,
    status TEXT
) AS $$
BEGIN
    PERFORM set_config('app.is_admin', 'true', true);
    RETURN QUERY
    SELECT 
        a.id,
        a.email,
        a.first_name,
        a.last_name,
        a.role,
        a.status
    FROM admins a
    WHERE 
        a.email = admin_email 
        AND a.password = crypt(input_password, a.password)
        AND a.status = 'active';
    PERFORM set_config('app.is_admin', 'false', true);
END;
$$ LANGUAGE plpgsql;

-- Function to set session claims
CREATE OR REPLACE FUNCTION set_claim(
    claim TEXT,
    value TEXT
) RETURNS void AS $$
BEGIN
    PERFORM set_config(claim, value, true);
END;
$$ LANGUAGE plpgsql;
