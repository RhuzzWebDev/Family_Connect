'use client';

import { FamilyMembers } from "@/components/family-members";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, Users, Calendar, MessageSquare, Search, UserPlus } from "lucide-react";
import Link from "next/link";

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
              Family Members
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/events">
              <Calendar className="w-5 h-5" />
              Events
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
        <main className="flex-1 container py-6 px-4">
          {/* Header and Actions */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search family members..."
                className="w-full pl-9 pr-4 py-2 rounded-full border bg-background"
              />
            </div>
            <Button className="w-full sm:w-auto gap-2">
              <UserPlus className="w-5 h-5" />
              Add Family Member
            </Button>
          </div>

          {/* Family Members Grid */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Family Members</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <FamilyMembers />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
