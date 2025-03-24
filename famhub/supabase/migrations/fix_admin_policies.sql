-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;

-- Create a policy that allows public access for authentication purposes
CREATE POLICY "Allow public access for authentication" ON public.admins
  FOR SELECT USING (true);

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
