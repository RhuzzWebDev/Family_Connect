-- Trigger function to sync Supabase Auth users to your users profile table
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    status,
    role,
    persona,
    bio,
    phone_number,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    '',         -- Placeholder, update after registration
    '',
    'Validating', -- Default status
    'Father',     -- Default role (change as needed)
    'Parent',     -- Default persona (change as needed)
    '',           -- bio
    '',           -- phone_number
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to Supabase Auth users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_auth_user();
