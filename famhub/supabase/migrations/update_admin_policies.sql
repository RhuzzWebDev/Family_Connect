-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for authentication" ON public.admins;
DROP POLICY IF EXISTS "Allow admin creation" ON public.admins;
DROP POLICY IF EXISTS "System admins can insert admins" ON public.admins;

-- Create a policy that allows public access for authentication purposes
CREATE POLICY "Allow public access for authentication" ON public.admins
  FOR SELECT USING (true);

-- Create a policy that allows admins to create new admins with role-based restrictions
CREATE POLICY "Role-based admin creation" ON public.admins
  FOR INSERT WITH CHECK (
    -- Check if the current admin is in the session and has appropriate role
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.headers')::json->>'x-admin-email'
      AND (
        -- sysAdmins can create any type of admin
        role = 'sysAdmin'
        OR
        -- regular admins can only create regular admins
        (role = 'admin' AND NEW.role = 'admin')
      )
    )
  );

-- Create a policy that allows admins to update admins with role-based restrictions
CREATE POLICY "Role-based admin updates" ON public.admins
  FOR UPDATE USING (true) WITH CHECK (
    -- Check if the current admin is in the session and has appropriate role
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.headers')::json->>'x-admin-email'
      AND (
        -- sysAdmins can update any admin
        role = 'sysAdmin'
        OR
        -- regular admins can only update regular admins and can't change roles to sysAdmin
        (role = 'admin' AND NEW.role = 'admin')
      )
    )
  );

-- Create a policy that allows admins to delete admins with role-based restrictions
CREATE POLICY "Role-based admin deletion" ON public.admins
  FOR DELETE USING (
    -- Check if the current admin is in the session and has appropriate role
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.headers')::json->>'x-admin-email'
      AND (
        -- sysAdmins can delete any admin
        role = 'sysAdmin'
        OR
        -- regular admins can only delete regular admins
        (role = 'admin' AND admins.role = 'admin')
      )
    )
  );
