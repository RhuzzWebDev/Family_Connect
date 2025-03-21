"use client"

import { MessagingInterface } from "@/components/messaging-interface"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Home as HomeIcon, Users, Calendar, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function MessagesPage() {
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
          <MessagingInterface />
        </main>
      </div>
    </div>
  )
}
