import { supabase } from '@/lib/supabase';
import { Admin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export class AdminLoginService {
  /**
   * Get an admin by email
   * @param email Admin's email
   * @returns Admin object or null if not found
   */
  static async getAdminByEmail(email: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select()
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No admin found
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  /**
   * Verify admin credentials
   * @param email Admin's email
   * @param password Admin's password
   * @returns Admin object if credentials are valid, null otherwise
   */
  static async verifyAdmin(email: string, password: string): Promise<Admin | null> {
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

  /**
   * Create a new admin
   * @param adminData Admin data without id and created_at
   * @returns Created admin object
   */
  static async createAdmin(adminData: Omit<Admin, 'id' | 'created_at'>) {
    try {
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
}
