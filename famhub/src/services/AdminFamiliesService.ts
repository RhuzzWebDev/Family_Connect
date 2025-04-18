import { supabase } from '@/lib/supabase';
import { User, Family } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

type FamilyWithMembers = {
  id: string;
  familyName: string;
  members: User[];
  memberCount: number;
  createdAt: string;
};

type CreateFamilyResult = {
  family: {
    id: string;
    family_name: string;
    user_ref?: string;
  };
  user: User;
};

type DeleteFamilyResult = {
  success: boolean;
  stats: {
    familyName: string;
    usersDeleted: number;
    questionsDeleted: number;
    commentsDeleted: number;
    conversationsDeleted: number;
    messagesDeleted: number;
  };
};

export class AdminFamiliesService {  
  /**
   * Create default questions for a user
   * @param userId ID of the user to create questions for
   * @param adminFlagAlreadySet Whether the admin flag is already set
   * @returns Count of questions created
   */
  static async createDefaultQuestions(userId: string, adminFlagAlreadySet = false) {
    try {
      console.log('Creating default questions for user:', userId);
      
      // Set the admin session to bypass RLS policies if it's not already set
      if (!adminFlagAlreadySet) {
        try {
          console.log('Setting admin session for default questions creation');
          const adminEmail = sessionStorage.getItem('adminEmail');
          if (!adminEmail) {
            throw new Error('Admin not authenticated. Please log in again.');
          }
          // Use set_admin_session to set both email and flag
          await supabase.rpc('set_admin_session', { admin_email: adminEmail });
        } catch (e) {
          console.error('Error setting admin session:', e);
          throw e;
        }
      } else {
        console.log('Admin flag already set, skipping');
      }

      try {
        // First, get user details to determine folder path
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, persona')
          .eq('id', userId)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          throw new Error('Could not retrieve user information');
        }
        
        // Determine folder path based on role following the established pattern
        let folderPath = '';
        if (userData.persona === 'Parent') {
          folderPath = `public/upload/${userData.last_name}/${userData.role}/`;
        } else {
          folderPath = `public/upload/other/${userData.first_name}/`;
        }
        
        // List of default questions
        const defaultQuestions = [
          "What are some of the roles that have been important to you in your life?",
          "What were your interests and hobbies in your younger days?",
          "What are you interested in these days?",
          "What are the memories that you are proud of?",
          "Who are the people who have been important to you in your life?",
          "Which relationships stand out to you and why?",
          "Who have you cared for, and who has cared for you?",
          "What are your hopes for these people, and how would you like to be remembered by them?",
          "Who would you like to be the person/people who would tell your story in future?",
          "What are some of the places that have been important to you in your life?",
          "Where have you lived, where have you traveled?",
          "What places have felt most like home for you? Why is that?",
          "Overall, how would you describe yourself?",
          "What are your most treasured memories?",
          "What are the key events that have made you who you are?",
          "What brings you strength these days?",
          "What are your hopes or concerns for the future?"
        ];
        
        // Default media files from public/uploads/default-media folder
        const defaultMediaFiles = [
          { url: "/uploads/default-media/media-1.jpg", type: "image" },
          { url: "/uploads/default-media/media-2.mp4", type: "video" },
          { url: "/uploads/default-media/media-3.mp3", type: "audio" },
          { url: "/uploads/default-media/media-4.mp4", type: "video" },
          { url: "/uploads/default-media/media-5.jpg", type: "image" }
        ];
        
        // Function to get media file for a question based on its index
        const getDefaultMediaForQuestion = (index: number) => {
          const mediaIndex = index % defaultMediaFiles.length;
          return defaultMediaFiles[mediaIndex];
        };
        
        // Create questions in batch
        const questionsToInsert = defaultQuestions.map((question, index) => ({
          user_id: userId,
          question: question,
          file_url: getDefaultMediaForQuestion(index).url,
          folder_path: folderPath,
          media_type: getDefaultMediaForQuestion(index).type,
          like_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString()
        }));
        
        // Insert questions in smaller batches to avoid potential issues
        const batchSize = 5;
        let successCount = 0;
        
        for (let i = 0; i < questionsToInsert.length; i += batchSize) {
          const batch = questionsToInsert.slice(i, i + batchSize);
          
          const { data, error } = await supabase
            .from('questions')
            .insert(batch)
            .select();
          
          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            // Continue with next batch even if this one fails
          } else if (data) {
            successCount += data.length;
            console.log(`Successfully inserted batch ${i / batchSize + 1} with ${data.length} questions`);
          }
        }
        
        console.log(`Successfully created ${successCount} default questions`);
        return { count: successCount };
      } finally {
        // Reset the is_admin flag after operation only if we set it in this method
        if (!adminFlagAlreadySet) {
          try {
            console.log('Resetting admin flag after default questions creation');
            // Just need to reset the admin flag, not the email
            await supabase.rpc('set_admin_flag', { admin: false });
          } catch (e) {
            console.error('Error resetting admin flag:', e);
            // Continue execution even if there's an error resetting the flag
            // This ensures we don't block the function from completing
          }
        } else {
          console.log('Skipping admin flag reset as it was set externally');
        }
      }
    } catch (error) {
      console.error('Error creating default questions:', error);
      throw error;
    }
  }
  /**
   * Get all families with their members
   * @returns Array of families with member information
   */
  static async getAllFamilies(): Promise<FamilyWithMembers[]> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Get all families
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('*')
        .order('family_name', { ascending: true });

      if (familiesError) {
        throw new Error(`Error fetching families: ${familiesError.message}`);
      }

      if (!families || families.length === 0) {
        return [];
      }

      // For each family, get its members
      const familiesWithMembers = await Promise.all(
        families.map(async (family) => {
          const { data: members, error: membersError } = await supabase
            .from('users')
            .select('*')
            .eq('family_id', family.id);

          if (membersError) {
            console.error(`Error fetching members for family ${family.id}:`, membersError);
            return {
              id: family.id,
              familyName: family.family_name,
              members: [],
              memberCount: 0,
              createdAt: family.created_at
            };
          }

          return {
            id: family.id,
            familyName: family.family_name,
            members: members || [],
            memberCount: members ? members.length : 0,
            createdAt: family.created_at
          };
        })
      );

      return familiesWithMembers;
    } catch (error) {
      console.error('Error in getAllFamilies:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Create a new family with an initial member
   * @param familyName Name of the family
   * @param memberData Data for the initial family member
   * @returns Created family and user data
   */
  static async createFamilyWithMember(
    familyName: string,
    memberData: Omit<User, 'id' | 'created_at' | 'family_id'>
  ): Promise<CreateFamilyResult> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Start a transaction
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('email', adminEmail)
        .single();

      if (adminError || !adminData) {
        throw new Error('Admin not found or not authorized');
      }

      // Create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          family_name: familyName,
          admin_id: adminData.id
        })
        .select()
        .single();

      if (familyError) {
        throw new Error(`Error creating family: ${familyError.message}`);
      }

      if (!family) {
        throw new Error('Failed to create family');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(memberData.password, 10);

      // Create the user with the family_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          ...memberData,
          password: hashedPassword,
          family_id: family.id
        })
        .select()
        .single();

      if (userError) {
        // If user creation fails, attempt to delete the family
        await supabase.from('families').delete().eq('id', family.id);
        throw new Error(`Error creating user: ${userError.message}`);
      }

      if (!user) {
        // If user data is not returned, attempt to delete the family
        await supabase.from('families').delete().eq('id', family.id);
        throw new Error('Failed to create user');
      }

      // Update the family with the user_ref
      const { error: updateError } = await supabase
        .from('families')
        .update({ user_ref: user.id })
        .eq('id', family.id);

      if (updateError) {
        console.error('Error updating family with user_ref:', updateError);
        // We don't throw here as the family and user are already created
      }

      // Create default questions for the new user
      try {
        // Admin flag is already set for this operation
        await this.createDefaultQuestions(user.id, true);
      } catch (questionError) {
        console.error('Error creating default questions:', questionError);
        // We don't throw here as the family and user are already created
      }

      return {
        family: {
          id: family.id,
          family_name: family.family_name,
          user_ref: user.id
        },
        user
      };
    } catch (error) {
      console.error('Error in createFamilyWithMember:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Add a new member to an existing family
   * @param familyId ID of the family
   * @param memberData Data for the new family member
   * @returns Created user data
   */
  static async addMemberToFamily(
    familyId: string,
    memberData: Omit<User, 'id' | 'created_at' | 'family_id'>
  ): Promise<User> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Verify the family exists
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select()
        .eq('id', familyId)
        .single();

      if (familyError || !family) {
        throw new Error('Family not found');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(memberData.password, 10);

      // Create the user with the family_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          ...memberData,
          password: hashedPassword,
          family_id: familyId
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Error creating user: ${userError.message}`);
      }

      if (!user) {
        throw new Error('Failed to create user');
      }

      return user;
    } catch (error) {
      console.error('Error in addMemberToFamily:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Update a family member's information
   * @param userId ID of the user to update
   * @param updateData Data to update
   * @returns Updated user data
   */
  static async updateFamilyMember(
    userId: string,
    updateData: Partial<Omit<User, 'id' | 'created_at' | 'family_id'>>
  ): Promise<User> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // If password is provided, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Update the user
      const { data: user, error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (userError) {
        throw new Error(`Error updating user: ${userError.message}`);
      }

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error in updateFamilyMember:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Delete a user
   * @param userId ID of the user to delete
   * @returns Success status
   */
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw new Error(`Error deleting user: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Delete a family and all associated data
   * @param familyId ID of the family to delete
   * @returns Success status
   */
  static async deleteFamily(familyId: string): Promise<DeleteFamilyResult> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Get family name for the result
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('family_name')
        .eq('id', familyId)
        .single();

      if (familyError || !family) {
        throw new Error('Family not found');
      }

      const familyName = family.family_name;

      // Get all users in the family
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', familyId);

      if (usersError) {
        throw new Error(`Error fetching family members: ${usersError.message}`);
      }

      const userIds = users ? users.map((user) => user.id) : [];
      const usersDeleted = userIds.length;

      // Delete all questions from family members
      let questionsDeleted = 0;
      if (userIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id')
          .in('user_id', userIds);

        if (!questionsError && questions) {
          questionsDeleted = questions.length;
          
          // Delete the questions
          if (questions.length > 0) {
            await supabase
              .from('questions')
              .delete()
              .in('user_id', userIds);
          }
        }
      }

      // Delete all comments from family members
      let commentsDeleted = 0;
      if (userIds.length > 0) {
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select('id')
          .in('user_id', userIds);

        if (!commentsError && comments) {
          commentsDeleted = comments.length;
          
          // Delete the comments
          if (comments.length > 0) {
            await supabase
              .from('comments')
              .delete()
              .in('user_id', userIds);
          }
        }
      }

      // Delete all conversations involving family members
      let conversationsDeleted = 0;
      let messagesDeleted = 0;
      
      if (userIds.length > 0) {
        // Get all conversations where family members are participants
        const { data: participations, error: participationsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('user_id', userIds);

        if (!participationsError && participations) {
          const conversationIds = [...new Set(participations.map((p) => p.conversation_id))];
          conversationsDeleted = conversationIds.length;
          
          // Get and delete all messages in these conversations
          if (conversationIds.length > 0) {
            const { data: messages, error: messagesError } = await supabase
              .from('messages')
              .select('id')
              .in('conversation_id', conversationIds);

            if (!messagesError && messages) {
              messagesDeleted = messages.length;
              
              // Delete the messages
              if (messages.length > 0) {
                await supabase
                  .from('messages')
                  .delete()
                  .in('conversation_id', conversationIds);
              }
            }
            
            // Delete the conversation participants
            await supabase
              .from('conversation_participants')
              .delete()
              .in('conversation_id', conversationIds);
            
            // Delete the conversations
            await supabase
              .from('conversations')
              .delete()
              .in('id', conversationIds);
          }
        }
      }

      // Delete all users in the family
      if (userIds.length > 0) {
        await supabase
          .from('users')
          .delete()
          .eq('family_id', familyId);
      }

      // Finally, delete the family
      const { error: deleteFamilyError } = await supabase
        .from('families')
        .delete()
        .eq('id', familyId);

      if (deleteFamilyError) {
        throw new Error(`Error deleting family: ${deleteFamilyError.message}`);
      }

      return {
        success: true,
        stats: {
          familyName: familyName,
          usersDeleted,
          questionsDeleted,
          commentsDeleted,
          conversationsDeleted,
          messagesDeleted
        }
      };
    } catch (error: any) {
      console.error('Error in deleteFamily:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Get a family by ID with its members
   * @param familyId ID of the family to retrieve
   * @returns Family data with members
   */
  static async getFamilyById(familyId: string) {
    try {
      // Get the admin email from session storage
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Admin not authenticated. Please log in again.');
      }
      
      // Set the admin session to bypass RLS policies
      await supabase.rpc('set_admin_session', { admin_email: adminEmail });

      try {
        // Get the family
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();
        
        if (familyError || !family) {
          throw new Error(`Error getting family: ${familyError?.message || 'Family not found'}`);
        }
        
        // Get the family members
        const { data: members, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('family_id', familyId);
        
        if (membersError) {
          throw new Error(`Error getting family members: ${membersError.message}`);
        }
        
        return {
          ...family,
          members: members || []
        };
      } finally {
        // Always reset the admin flag, even if there's an error
        try {
          await supabase.rpc('set_admin_flag', { admin: false });
        } catch (e) {
          console.error('Error resetting admin flag:', e);
        }
      }
    } catch (error) {
      console.error('Error getting family by ID:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}
