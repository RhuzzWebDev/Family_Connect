-- Update the question_type enum to include 'demographic'
-- Fixed syntax for PostgreSQL

-- Check if demographic already exists in the enum
DO $$
DECLARE
    type_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'demographic'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
    ) INTO type_exists;

    IF NOT type_exists THEN
        -- Add demographic to the enum with the correct syntax
        -- PostgreSQL syntax: ALTER TYPE enum_name ADD VALUE 'new_value';
        ALTER TYPE question_type ADD VALUE 'demographic';
        RAISE NOTICE 'Added demographic to question_type enum';
    ELSE
        RAISE NOTICE 'demographic already exists in question_type enum';
    END IF;
END $$;

-- Alternative method if needed
DO $$
BEGIN
    -- Try a different approach if the above fails
    BEGIN
        -- This is a more direct approach
        EXECUTE 'ALTER TYPE question_type ADD VALUE ''demographic'' AFTER ''ranking'';';
        RAISE NOTICE 'Added demographic to question_type enum using EXECUTE';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Note: Alternative method failed: %', SQLERRM;
    END;
END $$;

-- Method 3: Recreate the enum if needed (last resort)
-- This is commented out because it's a more drastic approach
-- Only uncomment and use if the above methods fail
/*
DO $$
BEGIN
    -- Create a temporary table to hold existing data
    CREATE TEMP TABLE temp_questions AS SELECT * FROM questions;
    
    -- Drop the existing table and enum
    DROP TABLE IF EXISTS questions CASCADE;
    DROP TYPE IF EXISTS question_type CASCADE;
    
    -- Recreate the enum with all values including demographic
    CREATE TYPE question_type AS ENUM (
        'multiple-choice',
        'rating-scale',
        'likert-scale',
        'matrix',
        'dropdown',
        'open-ended',
        'image-choice',
        'slider',
        'dichotomous',
        'ranking',
        'demographic'
    );
    
    -- Recreate the questions table
    CREATE TABLE questions (
        -- Add your columns here based on your schema
        -- ...
        type question_type DEFAULT 'open-ended'
    );
    
    -- Restore data (except for the new enum value)
    INSERT INTO questions
    SELECT * FROM temp_questions;
    
    -- Drop the temporary table
    DROP TABLE temp_questions;
    
    RAISE NOTICE 'Recreated question_type enum with demographic value';
END $$;
*/

-- Verify the enum values after running the script
DO $$
DECLARE
    enum_values TEXT;
BEGIN
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type');
    
    RAISE NOTICE 'Current question_type enum values: %', enum_values;
END $$;
