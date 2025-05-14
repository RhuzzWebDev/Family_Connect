-- Create a function to set the app.user_email setting
-- This is used by RLS policies to identify the current user
CREATE OR REPLACE FUNCTION set_app_user(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the user email in the app settings
  PERFORM set_config('app.user_email', p_email, false);
END;
$$;

-- Create a function to insert answers that works with our custom auth system
CREATE OR REPLACE FUNCTION insert_answer(
  p_question_id UUID,
  p_user_id UUID,
  p_answer_data JSONB,
  p_answer_format TEXT,
  p_question_type TEXT
)
RETURNS TABLE (
  id UUID,
  question_id UUID,
  user_id UUID,
  answer_data JSONB,
  answer_format TEXT,
  question_type TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Insert the answer
  INSERT INTO answers (
    question_id,
    user_id,
    answer_data,
    answer_format,
    question_type
  )
  VALUES (
    p_question_id,
    p_user_id,
    p_answer_data,
    p_answer_format,
    p_question_type
  )
  RETURNING * INTO v_result;
  
  -- Return the inserted row
  RETURN QUERY SELECT 
    v_result.id,
    v_result.question_id,
    v_result.user_id,
    v_result.answer_data,
    v_result.answer_format,
    v_result.question_type,
    v_result.created_at,
    v_result.updated_at;
END;
$$;
