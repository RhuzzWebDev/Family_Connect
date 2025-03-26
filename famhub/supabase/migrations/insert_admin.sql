-- Make sure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Temporarily disable RLS to insert the first admin
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

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

-- Re-enable RLS after inserting the admin
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
