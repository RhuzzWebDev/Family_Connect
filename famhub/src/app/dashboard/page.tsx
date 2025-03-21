'use client';

import { useEffect } from 'react';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Home as HomeIcon, Users, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r min-h-[calc(100vh-4rem)] sticky top-16">
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/">
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
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Family Feed</h1>
            </div>

            {/* Questions Grid */}
            <QuestionGrid />
          </div>
        </main>
      </div>
    </div>
  );
}
