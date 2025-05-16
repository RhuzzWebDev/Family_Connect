import { supabase } from '@/lib/supabaseClient';

export interface Answer {
  id: string;
  question_id: string;
  user_id: string;
  answer_format: 'text' | 'number' | 'array' | 'json';
  answer_data: any;
  question_type: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AnswerInput {
  question_id: string;
  answer_format: 'text' | 'number' | 'array' | 'json';
  answer_data: any;
  question_type: string;
  metadata?: Record<string, any>;
}

export const userAnswerQuestions = {
  // Submit a new answer
  async submitAnswer(answer: AnswerInput): Promise<{ data: Answer | null; error: Error | null }> {
    try {
      // Get user email from session storage
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User not logged in');
      }
      
      // Set user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (userError || !userData) {
        throw new Error('User not found');
      }
      
      // Format answer data based on answer format
      let formattedAnswerData = answer.answer_data;
      if (answer.answer_format === 'array' && typeof formattedAnswerData === 'string') {
        try {
          if (formattedAnswerData.startsWith('[') || formattedAnswerData.startsWith('{')) {
            formattedAnswerData = JSON.parse(formattedAnswerData);
          } else {
            formattedAnswerData = [formattedAnswerData]; // Wrap in array
          }
        } catch (e) {
          console.warn('Could not parse array data, wrapping in array:', e);
          formattedAnswerData = [formattedAnswerData]; // Wrap in array as fallback
        }
      } else if (answer.answer_format === 'json' && typeof formattedAnswerData === 'string') {
        try {
          if (formattedAnswerData.startsWith('[') || formattedAnswerData.startsWith('{')) {
            formattedAnswerData = JSON.parse(formattedAnswerData);
          } else {
            formattedAnswerData = { value: formattedAnswerData }; // Wrap in object
          }
        } catch (e) {
          console.warn('Could not parse JSON data, wrapping in object:', e);
          formattedAnswerData = { value: formattedAnswerData }; // Wrap in object as fallback
        }
      } else if (answer.answer_format === 'number' && typeof formattedAnswerData === 'string') {
        formattedAnswerData = Number(formattedAnswerData);
      }
      
      // Insert directly with RLS bypassed
      const { data, error } = await supabase
        .from('answers')
        .insert({
          question_id: answer.question_id,
          user_id: userData.id,
          answer_data: formattedAnswerData,
          answer_format: answer.answer_format,
          question_type: answer.question_type
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Answer submission failed:', error);
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return { data: null, error: error as Error };
    }
  },

  // Get user's answer for a specific question
  async getUserAnswer(questionId: string): Promise<{ data: Answer | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', questionId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting user answer:', error);
      return { data: null, error: error as Error };
    }
  },

  // Update an existing answer
  async updateAnswer(answerId: string, answer: Partial<AnswerInput>): Promise<{ data: Answer | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .update(answer)
        .eq('id', answerId)
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating answer:', error);
      return { data: null, error: error as Error };
    }
  },

  // Delete an answer
  async deleteAnswer(answerId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', answerId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting answer:', error);
      return { error: error as Error };
    }
  },

  // Get all answers for a question set
  async getQuestionSetAnswers(questionIds: string[]): Promise<{ data: Answer[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .in('question_id', questionIds);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting question set answers:', error);
      return { data: [], error: error as Error };
    }
  },

  // Format answer based on question type
  formatAnswer(questionType: string, answer: any): { answer_format: 'text' | 'number' | 'array' | 'json'; answer_data: any } {
    switch (questionType) {
      case 'multiple-choice':
      case 'image-choice':
      case 'ranking':
        return {
          answer_format: 'array',
          answer_data: Array.isArray(answer) ? answer : [answer]
        };
      case 'rating-scale':
      case 'likert-scale':
      case 'slider':
        return {
          answer_format: 'number',
          answer_data: Number(answer)
        };
      case 'matrix':
        return {
          answer_format: 'json',
          answer_data: typeof answer === 'object' ? answer : { value: answer }
        };
      case 'demographic':
        // Demographic questions are treated as text selections, similar to dropdown
        return {
          answer_format: 'text',
          answer_data: String(answer)
        };
      case 'dropdown':
      case 'open-ended':
      case 'dichotomous':
        return {
          answer_format: 'text',
          answer_data: String(answer)
        };
      default:
        return {
          answer_format: 'text',
          answer_data: String(answer)
        };
    }
  }
};
