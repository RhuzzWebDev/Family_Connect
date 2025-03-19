'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Moon, Sun, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AirtableService } from '@/services/airtableService';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch user data from session cookie and Airtable
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        // Check if we have a user session (this would be set during login)
        const userEmail = sessionStorage.getItem('userEmail');
        
        if (userEmail) {
          const airtableService = new AirtableService();
          try {
            const user = await airtableService.getUser(userEmail);
            setUserData({
              name: `${user.fields.first_name} ${user.fields.last_name}`,
              email: user.fields.Email
            });
          } catch (error) {
            console.error('Error fetching user:', error);
            setUserData({ name: 'Guest User', email: 'Not logged in' });
          }
        } else {
          // No user is logged in, show default values
          setUserData({ name: 'Guest User', email: 'Not logged in' });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({ name: 'Guest User', email: 'Not logged in' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle click outside of user menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('userEmail');
    setUserData({ name: 'Guest User', email: 'Not logged in' });
    router.push('/login');
  };

  const getInitial = () => {
    return userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4 ml-4">
          <Image
            src="/logo.svg"
            alt="FamilyConnect Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="font-bold text-xl">FamilyConnect</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <div className="relative" ref={userMenuRef}>
            <Avatar 
              className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <AvatarImage src="/default-avatar.png" alt={userData.name || 'User'} />
              <AvatarFallback>{getInitial()}</AvatarFallback>
            </Avatar>
            
            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-5 font-medium text-gray-900 dark:text-gray-100">
                          {userData.name || 'Guest User'}
                        </p>
                        <p className="text-xs leading-4 text-gray-500 dark:text-gray-400 truncate">
                          {userData.email || 'Not logged in'}
                        </p>
                      </>
                    )}
                  </div>
                  
                  <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <UserIcon className="mr-3 h-4 w-4" />
                    Profile
                  </Link>
                  
                  <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Settings className="mr-3 h-4 w-4" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
