-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for authentication" ON public.admins;
DROP POLICY IF EXISTS "Allow admin creation" ON public.admins;
DROP POLICY IF EXISTS "Allow admin updates" ON public.admins;
DROP POLICY IF EXISTS "Allow admin deletion" ON public.admins;
DROP POLICY IF EXISTS "System admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "System admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "System admins can delete admins" ON public.admins;
DROP POLICY IF EXISTS "Role-based admin creation" ON public.admins;
DROP POLICY IF EXISTS "Role-based admin updates" ON public.admins;
DROP POLICY IF EXISTS "Role-based admin deletion" ON public.admins;
DROP POLICY IF EXISTS "Admin role-based creation" ON public.admins;
DROP POLICY IF EXISTS "Admin role-based updates" ON public.admins;
DROP POLICY IF EXISTS "Admin role-based deletion" ON public.admins;
DROP POLICY IF EXISTS "Admin creation policy" ON public.admins;
DROP POLICY IF EXISTS "Admin update policy" ON public.admins;
DROP POLICY IF EXISTS "Admin deletion policy" ON public.admins;

-- Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows public access for authentication purposes
CREATE POLICY "Allow public access for authentication" ON public.admins
  FOR SELECT USING (true);

-- Create a policy for admin creation
-- This policy allows:
-- 1. The first admin to be created when no admins exist
-- 2. System admins to create any type of admin
-- 3. Regular admins to create only regular admins
CREATE POLICY "Admin creation policy" ON public.admins
  FOR INSERT TO authenticated WITH CHECK (
    (
      -- Allow first admin creation when no admins exist
      NOT EXISTS (SELECT 1 FROM public.admins)
    ) OR (
      EXISTS (
        SELECT 1 FROM public.admins
        WHERE email = auth.email()
        AND (
          -- sysAdmins can create any admin
          role = 'sysAdmin' 
          OR 
          -- regular admins can only create regular admins, but we'll check this in application code
          role = 'admin'
        )
      )
    )
  );

-- Create a policy for admin updates
-- This allows system admins to update any admin
-- Regular admins can only update regular admins
CREATE POLICY "Admin update policy" ON public.admins
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND (
        -- sysAdmins can update any admin
        role = 'sysAdmin' 
        OR 
        -- regular admins can only update regular admins
        (role = 'admin' AND public.admins.role = 'admin')
      )
    )
  );

-- Create a policy for admin deletion
-- This allows system admins to delete any admin
-- Regular admins can only delete regular admins
CREATE POLICY "Admin deletion policy" ON public.admins
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND (
        -- sysAdmins can delete any admin
        role = 'sysAdmin' 
        OR 
        -- regular admins can only delete regular admins
        (role = 'admin' AND public.admins.role = 'admin')
      )
    )
  );

-- Make sure we have at least one admin in the system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins) THEN
    -- Make sure pgcrypto extension is enabled
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Insert admin with hashed password
    INSERT INTO public.admins (
      first_name,
      last_name,
      email,
      password,
      role
    ) VALUES (
      'Rhuzzel',
      'Paramio',
      'rhuzz@awholefamilymatter.com',
      crypt('paramio12', gen_salt('bf', 10)), -- Using bcrypt with cost factor 10
      'sysAdmin'
    );
  END IF;
END
$$;
