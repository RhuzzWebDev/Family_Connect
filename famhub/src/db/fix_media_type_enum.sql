-- Fix the media_type enum to ensure it only contains the supported values
-- This script removes the 'document' value if it was added previously

-- First, check if the 'document' value exists in the enum
DO $$
DECLARE
    enum_values text[];
BEGIN
    -- Get the current enum values
    SELECT array_agg(enumlabel::text) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = 'media_type'::regtype;
    
    -- If 'document' is in the enum values, we need to recreate the enum
    IF 'document' = ANY(enum_values) THEN
        -- Create a temporary type with the correct values
        CREATE TYPE media_type_new AS ENUM ('image', 'video', 'audio');
        
        -- Update any existing rows with 'document' to use 'file' value to null
        UPDATE questions SET media_type = NULL WHERE media_type = 'document';
        
        -- Alter the column to use the new type
        ALTER TABLE questions 
        ALTER COLUMN media_type TYPE media_type_new 
        USING (media_type::text::media_type_new);
        
        -- Drop the old type
        DROP TYPE media_type;
        
        -- Rename the new type to the original name
        ALTER TYPE media_type_new RENAME TO media_type;
        
        RAISE NOTICE 'Successfully removed ''document'' value from media_type enum';
    ELSE
        RAISE NOTICE 'No ''document'' value found in media_type enum, no changes needed';
    END IF;
END $$;

-- Add a comment to the media_type enum to document the allowed values
COMMENT ON TYPE media_type IS 'Allowed values: image, video, audio. Document/file type is not supported.';
