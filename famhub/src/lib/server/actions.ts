'use server'

import { createServerSupabaseClient } from './supabase';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Helper function to get the current user's email from the NextAuth session
async function getCurrentUserEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email;
}

/**
 * Server action to like or unlike a question
 */
export async function toggleQuestionLike(questionId: string) {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Get user email from NextAuth session
    const userEmail = await getCurrentUserEmail();
    
    if (!userEmail) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      console.error('User fetch error:', userError);
      return { success: false, error: 'Failed to fetch user data' };
    }
    
    // Check if the user has already liked this question
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('question_likes')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userData.id)
      .maybeSingle();
      
    if (likeCheckError) {
      console.error('Error checking existing like:', likeCheckError);
      return { success: false, error: 'Failed to check existing like' };
    }
    
    if (existingLike) {
      // Unlike: Remove the like
      const { error: unlikeError } = await supabase
        .from('question_likes')
        .delete()
        .eq('question_id', questionId)
        .eq('user_id', userData.id);
        
      if (unlikeError) {
        console.error('Error unliking question:', unlikeError);
        return { success: false, error: 'Failed to unlike question' };
      }
      
      // Update the like count in the questions table
      await supabase.rpc('decrement_question_like_count', { question_id: questionId });
      
      // Revalidate the questions page to reflect the changes
      revalidatePath('/questions');
      revalidatePath('/');
      
      return { success: true, action: 'unliked' };
    } else {
      // Like: Add a new like
      const { error: likeError } = await supabase
        .from('question_likes')
        .insert({
          question_id: questionId,
          user_id: userData.id
        });
        
      if (likeError) {
        console.error('Error liking question:', likeError);
        return { success: false, error: 'Failed to like question' };
      }
      
      // Update the like count in the questions table
      await supabase.rpc('increment_question_like_count', { question_id: questionId });
      
      // Revalidate the questions page to reflect the changes
      revalidatePath('/questions');
      revalidatePath('/');
      
      return { success: true, action: 'liked' };
    }
  } catch (error) {
    console.error('Error in toggleQuestionLike:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to add a comment to a question
 */
export async function addComment(questionId: string, content: string, parentId?: string) {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Get user email from NextAuth session
    const userEmail = await getCurrentUserEmail();
    
    if (!userEmail) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      console.error('User fetch error:', userError);
      return { success: false, error: 'Failed to fetch user data' };
    }
    
    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        question_id: questionId,
        user_id: userData.id,
        content,
        parent_id: parentId || null
      })
      .select()
      .single();
      
    if (commentError) {
      console.error('Error adding comment:', commentError);
      return { success: false, error: 'Failed to add comment' };
    }
    
    // Update the comment count in the questions table
    await supabase.rpc('increment_question_comment_count', { question_id: questionId });
    
    // Revalidate the questions page to reflect the changes
    revalidatePath('/questions');
    revalidatePath('/');
    
    return { success: true, comment };
  } catch (error) {
    console.error('Error in addComment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to create a new question
 */
export async function createQuestion(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Get user email from NextAuth session
    const userEmail = await getCurrentUserEmail();
    
    if (!userEmail) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, persona')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      console.error('User fetch error:', userError);
      return { success: false, error: 'Failed to fetch user data' };
    }
    
    // Extract form data
    const question = formData.get('question') as string;
    const type = formData.get('type') as string;
    const mediaType = formData.get('mediaType') as string;
    const file = formData.get('file') as File;
    
    // Validate required fields
    if (!question || !type) {
      return { success: false, error: 'Question text and type are required' };
    }
    
    // Create question data object
    const questionData: any = {
      user_id: userData.id,
      question,
      type,
      media_type: mediaType !== 'text' ? mediaType : null,
      like_count: 0,
      comment_count: 0
    };
    
    // Handle file upload if present
    if (file && file.size > 0) {
      // Determine folder path based on user role
      let folderPath;
      if (userData.persona === 'Parent') {
        folderPath = `public/uploads/${userData.last_name}/${userData.first_name}/`;
      } else {
        folderPath = `public/uploads/other/${userData.first_name}/`;
      }
      
      // Add timestamp to filename for uniqueness
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const fullPath = `${folderPath}${fileName}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('family-connect')
        .upload(fullPath, file);
        
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return { success: false, error: 'Failed to upload file' };
      }
      
      // Get public URL for the uploaded file
      const { data: urlData } = await supabase.storage
        .from('family-connect')
        .getPublicUrl(fullPath);
        
      // Add file metadata to question data
      questionData.file_url = urlData.publicUrl;
      questionData.folder_path = folderPath;
    }
    
    // Insert the question
    const { data: newQuestion, error: questionError } = await supabase
      .from('questions')
      .insert(questionData)
      .select()
      .single();
      
    if (questionError) {
      console.error('Error creating question:', questionError);
      return { success: false, error: 'Failed to create question' };
    }
    
    // Revalidate the questions page to reflect the changes
    revalidatePath('/questions');
    revalidatePath('/');
    
    return { success: true, question: newQuestion };
  } catch (error) {
    console.error('Error in createQuestion:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
