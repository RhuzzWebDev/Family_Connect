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

-- Create a function for admins to get all families without RLS restrictions
CREATE OR REPLACE FUNCTION admin_get_all_families()
RETURNS TABLE (
    id UUID,
    family_name TEXT,
    created_at TIMESTAMPTZ,
    member_count BIGINT
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.family_name,
        f.created_at,
        COUNT(u.id)::BIGINT as member_count
    FROM 
        families f
    LEFT JOIN 
        users u ON f.id = u.family_id
    GROUP BY 
        f.id, f.family_name, f.created_at
    ORDER BY 
        f.created_at DESC;
END;
$$ LANGUAGE plpgsql;
