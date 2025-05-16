-- Example of inserting a demographic question

-- 1. First, insert the base question into the questions table
INSERT INTO questions (
    user_id,
    question,
    type,
    media_type,
    file_url,
    folder_path,
    like_count,
    comment_count
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    'What is your age group?',
    'demographic',
    NULL, -- No media for this question
    NULL, -- No file URL
    NULL, -- No folder path
    0, -- Initial like count
    0  -- Initial comment count
) RETURNING id INTO @question_id;

-- 2. Insert the demographic question details
INSERT INTO question_demographic (
    question_id,
    field_type,
    is_required,
    has_other_option
) VALUES (
    @question_id, -- Use the returned question_id
    'age',
    TRUE, -- This field is required
    TRUE  -- Include "Other" option
) RETURNING id INTO @demographic_id;

-- 3. Insert the demographic options
INSERT INTO question_demographic_option (
    demographic_id,
    option_text,
    option_order
) VALUES
    (@demographic_id, 'Under 18', 1),
    (@demographic_id, '18-24', 2),
    (@demographic_id, '25-34', 3),
    (@demographic_id, '35-44', 4),
    (@demographic_id, '45-54', 5),
    (@demographic_id, '55-64', 6),
    (@demographic_id, '65 or older', 7),
    (@demographic_id, 'Prefer not to say', 8);

-- Example of a gender demographic question
INSERT INTO questions (
    user_id,
    question,
    type,
    media_type,
    file_url,
    folder_path,
    like_count,
    comment_count
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    'What is your gender?',
    'demographic',
    NULL, -- No media for this question
    NULL, -- No file URL
    NULL, -- No folder path
    0, -- Initial like count
    0  -- Initial comment count
) RETURNING id INTO @question_id;

INSERT INTO question_demographic (
    question_id,
    field_type,
    is_required,
    has_other_option
) VALUES (
    @question_id,
    'gender',
    TRUE,
    TRUE
) RETURNING id INTO @demographic_id;

INSERT INTO question_demographic_option (
    demographic_id,
    option_text,
    option_order
) VALUES
    (@demographic_id, 'Male', 1),
    (@demographic_id, 'Female', 2),
    (@demographic_id, 'Non-binary', 3),
    (@demographic_id, 'Prefer to self-describe', 4),
    (@demographic_id, 'Prefer not to say', 5);

-- Example of an education demographic question
INSERT INTO questions (
    user_id,
    question,
    type,
    media_type,
    file_url,
    folder_path,
    like_count,
    comment_count
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    'What is your highest level of education?',
    'demographic',
    NULL, -- No media for this question
    NULL, -- No file URL
    NULL, -- No folder path
    0, -- Initial like count
    0  -- Initial comment count
) RETURNING id INTO @question_id;

INSERT INTO question_demographic (
    question_id,
    field_type,
    is_required,
    has_other_option
) VALUES (
    @question_id,
    'education',
    TRUE,
    FALSE
) RETURNING id INTO @demographic_id;

INSERT INTO question_demographic_option (
    demographic_id,
    option_text,
    option_order
) VALUES
    (@demographic_id, 'Less than high school', 1),
    (@demographic_id, 'High school graduate', 2),
    (@demographic_id, 'Some college', 3),
    (@demographic_id, 'Associate degree', 4),
    (@demographic_id, 'Bachelor's degree', 5),
    (@demographic_id, 'Master's degree', 6),
    (@demographic_id, 'Professional degree', 7),
    (@demographic_id, 'Doctorate', 8),
    (@demographic_id, 'Prefer not to say', 9);
