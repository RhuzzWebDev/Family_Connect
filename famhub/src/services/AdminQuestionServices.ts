import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Define question type enum
export enum QuestionTypeEnum {
  MULTIPLE_CHOICE = 'multiple-choice',
  RATING_SCALE = 'rating-scale',
  LIKERT_SCALE = 'likert-scale',
  MATRIX = 'matrix',
  DROPDOWN = 'dropdown',
  OPEN_ENDED = 'open-ended',
  IMAGE_CHOICE = 'image-choice',
  SLIDER = 'slider',
  DICHOTOMOUS = 'dichotomous',
  RANKING = 'ranking'
}

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
  media_type?: 'image' | 'video' | 'audio';
  folder_path?: string;
  created_at?: string;
  question_set_id?: string;
  type: QuestionTypeEnum;
}

export interface QuestionOption {
  id?: string;
  question_id: string;
  option_text: string;
  option_order: number;
  created_at?: string;
}

export interface QuestionMatrix {
  id?: string;
  question_id: string;
  is_row: boolean;
  content: string;
  item_order: number;
  created_at?: string;
}

export interface QuestionScale {
  id?: string;
  question_id: string;
  min_value: number;
  max_value: number;
  step_value?: number;
  default_value?: number;
  created_at?: string;
}

export interface QuestionImageOption {
  id?: string;
  question_id: string;
  option_text: string;
  image_url: string;
  option_order: number;
  created_at?: string;
}

// Combined question data with all possible type-specific data
export interface OpenEndedSettings {
  answer_format: string;
  character_limit?: number;
}

export interface QuestionData extends Question {
  options?: QuestionOption[];
  matrix?: {
    rows: QuestionMatrix[];
    columns: QuestionMatrix[];
  };
  scale?: QuestionScale;
  imageOptions?: QuestionImageOption[];
  openEndedSettings?: OpenEndedSettings;
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
  private async setAdminContext(email: string): Promise<void> {
    try {
      // Using the correct function name and parameter from schema.sql
      const { error } = await this.supabase.rpc('set_app_user', { p_email: email });
      
      if (error) {
        console.error('Error setting admin context:', error);
        throw error;
      }
      
      // For debugging
      console.log(`Admin context set for user: ${email}`);
    } catch (error) {
      console.error('Failed to set admin context:', error);
      throw error;
    }
  }
  
