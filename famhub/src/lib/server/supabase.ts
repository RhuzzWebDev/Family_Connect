import { createClient, PostgrestError } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Create a Supabase client for server components
export async function createServerSupabaseClient() {
  // Get the user's email from the NextAuth session
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
      },
      global: {
        // Set the user context for RLS policies if available
        headers: userEmail ? {
          'X-User-Email': userEmail
        } : undefined
      }
    }
  );
  
  // Set user context for RLS policies if available
  if (userEmail) {
    // This is a workaround for the fact that we're using custom auth
    // and not Supabase Auth. In a real app with Supabase Auth, you'd use
    // the session cookie automatically.
    const rpcCall = supabase.rpc('set_app_user', { p_email: userEmail });
    
    // Handle the promise properly
    void rpcCall.then(null, (err: PostgrestError) => {
      console.error('Error setting user context:', err);
    });
  }
  
  return supabase;
}
