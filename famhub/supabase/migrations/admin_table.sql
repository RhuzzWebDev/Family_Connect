-- Create admin table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sysAdmin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create RLS policies for admin table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows public access for authentication purposes
CREATE POLICY "Allow public access for authentication" ON public.admins
  FOR SELECT USING (true);

-- Policy to allow system admins to insert new admins
CREATE POLICY "System admins can insert admins" ON public.admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
      AND a.role = 'sysAdmin'
    )
  );

-- Policy to allow system admins to update admins
CREATE POLICY "System admins can update admins" ON public.admins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
      AND a.role = 'sysAdmin'
    )
  );

-- Policy to allow system admins to delete admins
CREATE POLICY "System admins can delete admins" ON public.admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
      AND a.role = 'sysAdmin'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS admins_email_idx ON public.admins (email);
