-- Create question_likes table
CREATE TABLE IF NOT EXISTS question_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(question_id, user_email)
);

-- Add RLS policies
ALTER TABLE question_likes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view likes
CREATE POLICY "Users can view likes"
  ON question_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to create their own likes
CREATE POLICY "Users can create their own likes"
  ON question_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = current_user);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own likes"
  ON question_likes
  FOR DELETE
  TO authenticated
  USING (user_email = current_user);