  /**
   * Get or create a default admin user ID for questions
   * This method ensures we have a consistent admin user for all admin-created questions
   */
  async getAdminUserId(adminEmail: string): Promise<string> {
    try {
      await this.setAdminContext(adminEmail);
      
      // Define the default admin user email
      const defaultAdminEmail = 'admin@famhub.com';
      
      // Try to find the default admin user
      const { data: adminUsers, error: findError } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', defaultAdminEmail)
        .limit(1);
      
      if (findError) throw findError;
      
      // If we found the admin user, return their ID
      if (adminUsers && adminUsers.length > 0) {
        return adminUsers[0].id;
      }
      
      // If the admin user doesn't exist, create it
      const { data: newAdmin, error: createError } = await this.supabase
        .from('users')
        .insert([
          {
            first_name: 'System',
            last_name: 'Admin',
            email: defaultAdminEmail,
            password: 'adminPassword123', // This would normally be hashed
            status: 'Active',
            role: 'Father', // Default role
            persona: 'Parent' // Default persona
          }
        ])
        .select()
        .single();
      
      if (createError) throw createError;
      
      return newAdmin.id;
    } catch (error) {
      console.error('Error getting admin user ID:', error);
      throw error;
    }
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
   * Get a question set by ID with its questions and all related data
   */
  async getQuestionSetById(id: string, adminEmail: string): Promise<QuestionSet & { questions: QuestionData[] }> {
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
      
      // Get all related data for each question based on its type
      const questionsWithData = await Promise.all(
        questions.map(async (question) => {
          return await this.getQuestionWithTypeData(question.id, adminEmail);
        })
      );
      
      return {
        ...questionSet,
        questionCount: questions.length,
        questions: questionsWithData
      };
    } catch (error) {
      console.error(`Error getting question set with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a question with all its type-specific data
   */
  async getQuestionWithTypeData(questionId: string, adminEmail: string): Promise<QuestionData> {
    try {
      // Make sure to set admin context before each database operation
      await this.setAdminContext(adminEmail);
      
      console.log(`Fetching question data for ID: ${questionId} with admin email: ${adminEmail}`);
      
      // Get the basic question data
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();
      
      if (questionError) throw questionError;
      
      // Initialize the question data object
      const questionData: QuestionData = {
        ...question
      };
      
      // Get type-specific data based on question type
      switch (question.type) {
        case QuestionTypeEnum.MULTIPLE_CHOICE:
  // Get multiple choice options
  const { data: multipleChoiceOptions, error: multipleChoiceError } = await this.supabase
    .from('question_multiple_choice')
    .select('*')
    .eq('question_id', questionId)
    .order('option_order', { ascending: true });
  
  console.log('Fetched MULTIPLE_CHOICE options:', multipleChoiceOptions);
  if (multipleChoiceError) throw multipleChoiceError;
  questionData.options = multipleChoiceOptions;
  break;
          
        case QuestionTypeEnum.DROPDOWN:
  // Get dropdown options
  const { data: dropdownOptions, error: dropdownError } = await this.supabase
    .from('question_dropdown')
    .select('*')
    .eq('question_id', questionId)
    .order('option_order', { ascending: true });
  
  console.log('Fetched DROPDOWN options:', dropdownOptions);
  if (dropdownError) throw dropdownError;
  questionData.options = dropdownOptions;
  break;
          
        case QuestionTypeEnum.LIKERT_SCALE:
  // Get likert scale options
  const { data: likertOptions, error: likertError } = await this.supabase
    .from('question_likert_scale')
    .select('*')
    .eq('question_id', questionId)
    .order('option_order', { ascending: true });
  
  console.log('Fetched LIKERT_SCALE options:', likertOptions);
  if (likertError) throw likertError;
  questionData.options = likertOptions;
  break;
          
        case QuestionTypeEnum.MATRIX:
          // Get matrix rows and columns
          const { data: matrixItems, error: matrixError } = await this.supabase
            .from('question_matrix')
            .select('*')
            .eq('question_id', questionId)
            .order('item_order', { ascending: true });
          
          if (matrixError) throw matrixError;
          
          // Separate rows and columns
          const rows = matrixItems.filter(item => item.is_row);
          const columns = matrixItems.filter(item => !item.is_row);
          
          questionData.matrix = {
            rows,
            columns
          };
          break;
          
        case QuestionTypeEnum.OPEN_ENDED:
          // Get open-ended question settings
          const { data: openEndedData, error: openEndedError } = await this.supabase
            .from('question_open_ended')
            .select('*')
            .eq('question_id', questionId)
            .single();
          
          if (openEndedError && openEndedError.code !== 'PGRST116') throw openEndedError;
          questionData.openEndedSettings = openEndedData || { answer_format: 'text' };
          break;
          
        case QuestionTypeEnum.RATING_SCALE:
          // Make sure to set admin context again before fetching rating scale data
          if (adminEmail) {
            await this.setAdminContext(adminEmail);
          }
          
          console.log(`Fetching rating scale data for question ID: ${questionId}`);
          // Get rating scale data with improved error handling - use maybeSingle() instead of single()
          // This will return null instead of throwing an error when no data is found
          const { data: ratingScaleData, error: ratingScaleError } = await this.supabase
            .from('question_rating_scale')
            .select('*')
            .eq('question_id', questionId)
            .maybeSingle();
            
          console.log('Rating scale fetch result:', { data: ratingScaleData, error: ratingScaleError });
          
          // Improved error handling for rating scale data
          if (ratingScaleError) {
            // Log the error but don't throw if it's just a "not found" error
            console.error('Error fetching rating scale data:', ratingScaleError);
            if (ratingScaleError.code !== 'PGRST116') {
              // Only throw for errors other than "not found"
              throw ratingScaleError;
            }
          }
          questionData.scale = ratingScaleData || undefined;
          break;
          
        case QuestionTypeEnum.SLIDER:
          // Get slider data
          const { data: sliderData, error: sliderError } = await this.supabase
            .from('question_slider')
            .select('*')
            .eq('question_id', questionId)
            .single();
          
          if (sliderError && sliderError.code !== 'PGRST116') throw sliderError;
          questionData.scale = sliderData || undefined;
          break;
          
        case QuestionTypeEnum.IMAGE_CHOICE:
  // Get image options
  const { data: imageOptions, error: imageOptionsError } = await this.supabase
    .from('question_image_choice')
    .select('*')
    .eq('question_id', questionId)
    .order('option_order', { ascending: true });
  
  console.log('Fetched IMAGE_CHOICE options:', imageOptions);
  if (imageOptionsError) throw imageOptionsError;
  questionData.imageOptions = imageOptions;
  break;
          
        case QuestionTypeEnum.DICHOTOMOUS:
  // Get dichotomous options
  const { data: dichotomousData, error: dichotomousError } = await this.supabase
    .from('question_dichotomous')
    .select('*')
    .eq('question_id', questionId)
    .single();
  
  console.log('Fetched DICHOTOMOUS data:', dichotomousData);
  if (dichotomousError && dichotomousError.code !== 'PGRST116') throw dichotomousError;
  if (dichotomousData) {
    questionData.options = [
      { id: `${questionId}-yes`, question_id: questionId, option_text: dichotomousData.positive_option, option_order: 0 },
      { id: `${questionId}-no`, question_id: questionId, option_text: dichotomousData.negative_option, option_order: 1 }
    ];
  }
  break;
          
        case QuestionTypeEnum.RANKING:
  // Get ranking items
  const { data: rankingItems, error: rankingError } = await this.supabase
    .from('question_ranking')
    .select('*')
    .eq('question_id', questionId)
    .order('item_order', { ascending: true });
  
  console.log('Fetched RANKING items:', rankingItems);
  if (rankingError) throw rankingError;
  questionData.options = rankingItems.map(item => ({
    id: item.id,
    question_id: item.question_id,
    option_text: item.item_text,
    option_order: item.item_order
  }));
  break;
      }
      
      return questionData;
    } catch (error) {
      console.error(`Error getting question data for ID ${questionId}:`, error);
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
        .insert([{
          title: questionSet.title,
          description: questionSet.description,
          author_name: questionSet.author_name,
          resource_url: questionSet.resource_url,
          donate_url: questionSet.donate_url,
          cover_image: questionSet.cover_image
        }])
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
  
  /**
   * Create a question with type-specific data
   */
  async createQuestion(questionData: Partial<QuestionData>, adminEmail: string): Promise<QuestionData> {
    try {
      // Debug logging to see what data is being received
      console.log('Creating question with data:', JSON.stringify(questionData, null, 2));
      
      await this.setAdminContext(adminEmail);
      
      // First, insert the base question
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .insert([{
          user_id: questionData.user_id,
          question: questionData.question,
          file_url: questionData.file_url,
          media_type: questionData.media_type,
          folder_path: questionData.folder_path,
          question_set_id: questionData.question_set_id,
          type: questionData.type,
          like_count: 0,
          comment_count: 0
        }])
        .select()
        .single();
      
      if (questionError) throw questionError;
      
      // Then, insert type-specific data based on question type
      const questionId = question.id;
      const result: QuestionData = { ...question };
      
      if (questionData.type) {
        switch (questionData.type) {
          case QuestionTypeEnum.MULTIPLE_CHOICE:
            if (questionData.options && questionData.options.length > 0) {
              const optionsToInsert = questionData.options.map((option, index) => ({
                question_id: questionId,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: options, error: optionsError } = await this.supabase
                .from('question_multiple_choice')
                .insert(optionsToInsert)
                .select();
              
              if (optionsError) throw optionsError;
              result.options = options;
            }
            break;
            
          case QuestionTypeEnum.DROPDOWN:
            if (questionData.options && questionData.options.length > 0) {
              const optionsToInsert = questionData.options.map((option, index) => ({
                question_id: questionId,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: options, error: optionsError } = await this.supabase
                .from('question_dropdown')
                .insert(optionsToInsert)
                .select();
              
              if (optionsError) throw optionsError;
              result.options = options;
            }
            break;
            
          case QuestionTypeEnum.LIKERT_SCALE:
            if (questionData.options && questionData.options.length > 0) {
              const optionsToInsert = questionData.options.map((option, index) => ({
                question_id: questionId,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: options, error: optionsError } = await this.supabase
                .from('question_likert_scale')
                .insert(optionsToInsert)
                .select();
              
              if (optionsError) throw optionsError;
              result.options = options;
            }
            break;
            
          case QuestionTypeEnum.MATRIX:
            if (questionData.matrix) {
              // Insert rows
              if (questionData.matrix.rows && questionData.matrix.rows.length > 0) {
                const rowsToInsert = questionData.matrix.rows.map((row, index) => ({
                  question_id: questionId,
                  is_row: true,
                  content: row.content,
                  item_order: row.item_order || index
                }));
                
                const { data: rows, error: rowsError } = await this.supabase
                  .from('question_matrix')
                  .insert(rowsToInsert)
                  .select();
                
                if (rowsError) throw rowsError;
                
                // Insert columns
                const columnsToInsert = questionData.matrix.columns.map((col, index) => ({
                  question_id: questionId,
                  is_row: false,
                  content: col.content,
                  item_order: col.item_order || index
                }));
                
                const { data: columns, error: columnsError } = await this.supabase
                  .from('question_matrix')
                  .insert(columnsToInsert)
                  .select();
                
                if (columnsError) throw columnsError;
                
                result.matrix = {
                  rows,
                  columns
                };
              }
            }
            break;
            
          case QuestionTypeEnum.OPEN_ENDED:
            if (questionData.openEndedSettings) {
              const { data: openEndedData, error: openEndedError } = await this.supabase
                .from('question_open_ended')
                .insert([{
                  question_id: questionId,
                  answer_format: questionData.openEndedSettings.answer_format || 'text',
                  character_limit: questionData.openEndedSettings.character_limit
                }])
                .select()
                .single();
              
              if (openEndedError) throw openEndedError;
              result.openEndedSettings = openEndedData;
            }
            break;
            
          case QuestionTypeEnum.RATING_SCALE:
          // Make sure to set admin context again before fetching rating scale data
          if (adminEmail) {
            await this.setAdminContext(adminEmail);
          }
          
          console.log(`Fetching rating scale data for question ID: ${questionId}`);
            if (questionData.scale) {
              const { data: scale, error: scaleError } = await this.supabase
                .from('question_rating_scale')
                .insert([{
                  question_id: questionId,
                  min_value: questionData.scale.min_value,
                  max_value: questionData.scale.max_value,
                  step_value: questionData.scale.step_value || 1
                }])
                .select()
                .single();
              
              if (scaleError) throw scaleError;
              result.scale = scale;
            }
            break;
            
          case QuestionTypeEnum.SLIDER:
            if (questionData.scale) {
              const { data: sliderData, error: sliderError } = await this.supabase
                .from('question_slider')
                .insert([{
                  question_id: questionId,
                  min_value: questionData.scale.min_value,
                  max_value: questionData.scale.max_value,
                  step_value: questionData.scale.step_value || 1,
                  default_value: questionData.scale.default_value
                }])
                .select()
                .single();
              
              if (sliderError) throw sliderError;
              result.scale = sliderData;
            }
            break;
            
          case QuestionTypeEnum.IMAGE_CHOICE:
            if (questionData.imageOptions && questionData.imageOptions.length > 0) {
              const imageOptionsToInsert = questionData.imageOptions.map((option, index) => ({
                question_id: questionId,
                option_text: option.option_text,
                image_url: option.image_url,
                option_order: option.option_order || index
              }));
              
              const { data: imageOptions, error: imageOptionsError } = await this.supabase
                .from('question_image_choice')
                .insert(imageOptionsToInsert)
                .select();
              
              if (imageOptionsError) throw imageOptionsError;
              result.imageOptions = imageOptions;
            }
            break;
            
          case QuestionTypeEnum.DICHOTOMOUS:
            // For dichotomous questions, we store the yes/no options
            const positiveOption = questionData.options && questionData.options.length > 0 ? 
              questionData.options[0].option_text : 'Yes';
            const negativeOption = questionData.options && questionData.options.length > 1 ? 
              questionData.options[1].option_text : 'No';
              
            const { data: dichotomousData, error: dichotomousError } = await this.supabase
              .from('question_dichotomous')
              .insert([{
                question_id: questionId,
                positive_option: positiveOption,
                negative_option: negativeOption
              }])
              .select()
              .single();
            
            if (dichotomousError) throw dichotomousError;
            result.options = [
              { id: `${questionId}-yes`, question_id: questionId, option_text: positiveOption, option_order: 0 },
              { id: `${questionId}-no`, question_id: questionId, option_text: negativeOption, option_order: 1 }
            ];
            break;
            
          case QuestionTypeEnum.RANKING:
            if (questionData.options && questionData.options.length > 0) {
              const rankingItemsToInsert = questionData.options.map((option, index) => ({
                question_id: questionId,
                item_text: option.option_text,
                item_order: option.option_order || index
              }));
              
              const { data: rankingItems, error: rankingError } = await this.supabase
                .from('question_ranking')
                .insert(rankingItemsToInsert)
                .select();
              
              if (rankingError) throw rankingError;
              result.options = rankingItems.map(item => ({
                id: item.id,
                question_id: item.question_id,
                option_text: item.item_text,
                option_order: item.item_order
              }));
            }
            break;
        }
      }
      
      return result;
    } catch (error) {
      // Log detailed error information
      console.error('Error creating question:', error);
      
      // If it's a Supabase error, it might have code and details properties
      if (error && typeof error === 'object' && 'code' in error) {
        console.error(`Supabase error code: ${(error as any).code}`);
        console.error(`Error details: ${JSON.stringify(error)}`);
      }
      
      // If it's related to media_type, provide a more helpful message
      if (error && typeof error === 'object' && 'message' in error && 
          (error as any).message?.includes('media_type')) {
        throw new Error(`Media type validation failed. Only 'image', 'audio', and 'video' are supported. Error: ${JSON.stringify(error)}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Update a question with type-specific data
   */
  async updateQuestion(id: string, questionData: Partial<QuestionData>, adminEmail: string): Promise<QuestionData> {
    try {
      await this.setAdminContext(adminEmail);
      
      // Get the current question to know its type
      const { data: currentQuestion, error: currentQuestionError } = await this.supabase
        .from('questions')
        .select('type')
        .eq('id', id)
        .single();
      
      if (currentQuestionError) throw currentQuestionError;
      
      // First, update the base question
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .update({
          question: questionData.question,
          file_url: questionData.file_url,
          media_type: questionData.media_type,
          folder_path: questionData.folder_path,
          type: questionData.type
        })
        .eq('id', id)
        .select()
        .single();
      
      if (questionError) throw questionError;
      
      // If the question type has changed, delete data from the old type's table
      if (currentQuestion.type !== questionData.type) {
        await this.deleteQuestionTypeData(id, currentQuestion.type, adminEmail);
      }
      
      // Then, update type-specific data based on question type
      const result: QuestionData = { ...question };
      
      if (questionData.type) {
        switch (questionData.type) {
          case QuestionTypeEnum.MULTIPLE_CHOICE:
            if (questionData.options) {
              // Delete existing options
              await this.supabase
                .from('question_multiple_choice')
                .delete()
                .eq('question_id', id);
              
              // Insert new options
              const mcOptionsToInsert = questionData.options.map((option, index) => ({
                question_id: id,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: mcOptions, error: mcOptionsError } = await this.supabase
                .from('question_multiple_choice')
                .insert(mcOptionsToInsert)
                .select();
              
              if (mcOptionsError) throw mcOptionsError;
              result.options = mcOptions;
            }
            break;
            
          case QuestionTypeEnum.DROPDOWN:
            if (questionData.options) {
              // Delete existing options
              await this.supabase
                .from('question_dropdown')
                .delete()
                .eq('question_id', id);
              
              // Insert new options
              const dropdownOptionsToInsert = questionData.options.map((option, index) => ({
                question_id: id,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: dropdownOptions, error: dropdownOptionsError } = await this.supabase
                .from('question_dropdown')
                .insert(dropdownOptionsToInsert)
                .select();
              
              if (dropdownOptionsError) throw dropdownOptionsError;
              result.options = dropdownOptions;
            }
            break;
            
          case QuestionTypeEnum.LIKERT_SCALE:
            if (questionData.options) {
              // Delete existing options
              await this.supabase
                .from('question_likert_scale')
                .delete()
                .eq('question_id', id);
              
              // Insert new options
              const likertOptionsToInsert = questionData.options.map((option, index) => ({
                question_id: id,
                option_text: option.option_text,
                option_order: option.option_order || index
              }));
              
              const { data: likertOptions, error: likertOptionsError } = await this.supabase
                .from('question_likert_scale')
                .insert(likertOptionsToInsert)
                .select();
              
              if (likertOptionsError) throw likertOptionsError;
              result.options = likertOptions;
            }
            break;
            
          case QuestionTypeEnum.MATRIX:
            if (questionData.matrix) {
              // Delete existing matrix items
              await this.supabase
                .from('question_matrix')
                .delete()
                .eq('question_id', id);
              
              // Insert new rows
              if (questionData.matrix.rows && questionData.matrix.rows.length > 0) {
                const rowsToInsert = questionData.matrix.rows.map((row, index) => ({
                  question_id: id,
                  is_row: true,
                  content: row.content,
                  item_order: row.item_order || index
                }));
                
                const { data: rows, error: rowsError } = await this.supabase
                  .from('question_matrix')
                  .insert(rowsToInsert)
                  .select();
                
                if (rowsError) throw rowsError;
                
                // Insert new columns
                const columnsToInsert = questionData.matrix.columns.map((col, index) => ({
                  question_id: id,
                  is_row: false,
                  content: col.content,
                  item_order: col.item_order || index
                }));
                
                const { data: columns, error: columnsError } = await this.supabase
                  .from('question_matrix')
                  .insert(columnsToInsert)
                  .select();
                
                if (columnsError) throw columnsError;
                
                result.matrix = {
                  rows,
                  columns
                };
              }
            }
            break;
            
          case QuestionTypeEnum.OPEN_ENDED:
            if (questionData.openEndedSettings) {
              // Delete existing open-ended settings
              await this.supabase
                .from('question_open_ended')
                .delete()
                .eq('question_id', id);
              
              // Insert new open-ended settings
              const { data: openEndedData, error: openEndedError } = await this.supabase
                .from('question_open_ended')
                .insert([{
                  question_id: id,
                  answer_format: questionData.openEndedSettings.answer_format || 'text',
                  character_limit: questionData.openEndedSettings.character_limit
                }])
                .select()
                .single();
              
              if (openEndedError) throw openEndedError;
              result.openEndedSettings = openEndedData;
            }
            break;
            
          case QuestionTypeEnum.RATING_SCALE:
          // Make sure to set admin context again before fetching rating scale data
          await this.setAdminContext(adminEmail);
          
          console.log(`Fetching rating scale data for question ID: ${id}`);
            if (questionData.scale) {
              // Delete existing rating scale
              await this.supabase
                .from('question_rating_scale')
                .delete()
                .eq('question_id', id);
              
              // Insert new rating scale
              const { data: ratingScale, error: ratingScaleError } = await this.supabase
                .from('question_rating_scale')
                .insert([{
                  question_id: id,
                  min_value: questionData.scale.min_value,
                  max_value: questionData.scale.max_value,
                  step_value: questionData.scale.step_value || 1
                }])
                .select()
                .single();
              
              if (ratingScaleError) throw ratingScaleError;
              result.scale = ratingScale;
            }
            break;
            
          case QuestionTypeEnum.SLIDER:
            if (questionData.scale) {
              // Delete existing slider settings
              await this.supabase
                .from('question_slider')
                .delete()
                .eq('question_id', id);
              
              // Insert new slider settings
              const { data: sliderData, error: sliderError } = await this.supabase
                .from('question_slider')
                .insert([{
                  question_id: id,
                  min_value: questionData.scale.min_value,
                  max_value: questionData.scale.max_value,
                  step_value: questionData.scale.step_value || 1,
                  default_value: questionData.scale.default_value
                }])
                .select()
                .single();
              
              if (sliderError) throw sliderError;
              result.scale = sliderData;
            }
            break;
            
          case QuestionTypeEnum.IMAGE_CHOICE:
            if (questionData.imageOptions) {
              // Delete existing image options
              await this.supabase
                .from('question_image_choice')
                .delete()
                .eq('question_id', id);
              
              // Insert new image options
              const imageOptionsToInsert = questionData.imageOptions.map((option, index) => ({
                question_id: id,
                option_text: option.option_text,
                image_url: option.image_url,
                option_order: option.option_order || index
              }));
              
              const { data: imageOptions, error: imageOptionsError } = await this.supabase
                .from('question_image_choice')
                .insert(imageOptionsToInsert)
                .select();
              
              if (imageOptionsError) throw imageOptionsError;
              result.imageOptions = imageOptions;
            }
            break;
            
          case QuestionTypeEnum.DICHOTOMOUS:
            // For dichotomous questions, we store the yes/no options
            const positiveOption = questionData.options && questionData.options.length > 0 ? 
              questionData.options[0].option_text : 'Yes';
            const negativeOption = questionData.options && questionData.options.length > 1 ? 
              questionData.options[1].option_text : 'No';
              
            // Delete existing dichotomous options
            await this.supabase
              .from('question_dichotomous')
              .delete()
              .eq('question_id', id);
              
            // Insert new dichotomous options
            const { data: dichotomousData, error: dichotomousError } = await this.supabase
              .from('question_dichotomous')
              .insert([{
                question_id: id,
                positive_option: positiveOption,
                negative_option: negativeOption
              }])
              .select()
              .single();
            
            if (dichotomousError) throw dichotomousError;
            result.options = [
              { id: `${id}-yes`, question_id: id, option_text: positiveOption, option_order: 0 },
              { id: `${id}-no`, question_id: id, option_text: negativeOption, option_order: 1 }
            ];
            break;
            
          case QuestionTypeEnum.RANKING:
            if (questionData.options) {
              // Delete existing ranking items
              await this.supabase
                .from('question_ranking')
                .delete()
                .eq('question_id', id);
              
              // Insert new ranking items
              const rankingItemsToInsert = questionData.options.map((option, index) => ({
                question_id: id,
                item_text: option.option_text,
                item_order: option.option_order || index
              }));
              
              const { data: rankingItems, error: rankingError } = await this.supabase
                .from('question_ranking')
                .insert(rankingItemsToInsert)
                .select();
              
              if (rankingError) throw rankingError;
              result.options = rankingItems.map(item => ({
                id: item.id,
                question_id: item.question_id,
                option_text: item.item_text,
                option_order: item.item_order
              }));
            }
            break;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating question with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to delete type-specific data when changing question type
   */
  private async deleteQuestionTypeData(questionId: string, questionType: QuestionTypeEnum, adminEmail?: string): Promise<void> {
    try {
      // Set admin context if provided
      if (adminEmail) {
        await this.setAdminContext(adminEmail);
      }
      
      // Delete type-specific data based on question type
      switch (questionType) {
        case QuestionTypeEnum.MULTIPLE_CHOICE:
          await this.supabase
            .from('question_multiple_choice')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.RATING_SCALE:
          // Make sure to set admin context again before fetching rating scale data
          if (adminEmail) {
            await this.setAdminContext(adminEmail);
          }
          
          console.log(`Fetching rating scale data for question ID: ${questionId}`);
          await this.supabase
            .from('question_rating_scale')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.LIKERT_SCALE:
          await this.supabase
            .from('question_likert_scale')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.MATRIX:
          await this.supabase
            .from('question_matrix')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.DROPDOWN:
          await this.supabase
            .from('question_dropdown')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.OPEN_ENDED:
          await this.supabase
            .from('question_open_ended')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.IMAGE_CHOICE:
          await this.supabase
            .from('question_image_choice')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.SLIDER:
          await this.supabase
            .from('question_slider')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.DICHOTOMOUS:
          await this.supabase
            .from('question_dichotomous')
            .delete()
            .eq('question_id', questionId);
          break;
          
        case QuestionTypeEnum.RANKING:
          await this.supabase
            .from('question_ranking')
            .delete()
            .eq('question_id', questionId);
          break;
      }
    } catch (error) {
      console.error(`Error deleting question type data for question ${questionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a question and all its related data
   */
  async deleteQuestion(id: string, adminEmail: string): Promise<void> {
    try {
      await this.setAdminContext(adminEmail);
      
      // Delete the question (cascade will delete all related data)
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
  async assignQuestionToQuestionSet(questionId: string, questionSetId: string, adminEmail: string): Promise<QuestionData> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .update({ question_set_id: questionSetId })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return await this.getQuestionWithTypeData(questionId, adminEmail);
    } catch (error) {
      console.error(`Error assigning question ${questionId} to question set ${questionSetId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a question from a question set
   */
  async removeQuestionFromQuestionSet(questionId: string, adminEmail: string): Promise<QuestionData> {
    try {
      await this.setAdminContext(adminEmail);
      
      const { data, error } = await this.supabase
        .from('questions')
        .update({ question_set_id: null })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return await this.getQuestionWithTypeData(questionId, adminEmail);
    } catch (error) {
      console.error(`Error removing question ${questionId} from question set:`, error);
      throw error;
    }
  }
}

// Export a singleton instance of AdminQuestionServices
export const adminQuestionServices = new AdminQuestionServices();
