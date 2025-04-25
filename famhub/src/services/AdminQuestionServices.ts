import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Define types
export interface QuestionSet {
  id: string;
  title: string;
  description?: string;
  author_name?: string;
  resource_url?: string;
  donate_url?: string;
  cover_image?: string;
  created_at?: string;
  updated_at?: string;
  questionCount?: number;
}

export interface Question {
  id: string;
  user_id: string;
  question: string;
  file_url?: string;
  like_count?: number;
  comment_count?: number;
  media_type?: string;
  folder_path?: string;
  created_at?: string;
  question_set_id?: string;
}

export class AdminQuestionServices {
  private supabase: SupabaseClient;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }

  // Set the admin context for RLS policies
  private async setAdminContext(email: string) {
    await this.supabase.rpc('set_app_user', { p_email: email });
  }

  // Question Set Operations
  
  /**
   * Get all question sets with question count
   */
  async getAllQuestionSets(adminEmail: string): Promise<QuestionSet[]> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('question_sets')
        .select('*');
      
      if (error) throw error;
      
      // Get question counts for each question set
      const questionSetsWithCount = await Promise.all(
        data.map(async (set) => {
          const { count, error: countError } = await this.supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('question_set_id', set.id);
          
          if (countError) throw countError;
          
          return {
            ...set,
            questionCount: count || 0
          };
        })
      );
      
      return questionSetsWithCount;
    } catch (error) {
      console.error('Error getting question sets:', error);
      throw error;
    }
  }
  
  /**
   * Get a question set by ID with its questions
   */
  async getQuestionSetById(id: string, adminEmail: string): Promise<QuestionSet & { questions: Question[] }> {
    try {
      await this.setAdminContext(adminEmail);
      
      // Get the question set
      const { data: questionSet, error: questionSetError } = await this.supabase
        .from('question_sets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (questionSetError) throw questionSetError;
      
      // Get the questions for this question set
      const { data: questions, error: questionsError } = await this.supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', id);
      
      if (questionsError) throw questionsError;
      
      return {
        ...questionSet,
        questionCount: questions.length,
        questions: questions
      };
    } catch (error) {
      console.error(`Error getting question set with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new question set
   */
  async createQuestionSet(questionSet: Partial<QuestionSet>, adminEmail: string): Promise<QuestionSet> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('question_sets')
        .insert([
          {
            title: questionSet.title,
            description: questionSet.description,
            author_name: questionSet.author_name,
            resource_url: questionSet.resource_url,
            donate_url: questionSet.donate_url,
            cover_image: questionSet.cover_image
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        questionCount: 0
      };
    } catch (error) {
      console.error('Error creating question set:', error);
      throw error;
    }
  }
  
  /**
   * Update a question set
   */
  async updateQuestionSet(id: string, questionSet: Partial<QuestionSet>, adminEmail: string): Promise<QuestionSet> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('question_sets')
        .update({
          title: questionSet.title,
          description: questionSet.description,
          author_name: questionSet.author_name,
          resource_url: questionSet.resource_url,
          donate_url: questionSet.donate_url,
          cover_image: questionSet.cover_image
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Get question count
      const { count, error: countError } = await this.supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('question_set_id', id);
      
      if (countError) throw countError;
      
      return {
        ...data,
        questionCount: count || 0
      };
    } catch (error) {
      console.error(`Error updating question set with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a question set
   */
  async deleteQuestionSet(id: string, adminEmail: string): Promise<void> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { error } = await this.supabase
        .from('question_sets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting question set with ID ${id}:`, error);
      throw error;
    }
  }
  
  // Question Operations
  
  /**
   * Get all questions
   */
  async getAllQuestions(adminEmail: string): Promise<Question[]> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .select('*');
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting questions:', error);
      throw error;
    }
  }
  
  /**
   * Get questions by question set ID
   */
  async getQuestionsByQuestionSetId(questionSetId: string, adminEmail: string): Promise<Question[]> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', questionSetId);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error getting questions for question set with ID ${questionSetId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new question
   */
  async createQuestion(question: Partial<Question>, adminEmail: string): Promise<Question> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .insert([
          {
            user_id: question.user_id,
            question: question.question,
            file_url: question.file_url,
            media_type: question.media_type,
            folder_path: question.folder_path,
            question_set_id: question.question_set_id
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }
  
  /**
   * Update a question
   */
  async updateQuestion(id: string, question: Partial<Question>, adminEmail: string): Promise<Question> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .update({
          question: question.question,
          file_url: question.file_url,
          media_type: question.media_type,
          folder_path: question.folder_path,
          question_set_id: question.question_set_id
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error updating question with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a question
   */
  async deleteQuestion(id: string, adminEmail: string): Promise<void> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { error } = await this.supabase
        .from('questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting question with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Assign a question to a question set
   */
  async assignQuestionToQuestionSet(questionId: string, questionSetId: string, adminEmail: string): Promise<Question> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .update({ question_set_id: questionSetId })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error assigning question ${questionId} to question set ${questionSetId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a question from a question set
   */
  async removeQuestionFromQuestionSet(questionId: string, adminEmail: string): Promise<Question> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .update({ question_set_id: null })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error removing question ${questionId} from question set:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const adminQuestionServices = new AdminQuestionServices();