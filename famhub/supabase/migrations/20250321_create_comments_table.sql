-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    like_count INTEGER DEFAULT 0,
    file_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
    folder_path TEXT,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    CHECK (content IS NOT NULL OR file_url IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_question_id_idx ON public.comments(question_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.comments;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.comments;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.comments;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.comments;
EXCEPTION
    WHEN undefined_object THEN
END $$;

-- Create policies for comments table
CREATE POLICY "Enable read access for all users"
    ON public.comments
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users only"
    ON public.comments
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
    ON public.comments
    FOR UPDATE
    TO public
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE POLICY "Enable delete for users based on user_id"
    ON public.comments
    FOR DELETE
    TO public
    USING (user_id = current_user_id());

-- Create storage bucket for comment attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comments', 'comments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ 
BEGIN
    -- Check if policy doesn't exist before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access"
            ON storage.objects
            FOR SELECT
            USING (bucket_id = 'comments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads'
    ) THEN
        CREATE POLICY "Allow authenticated uploads"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'comments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated deletes'
    ) THEN
        CREATE POLICY "Allow authenticated deletes"
            ON storage.objects
            FOR DELETE
            TO authenticated
            USING (bucket_id = 'comments');
    END IF;
END $$;
