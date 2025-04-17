import { supabase } from '@/lib/supabase';
import { User, Family } from '@/lib/supabase';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number | null;
  totalQuestions: number | null; // Keeping in interface for type compatibility
  recentUsers: User[];
  recentQuestions: any[]; // Keeping in interface for type compatibility
}

export class AdminDashboardService {
  /**
   * Get dashboard statistics for admin dashboard
   * @returns Dashboard statistics including counts and recent items
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Verify admin is authenticated
      const adminEmail = sessionStorage.getItem('adminEmail');
      if (!adminEmail) {
        throw new Error('Not authenticated as admin');
      }

      // Get total families count
      const { count: totalFamilies, error: familiesError } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true });

      if (familiesError) {
        throw new Error(`Error fetching families: ${familiesError.message}`);
      }

      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        throw new Error(`Error fetching users: ${usersError.message}`);
      }

      // Get recent users (limit to 5)
      const { data: recentUsers, error: recentUsersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentUsersError) {
        throw new Error(`Error fetching recent users: ${recentUsersError.message}`);
      }

      // Return empty array for questions as requested
      const recentQuestions: any[] = [];
      
      return {
        totalFamilies: totalFamilies || 0,
        totalUsers: totalUsers || 0,
        totalQuestions: null, // As requested, not counting questions
        recentUsers: recentUsers || [],
        recentQuestions: recentQuestions
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Get all families
   * @returns List of all families
   */
  static async getAllFamilies(): Promise<Family[]> {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .order('family_name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Get users by family ID
   * @param familyId Family ID
   * @returns List of users in the specified family
   */
  static async getUsersByFamilyId(familyId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}
