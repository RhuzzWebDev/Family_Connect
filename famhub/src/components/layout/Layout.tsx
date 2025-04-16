'use client';

import { useSession } from "@/hooks/useSession";
import { Navbar } from "./Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HomeIcon, Users, Calendar, MessageSquare } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isClient, userEmail } = useSession();

  if (!isClient) {
    return <>{children}</>;
  }

  if (!userEmail) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r border-gray-700 min-h-[calc(100vh-4rem)] sticky top-16" style={{ background: '#1E1F29' }}>
          <div style={{ color: '#fff' }}>
          <Button
              variant="ghost"
              className="border border-transparent justify-start gap-2 hover:bg-transparent focus:bg-transparent active:bg-transparent hover:shadow-lg hover:border-white hover:font-bold transition-shadow"
              size="lg"
              asChild
              style={{ color: '#fff' }}
            >
              <Link href="/dashboard">
                <HomeIcon className="w-5 h-5" />
                Family Feed
              </Link>
            </Button> 
          <Button
              variant="ghost"
              className="border border-transparent justify-start gap-2 hover:bg-transparent focus:bg-transparent active:bg-transparent hover:shadow hover:border-white hover:font-bold transition-shadow"
              size="lg"
              asChild
              style={{ color: '#fff' }}
            >
              <Link href="/family">
                <Users className="w-5 h-5" />
                Family Members
              </Link>
            </Button>
          <Button
              variant="ghost"
              className="border border-transparent justify-start gap-2 hover:bg-transparent focus:bg-transparent active:bg-transparent hover:shadow hover:border-white hover:font-bold transition-shadow"
              size="lg"
              asChild
              style={{ color: '#fff' }}
            >
              <Link href="/calendar">
                <Calendar className="w-5 h-5" />
                Family Calendar
              </Link>
            </Button>
          <Button
              variant="ghost"
              className="border border-transparent justify-start gap-2 hover:bg-transparent focus:bg-transparent active:bg-transparent hover:shadow hover:border-white hover:font-bold transition-shadow"
              size="lg"
              asChild
              style={{ color: '#fff' }}
            >
              <Link href="/messages">
                <MessageSquare className="w-5 h-5" />
                Messages
              </Link>
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
