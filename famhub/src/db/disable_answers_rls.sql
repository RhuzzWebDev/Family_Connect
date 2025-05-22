-- Temporarily disable RLS on the answers table to allow all operations
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS but allow all operations:
-- DROP ALL POLICIES ON answers;
-- 
-- CREATE POLICY "Allow all operations" ON answers
--     FOR ALL USING (true);
