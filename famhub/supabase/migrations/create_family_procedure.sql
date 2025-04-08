-- Create a stored procedure to create families with admin privileges
-- This function will run with security definer permissions, bypassing RLS
CREATE OR REPLACE FUNCTION create_family_for_admin(
  p_family_name TEXT,
  p_admin_email TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_family_id UUID;
  v_family JSONB;
BEGIN
  -- Insert the new family
  INSERT INTO families (family_name)
  VALUES (p_family_name)
  RETURNING id INTO v_family_id;
  
  -- Get the complete family record
  SELECT jsonb_build_object(
    'id', f.id,
    'family_name', f.family_name,
    'created_at', f.created_at,
    'user_ref', f.user_ref
  ) INTO v_family
  FROM families f
  WHERE f.id = v_family_id;
  
  -- Return the family data
  RETURN v_family;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_family_for_admin(TEXT, TEXT) TO authenticated;

-- Create a function to set user context (if it doesn't already exist)
CREATE OR REPLACE FUNCTION set_user_context(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_email', user_email, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO authenticated;
