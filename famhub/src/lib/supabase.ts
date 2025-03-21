import { createClient } from '@supabase/supabase-js';

// Required environment variables check
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Database types
export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          file_url: string | null;
          like_count: number;
          comment_count: number;
          media_type: 'image' | 'video' | 'audio' | null;
          folder_path: string | null;
          created_at: string;
        };
        Insert: Omit<Question, 'id' | 'created_at'>;
        Update: Partial<Omit<Question, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
    };
  };
}

// Initialize Supabase client with types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Type definitions for our database schema
export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  status: 'Active' | 'Validating' | 'Not Active';
  role: string;
  persona: 'Parent' | 'Children';
  created_at: string;
};

// Base Question type from database schema
export type Question = Database['public']['Tables']['questions']['Row'];

// Type for questions with user data
export type QuestionWithUser = Omit<Question, 'user'> & {
  user: Pick<User, 'first_name' | 'last_name' | 'role' | 'persona'>;
};
