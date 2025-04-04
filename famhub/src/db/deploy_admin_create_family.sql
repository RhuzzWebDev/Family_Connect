-- Create a function for admins to create families without RLS restrictions
CREATE OR REPLACE FUNCTION admin_create_family(
    p_family_name TEXT
) RETURNS TABLE (
    family_id UUID,
    success BOOLEAN
) SECURITY DEFINER AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Insert the family record
    INSERT INTO families (family_name)
    VALUES (p_family_name)
    RETURNING id INTO v_family_id;
    
    -- Return the family ID and success status
    RETURN QUERY SELECT v_family_id, TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Return NULL and FALSE if there was an error
    RETURN QUERY SELECT NULL::UUID, FALSE;
END;
$$ LANGUAGE plpgsql;
