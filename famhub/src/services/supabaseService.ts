import { supabase, Database } from '@/lib/supabase'
import { User, Question, QuestionWithUser, Admin, Family } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

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
    role: string
    persona: 'Parent' | 'Children'
  }>
}

export class SupabaseService {
  // Helper method to verify user status
  private static async verifyUserStatus(userEmail: string | null): Promise<User> {
    if (!userEmail) {
      throw new Error('Not authenticated');
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('User not found');
      }
      throw new Error(error.message);
    }

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== 'Active') {
      throw new Error('User account is not active');
    }

    return user;
  }

  // User methods
  static async createUser(userData: Omit<User, 'id' | 'created_at'>) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          password: hashedPassword
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('User with this email already exists');
        }
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to create user');
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async getUserByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async verifyUser(email: string, password: string) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) return null;

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;

      return user;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // Question methods
  static async createQuestion(questionData: Omit<Question, 'id' | 'created_at' | 'like_count' | 'comment_count'>) {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const currentUser = await this.verifyUserStatus(userEmail);

      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...questionData,
          user_id: currentUser.id,
          like_count: 0,
          comment_count: 0
        })
        .select(`
          *,
          user:users!inner(
            id,
            first_name,
            last_name,
            role,
            persona
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const response = data as SupabaseQuestionResponse;
      if (!response || !response.user?.[0]) {
        throw new Error('Failed to create question with user data');
      }

      return {
        id: response.id,
        user_id: response.user[0].id,
        question: response.question,
        file_url: response.file_url,
        like_count: response.like_count,
        comment_count: response.comment_count,
        media_type: response.media_type,
        folder_path: response.folder_path,
        created_at: response.created_at,
        user: {
          first_name: response.user[0].first_name,
          last_name: response.user[0].last_name,
          role: response.user[0].role,
          persona: response.user[0].persona
        }
      } as QuestionWithUser;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async getQuestions(): Promise<QuestionWithUser[]> {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      await this.verifyUserStatus(userEmail);

      // This will automatically filter questions to only show those from the same family
      // due to the RLS policy we created
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          user:users!inner(
            id,
            first_name,
            last_name,
            role,
            persona
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const response = data as SupabaseQuestionResponse[];
      
      if (!response) {
        return [];
      }

      return response.map(item => ({
        id: item.id,
        user_id: item.user[0].id,
        question: item.question,
        file_url: item.file_url || null,
        like_count: item.like_count,
        comment_count: item.comment_count,
        media_type: item.media_type || null,
        folder_path: item.folder_path || null,
        created_at: item.created_at,
        user: {
          first_name: item.user[0].first_name,
          last_name: item.user[0].last_name,
          role: item.user[0].role,
          persona: item.user[0].persona
        }
      })) as QuestionWithUser[];
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async updateQuestionLikes(questionId: string, increment: boolean) {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      await this.verifyUserStatus(userEmail);

      const { data: currentQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('like_count')
        .eq('id', questionId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!currentQuestion) {
        throw new Error('Question not found');
      }

      const newLikeCount = increment 
        ? (currentQuestion.like_count || 0) + 1 
        : Math.max(0, (currentQuestion.like_count || 0) - 1);

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
            last_name,
            role,
            persona
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const response = data as SupabaseQuestionResponse;
      if (!response || !response.user?.[0]) {
        throw new Error('Failed to update question likes');
      }

      return {
        id: response.id,
        user_id: response.user[0].id,
        question: response.question,
        file_url: response.file_url,
        like_count: response.like_count,
        comment_count: response.comment_count,
        media_type: response.media_type,
        folder_path: response.folder_path,
        created_at: response.created_at,
        user: {
          first_name: response.user[0].first_name,
          last_name: response.user[0].last_name,
          role: response.user[0].role,
          persona: response.user[0].persona
        }
      } as QuestionWithUser;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async getAllQuestionsWithUserDetails() {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          user:user_id (
            id,
            first_name,
            last_name,
            email,
            role,
            persona,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting questions with user details:', error);
      throw error;
    }
  }

  static async deleteQuestion(questionId: string) {
    try {
      // First, get the question to check if it has a file
      const { data: question, error: getError } = await supabase
        .from('questions')
        .select('file_url, folder_path')
        .eq('id', questionId)
        .single();
      
      if (getError) throw getError;
      
      // Delete the file from storage if it exists
      if (question?.file_url) {
        const { error: storageError } = await supabase.storage
          .from('public')
          .remove([question.folder_path]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Continue with question deletion even if file deletion fails
        }
      }
      
      // Delete the question from the database
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      
      if (deleteError) throw deleteError;
      
      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  // Get all family members
  static async getFamilyMembers(): Promise<Omit<User, 'password'>[]> {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const currentUser = await this.verifyUserStatus(userEmail);

      // First get the family where user_ref matches the current user's ID
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id')
        .eq('user_ref', currentUser.id)
        .single();

      if (familyError) {
        // If no family found with user_ref, try getting family by family_id
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('family_id', currentUser.family_id);

        if (userError) {
          throw new Error(userError.message);
        }

        return users || [];
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
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      return await this.verifyUserStatus(userEmail);
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // Add family member
  static async addFamilyMember(userData: Omit<User, 'id' | 'created_at'>) {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const currentUser = await this.verifyUserStatus(userEmail);
      
      // If family_id is not provided, use the current user's family_id
      if (!userData.family_id && currentUser.family_id) {
        userData.family_id = currentUser.family_id;
      }
      
      // If still no family_id, create a new family using the last name
      if (!userData.family_id) {
        // Create a new family
        const { data: family, error: familyError } = await supabase
          .from('families')
          .insert({
            family_name: userData.last_name,
            created_by: currentUser.id
          })
          .select()
          .single();
          
        if (familyError) {
          console.error('Error creating family:', familyError);
          throw new Error('Failed to create family: ' + familyError.message);
        }
        
        if (family) {
          userData.family_id = family.id;
          
          // Also update the current user with the new family_id if they don't have one
          if (!currentUser.family_id) {
            await supabase
              .from('users')
              .update({ family_id: family.id })
              .eq('id', currentUser.id);
          }
        }
      }
      
      return await this.createUser(userData);
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // updateFamilyMember function has been migrated to AdminFamiliesService

  static async deleteFamilyMember(userId: string) {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      await this.verifyUserStatus(userEmail);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // Admin methods
  static async getAdminById(id: string) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async adminLogin(email: string, password: string) {
    try {
      // First, check if the admin exists
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminError) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }

      // Set the admin email in the session
      await supabase.rpc('set_claim', {
        claim: 'app.user_email',
        value: email
      });

      // Store admin info in session
      sessionStorage.setItem('adminEmail', admin.email);
      sessionStorage.setItem('adminRole', admin.role);
      sessionStorage.setItem('adminId', admin.id);
      sessionStorage.setItem('adminName', `${admin.first_name} ${admin.last_name}`);

      return admin;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async createAdmin(adminData: Omit<Admin, 'id' | 'created_at'>) {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Get the current admin's email from sessionStorage
      const currentAdminEmail = sessionStorage.getItem('adminEmail');
      if (!currentAdminEmail) {
        throw new Error('No admin session found');
      }

      // Get the current admin's role
      const currentAdmin = await this.getAdminByEmail(currentAdminEmail);
      if (!currentAdmin || currentAdmin.role !== 'sysAdmin') {
        throw new Error('Only system administrators can create new admin accounts');
      }

      // Set the admin email in the session
      await supabase.rpc('set_claim', {
        claim: 'app.user_email',
        value: currentAdminEmail
      });

      const { data, error } = await supabase
        .from('admins')
        .insert({
          ...adminData,
          password: hashedPassword
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Admin with this email already exists');
        }
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to create admin');
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async getAdminByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select()
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async verifyAdmin(email: string, password: string) {
    try {
      const admin = await this.getAdminByEmail(email);
      if (!admin) return null;

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) return null;

      return admin;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async getAllAdmins() {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async updateAdmin(adminId: string, adminData: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  }) {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }
      
      // Get current admin to check permissions
      const currentAdmin = await this.getAdminByEmail(adminEmail);
      if (!currentAdmin) {
        throw new Error('Admin not found');
      }
      
      // Regular admins can only update to regular admin role
      if (currentAdmin.role !== 'sysAdmin' && adminData.role === 'sysAdmin') {
        throw new Error('You do not have permission to assign system admin role');
      }
      
      // Get the admin being updated to check if attempting to downgrade a sysAdmin
      const targetAdmin = await this.getAdminById(adminId);
      if (targetAdmin && targetAdmin.role === 'sysAdmin' && adminData.role === 'admin' && currentAdmin.role !== 'sysAdmin') {
        throw new Error('You do not have permission to change a system admin\'s role');
      }
      
      const { data, error } = await supabase
        .from('admins')
        .update({
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          email: adminData.email,
          role: adminData.role
        })
        .eq('id', adminId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Admin with this email already exists');
        }
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to update admin');
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async updateAdminPassword(adminId: string, newPassword: string) {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Check if the current admin is a sysAdmin
      const currentAdmin = await this.getAdminByEmail(adminEmail);
      if (!currentAdmin || currentAdmin.role !== 'sysAdmin') {
        throw new Error('Only system administrators can update admin accounts');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const { data, error } = await supabase
        .from('admins')
        .update({ password: hashedPassword })
        .eq('id', adminId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async deleteAdmin(adminId: string) {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Get current admin to check permissions
      const currentAdmin = await this.getAdminByEmail(adminEmail);
      if (!currentAdmin) {
        throw new Error('Admin not found');
      }

      // Get the admin being deleted to check if attempting to delete a sysAdmin
      const targetAdmin = await this.getAdminById(adminId);
      if (targetAdmin && targetAdmin.role === 'sysAdmin' && currentAdmin.role !== 'sysAdmin') {
        throw new Error('You do not have permission to delete a system admin');
      }

      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  
  static async getFamilyMembersByLastName(lastName: string) {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('last_name', lastName)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async updateUserStatus(userId: string, status: 'Active' | 'Validating' | 'Not Active') {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      const { data, error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  // deleteUser function has been migrated to AdminFamiliesService

 

  // Family methods
  static async getFamilyDetails(): Promise<Family | null> {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const currentUser = await this.verifyUserStatus(userEmail);

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
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }



  /**
   * @deprecated This method has been migrated to AdminFamiliesService.getFamilyById
   * Please use AdminFamiliesService.getFamilyById instead
   */
  static async getFamilyById(familyId: string) {
    console.warn('SupabaseService.getFamilyById is deprecated. Use AdminFamiliesService.getFamilyById instead.');
    const { AdminFamiliesService } = await import('./AdminFamiliesService');
    return AdminFamiliesService.getFamilyById(familyId);
  }
  

}
