'use client';

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, Users, Calendar, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import FamilyHub from "@/components/family/FamilyHub";

export default function FamilyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r min-h-[calc(100vh-4rem)] sticky top-16">
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/">
              <HomeIcon className="w-5 h-5" />
              Home
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/family">
              <Users className="w-5 h-5" />
              Family
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/questions">
              <MessageSquare className="w-5 h-5" />
              Questions
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/search">
              <Search className="w-5 h-5" />
              Search
            </Link>
          </Button>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <FamilyHub />
        </main>
      </div>
    </div>
  );
}
