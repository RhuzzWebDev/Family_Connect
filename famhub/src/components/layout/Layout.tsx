'use client';

import { useSession } from "next-auth/react";
import Navbar from "./Navbar";
import { InnerNavbar } from "./InnerNavbar";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HomeIcon, Users, Calendar, MessageSquare } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '';
  
  // While session is loading, just show children without layout
  if (status === 'loading') {
    return <>{children}</>;
  }

  // If not authenticated, just show children without layout
  if (status !== 'authenticated' || !session?.user) {
    return <>{children}</>;
  }

  // Show inner navigation for main app sections
  const showInnerNav = pathname.includes('/dashboard') || 
                      pathname.includes('/questions') || 
                      pathname.includes('/events') || 
                      pathname.includes('/members');
  
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ background: '#171821' }}>
      {/* Header - visible to all */}
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto" style={{ background: '#1E1F29', borderRight: '1px solid #232336' }}>
          <div className="flex flex-col space-y-1 pt-4">
            <Link 
              href="/dashboard" 
              className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none group"
            >
              <HomeIcon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white" />
              <span>Welcome</span>
            </Link>
            
            <Link 
              href="/events" 
              className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none group"
            >
              <Calendar className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white" />
              <span>Events</span>
            </Link>
            
            <Link 
              href="/members" 
              className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none group"
            >
              <Users className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white" />
              <span>Members</span>
            </Link>
            
            <div className="px-3 pt-5 pb-2">
              <div className="flex items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Get Started</span>
                <button className="ml-auto">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <Link 
              href="/community" 
              className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none group pl-6"
            >
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center mr-3 text-xs">A</div>
              <span>All Community Members</span>
            </Link>
            
            <Link 
              href="/explore" 
              className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none group mt-5"
            >
              <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Explore</span>
            </Link>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-[#0F1017]">
          {showInnerNav && <InnerNavbar />}
          <div className="container mx-auto py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
