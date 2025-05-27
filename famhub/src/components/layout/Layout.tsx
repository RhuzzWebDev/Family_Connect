'use client';

import { Navbar } from './Navbar';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { InnerNavbar } from './InnerNavbar';
import { memo } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HomeIcon, Users, Calendar, MessageSquare, Group, PersonStanding } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink = memo(({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <Link 
    href={href}
    prefetch
    className="flex items-center px-4 py-2.5 text-sm font-medium text-white hover:bg-[#232336] rounded-none transition-colors duration-200 will-change-transform"
  >
    <Icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white transition-colors duration-200" />
    <span className="transition-colors duration-200">{children}</span>
  </Link>
));

NavLink.displayName = 'NavLink';

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const pathname = usePathname() || '';
  
  // Show inner navigation for main app sections
  const showInnerNav = pathname.includes('/dashboard') || 
                      pathname.includes('/questions') || 
                      pathname.includes('/events') || 
                      pathname.includes('/members');
  
  return (
    <div className="min-h-screen bg-[#0F1017]">
      {/* Header - visible to all */}
      <div className="sticky top-0 z-50 transition-all duration-300 will-change-transform">
        <Navbar />
      </div>
      
      <div className="flex flex-1 transition-opacity duration-300 will-change-opacity">
        {/* Sidebar */}
        <aside className="w-64 hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300 will-change-transform" 
              style={{ background: '#1E1F29', borderRight: '1px solid #232336' }}>
          <div className="flex flex-col space-y-1 pt-4">
            <NavLink href="/dashboard" icon={HomeIcon}>Welcome</NavLink>
            <NavLink href="/events" icon={Calendar}>Events</NavLink>
            <NavLink href="/members" icon={Users}>Members</NavLink>
            <NavLink href="/family" icon={PersonStanding}>Family</NavLink>
            
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
            
            <NavLink href="/community" icon={MessageSquare}>All Community Members</NavLink>
            
            <NavLink href="/explore" icon={Group}>Explore</NavLink>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-[#0F1017] transition-all duration-300 will-change-transform">
          {showInnerNav && <InnerNavbar />}
          <div className="container mx-auto py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
