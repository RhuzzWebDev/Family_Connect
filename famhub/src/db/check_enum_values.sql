-- Script to check the exact values in the question_type enum
-- This will help us debug the constraint error

-- Get all values from the question_type enum
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
ORDER BY enumsortorder;

-- Check the constraint definition
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'questions_type_check';

-- Check if any existing questions have the demographic type
SELECT id, type
FROM questions
WHERE type::text = 'demographic';
