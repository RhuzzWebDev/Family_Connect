import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { supabase } from '@/services/userService';
import bcrypt from 'bcryptjs';

// Ensure environment variables are set
const checkEnv = () => {
  const requiredEnvVars = ['NEXTAUTH_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please create a .env.local file with these variables');
  }
};

checkEnv();

export const authOptions: NextAuthOptions = {
  // Ensure a secret is always provided
  secret: process.env.NEXTAUTH_SECRET || 'TEMPORARY_SECRET_FOR_DEVELOPMENT',
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .maybeSingle();
        if (!user || error) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        // Return user with proper type casting
        return {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          status: user.status,
          role: user.role,
          familyId: user.family_id,
          persona: user.persona
        } as any; // Type cast to avoid TypeScript errors
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Type cast user to avoid TypeScript errors
        const typedUser = user as any;
        token.id = typedUser.id;
        token.status = typedUser.status;
        token.role = typedUser.role;
        token.familyId = typedUser.familyId;
        token.persona = typedUser.persona;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Type cast token and session to avoid TypeScript errors
        const typedToken = token as any;
        const typedSession = session as any;
        typedSession.user.id = typedToken.id;
        typedSession.user.status = typedToken.status;
        typedSession.user.role = typedToken.role;
        typedSession.user.familyId = typedToken.familyId;
        typedSession.user.persona = typedToken.persona;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect callback - URL:', url);
      console.log('NextAuth redirect callback - Base URL:', baseUrl);
      
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        console.log('Returning relative URL:', `${baseUrl}${url}`);
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        console.log('Returning same-origin URL:', url);
        return url;
      }
      
      console.log('Returning base URL:', baseUrl);
      return baseUrl;
    }
  }
};

// Create a handler function that can be exported
const handler = NextAuth(authOptions);

// Export the handler as both default and named export
export { handler as GET, handler as POST };
export default handler;
