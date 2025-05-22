import { createServerSupabaseClient } from './supabase';
import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Fetches questions with user info and question set data
 * This is a server-side function that uses Next.js cache
 */
export const getQuestions = cache(async () => {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Get user email from NextAuth session
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    // If no user is authenticated, return empty array
    if (!userEmail) {
      console.log('No authenticated user, returning empty questions array');
      return [];
    }
    
    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, family_id')
      .eq('email', userEmail)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return [];
    }

    if (!userData || !userData.family_id) {
      console.error('Family ID not found');
      return [];
    }

    // Get all users in the same family
    const { data: familyUsers, error: familyError } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', userData.family_id);

    if (familyError) {
      throw new Error('Failed to fetch family members');
    }

    const familyUserIds = familyUsers.map(user => user.id);

    // Fetch questions with user info and question set data
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        user:users!questions_user_id_fkey (
          first_name,
          last_name,
          role,
          persona,
          family_id
        ),
        question_set:question_sets(*)
      `)
      .in('user_id', familyUserIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch questions');
    }
    
    // Fetch the current user's likes
    const { data: userLikes, error: likesError } = await supabase
      .from('question_likes')
      .select('question_id')
      .eq('user_id', userData.id);
      
    if (likesError) {
      console.error('Error fetching user likes:', likesError);
      // Continue anyway, just won't show liked status
    }
    
    // Create a set of liked question IDs for faster lookup
    const likedQuestionIds = new Set(userLikes?.map(like => like.question_id) || []);
    
    // Add has_liked property to each question
    const questionsWithLikes = (data || []).map(question => ({
      ...question,
      has_liked: likedQuestionIds.has(question.id)
    }));
    
    return questionsWithLikes;
  } catch (error) {
    console.error('Error in getQuestions:', error);
    return [];
  }
});

/**
 * Fetches question sets with question counts
 * This is a server-side function that uses Next.js cache
 */
export const getQuestionSets = cache(async () => {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Get all question sets with their questions
    const { data, error } = await supabase
      .from('question_sets')
      .select(`
        *,
        questions!question_set_id(id)
      `);
    
    if (error) {
      console.error('Failed to fetch question sets:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Process the data to include question counts
    const questionSetsWithCounts = data.map(set => {
      // The questions field will be an array of question objects
      const questionCount = Array.isArray(set.questions) ? set.questions.length : 0;
      
      // Create a new object without the questions array (we just need the count)
      const { questions, ...setWithoutQuestions } = set;
      
      return {
        ...setWithoutQuestions,
        question_count: questionCount
      };
    });
    
    return questionSetsWithCounts;
  } catch (error) {
    console.error('Error in getQuestionSets:', error);
    return [];
  }
});

/**
 * Fetches a single question with all its details
 */
export const getQuestionById = cache(async (questionId: string) => {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        user:users!questions_user_id_fkey (
          first_name,
          last_name,
          role,
          persona,
          family_id
        ),
        question_set:question_sets(*)
      `)
      .eq('id', questionId)
      .single();
    
    if (error) {
      throw new Error('Failed to fetch question');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching question ${questionId}:`, error);
    return null;
  }
});

/**
 * Fetches type-specific data for a question
 */
export const getQuestionTypeData = cache(async (questionId: string, questionType: string) => {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Determine which table to query based on question type
    let tableName = '';
    switch (questionType) {
      case 'multiple-choice':
      case 'dropdown':
      case 'likert-scale':
        tableName = `question_${questionType.replace('-', '_')}`;
        break;
      case 'rating-scale':
        tableName = 'question_rating_scale';
        break;
      case 'matrix':
        tableName = 'question_matrix';
        break;
      case 'open-ended':
        tableName = 'question_open_ended';
        break;
      case 'image-choice':
        tableName = 'question_image_choice';
        break;
      case 'slider':
        tableName = 'question_slider';
        break;
      case 'dichotomous':
        tableName = 'question_dichotomous';
        break;
      case 'ranking':
        tableName = 'question_ranking';
        break;
      case 'demographic':
        tableName = 'question_demographic';
        break;
      default:
        return null;
    }
    
    if (tableName) {
      // Special handling for demographic questions
      if (questionType === 'demographic') {
        // First, fetch the demographic question data
        const { data: demographicData, error: demographicError } = await supabase
          .from('question_demographic')
          .select('*')
          .eq('question_id', questionId)
          .single();
          
        if (demographicError) {
          console.error('Error fetching demographic data:', demographicError);
          return null;
        }
        
        if (demographicData) {
          // Then fetch the demographic options using the question_demographic_id
          const { data: optionsData, error: optionsError } = await supabase
            .from('question_demographic_option')
            .select('*')
            .eq('question_demographic_id', demographicData.id)
            .order('option_order', { ascending: true });
            
          if (optionsError) {
            console.error('Error fetching demographic options:', optionsError);
            return null;
          }
          
          // Combine the demographic data with its options
          return {
            ...demographicData,
            options: optionsData || []
          };
        }
      } else {
        // Standard handling for other question types
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('question_id', questionId);
          
        if (error) {
          console.error(`Error fetching ${tableName} data:`, error);
          return null;
        }
        
        return data;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching type data for question ${questionId}:`, error);
    return null;
  }
});

// We're now using the imported nextCookies function directly
// No need for this helper function anymore
