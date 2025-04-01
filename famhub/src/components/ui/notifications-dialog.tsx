'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

export interface User {
  first_name: string;
  last_name: string;
}

export interface CommentNotification {
  id: string;
  content: string;
  created_at: string;
  users: User;
}

export interface LikeNotification {
  id: string;
  created_at: string;
  user_id: string;
  users: User;
}

export interface Notification {
  id: string;
  type: 'comment' | 'like' | 'question';
  content: string;
  timestamp: string;
  user: {
    first_name: string;
    last_name: string;
  };
}

export interface NotificationsDialogProps {
  notifications: Notification[];
  show: boolean;
  onClose: () => void;
}

export function NotificationsDialog({
  notifications,
  show,
  onClose,
}: NotificationsDialogProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) {
      setLoading(false);
    }
  }, [show]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!show) return null;

  return (
    <div 
      className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
    >
      <div className="py-2">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="py-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/default-avatar.png" />
                      <AvatarFallback className="text-xs">
                        {getInitials(notification.user.first_name, notification.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {notification.user.first_name} {notification.user.last_name}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {notification.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No new notifications
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
