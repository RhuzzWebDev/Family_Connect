import { supabase } from '@/lib/supabase'
import { User, Question, QuestionWithUser } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

type SupabaseQuestionResponse = {
  id: string
  question: string
  file_url?: string
  like_count: number
  comment_count: number
  media_type?: 'image' | 'video' | 'audio'
  folder_path?: string
  created_at: string
  user: Array<{
    id: string
    first_name: string
    last_name: string
  }>
}

export class SupabaseService {
  // User methods
  static async createUser(userData: Omit<User, 'id' | 'created_at'>) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        password: hashedPassword
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUserByEmail(email: string) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }

  static async verifyUser(email: string, password: string) {
    const user = await this.getUserByEmail(email)
    if (!user) return null

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return null

    return user
  }

  // Question methods
  static async createQuestion(questionData: Omit<Question, 'id' | 'created_at' | 'like_count' | 'comment_count'>) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('questions')
      .insert({
        ...questionData,
        like_count: 0,
        comment_count: 0
      })
      .select(`
        id,
        question,
        file_url,
        like_count,
        comment_count,
        media_type,
        folder_path,
        created_at,
        user:users!inner(
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) throw error
    const response = data as SupabaseQuestionResponse
    if (!response || !response.user?.[0]) throw new Error('Failed to create question with user data')

    return {
      id: response.id,
      question: response.question,
      file_url: response.file_url,
      like_count: response.like_count,
      comment_count: response.comment_count,
      media_type: response.media_type,
      folder_path: response.folder_path,
      created_at: response.created_at,
      user: response.user[0]
    } as QuestionWithUser
  }

  static async getQuestions(): Promise<QuestionWithUser[]> {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        question,
        file_url,
        like_count,
        comment_count,
        media_type,
        folder_path,
        created_at,
        user:users!inner(
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data) return []

    const response = data as SupabaseQuestionResponse[]
    return response.map(question => ({
      id: question.id,
      question: question.question,
      file_url: question.file_url,
      like_count: question.like_count,
      comment_count: question.comment_count,
      media_type: question.media_type,
      folder_path: question.folder_path,
      created_at: question.created_at,
      user: question.user[0]
    })) as QuestionWithUser[]
  }

  static async updateQuestionLikes(questionId: string, increment: boolean) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: currentQuestion, error: fetchError } = await supabase
      .from('questions')
      .select('like_count')
      .eq('id', questionId)
      .single()

    if (fetchError) throw fetchError

    const newLikeCount = increment 
      ? (currentQuestion?.like_count || 0) + 1 
      : Math.max(0, (currentQuestion?.like_count || 0) - 1)

    const { data, error } = await supabase
      .from('questions')
      .update({ like_count: newLikeCount })
      .eq('id', questionId)
      .select(`
        id,
        question,
        file_url,
        like_count,
        comment_count,
        media_type,
        folder_path,
        created_at,
        user:users!inner(
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) throw error
    const response = data as SupabaseQuestionResponse
    if (!response || !response.user?.[0]) throw new Error('Failed to update question')

    return {
      id: response.id,
      question: response.question,
      file_url: response.file_url,
      like_count: response.like_count,
      comment_count: response.comment_count,
      media_type: response.media_type,
      folder_path: response.folder_path,
      created_at: response.created_at,
      user: response.user[0]
    } as QuestionWithUser
  }

  static async updateQuestionComments(questionId: string, increment: boolean) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: currentQuestion, error: fetchError } = await supabase
      .from('questions')
      .select('comment_count')
      .eq('id', questionId)
      .single()

    if (fetchError) throw fetchError

    const newCommentCount = increment 
      ? (currentQuestion?.comment_count || 0) + 1 
      : Math.max(0, (currentQuestion?.comment_count || 0) - 1)

    const { data, error } = await supabase
      .from('questions')
      .update({ comment_count: newCommentCount })
      .eq('id', questionId)
      .select(`
        id,
        question,
        file_url,
        like_count,
        comment_count,
        media_type,
        folder_path,
        created_at,
        user:users!inner(
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) throw error
    const response = data as SupabaseQuestionResponse
    if (!response || !response.user?.[0]) throw new Error('Failed to update question')

    return {
      id: response.id,
      question: response.question,
      file_url: response.file_url,
      like_count: response.like_count,
      comment_count: response.comment_count,
      media_type: response.media_type,
      folder_path: response.folder_path,
      created_at: response.created_at,
      user: response.user[0]
    } as QuestionWithUser
  }
}
