import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/debug'];

// List of API routes that don't require authentication
const publicApiRoutes = ['/api/auth'];

// List of static assets that don't need authentication checks
const staticAssets = ['/images', '/fonts', '/favicon.ico', '/robots.txt', '/_next'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets and Next.js internals
  if (staticAssets.some(asset => pathname.startsWith(asset))) {
    return NextResponse.next();
  }
  
  // Check if the route is public
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    publicApiRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }
  
  try {
    // Check if the user is authenticated
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'TEMPORARY_SECRET_FOR_DEVELOPMENT',
    });
    
    // If not authenticated and not accessing a public route, redirect to login
    if (!token) {
      const url = new URL('/login', request.url);
      
      // Fix the callbackUrl to ensure it's properly encoded
      if (pathname.startsWith('/dashboard')) {
        url.searchParams.set('callbackUrl', '/dashboard');
      } else {
        url.searchParams.set('callbackUrl', pathname);
      }
      
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's an error in the middleware, allow the request to continue
    // This prevents authentication errors from blocking the entire application
    return NextResponse.next();
  }
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api/auth (NextAuth.js API routes)
     * 3. /_vercel (Vercel internals)
     * 4. /static (static files)
     * 5. All files in the public directory
     */
    '/((?!_next|api/auth|_vercel|static|.*\\..*|_next/static|_next/image|favicon.ico).*)',
    // Include dashboard routes explicitly
    '/dashboard/:path*',
  ],
};
