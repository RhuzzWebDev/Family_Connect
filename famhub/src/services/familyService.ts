import { supabase } from './userService';
import { UserService } from './userService';
import { v4 as uuidv4 } from 'uuid';

export interface Family {
  id: string;
  family_name: string;
  created_at?: string;
  user_ref?: string; // Reference to the creator of the family
}

export interface FamilyMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  role: string;
  persona: string;
  bio?: string;
  phone_number?: string;
  created_at?: string;
  family_id?: string;
  password?: string;
}

export class FamilyService {
  /**
   * Helper method to get the current user's email from session storage
   * @returns The current user's email or null if not found
   */
  private static getCurrentUserEmail(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('userEmail');
    }
    return null;
  }

  /**
   * Creates a new family and links the creator to it
   * @param familyName The name of the family to create
   * @param userId The ID of the user creating the family
   * @param userEmail The email of the user creating the family (for RLS)
   * @returns The ID of the newly created family
   */
  static async createFamily(familyName: string, userId: string, userEmail: string): Promise<string> {
    try {
      // Set the user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      const familyId = uuidv4();
      
      // First, create the family with anon key (public access)
      const { data, error } = await supabase
        .from('families')
        .insert({
          id: familyId,
          family_name: familyName,
          user_ref: userId
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Family creation error details:', error);
        throw error;
      }
      
      if (!data) throw new Error('Failed to create family');
      
      // Set RLS context
      await supabase.rpc('set_app_user', { p_email: userEmail });

      // Try updating by userId first
      let updateResult = await supabase
        .from('users')
        .update({ family_id: familyId })
        .eq('id', userId)
        .select();

      console.log('[FAMILY CREATE] Update by userId result:', updateResult);

      if (updateResult.error || !updateResult.data?.length) {
        // Fallback: Try updating by email
        updateResult = await supabase
          .from('users')
          .update({ family_id: familyId })
          .eq('email', userEmail)
          .select();

        console.log('[FAMILY CREATE] Update by email result:', updateResult);
      }

      if (updateResult.error) {
        console.error('[FAMILY CREATE] Failed to update user family_id:', updateResult.error);
        throw new Error('Failed to update user with new family_id');
      }
      if (!updateResult.data?.length) {
        console.error('[FAMILY CREATE] No user updated for family_id!');
        throw new Error('No user updated for family_id');
      }

      // Fetch user to confirm family_id is set
      const { data: updatedUser, error: fetchUserError } = await supabase
        .from('users')
        .select('id, family_id')
        .eq('id', userId)
        .single();
      if (fetchUserError) {
        console.error('[FAMILY CREATE] Could not fetch user after update:', fetchUserError);
      } else {
        console.log('[FAMILY CREATE] User after update:', updatedUser);
      }
      return familyId;
    } catch (error) {
      console.error('Family creation error:', error);
      throw error;
    }
  }

  /**
   * Gets a family by its ID
   * @param familyId The ID of the family to retrieve
   * @returns The family details or null if not found
   */
  static async getFamilyById(familyId: string): Promise<Family | null> {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get family error:', error);
      throw error;
    }
  }

  /**
   * Gets all members of a specific family by family ID
   * @param familyId The ID of the family to get members for
   * @returns Array of family members
   */
  static async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', familyId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get family members error:', error);
      throw error;
    }
  }

  /**
   * Gets the current logged-in user's details
   * @returns The current user's details
   */
  static async getCurrentUser(): Promise<FamilyMember> {
    try {
      const userEmail = this.getCurrentUserEmail();
      if (!userEmail) {
        throw new Error('Not authenticated');
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) {
        throw new Error('User not found');
      }

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'Active') {
        throw new Error('User account is not active');
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Gets all family members for the current user's family
   * @returns Array of family members
   */
  static async getAllFamilyMembers(): Promise<FamilyMember[]> {
    try {
      // Get the current user first
      const currentUser = await this.getCurrentUser();

      // First get the family where user_ref matches the current user's ID
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id')
        .eq('user_ref', currentUser.id)
        .single();

      if (familyError) {
        // If no family found with user_ref, try getting family by family_id
        if (currentUser.family_id) {
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('family_id', currentUser.family_id);

          if (userError) {
            throw new Error(userError.message);
          }

          return users || [];
        } else {
          // If no family_id, return empty array
          return [];
        }
      }

      // Get all users from the family
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', familyData.id);

      if (userError) {
        throw new Error(userError.message);
      }

      return users || [];
    } catch (error) {
      console.error('Get all family members error:', error);
      throw error;
    }
  }

  /**
   * Gets the details of the current user's family
   * @returns The family details or null if not found
   */
  static async getFamilyDetails(): Promise<Family | null> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser.family_id) {
        return null;
      }

      // Use maybeSingle() instead of single() to handle the case where no rows are returned
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', currentUser.family_id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error getting family details:', error);
      throw error;
    }
  }

  /**
   * Generates a family invite code for sharing
   * @returns The generated invite code
   */
  static async generateFamilyInviteCode(): Promise<string> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.family_id) {
        throw new Error('You do not belong to a family');
      }
      
      // For now, just return the family ID as the invite code
      // In a real implementation, you might want to generate a more user-friendly code
      // or store the code in a separate table with an expiration date
      return currentUser.family_id;
    } catch (error) {
      console.error('Error generating family invite code:', error);
      throw error;
    }
  }

  /**
   * Joins a family using an invite code (family ID)
   * @param inviteCode The invite code (family ID) to join with
   * @returns Whether the join was successful
   */
  static async joinFamilyWithCode(inviteCode: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      
      // Update the user's family_id
      const { error } = await supabase
        .from('users')
        .update({ family_id: inviteCode })
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error joining family with code:', error);
      throw error;
    }
  }

  /**
   * Gets a user by their email address
   * @param email The email address of the user to retrieve
   * @returns The user details or throws an error if not found
   */
  static async getUserByEmail(email: string): Promise<FamilyMember> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error) throw new Error('User not found');
      if (!data) throw new Error('User not found');
      
      return data;
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  /**
   * Adds a new member to a specific family
   * @param familyIdentifier The family ID or family name to add the member to
   * @param memberData The data for the new family member
   * @returns The ID of the newly created family member
   */
  static async addMemberToFamily(
    familyIdentifier: string,
    memberData: Omit<FamilyMember, 'id' | 'created_at' | 'family_id'>
  ): Promise<string> {
    try {
      const userEmail = this.getCurrentUserEmail();
      if (!userEmail) throw new Error('Not authenticated');
      
      // Set the user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Check if family exists by ID first
      let familyId = familyIdentifier;
      let family = await this.getFamilyById(familyIdentifier).catch(() => null);
      
      // If family not found by ID, try to find by name
      if (!family) {
        const { data, error } = await supabase
          .from('families')
          .select('id')
          .eq('family_name', familyIdentifier)
          .single();
          
        if (error || !data) {
          // Create a new family if it doesn't exist
          const currentUser = await this.getCurrentUser();
          familyId = await this.createFamily(familyIdentifier, currentUser.id, userEmail);
        } else {
          familyId = data.id;
        }
      }
      
      // Create the new user with bcrypt hashed password
      const hashedPassword = await UserService.hashPassword(memberData.password || '');
      const newUserId = uuidv4();
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          family_id: familyId,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          email: memberData.email,
          password: hashedPassword,
          role: memberData.role,
          persona: memberData.persona,
          status: memberData.status,
          bio: memberData.bio,
          phone_number: memberData.phone_number
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Failed to add family member');
      
      return data.id;
    } catch (error) {
      console.error('Add member to family error:', error);
      throw error;
    }
  }

  /**
   * Adds a new family member, creating a family if needed
   * @param memberData The data for the new family member
   * @returns The ID of the newly created family member
   */
  static async addFamilyMember(
    memberData: Omit<FamilyMember, 'id' | 'created_at'> & { family_id?: string }
  ): Promise<string> {
    try {
      const userEmail = this.getCurrentUserEmail();
      if (!userEmail) throw new Error('Not authenticated');
      
      // Set the user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Check if user with this email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', memberData.email)
        .maybeSingle();
        
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
      
      // Get current user to determine family
      const currentUser = await this.getCurrentUser();
      let familyId = memberData.family_id || currentUser.family_id;
      
      // If no family exists, create one using the last name
      if (!familyId) {
        familyId = await this.createFamily(
          memberData.last_name,
          currentUser.id,
          userEmail
        );
      }
      
      // Create the new user with bcrypt hashed password
      const hashedPassword = await UserService.hashPassword(memberData.password || '');
      const newUserId = uuidv4();
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          family_id: familyId,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          email: memberData.email,
          password: hashedPassword,
          role: memberData.role,
          persona: memberData.persona,
          status: memberData.status,
          bio: memberData.bio,
          phone_number: memberData.phone_number
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Failed to add family member');
      
      return data.id;
    } catch (error) {
      console.error('Add family member error:', error);
      throw error;
    }
  }

  /**
   * Updates an existing family member's information
   * @param memberId The ID of the family member to update
   * @param memberData The updated data for the family member
   * @returns Whether the update was successful
   */
  static async updateFamilyMember(
    memberId: string,
    memberData: Partial<Omit<FamilyMember, 'id' | 'created_at' | 'family_id'>>
  ): Promise<boolean> {
    try {
      const userEmail = this.getCurrentUserEmail();
      if (!userEmail) throw new Error('Not authenticated');
      
      // Set the user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get current user to check family relationship
      const currentUser = await this.getCurrentUser();
      
      // Get the member to update to verify they're in the same family
      const { data: memberToUpdate, error: memberError } = await supabase
        .from('users')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (memberError || !memberToUpdate) {
        console.error('Error finding member to update:', memberError);
        throw new Error('Member not found');
      }
      
      // Verify the user is in the same family or is updating themselves
      if (memberId !== currentUser.id && memberToUpdate.family_id !== currentUser.family_id) {
        console.error('Cannot update member from different family');
        throw new Error('You can only update members from your own family');
      }
      
      // If password is being updated, hash it
      let updatedData = { ...memberData };
      if (memberData.password) {
        updatedData.password = await UserService.hashPassword(memberData.password);
      }
      
      // Log the update operation for debugging
      console.log('Updating family member with data:', {
        id: memberId,
        currentUserEmail: userEmail,
        currentUserId: currentUser.id,
        familyId: currentUser.family_id,
        ...updatedData
      });
      
      // Use the stored procedure to update the family member
      // This bypasses RLS and performs additional validation
      console.log('Calling update_family_member stored procedure');
      
      const { data, error } = await supabase.rpc('update_family_member', {
        member_id: memberId,
        current_user_email: userEmail,
        update_data: updatedData
      });
      
      if (error) {
        console.error('Error updating family member:', error);
        
        // Check for specific error types
        if (error.message && error.message.includes('Cannot update member from different family')) {
          throw new Error('You can only update members from your own family');
        } else if (error.code === '42501' || error.code === 'PGRST301') { // Permission denied
          throw new Error('You do not have permission to update this family member');
        } else if (error.code === 'PGRST202') { // Function not found
          console.warn('Stored procedure not found, falling back to direct update');
          
          // Fall back to direct update if the stored procedure doesn't exist
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update(updatedData)
            .eq('id', memberId)
            .select();
            
          if (updateError) {
            console.error('Error with fallback update:', updateError);
            throw updateError;
          }
          
          // Verify the update was successful
          if (!updateData || updateData.length === 0) {
            console.warn('Update operation did not return updated data');
            
            // If the update didn't return data but also didn't error, check if it worked
            const { data: verifyData, error: verifyError } = await supabase
              .from('users')
              .select('*')
              .eq('id', memberId)
              .single();
              
            if (verifyError) {
              console.error('Error verifying update:', verifyError);
            } else if (verifyData) {
              console.log('Verified updated data:', verifyData);
              // Check if the update was actually applied
              const wasUpdated = Object.keys(updatedData).some(key => 
                updatedData[key as keyof typeof updatedData] === verifyData[key as keyof typeof verifyData]
              );
              if (!wasUpdated) {
                console.error('Update was not applied correctly');
                throw new Error('Failed to update family member');
              }
            }
          } else {
            console.log('Updated family member data (fallback):', updateData);
            return true;
          }
        } else {
          throw error;
        }
      } else {
        console.log('Updated family member data (stored procedure):', data);
      }
      
      return true;
    } catch (error) {
      console.error('Update family member error:', error);
      throw error;
    }
  }

  /**
   * Deletes a family member
   * @param memberId The ID of the family member to delete
   * @returns Whether the deletion was successful
   */
  static async deleteFamilyMember(memberId: string): Promise<boolean> {
    try {
      const userEmail = this.getCurrentUserEmail();
      if (!userEmail) throw new Error('Not authenticated');
      
      // Set the user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get current user to check if they're trying to delete themselves
      const currentUser = await this.getCurrentUser();
      if (currentUser.id === memberId) {
        throw new Error('You cannot delete your own account');
      }
      
      // Get the member to delete to verify they're in the same family
      const { data: memberToDelete, error: memberError } = await supabase
        .from('users')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (memberError || !memberToDelete) {
        console.error('Error finding member to delete:', memberError);
        throw new Error('Member not found');
      }
      
      // Verify the user is in the same family
      if (memberToDelete.family_id !== currentUser.family_id) {
        console.error('Cannot delete member from different family');
        throw new Error('You can only delete members from your own family');
      }
      
      console.log('Attempting to delete member:', {
        memberId,
        currentUserEmail: userEmail,
        currentUserId: currentUser.id,
        familyId: currentUser.family_id
      });
      
      // Use the stored procedure to delete the family member
      // This bypasses RLS and performs additional validation
      console.log('Calling delete_family_member stored procedure');
      
      const { data, error } = await supabase.rpc('delete_family_member', {
        member_id: memberId,
        current_user_email: userEmail
      });
      
      if (error) {
        console.error('Error deleting family member:', error);
        
        // Check for specific error types
        if (error.message && error.message.includes('Cannot delete member from different family')) {
          throw new Error('You can only delete members from your own family');
        } else if (error.code === '42501' || error.code === 'PGRST301') { // Permission denied
          throw new Error('You do not have permission to delete this family member');
        } else if (error.code === 'PGRST202') { // Function not found
          console.warn('Stored procedure not found, falling back to direct delete');
          
          // Fall back to direct delete if the stored procedure doesn't exist
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', memberId);
            
          if (deleteError) {
            console.error('Error with fallback delete:', deleteError);
            throw deleteError;
          }
        } else {
          throw error;
        }
      }
      
      console.log('Delete operation completed successfully:', data);
      return true;
    } catch (error) {
      console.error('Delete family member error:', error);
      throw error;
    }
  }
}
