'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Moon, Sun, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  NotificationsDialog, 
  Notification, 
  CommentNotification, 
  LikeNotification 
} from '@/components/ui/notifications-dialog';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [userData, setUserData] = useState({ name: '', email: '', lastName: '' });
  const [isLoading, setIsLoading] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle click outside to close menus
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

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userData.lastName) return;

    // Subscribe to new comments
    const commentsSubscription = supabase
      .channel('comments-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `users.last_name=eq.${userData.lastName}`
        },
        async () => {
          // Refetch notifications when a comment changes
          await fetchNotifications(userData.lastName);
        }
      )
      .subscribe();

    // Subscribe to new likes
    const likesSubscription = supabase
      .channel('likes-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions_like',
          filter: `users.last_name=eq.${userData.lastName}`
        },
        async () => {
          // Refetch notifications when a like changes
          await fetchNotifications(userData.lastName);
        }
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [userData.lastName]);

  // Fetch user data and initial notifications
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userEmail = sessionStorage.getItem('userEmail');
        
        if (userEmail) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name, email, status')
            .eq('email', userEmail)
            .single();

          if (userError) throw userError;

          if (user.status !== 'Active') {
            handleLogout();
            return;
          }

          if (user) {
            setUserData({
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              lastName: user.last_name
            });
            await fetchNotifications(user.last_name);
          }
        } else {
          setUserData({ name: 'Guest User', email: 'Not logged in', lastName: '' });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({ name: 'Guest User', email: 'Not logged in', lastName: '' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEmail') {
        fetchUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchNotifications = async (lastName: string) => {
    try {
      // Fetch comments
      const { data: comments } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          users!inner(
            first_name,
            last_name
          )
        `)
        .eq('users.last_name', lastName)
        .order('created_at', { ascending: false })
        .limit(10) as { data: Array<{
  id: string;
  content: string;
  created_at: string;
  users: { first_name: string; last_name: string };
}> | null };

      // Fetch likes with user info
      const { data: likes } = await supabase
        .from('questions_like')
        .select(`
          id,
          created_at,
          user_id,
          users (
            first_name,
            last_name
          )
        `)
        .eq('users.last_name', lastName)
        .order('created_at', { ascending: false })
        .limit(10) as { data: Array<{
  id: string;
  created_at: string;
  user_id: string;
  users: { first_name: string; last_name: string };
}> | null };

      const formattedNotifications = [
        ...(comments?.map(comment => ({
          id: comment.id,
          type: 'comment' as const,
          content: comment.content || '',
          timestamp: comment.created_at,
          user: {
            first_name: comment.users.first_name,
            last_name: comment.users.last_name
          }
        })) || []),
        ...(likes?.map(like => ({
          id: like.id,
          type: 'like' as const,
          content: 'liked a post',
          timestamp: like.created_at,
          user: {
            first_name: like.users.first_name,
            last_name: like.users.last_name
          }
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(formattedNotifications);
      setNotificationCount(formattedNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.log('Error details:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userEmail');
    setUserData({ name: 'Guest User', email: 'Not logged in', lastName: '' });
    router.push('/login');
  };

  const getInitial = () => {
    return userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: '#1E1F29', borderBottom: '1px solid #232336' }}
    >
      <div className="w-full px-4 flex h-16 items-center">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="FamilyConnect Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="font-bold text-xl" style={{ color: '#fff' }}>FamilyConnect</span>
        </div>
        
        <div className="ml-auto flex items-center gap-6 pr-8">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              style={{ background: '#232336', color: '#fff' }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>

            <NotificationsDialog
              notifications={notifications}
              show={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/*
          <Button
            variant="ghost"
            size="icon"
            style={{ background: '#232336', color: '#fff' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          */}

          <div className="relative" ref={userMenuRef}>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-blue-500"
              style={{ background: '#23233b', color: '#60a5fa' }}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {getInitial()}
            </div>
            
            {/* User dropdown menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-md shadow-lg z-50"
                style={{ background: '#232336', border: '1px solid #232336' }}
              >
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#232336' }}>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-5 font-medium" style={{ color: '#fff' }}>
                          {userData.name || 'Guest User'}
                        </p>
                        <p className="text-xs leading-4 truncate" style={{ color: '#e5e7eb' }}>
                          {userData.email || 'Not logged in'}
                        </p>
                      </>
                    )}
                  </div>
                  
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm transition-colors"
                    style={{ color: '#e5e7eb', background: 'transparent' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#1E1F29')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserIcon className="mr-3 h-4 w-4" />
                    Profile
                  </Link>

                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm transition-colors"
                    style={{ color: '#e5e7eb', background: 'transparent' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#1E1F29')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm transition-colors"
                    style={{ color: '#ff6b6b', background: 'transparent' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#1E1F29')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
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
