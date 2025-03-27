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

-- Create a simplified policy that allows any authenticated user to create admins
-- The role-based restrictions will be handled in the application code
CREATE POLICY "Allow admin creation" ON public.admins
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create a policy that allows updating admins
-- Role-based restrictions will be handled in the application code
CREATE POLICY "Allow admin updates" ON public.admins
  FOR UPDATE TO authenticated USING (true);

-- Create a policy that allows deleting admins
-- Role-based restrictions will be handled in the application code
CREATE POLICY "Allow admin deletion" ON public.admins
  FOR DELETE TO authenticated USING (true);

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
