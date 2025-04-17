import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
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

export class UserService {
  // Set user email in Supabase context for RLS policies
  private static async setUserContext(email: string) {
    await supabase.rpc('set_app_user', { p_email: email });
  }
  
  // Hash a password using bcrypt
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Register user directly in the users table (native auth)
  static async registerUser({ email, password, first_name, last_name, role, persona, bio, phone_number, family_id }: Omit<UserProfile, 'id' | 'status' | 'created_at'> & { password: string }) {
    try {
      // 1. Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) throw new Error('User with this email already exists');
      
      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // 3. Insert new user into users table
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: uuidv4(), // Generate a UUID for the user
          email,
          password: hashedPassword,
          first_name,
          last_name,
          role,
          persona,
          bio: bio || '',
          phone_number: phone_number || '',
          family_id: family_id || null,
          status: 'Validating' // Set initial status as Validating
        })
        .select('id, email')
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Failed to create user');
      
      // Store user email in session storage (handled in the component)
      return data.id;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Get user profile by id
  static async getUserProfile(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return null;
    return data as UserProfile;
  }

  // Login user with email and password
  static async loginUser(email: string, password: string): Promise<UserProfile> {
    try {
      // 1. Find user by email
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw new Error('Invalid email or password');
      if (!user) throw new Error('User not found');

      // 2. Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) throw new Error('Invalid email or password');

      // 3. Set user context for RLS policies
      await UserService.setUserContext(email);

      // 4. Store user email in session storage (handled in the component)
      return user as UserProfile;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
}
