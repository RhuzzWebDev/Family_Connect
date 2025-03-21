'use client';

import Link from "next/link";
import { Home as HomeIcon, Users, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-2 p-4 h-full">
      <div className="mb-8">
        <h1 className="text-xl font-bold px-4 py-2">Family Connect</h1>
      </div>
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
  );
}
