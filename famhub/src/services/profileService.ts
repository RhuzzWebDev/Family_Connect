import { supabase } from './userService';
import { UserProfile } from './userService';

export class ProfileService {
  // Get current user's profile
  static async getProfile(email: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }

  // Update profile
  static async updateProfile(
    userId: string, 
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    console.log('Attempting to update profile with:', updates);
    
    // First perform the update
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return null;
    }

    console.log('Update successful, fetching updated profile');
    
    // Then fetch the updated profile
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return null;
    }

    console.log('Updated profile data:', data);
    return data;
  }

  // Update avatar URL
  static async updateAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      console.error('Error updating avatar:', error);
      return false;
    }
    return true;
  }
}
