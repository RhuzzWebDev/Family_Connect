-- Migration to implement admin role restrictions
-- This allows admins to create, update, and delete accounts, but prevents them from creating sysAdmin accounts

-- Drop existing policies to avoid conflicts
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

-- Create a policy for sysAdmin to create any admin
CREATE POLICY "SysAdmin can create any admin" ON public.admins
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'sysAdmin'
    )
  );

-- Create a policy for regular admins to create only regular admin accounts
CREATE POLICY "Admin can create only admin role" ON public.admins
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'admin'
    )
    AND current_setting('request.jwt.claims')::json->>'role' = 'admin'
  );

-- Create a policy for first admin creation
CREATE POLICY "First admin creation" ON public.admins
  FOR INSERT TO authenticated WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.admins)
  );

-- Create a policy for sysAdmin to update any admin
CREATE POLICY "SysAdmin can update any admin" ON public.admins
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'sysAdmin'
    )
  );

-- Create a policy for regular admins to update only regular admin accounts
CREATE POLICY "Admin can update only admin role" ON public.admins
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'admin'
    )
    AND public.admins.role = 'admin'
  ) WITH CHECK (
    current_setting('request.jwt.claims')::json->>'role' = 'admin'
  );

-- Create a policy for sysAdmin to delete any admin
CREATE POLICY "SysAdmin can delete any admin" ON public.admins
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'sysAdmin'
    )
  );

-- Create a policy for regular admins to delete only regular admin accounts
CREATE POLICY "Admin can delete only admin role" ON public.admins
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND role = 'admin'
    )
    AND public.admins.role = 'admin'
  );

-- Create a policy for users table to allow admins to manage users
-- This assumes you have a users table with similar structure
DROP POLICY IF EXISTS "Admin user management" ON public.users;

CREATE POLICY "Admin user management" ON public.users
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
      AND (role = 'sysAdmin' OR role = 'admin')
    )
  );
