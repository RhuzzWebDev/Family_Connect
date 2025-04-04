-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin role enum
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('Admin', 'sysAdmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admins table (modified to work with Supabase Auth)
CREATE TABLE admins (
    id UUID PRIMARY KEY, -- Use Auth user ID instead of generating a new one
    email TEXT UNIQUE NOT NULL,
    password TEXT, -- Optional for backward compatibility
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role admin_role NOT NULL,
    status TEXT DEFAULT 'active',
    auth_user_id UUID REFERENCES auth.users(id), -- Reference to Supabase Auth user
    CONSTRAINT admin_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster admin lookups
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_auth_user_id ON admins(auth_user_id);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin self-access" ON admins;
DROP POLICY IF EXISTS "Allow admin registration" ON admins;
DROP POLICY IF EXISTS "Allow sysadmin full access" ON admins;
DROP POLICY IF EXISTS "Allow public read for authentication" ON admins;
DROP POLICY IF EXISTS "Allow auth user access" ON admins;

-- Create admin policies for Supabase Auth
CREATE POLICY "Allow public read for authentication"
    ON admins
    FOR SELECT
    USING (true);

-- Allow authenticated users to access their own admin record
CREATE POLICY "Allow auth user access"
    ON admins
    FOR ALL
    USING (auth.uid() = auth_user_id);

-- Legacy policies for backward compatibility
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
        OR 
        -- Allow registration through Supabase Auth
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Allow sysadmin full access"
    ON admins
    FOR ALL
    USING (
        (current_setting('app.user_email', true) = email
        AND role = 'sysAdmin'
        AND status = 'active')
        OR
        -- Allow sysAdmin access through Supabase Auth
        (auth.uid() = auth_user_id AND role = 'sysAdmin' AND status = 'active')
    );

CREATE POLICY "Allow admin self-access"
    ON admins
    FOR SELECT
    USING (
        (current_setting('app.user_email', true) = email
        AND status = 'active')
        OR
        -- Allow admin access through Supabase Auth
        (auth.uid() = auth_user_id AND status = 'active')
    );

-- Function to create default admin accounts
CREATE OR REPLACE FUNCTION create_default_admins()
RETURNS void AS $$
DECLARE
    sysadmin_id UUID;
    admin_id UUID;
BEGIN
    -- Create sysAdmin if none exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE role = 'sysAdmin') THEN
        -- First create the auth user
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
        VALUES (
            uuid_generate_v4(),
            'sysadmin@familyconnect.com',
            crypt('sysadmin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"is_admin":true}',
            '{"first_name":"System","last_name":"Admin","role":"sysAdmin"}'
        )
        RETURNING id INTO sysadmin_id;
        
        -- Then create the admin record
        INSERT INTO admins (
            id,
            email,
            password,
            first_name,
            last_name,
            role,
            status,
            auth_user_id
        ) VALUES (
            sysadmin_id,
            'sysadmin@familyconnect.com',
            crypt('sysadmin123', gen_salt('bf')), -- Default password: sysadmin123
            'System',
            'Admin',
            'sysAdmin',
            'active',
            sysadmin_id
        );
    END IF;

    -- Create regular Admin if none exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE role = 'Admin') THEN
        -- First create the auth user
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
        VALUES (
            uuid_generate_v4(),
            'admin@familyconnect.com',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"is_admin":true}',
            '{"first_name":"Regular","last_name":"Admin","role":"Admin"}'
        )
        RETURNING id INTO admin_id;
        
        -- Then create the admin record
        INSERT INTO admins (
            id,
            email,
            password,
            first_name,
            last_name,
            role,
            status,
            auth_user_id
        ) VALUES (
            admin_id,
            'admin@familyconnect.com',
            crypt('admin123', gen_salt('bf')), -- Default password: admin123
            'Regular',
            'Admin',
            'Admin',
            'active',
            admin_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the default admin accounts
SELECT create_default_admins();

-- Drop existing verify_admin_password function if it exists
DROP FUNCTION IF EXISTS verify_admin_password(TEXT, TEXT);

-- Function to verify admin password (legacy method)
CREATE OR REPLACE FUNCTION verify_admin_password(
    admin_email TEXT,
    input_password TEXT
) RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role admin_role,
    status TEXT,
    auth_user_id UUID
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
        a.status,
        a.auth_user_id
    FROM admins a
    WHERE 
        a.email = admin_email 
        AND a.password = crypt(input_password, a.password)
        AND a.status = 'active';
    PERFORM set_config('app.is_admin', 'false', true);
END;
$$ LANGUAGE plpgsql;

-- Function to get admin by auth user ID
CREATE OR REPLACE FUNCTION get_admin_by_auth_id(
    auth_id UUID
) RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role admin_role,
    status TEXT
) AS $$
BEGIN
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
        a.auth_user_id = auth_id
        AND a.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to set session claims (legacy method)
CREATE OR REPLACE FUNCTION set_claim(
    claim TEXT,
    value TEXT
) RETURNS void AS $$
BEGIN
    PERFORM set_config(claim, value, true);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to sync admin data with auth.users
CREATE OR REPLACE FUNCTION sync_admin_with_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update auth.users metadata
        UPDATE auth.users
        SET 
            raw_user_meta_data = jsonb_build_object(
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'role', NEW.role
            ),
            raw_app_meta_data = jsonb_build_object(
                'is_admin', true,
                'admin_role', NEW.role,
                'status', NEW.status
            )
        WHERE id = NEW.auth_user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- You might want to handle deletion differently
        -- This example doesn't delete the auth user
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_admin_with_auth
AFTER INSERT OR UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION sync_admin_with_auth();

-- Create a function to handle new user signups through Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the new user has is_admin in metadata
    IF (NEW.raw_app_meta_data->>'is_admin')::boolean = true THEN
        -- Create a corresponding record in the admins table
        INSERT INTO admins (
            id,
            email,
            first_name,
            last_name,
            role,
            status,
            auth_user_id
        ) VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            (NEW.raw_user_meta_data->>'role')::admin_role,
            'active',
            NEW.id
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on auth.users to handle new admin signups
CREATE TRIGGER trigger_handle_new_admin_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_admin_user();

-- Create a function for admins to create families without RLS restrictions
CREATE OR REPLACE FUNCTION admin_create_family(
    p_family_name TEXT
) RETURNS TABLE (
    family_id UUID,
    success BOOLEAN
) SECURITY DEFINER AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Insert the family record
    INSERT INTO families (family_name)
    VALUES (p_family_name)
    RETURNING id INTO v_family_id;
    
    -- Return the family ID and success status
    RETURN QUERY SELECT v_family_id, TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Return NULL and FALSE if there was an error
    RETURN QUERY SELECT NULL::UUID, FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create a function for admins to get all families without RLS restrictions
CREATE OR REPLACE FUNCTION admin_get_all_families()
RETURNS TABLE (
    id UUID,
    family_name TEXT,
    created_at TIMESTAMPTZ,
    member_count BIGINT
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.family_name,
        f.created_at,
        COUNT(u.id)::BIGINT as member_count
    FROM 
        families f
    LEFT JOIN 
        users u ON f.id = u.family_id
    GROUP BY 
        f.id, f.family_name, f.created_at
    ORDER BY 
        f.created_at DESC;
END;
$$ LANGUAGE plpgsql;
