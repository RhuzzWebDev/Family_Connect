import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface FamilyInvite {
  id: string;
  family_id: string;
  invite_token: string;
  created_by?: string | null;
  created_at: string;
  used: boolean;
  used_at?: string | null;
  family_name?: string;
  families?: { family_name: string };
}

export interface FamilyInviteRegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
  role: string;
  persona: 'Parent' | 'Children';
  bio?: string;
  family_id: string;
}

const FAMILY_INVITES_TABLE = 'family_invites';
const USERS_TABLE = 'users';

export const FamilyInviteService = {
  /**
   * Generates a unique invite token tied to a family_id and stores it in the family_invites table.
   */
  async createInvite(family_id: string, created_by?: string): Promise<FamilyInvite | null> {
    // First, check for an existing unused invite for this family
    const { data: existingInvite, error: fetchError } = await supabase
      .from(FAMILY_INVITES_TABLE)
      .select('*')
      .eq('family_id', family_id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) {
      console.error('Error checking existing invite:', fetchError);
      return null;
    }
    if (existingInvite) {
      return existingInvite as FamilyInvite;
    }
    // No unused invite, create a new one
    const invite_token = uuidv4();
    const insertObj: any = {
      family_id,
      invite_token,
      used: false,
    };
    if (created_by) insertObj.created_by = created_by;
    const { data, error } = await supabase
      .from(FAMILY_INVITES_TABLE)
      .insert([insertObj])
      .select()
      .single();
    if (error) {
      console.error('Error creating invite:', error);
      return null;
    }
    return data as FamilyInvite;
  },

  /**
   * Validates an invite token and fetches the associated family_id if valid and not used/expired.
   */
  async validateInvite(token: string): Promise<FamilyInvite | null> {
    const { data, error } = await supabase
      .from(FAMILY_INVITES_TABLE)
      .select('*, families(family_name)')
      .eq('invite_token', token)
      .single();
    if (error || !data) {
      console.error('Error validating invite:', error);
      return null;
    }
    if (data.used) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    
    // Extract family name from the joined table
    const family_name = data.families?.family_name || null;
    return { ...data, family_name } as FamilyInvite;
  },

  /**
   * Marks an invite token as used after successful registration.
   */
  async markInviteUsed(token: string): Promise<boolean> {
    const { error } = await supabase
      .from(FAMILY_INVITES_TABLE)
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('invite_token', token);
    
    if (error) {
      console.error('Error marking invite as used:', error);
      return false;
    }
    return true;
  },

  /**
   * Registers a new user using the invite, pre-filling the family_id and collecting other required fields.
   */
  async registerWithInvite(
    registrationData: FamilyInviteRegistrationData,
    inviteToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check invite validity
      const invite = await this.validateInvite(inviteToken);
      if (!invite) {
        return { success: false, error: 'Invalid or expired invite token.' };
      }
      
      // Hash the password using bcrypt (same as in UserService)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(registrationData.password, salt);
      
      // Generate a UUID for the user
      const userId = uuidv4();
      
      // Insert new user with hashed password
      const { error: userError } = await supabase.from(USERS_TABLE).insert([
        {
          id: userId,
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          email: registrationData.email,
          password: hashedPassword, // Use the hashed password
          phone_number: registrationData.phone_number || '',
          bio: registrationData.bio || '',
          role: registrationData.role,
          persona: registrationData.persona,
          family_id: invite.family_id,
          status: 'Active',
          created_at: new Date().toISOString(),
        },
      ]);
      
      if (userError) {
        console.error('Error registering user with invite:', userError);
        return { success: false, error: userError.message };
      }
      
      // Mark invite as used
      await this.markInviteUsed(inviteToken);
      return { success: true };
    } catch (err: any) {
      console.error('Error in registerWithInvite:', err);
      return { success: false, error: err.message || 'Registration failed' };
    }
  },
};
