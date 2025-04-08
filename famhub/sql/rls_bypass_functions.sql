-- Create functions with SECURITY DEFINER to bypass RLS policies

-- Function to create a family with admin privileges
CREATE OR REPLACE FUNCTION admin_create_family(
  p_family_name TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Insert the family with user_ref
  INSERT INTO families (family_name, user_ref)
  VALUES (p_family_name, p_user_id)
  RETURNING id INTO v_family_id;
  
  RETURN v_family_id;
END;
$$;

-- Function to update a user with family_id
CREATE OR REPLACE FUNCTION admin_update_user_family(
  p_user_id UUID,
  p_family_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user with family_id
  UPDATE users
  SET family_id = p_family_id
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to check if admin flag is set
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Get the current admin flag value
  v_is_admin := current_setting('app.is_admin', TRUE)::boolean;
  
  RETURN jsonb_build_object('is_admin', v_is_admin);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('is_admin', FALSE);
END;
$$;

-- Function to set admin flag
CREATE OR REPLACE FUNCTION set_admin_flag(admin BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.is_admin', admin::text, FALSE);
END;
$$;
