-- Script to fix the questions_type_check constraint
-- This addresses the "violates check constraint" error

-- First, check the current constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'questions'::regclass
AND conname = 'questions_type_check';

-- Drop the existing constraint
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;

-- Recreate the constraint with all enum values including 'demographic'
ALTER TABLE questions ADD CONSTRAINT questions_type_check 
CHECK (type = ANY (ARRAY[
  'multiple-choice'::question_type, 
  'rating-scale'::question_type, 
  'likert-scale'::question_type, 
  'matrix'::question_type, 
  'dropdown'::question_type, 
  'open-ended'::question_type, 
  'image-choice'::question_type, 
  'slider'::question_type, 
  'dichotomous'::question_type, 
  'ranking'::question_type,
  'demographic'::question_type
]));

-- Verify the updated constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'questions'::regclass
AND conname = 'questions_type_check';
