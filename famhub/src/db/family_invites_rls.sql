-- Enable Row Level Security for family_invites
aLTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert if created_by matches their user id
CREATE POLICY "Users can insert their own invites" ON family_invites
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = current_setting('app.user_email', true))
  );

-- Allow creators or admins to update their invites
CREATE POLICY "Users or admins can update invites" ON family_invites
  FOR UPDATE
  USING (
    created_by = (SELECT id FROM users WHERE email = current_setting('app.user_email', true))
    OR current_setting('app.is_admin', true)::boolean = true
  );

-- Allow creators or admins to delete invites
CREATE POLICY "Users or admins can delete invites" ON family_invites
  FOR DELETE
  USING (
    created_by = (SELECT id FROM users WHERE email = current_setting('app.user_email', true))
    OR current_setting('app.is_admin', true)::boolean = true
  );

-- Allow anyone to select (read) invites (optional, restrict as needed)
CREATE POLICY "Anyone can view invites" ON family_invites
  FOR SELECT
  USING (true);



-- Create family_invites table for invite links
CREATE TABLE family_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE
);