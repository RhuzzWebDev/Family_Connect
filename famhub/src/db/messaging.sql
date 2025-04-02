-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create conversations table first
CREATE TABLE conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  last_message text,
  last_message_time timestamptz DEFAULT now(),
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create conversation participants table
CREATE TABLE conversation_participants (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  unread_count int DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table last since it references conversations
CREATE TABLE messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "View conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = (SELECT id FROM users WHERE email = current_setting('app.user_email', TRUE))
    )
  );

CREATE POLICY "Create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "View participants" ON conversation_participants
  FOR SELECT USING (true);

CREATE POLICY "Add participants" ON conversation_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "View messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = (SELECT id FROM users WHERE email = current_setting('app.user_email', TRUE))
    )
  );

CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = (SELECT id FROM users WHERE email = current_setting('app.user_email', TRUE))
    )
  );

-- Helper function to set user context (needed for RLS)
CREATE OR REPLACE FUNCTION set_user_context(user_email text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_email', user_email, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Create a test conversation
INSERT INTO conversations (name, created_by)
VALUES ('Test Group', (SELECT id FROM users LIMIT 1));

-- Example: Add participants
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  (SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1),
  id
FROM users
LIMIT 3;

-- Example: Send a test message
INSERT INTO messages (conversation_id, sender_id, content)
VALUES (
  (SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Hello everyone!'
);
