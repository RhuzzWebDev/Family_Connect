import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type User = {
  id: string
  first_name: string
  last_name: string
  email: string
  password: string
  status: 'Active' | 'Validating' | 'Not Active'
  role: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister'
  persona: 'Parent' | 'Children'
  created_at: string
}

export type Question = {
  id: string
  user_id: string
  question: string
  file_url?: string
  like_count: number
  comment_count: number
  media_type?: 'image' | 'video' | 'audio'
  folder_path?: string
  created_at: string
}

export type QuestionWithUser = Omit<Question, 'user_id'> & {
  user: {
    id: string
    first_name: string
    last_name: string
  }
}
