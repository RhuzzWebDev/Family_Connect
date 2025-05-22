import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id */
      id: string;
      /** The user's role */
      role: string;
      /** The user's family id */
      familyId: string;
      /** The user's persona */
      persona: string;
      /** The user's status */
      status: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    familyId: string;
    persona: string;
    status: string;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's id */
    id: string;
    /** The user's role */
    role: string;
    /** The user's family id */
    familyId: string;
    /** The user's persona */
    persona: string;
    /** The user's status */
    status: string;
  }
}
