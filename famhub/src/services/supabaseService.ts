import { supabase, Database } from '@/lib/supabase'
import { User, Question, QuestionWithUser, Admin, Family } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

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

  static async updateFamilyMember(userId: string, userData: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone_number?: string;
    bio?: string;
    status: 'Active' | 'Validating' | 'Not Active';
    password?: string;
  }) {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      await this.verifyUserStatus(userEmail);
      
      // Prepare update data
      const updateData: any = {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
        phone_number: userData.phone_number,
        bio: userData.bio,
        status: userData.status
      };
      
      // Hash password if provided
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('User with this email already exists');
        }
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to update user');
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

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

  // Admin methods with Supabase Auth
  
  /**
   * Creates a new admin using Supabase Auth
   * @param adminData Admin data to create
   * @returns The created admin
   */
  static async createAdminWithAuth(adminData: Omit<Admin, 'id' | 'created_at'>) {
    try {
      // 1. Create the auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            first_name: adminData.first_name,
            last_name: adminData.last_name,
            role: adminData.role,
            is_admin: true
          }
        }
      });

      if (authError) {
        console.error('Error creating admin auth user:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create admin auth user');
      }

      // 2. Create the admin record in the admins table
      const { data: adminRecord, error: adminError } = await supabase
        .from('admins')
        .insert([
          {
            id: authData.user.id,
            first_name: adminData.first_name,
            last_name: adminData.last_name,
            email: adminData.email,
            role: adminData.role,
            password: adminData.password // Store password for backward compatibility
          }
        ])
        .select()
        .single();

      if (adminError) {
        console.error('Error creating admin record:', adminError);
        throw new Error(adminError.message);
      }

      return adminRecord as Admin;
    } catch (error) {
      console.error('Error creating admin with auth:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Authenticates an admin using Supabase Auth
   * @param email Admin email
   * @param password Admin password
   * @returns The authenticated admin
   */
  static async adminAuthLogin(email: string, password: string) {
    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Admin auth login error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to authenticate admin');
      }

      // 2. Get the admin record from the admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (adminError) {
        console.error('Error fetching admin data:', adminError);
        throw new Error(adminError.message);
      }

      return adminData as Admin;
    } catch (error) {
      console.error('Admin auth login error:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Gets the current authenticated admin
   * @returns The current admin or null if not authenticated
   */
  static async getCurrentAuthAdmin() {
    try {
      // 1. Get the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error(sessionError.message);
      }

      if (!sessionData.session?.user) {
        console.log('No authenticated session found');
        return null; // No authenticated user
      }

      console.log('Found authenticated session, checking for admin status');
      
      // Check if the user is an admin in app_metadata first
      const appMetadata = sessionData.session.user.app_metadata;
      let isAdmin = appMetadata?.is_admin === true;
      
      if (!isAdmin) {
        console.log('Not an admin in app_metadata, checking user_metadata');
        // Try user_metadata if app_metadata doesn't have admin flag
        const userMetadata = sessionData.session.user.user_metadata;
        isAdmin = userMetadata?.is_admin === true || 
                 userMetadata?.role === 'sysAdmin' || 
                 userMetadata?.role === 'Admin';
      }
      
      if (!isAdmin) {
        console.log('User is not an admin in any metadata');
        return null; // User is not an admin
      }
      
      console.log('User confirmed as admin, fetching admin record');

      // 2. Get the admin record from the admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single();

      if (adminError) {
        console.error('Error fetching current admin:', adminError);
        
        // Try to get admin by auth_user_id as a fallback
        const { data: adminByAuthId, error: authIdError } = await supabase
          .from('admins')
          .select('*')
          .eq('auth_user_id', sessionData.session.user.id)
          .single();
          
        if (authIdError || !adminByAuthId) {
          console.error('Error fetching admin by auth_user_id:', authIdError);
          return null;
        }
        
        console.log('Found admin by auth_user_id');
        return adminByAuthId as Admin;
      }

      console.log('Found admin record:', adminData?.email);
      return adminData as Admin;
    } catch (error) {
      console.error('Error getting current admin:', error);
      return null;
    }
  }

  /**
   * Signs out the current admin
   */
  static async adminSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw new Error(error.message);
      }
      
      // Clear session storage for backward compatibility
      sessionStorage.removeItem('adminEmail');
      sessionStorage.removeItem('adminRole');
      sessionStorage.removeItem('adminId');
      sessionStorage.removeItem('adminName');
      localStorage.removeItem('adminEmail');
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
  
  // Legacy admin methods (for backward compatibility)
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
      // Try to use Supabase Auth first
      try {
        const admin = await this.adminAuthLogin(email, password);
        if (admin) {
          // Store admin info in session for backward compatibility
          sessionStorage.setItem('adminEmail', admin.email);
          localStorage.setItem('adminEmail', admin.email);
          sessionStorage.setItem('adminRole', admin.role);
          sessionStorage.setItem('adminId', admin.id);
          sessionStorage.setItem('adminName', `${admin.first_name} ${admin.last_name}`);
          
          // Set the admin email in the session
          await supabase.rpc('set_claim', {
            claim: 'app.user_email',
            value: email
          });
          
          return admin;
        }
      } catch (authError) {
        console.log('Supabase Auth failed, falling back to legacy auth:', authError);
        // Fall back to legacy auth if Supabase Auth fails
      }
      
      // Legacy authentication as fallback
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

      // Store admin info in session and localStorage for persistence
      sessionStorage.setItem('adminEmail', admin.email);
      localStorage.setItem('adminEmail', admin.email);
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
      // First check if user is authenticated with Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession();
      let isAuthenticated = false;
      let isSysAdmin = false;
      
      if (sessionData.session?.user) {
        isAuthenticated = true;
        // Check if the user is a sysAdmin in metadata
        const metadata = sessionData.session.user.user_metadata;
        isSysAdmin = metadata?.role === 'sysAdmin';
        
        if (!isSysAdmin) {
          // Try app_metadata if user_metadata doesn't have role
          const appMetadata = sessionData.session.user.app_metadata;
          isSysAdmin = appMetadata?.admin_role === 'sysAdmin';
        }
      }
      
      // Fallback to legacy authentication if not authenticated via Supabase Auth
      if (!isAuthenticated || !isSysAdmin) {
        const adminEmail = sessionStorage.getItem('adminEmail');
        if (!adminEmail) {
          throw new Error('Not authenticated as admin');
        }

        // Check if the current admin is a sysAdmin
        const currentAdmin = await this.getAdminByEmail(adminEmail);
        if (!currentAdmin || currentAdmin.role !== 'sysAdmin') {
          throw new Error('Only system administrators can update admin accounts');
        }
        
        isSysAdmin = true;
      }
      
      if (!isSysAdmin) {
        throw new Error('Only system administrators can update admin passwords');
      }
      
      // Get the admin to update
      const { data: adminToUpdate, error: getError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', adminId)
        .single();
        
      if (getError || !adminToUpdate) {
        throw new Error('Admin not found');
      }
      
      // Update in Supabase Auth if auth_user_id exists
      if (adminToUpdate.auth_user_id) {
        try {
          // Update the password in Supabase Auth
          const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
            adminToUpdate.auth_user_id,
            { password: newPassword }
          );
          
          if (authUpdateError) {
            console.error('Error updating auth user password:', authUpdateError);
            // Continue anyway to update the admin record
          } else {
            console.log('Updated auth user password successfully');
          }
        } catch (authError) {
          console.error('Error updating auth user password:', authError);
          // Continue anyway to update the admin record
        }
      }
      
      // Update the password in the admins table for backward compatibility
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

  // Family management methods
  static async getAllFamilies() {
    try {
      console.log('Getting all families...');
      
      let isAdmin = false;
      
      // Check if user is authenticated with Supabase Auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      const isAuthenticated = !!sessionData?.session;
      
      if (isAuthenticated) {
        console.log('User authenticated with Supabase Auth');
        
        // Get user metadata to check if they're an admin
        const appMetadata = sessionData.session?.user?.app_metadata;
        isAdmin = appMetadata?.is_admin === true;
        
        if (isAdmin) {
          console.log('User is authenticated as admin with Supabase Auth (app_metadata)');
          // Store admin email in both session and local storage for persistence
          const userEmail = sessionData.session?.user?.email;
          if (userEmail) {
            sessionStorage.setItem('adminEmail', userEmail);
            localStorage.setItem('adminEmail', userEmail);
            console.log('Stored admin email in storage for persistence:', userEmail);
          }
        } else {
          console.log('Checking user_metadata for admin status...');
          // Try user_metadata if app_metadata doesn't have admin flag
          const userMetadata = sessionData.session?.user?.user_metadata;
          isAdmin = userMetadata?.is_admin === true || 
                   userMetadata?.role === 'sysAdmin' || 
                   userMetadata?.role === 'Admin';
          
          if (isAdmin) {
            console.log('User is authenticated as admin via user_metadata');
            // Store admin email in both session and local storage for persistence
            const userEmail = sessionData.session?.user?.email;
            if (userEmail) {
              sessionStorage.setItem('adminEmail', userEmail);
              localStorage.setItem('adminEmail', userEmail);
              console.log('Stored admin email in storage for persistence:', userEmail);
            }
          } else {
            console.warn('User is authenticated but not an admin');
          }
        }
      }
      
      // Fallback to legacy authentication if not authenticated via Supabase Auth
      if (!isAuthenticated || !isAdmin) {
        console.warn('No Supabase Auth admin session found, attempting legacy authentication');
        
        const adminEmail = sessionStorage.getItem('adminEmail') || localStorage.getItem('adminEmail');
        if (!adminEmail) {
          console.warn('No admin authentication found in any storage mechanism');
          throw new Error('Not authenticated as admin');
        }
        
        console.log('Found legacy admin authentication:', adminEmail);
        
        // Ensure both storage mechanisms have the admin email for persistence
        sessionStorage.setItem('adminEmail', adminEmail);
        localStorage.setItem('adminEmail', adminEmail);
        
        // Verify admin status
        const adminData = await this.getAdminByEmail(adminEmail);
        if (!adminData) {
          console.log('Admin not found with email:', adminEmail);
          throw new Error('Admin not found');
        }
        
        console.log('Authenticated as admin via legacy method:', adminData.email);
        isAdmin = true;
      }
      
      if (!isAdmin) {
        console.log('User is not an admin');
        throw new Error('Not authorized as admin');
      }
      
      // Set admin flag to bypass RLS - using the correct parameter format from schema.sql
      let adminFlagSet = false;
      try {
        console.log('Setting admin flag to bypass RLS...');
        // The function signature is set_admin_flag(admin BOOLEAN)
        const { data: flagData, error: flagError } = await supabase.rpc('set_admin_flag', { admin: true });
        
        if (flagError) {
          console.error('Error setting admin flag:', flagError);
          // Don't throw here, just log and continue
          console.log('Will attempt to proceed despite admin flag error');
        } else {
          console.log('Admin flag set successfully');
          adminFlagSet = true;
        }
        
        // We'll proceed regardless of whether the flag was set successfully
        // This is a more resilient approach that won't break the entire flow
      } catch (flagError) {
        console.error('Exception setting admin flag:', flagError);
        // Don't throw here, just log and continue
        console.log('Will attempt to proceed despite admin flag exception');
      }

      // Try using the stored procedure first (most reliable approach)
      let familiesData;
      try {
        console.log('Attempting to fetch families using stored procedure...');
        const { data: procData, error: procError } = await supabase
          .rpc('admin_get_all_families');

        if (!procError && procData) {
          console.log('Successfully fetched families using stored procedure');
          // Transform the data to match the expected format
          familiesData = procData.map((family: { id: string; family_name: string; created_at: string; member_count: number }) => ({
            id: family.id,
            family_name: family.family_name,
            created_at: family.created_at
          }));
        } else {
          console.error('Error using stored procedure:', procError);
          console.log('Falling back to regular query...');
          
          // Fallback to regular query
          const { data: regFamilies, error: familiesError } = await supabase
            .from('families')
            .select('*')
            .order('created_at', { ascending: false });

          if (familiesError) {
            console.error('Error fetching families:', familiesError);
            throw new Error(familiesError.message);
          }
          
          familiesData = regFamilies;
        }
      } catch (procCallError) {
        console.error('Exception calling stored procedure:', procCallError);
        console.log('Falling back to regular query...');
        
        // Fallback to regular query
        const { data: regFamilies, error: familiesError } = await supabase
          .from('families')
          .select('*')
          .order('created_at', { ascending: false });

        if (familiesError) {
          console.error('Error fetching families:', familiesError);
          throw new Error(familiesError.message);
        }
        
        familiesData = regFamilies;
      }

      console.log('Families data:', familiesData?.length ? `Found ${familiesData.length} families` : 'No families found');
      
      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(usersError.message);
      }

      console.log('Users data:', usersData?.length ? `Found ${usersData.length} users` : 'No users found');

      // Group users by family_id
      const usersByFamilyId = usersData.reduce((acc: Record<string, User[]>, user) => {
        if (user.family_id) {
          if (!acc[user.family_id]) {
            acc[user.family_id] = [];
          }
          acc[user.family_id].push(user);
        }
        return acc;
      }, {});

      console.log('Users grouped by family_id:', usersByFamilyId);

      // Format the families for display
      const formattedFamilies = familiesData.map((family: { id: string; family_name: string; created_at: string }) => {
        const members = usersByFamilyId[family.id] || [];
        
        return {
          id: family.id,
          familyName: family.family_name,
          members,
          memberCount: members.length,
          createdAt: family.created_at
        };
      });

      console.log('Formatted families:', formattedFamilies);

      // Reset admin flag
      if (adminFlagSet) {
        try {
          const { data: resetData, error: resetError } = await supabase.rpc('set_admin_flag', { admin: false });
          
          if (resetError) {
            throw resetError;
          }
          
          console.log('Admin flag reset successfully:', resetData);
        } catch (flagError) {
          console.error('Error resetting admin flag:', flagError);
        }
      }

      return formattedFamilies;
    } catch (error) {
      console.error('Error getting families:', error);
      throw error;
    }
  }

  static async getFamilyMembersByLastName(lastName: string) {
    try {
      console.log(`Getting family members with last name: ${lastName}`);
      let isAdmin = false;
      
      // Check if user is authenticated with Supabase Auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      const isAuthenticated = !!sessionData?.session;
      
      if (isAuthenticated) {
        console.log('User is authenticated with Supabase Auth');
        // Check app_metadata first
        const appMetadata = sessionData.session?.user?.app_metadata;
        isAdmin = appMetadata?.is_admin === true;
        
        if (!isAdmin) {
          // Try user_metadata if app_metadata doesn't have admin flag
          const userMetadata = sessionData.session?.user?.user_metadata;
          isAdmin = userMetadata?.is_admin === true || 
                   userMetadata?.role === 'sysAdmin' || 
                   userMetadata?.role === 'Admin';
        }
        
        console.log('Is admin from metadata:', isAdmin);
      } else {
        console.log('No Supabase Auth session found, trying legacy authentication');
      }
      
      // Fallback to legacy authentication if not authenticated via Supabase Auth
      if (!isAuthenticated || !isAdmin) {
        const adminEmail = sessionStorage.getItem('adminEmail') || localStorage.getItem('adminEmail');
        if (!adminEmail) {
          console.log('No admin email found in session/local storage');
          throw new Error('Not authenticated as admin');
        }
        
        // Ensure both storage mechanisms have the admin email
        sessionStorage.setItem('adminEmail', adminEmail);
        localStorage.setItem('adminEmail', adminEmail);
        
        // Verify admin status
        const adminData = await this.getAdminByEmail(adminEmail);
        if (!adminData) {
          console.log('Admin not found with email:', adminEmail);
          throw new Error('Admin not found');
        }
        
        console.log('Authenticated as admin via legacy method:', adminData.email);
        isAdmin = true;
      }
      
      if (!isAdmin) {
        console.log('User is not an admin');
        throw new Error('Not authorized as admin');
      }
      
      // Set admin flag to bypass RLS - using the correct parameter format
      let adminFlagSet = false;
      try {
        console.log('Setting admin flag to bypass RLS...');
        const { data: flagData, error: flagError } = await supabase.rpc('set_admin_flag', { admin: true });
        
        if (flagError) {
          console.error('Error setting admin flag:', flagError);
          // Don't throw here, just log and continue
          console.log('Will attempt to proceed despite admin flag error');
        } else {
          console.log('Admin flag set successfully');
          adminFlagSet = true;
        }
        
        // Try a second time if the first attempt failed
        if (!adminFlagSet) {
          console.log('Retrying admin flag setting...');
          const { error: retryError } = await supabase.rpc('set_admin_flag', { admin: true });
          
          if (retryError) {
            console.error('Error in retry setting admin flag:', retryError);
            console.log('Will attempt to proceed despite retry error');
          } else {
            console.log('Admin flag set successfully on retry');
            adminFlagSet = true;
          }
        }
        
        // We'll proceed regardless of whether the flag was set successfully
        // This is a more resilient approach that won't break the entire flow
      } catch (flagError) {
        console.error('Exception setting admin flag:', flagError);
        // Don't throw here, just log and continue
        console.log('Will attempt to proceed despite admin flag exception');
      }

      console.log(`Querying users with last name: ${lastName}`);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('last_name', lastName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
      }
      
      console.log(`Found ${data?.length || 0} users with last name: ${lastName}`);
      
      // Reset admin flag
      if (adminFlagSet) {
        try {
          const { data: resetData, error: resetError } = await supabase.rpc('set_admin_flag', { admin: false });
          
          if (resetError) {
            throw resetError;
          }
          
          console.log('Admin flag reset successfully:', resetData);
        } catch (flagError) {
          console.error('Error resetting admin flag:', flagError);
        }
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async updateUserStatus(userId: string, status: 'Active' | 'Validating' | 'Not Active') {
    try {
      console.log(`Updating user ${userId} status to ${status}`);
      let isAdmin = false;
      
      // First try to authenticate with Supabase Auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      const isAuthenticated = !!sessionData?.session;
      
      if (isAuthenticated) {
        console.log('User is authenticated with Supabase Auth');
        // Check if the user is an admin in app_metadata
        const appMetadata = sessionData.session?.user?.app_metadata;
        isAdmin = appMetadata?.is_admin === true;
        
        if (!isAdmin) {
          // Try user_metadata if app_metadata doesn't have admin flag
          const userMetadata = sessionData.session?.user?.user_metadata;
          isAdmin = userMetadata?.is_admin === true || 
                   userMetadata?.role === 'sysAdmin' || 
                   userMetadata?.role === 'Admin';
        }
        
        console.log('Is admin from metadata:', isAdmin);
      } else {
        console.log('No Supabase Auth session found, trying legacy authentication');
      }
      
      // Fallback to legacy authentication if not authenticated via Supabase Auth
      if (!isAuthenticated || !isAdmin) {
        const adminEmail = sessionStorage.getItem('adminEmail') || localStorage.getItem('adminEmail');
        if (!adminEmail) {
          console.log('No admin email found in session/local storage');
          throw new Error('Not authenticated as admin');
        }
        
        // Verify admin status
        const adminData = await this.getAdminByEmail(adminEmail);
        if (!adminData) {
          console.log('Admin not found with email:', adminEmail);
          throw new Error('Admin not found');
        }
        
        console.log('Authenticated as admin via legacy method:', adminData.email);
        isAdmin = true;
      }
      
      if (!isAdmin) {
        console.log('User is not an admin');
        throw new Error('Not authorized as admin');
      }
      
      // Set admin flag to bypass RLS
      let adminFlagSet = false;
      try {
        const { data: flagData, error: flagError } = await supabase.rpc('set_admin_flag', { admin: true });
        
        if (flagError) {
          throw flagError;
        }
        
        adminFlagSet = true;
        console.log('Admin flag set successfully:', flagData);
      } catch (flagError) {
        console.error('Error setting admin flag:', flagError);
        console.log('Attempting to proceed without admin flag');
      }

      // Update user status
      const { data, error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user status:', error);
        throw new Error(error.message);
      }
      
      console.log(`Successfully updated user ${userId} status to ${status}`);
      
      // Reset admin flag
      if (adminFlagSet) {
        try {
          const { data: resetData, error: resetError } = await supabase.rpc('set_admin_flag', { admin: false });
          
          if (resetError) {
            throw resetError;
          }
          
          console.log('Admin flag reset successfully:', resetData);
        } catch (flagError) {
          console.error('Error resetting admin flag:', flagError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  static async deleteUser(userId: string) {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // First delete all questions by this user
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('user_id', userId);

      if (questionsError) {
        throw new Error(`Error deleting user's questions: ${questionsError.message}`);
      }

      // Then delete the user
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

  // Dashboard statistics methods
  static async getDashboardStats() {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Get total families (unique last names of parent users)
      const { data: parentUsers, error: parentsError } = await supabase
        .from('users')
        .select('last_name')
        .eq('persona', 'Parent');

      if (parentsError) {
        throw new Error(parentsError.message);
      }

      const uniqueFamilies = new Set(parentUsers.map(user => user.last_name));
      
      // Get total active users
      const { count: activeUsers, error: activeError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      if (activeError) {
        throw new Error(activeError.message);
      }

      // Get total questions
      const { count: totalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (questionsError) {
        throw new Error(questionsError.message);
      }

      // Get recent activity (last 5 users and questions)
      const { data: recentUsers, error: recentUsersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentUsersError) {
        throw new Error(recentUsersError.message);
      }

      const { data: recentQuestions, error: recentQuestionsError } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentQuestionsError) {
        throw new Error(recentQuestionsError.message);
      }

      return {
        totalFamilies: uniqueFamilies.size,
        totalUsers: activeUsers,
        totalQuestions,
        recentUsers,
        recentQuestions
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

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
   * Generates a family invite code
   * @returns The generated invite code
   */
  static async generateFamilyInviteCode(): Promise<string> {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const currentUser = await this.verifyUserStatus(userEmail);
      
      if (!currentUser.family_id) {
        throw new Error('You do not belong to a family');
      }
      
      // Since we're removing invite code functionality, just return a placeholder
      // This method is kept for backward compatibility but is no longer functional
      return 'INVITE_CODE_REMOVED';
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
  
  /**
   * Joins a family with an invite code
   * @param inviteCode The invite code to join with
   * @returns Whether the join was successful
   */
  static async joinFamilyWithCode(inviteCode: string): Promise<boolean> {
    try {
      // Since we're removing invite code functionality, this method is no longer functional
      // Kept for backward compatibility
      throw new Error('Invite code functionality has been removed');
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Adds a member to an existing family
   * @param familyId The ID of the family to add the member to
   * @param userData The data for the new family member
   * @returns The created user
   */
  static async addMemberToFamily(familyId: string, userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister';
    persona: 'Parent' | 'Children';
    status: 'Active' | 'Validating' | 'Not Active';
  }) {
    try {
      console.log('Adding member to family with ID:', familyId);
      
      // Set the admin flag to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });

      try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Get the admin email from session storage
        const adminEmail = sessionStorage.getItem('adminEmail');
        if (!adminEmail) {
          throw new Error('Admin not authenticated. Please log in again.');
        }
        
        // Get the admin ID from the database
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('email', adminEmail)
          .single();
          
        if (adminError || !admin) {
          console.error('Error getting admin:', adminError);
          throw new Error('Admin not found. Please log in again.');
        }
        
        // First verify the family exists
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();
          
        if (familyError || !family) {
          console.error('Family not found:', familyError);
          throw new Error(`Family with ID ${familyId} not found`);
        }
        
        console.log('Found family:', family);
        
        // Create the user with the family_id
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            persona: userData.persona,
            status: userData.status,
            family_id: familyId
          })
          .select()
          .single();
        
        if (userError) {
          console.error('Error creating user:', userError);
          throw userError;
        }
        
        console.log('Successfully added member to family:', user);
        return user;
      } finally {
        // Always reset the admin flag, even if there's an error
        try {
          await supabase.rpc('set_admin_flag', { admin: false });
        } catch (e) {
          console.error('Error resetting admin flag:', e);
        }
      }
    } catch (error) {
      console.error('Error adding member to family:', error);
      throw error;
    }
  }
  
  /**
   * Gets a family by ID
   * @param familyId The ID of the family to get
   * @returns The family and its members
   */
  static async getFamilyById(familyId: string) {
    try {
      // Get the admin email from session storage
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Admin not authenticated. Please log in again.');
      }
      
      // Set the admin flag to bypass RLS policies
      await supabase.rpc('set_admin_flag', { admin: true });

      try {
        // Get the family
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();
        
        if (familyError) {
          console.error('Error getting family:', familyError);
          throw familyError;
        }
        
        // Get the family members
        const { data: members, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('family_id', familyId);
        
        if (membersError) {
          console.error('Error getting family members:', membersError);
          throw membersError;
        }
        
        console.log('Family members:', members);
        
        return {
          ...family,
          members
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
      throw error;
    }
  }
  
  /**
   * Gets all families with their members
   * @returns A list of families with their members
   */
  static async getAllFamiliesWithMembers() {
    try {
      // Get the admin email from session storage
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Admin not authenticated. Please log in again.');
      }
      
      // Set the admin flag to bypass RLS policies
      await supabase.rpc('set_admin_flag', { admin: true });

      try {
        // Get all users with their family_id
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*, family:family_id(id, family_name, created_at)')
          .not('family_id', 'is', null);
        
        if (usersError) {
          console.error('Error getting users:', usersError);
          throw usersError;
        }
        
        console.log('Users:', users);
        
        // Group users by family
        const familiesMap = new Map();
        
        users.forEach(user => {
          if (!user.family) return;
          
          const familyId = user.family.id;
          
          if (!familiesMap.has(familyId)) {
            familiesMap.set(familyId, {
              familyId: familyId,
              familyName: user.family.family_name,
              createdAt: user.family.created_at,
              members: [],
              memberCount: 0
            });
          }
          
          const family = familiesMap.get(familyId);
          family.members.push(user);
          family.memberCount++;
        });
        
        console.log('Families map:', familiesMap);
        
        return Array.from(familiesMap.values());
      } finally {
        // Always reset the admin flag, even if there's an error
        try {
          await supabase.rpc('set_admin_flag', { admin: false });
        } catch (e) {
          console.error('Error resetting admin flag:', e);
        }
      }
    } catch (error) {
      console.error('Error getting all families with members:', error);
      throw error;
    }
  }

  static async createDefaultQuestions(userId: string) {
    try {
      console.log('Creating default questions for user ID:', userId);
      
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });

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
        // Reset the is_admin flag after operation
        try {
          await supabase.rpc('set_admin_flag', { admin: false });
        } catch (e) {
          console.error('Error resetting admin flag:', e);
        }
      }
    } catch (error) {
      console.error('Error creating default questions:', error);
      throw error;
    }
  }
  
  static async createFamilyWithMember(familyName: string, userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister';
    persona: 'Parent' | 'Children';
    status: 'Active' | 'Validating' | 'Not Active';
  }) {
    try {
      console.log('Creating family with name:', familyName);
      console.log('First member data:', { ...userData, password: '[REDACTED]' });
      
      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      let isAdmin = false;
      let adminFlagSet = false;
      
      // First try to authenticate with Supabase Auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      const isAuthenticated = !!sessionData?.session;
      
      if (isAuthenticated) {
        console.log('User is authenticated with Supabase Auth');
        // Check if the user is an admin in app_metadata
        const appMetadata = sessionData.session?.user?.app_metadata;
        isAdmin = appMetadata?.is_admin === true;
        
        if (!isAdmin) {
          // Try user_metadata if app_metadata doesn't have admin flag
          const userMetadata = sessionData.session?.user?.user_metadata;
          isAdmin = userMetadata?.is_admin === true || 
                   userMetadata?.role === 'sysAdmin' || 
                   userMetadata?.role === 'Admin';
        }
        
        console.log('Is admin from metadata:', isAdmin);
      } else {
        console.log('No Supabase Auth session found, trying legacy authentication');
      }
      
      // Fallback to legacy authentication if not authenticated via Supabase Auth
      if (!isAuthenticated || !isAdmin) {
        const adminEmail = sessionStorage.getItem('adminEmail') || localStorage.getItem('adminEmail');
        if (!adminEmail) {
          console.log('No admin email found in session/local storage');
          throw new Error('Not authenticated as admin');
        }
        
        // Verify admin status
        const adminData = await this.getAdminByEmail(adminEmail);
        if (!adminData) {
          console.log('Admin not found with email:', adminEmail);
          throw new Error('Admin not found');
        }
        
        console.log('Authenticated as admin via legacy method:', adminData.email);
        isAdmin = true;
      }
      
      if (!isAdmin) {
        console.log('User is not an admin');
        throw new Error('Not authorized as admin');
      }
      
      // Set admin flag to bypass RLS - using the correct parameter format
      try {
        console.log('Setting admin flag to bypass RLS...');
        
        // Attempt to set the admin flag
        const { data: flagData, error: flagError } = await supabase.rpc('set_admin_flag', { admin: true });
        
        if (flagError) {
          console.error('Error setting admin flag:', flagError);
          // Don't throw here, just log and continue
          console.log('Will attempt to proceed despite admin flag error');
        } else {
          console.log('Admin flag set successfully');
          adminFlagSet = true;
        }
        
        // Try a second time if the first attempt failed
        if (!adminFlagSet) {
          console.log('Retrying admin flag setting...');
          const { error: retryError } = await supabase.rpc('set_admin_flag', { admin: true });
          
          if (retryError) {
            console.error('Error in retry setting admin flag:', retryError);
            console.log('Will attempt to proceed despite retry error');
          } else {
            console.log('Admin flag set successfully on retry');
            adminFlagSet = true;
          }
        }
        
        // We'll proceed regardless of whether the flag was set successfully
        // This is a more resilient approach that won't break the entire flow
      } catch (flagError) {
        console.error('Exception setting admin flag:', flagError);
        // Don't throw here, just log and continue
        console.log('Will attempt to proceed despite admin flag exception');
      }

      try {
        // First create the family using a stored procedure to bypass RLS
        // This is a more reliable approach than setting the admin flag
        console.log('Creating family record using stored procedure...');
        
        // Create a stored procedure call that will create the family and return its ID
        const { data: familyData, error: familyProcError } = await supabase
          .rpc('admin_create_family', { 
            p_family_name: familyName 
          });

        if (familyProcError) {
          console.error('Error creating family via procedure:', familyProcError);
          
          // Fallback to direct insert if the procedure fails
          console.log('Falling back to direct insert...');
          const { data: family, error: familyError } = await supabase
            .from('families')
            .insert({
              family_name: familyName,
            })
            .select('*')
            .single();

          if (familyError) {
            console.error('Error creating family via direct insert:', familyError);
            throw familyError;
          }
          
          console.log('Created family via fallback:', family);
          return { family, user: null }; // Early return with partial success
        }
        
        // If we get here, the procedure worked
        const family = {
          id: familyData.family_id,
          family_name: familyName,
          created_at: new Date().toISOString()
        };
        
        console.log('Created family via procedure:', family);

        // Then create the user with family_id
        console.log('Creating user record...');
        
        // Set admin flag again to ensure we can create the user
        try {
          console.log('Setting admin flag for user creation...');
          await supabase.rpc('set_admin_flag', { admin: true });
        } catch (flagError) {
          console.error('Error setting admin flag for user creation:', flagError);
          // Continue anyway
        }
        
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            persona: userData.persona,
            status: userData.status,
            family_id: family.id
          })
          .select()
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          // Don't throw here, just return the family without the user
          console.log('Returning family without user due to user creation error');
          return { family, user: null };
        }
        
        console.log('Created user:', user);
        
        // Update the family with user_ref
        console.log('Updating family with user reference...');
        const { data: updatedFamily, error: updateError } = await supabase
          .from('families')
          .update({ user_ref: user.id })
          .eq('id', family.id)
          .select('*')
          .single();
        
        if (updateError) {
          console.error('Error updating family with user ref:', updateError);
          throw updateError;
        }

        // Create default questions for the user
        console.log('Creating default questions for user:', user.id);
        await SupabaseService.createDefaultQuestions(user.id);

        console.log('Successfully created family with member and default questions');
        return {
          family: updatedFamily,
          user
        };
      } finally {
        // Reset the admin flag after operation
        if (adminFlagSet) {
          try {
            console.log('Resetting admin flag...');
            const { data: resetData, error: resetError } = await supabase.rpc('set_admin_flag', { admin: false });
            
            if (resetError) {
              console.error('Error resetting admin flag:', resetError);
            } else {
              console.log('Admin flag reset successfully:', resetData);
            }
          } catch (e) {
            console.error('Error resetting admin flag:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error creating family with member:', error);
      throw error;
    }
  }
}
