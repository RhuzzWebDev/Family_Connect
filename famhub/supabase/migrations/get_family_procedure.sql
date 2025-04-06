-- Create a stored procedure to get family data by ID with admin privileges
-- This function will run with security definer permissions, bypassing RLS
CREATE OR REPLACE FUNCTION get_family_by_id(
  p_family_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_family JSONB;
BEGIN
  -- Get the family record
  SELECT jsonb_build_object(
    'id', f.id,
    'family_name', f.family_name,
    'created_at', f.created_at,
    'user_ref', f.user_ref
  ) INTO v_family
  FROM families f
  WHERE f.id = p_family_id;
  
  -- Return the family data
  RETURN v_family;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_family_by_id(UUID) TO authenticated;
