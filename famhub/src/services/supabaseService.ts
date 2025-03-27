import { supabase } from '@/lib/supabase'
import { User, Question, QuestionWithUser, Admin, Family } from '@/lib/supabase'
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
      await this.verifyUserStatus(userEmail);

      const { data, error } = await supabase
        .rpc('get_family_members', { p_user_email: userEmail });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
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
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }
      
      // Get current admin to check permissions
      const currentAdmin = await this.getAdminByEmail(adminEmail);
      
      // Client-side permission check
      if (currentAdmin && currentAdmin.role !== 'sysAdmin' && adminData.role === 'sysAdmin') {
        throw new Error('You do not have permission to create system admin accounts');
      }
      
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
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

  // Family management methods
  static async getAllFamilies() {
    try {
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      console.log('Getting all families...');
      
      // Set admin flag to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });

      // Get all families
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('*')
        .order('created_at', { ascending: false });

      if (familiesError) {
        console.error('Error fetching families:', familiesError);
        throw new Error(familiesError.message);
      }

      console.log('Families data:', familiesData);

      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Reset admin flag
      await supabase.rpc('set_admin_flag', { admin: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(usersError.message);
      }

      console.log('Users data:', usersData);

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
      const formattedFamilies = familiesData.map(family => {
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

      return formattedFamilies;
    } catch (error) {
      console.error('Error getting families:', error);
      throw error;
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

  static async createDefaultQuestions(userId: string) {
    try {
      console.log('Creating default questions for user ID:', userId);
      
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });

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
      
      // Placeholder image URL for default questions
      const placeholderImageUrl = "https://via.placeholder.com/300x200?text=Family+Connect";
      
      // Create questions in batch
      const questionsToInsert = defaultQuestions.map(question => ({
        user_id: userId,
        question: question,
        file_url: placeholderImageUrl,
        folder_path: folderPath,
        media_type: 'image', // Using 'image' as it's a valid enum value
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
      
      // Reset the is_admin flag
      await supabase.rpc('set_admin_flag', { admin: false });
      
      if (successCount === 0) {
        throw new Error('Failed to insert any default questions');
      }
      
      console.log(`Successfully created ${successCount} default questions`);
      return { count: successCount };
    } catch (error) {
      console.error('Error creating default questions:', error);
      // Reset the is_admin flag in case of error
      await supabase.rpc('set_admin_flag', { admin: false });
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
      
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });
      
      // Get the admin ID from the session
      const adminEmail = sessionStorage.getItem('adminEmail');
      let adminId = null;
      
      if (adminEmail) {
        const { data: admin } = await supabase
          .from('admins')
          .select('id')
          .eq('email', adminEmail)
          .single();
          
        if (admin) {
          adminId = admin.id;
        }
      }
      
      // First create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          family_name: familyName,
          admin_id: adminId
        })
        .select()
        .single();
      
      if (familyError) {
        console.error('Error creating family:', familyError);
        await supabase.rpc('set_admin_flag', { admin: false });
        throw familyError;
      }
      
      console.log('Created family:', family);
      
      // Then create the user with the family_id
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
        await supabase.rpc('set_admin_flag', { admin: false });
        throw userError;
      }
      
      console.log('Created user:', user);
      
      // Update the family with the user_ref
      const { error: updateError } = await supabase
        .from('families')
        .update({ user_ref: user.id })
        .eq('id', family.id);
      
      if (updateError) {
        console.error('Error updating family with user_ref:', updateError);
        // Continue even if this fails, as the core functionality is still working
      }
      
      // Create default questions for the new family
      try {
        await this.createDefaultQuestions(user.id);
      } catch (error) {
        console.error('Error creating default questions:', error);
        // Continue even if creating default questions fails
      }
      
      // Reset the is_admin flag
      await supabase.rpc('set_admin_flag', { admin: false });
      
      return {
        family,
        user
      };
    } catch (error) {
      console.error('Error creating family with member:', error);
      throw error;
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
      
      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });
      
      // First verify the family exists
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('id, family_name')
        .eq('id', familyId)
        .single();
        
      if (familyError || !family) {
        console.error('Family not found:', familyError);
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      console.log('Found family:', family);
      
      // Create the user with the family_id
      const userData_with_family = {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        persona: userData.persona,
        status: userData.status,
        family_id: familyId
      };
      
      console.log('Creating user with data:', { ...userData_with_family, password: '[REDACTED]' });
      
      const { data, error } = await supabase
        .from('users')
        .insert(userData_with_family)
        .select()
        .single();
      
      // Reset the is_admin flag
      await supabase.rpc('set_admin_flag', { admin: false });
      
      if (error) {
        console.error('Error adding member to family:', error);
        throw error;
      }
      
      console.log('Successfully added member to family:', data);
      return data;
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
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });

      // Get the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();
      
      if (familyError) throw familyError;
      
      // Get the family members
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', familyId);
      
      if (membersError) throw membersError;
      
      // Reset the is_admin flag
      await supabase.rpc('set_admin_flag', { admin: false });
      
      return {
        ...family,
        members
      };
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
      // Set the is_admin flag to true to bypass RLS
      await supabase.rpc('set_admin_flag', { admin: true });
      
      // Get all users with their family_id
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, family:family_id(id, family_name, created_at)')
        .not('family_id', 'is', null);
      
      if (usersError) throw usersError;
      
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
      
      // Reset the is_admin flag
      await supabase.rpc('set_admin_flag', { admin: false });
      
      return Array.from(familiesMap.values());
    } catch (error) {
      console.error('Error getting all families:', error);
      throw error;
    }
  }
}
