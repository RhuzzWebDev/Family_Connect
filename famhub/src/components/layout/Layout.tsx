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
        <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r min-h-[calc(100vh-4rem)] sticky top-16">
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/dashboard">
              <HomeIcon className="w-5 h-5" />
              Family Feed
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/members">
              <Users className="w-5 h-5" />
              Family Members
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/calendar">
              <Calendar className="w-5 h-5" />
              Family Calendar
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/messages">
              <MessageSquare className="w-5 h-5" />
              Messages
            </Link>
          </Button>
        </aside>

        {/* Main content */}
        <main>
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
