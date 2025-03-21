'use client';

import Link from "next/link"
import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Sidebar } from "@/components/sidebar"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { createClient } from '@supabase/supabase-js'
import { useSession } from "@/hooks/useSession"

export function Header() {
  const [notificationCount, setNotificationCount] = useState(3)
  const router = useRouter();
  const { isClient, userEmail, setUserEmail } = useSession();
  const [userData, setUserData] = useState({ first_name: '', last_name: '' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUserData = async () => {
      if (userEmail) {
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('email', userEmail)
          .single();

        if (data && !error) {
          setUserData(data);
        }
      }
    };

    if (isClient && userEmail) {
      fetchUserData();
    }
  }, [userEmail, isClient]);

  if (!isClient) {
    return null;
  }

  const handleLogout = () => {
    setUserEmail(null);
    router.push('/login');
  };

  if (!userEmail) return null;

  const getInitials = () => {
    const { first_name, last_name } = userData;
    if (first_name && last_name) {
      return `${first_name[0]}${last_name[0]}`.toUpperCase();
    }
    return 'FC';
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 h-screen w-[300px] top-0 left-0 rounded-none">
              <Sidebar />
            </DialogContent>
          </Dialog>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">FamilyConnect</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {notificationCount}
              </Badge>
            )}
          </Button>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{`${userData.first_name} ${userData.last_name}`}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
