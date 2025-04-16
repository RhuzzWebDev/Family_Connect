'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

export interface User {
  first_name: string;
  last_name: string;
}

export interface Notification {
  id: string;
  type: 'comment' | 'like' | 'question';
  content: string;
  timestamp: string;
  user: User;
}

export interface NotificationsDialogProps {
  notifications: Notification[];
  show: boolean;
  onClose: () => void;
}

import { useRef } from 'react';

export function NotificationsDialog({
  notifications,
  show,
  onClose,
}: NotificationsDialogProps) {
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  if (!show) return null;

  return (
    <div
      ref={dialogRef}
      className="absolute right-0 mt-2 w-80 rounded-md shadow-lg z-50"
      style={{ background: '#232336', border: '1px solid #232336' }}
    >
      <div className="py-2">
        <div className="px-4 py-2   dark:border-gray-700">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
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
                  className="px-4 py-2 transition-colors hover:bg-[#30304b]" style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold" style={{ background: '#23233b', color: '#60a5fa' }}>
  {getInitials(notification.user.first_name, notification.user.last_name)}
</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          {notification.user.first_name} {notification.user.last_name}
                        </p>
                        <span className="text-xs text-white">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">{notification.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-300">
              No new notifications
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export interface CommentNotificationProps {
  notification: Notification;
}

export function CommentNotification({ notification }: CommentNotificationProps) {
  return (
    <div className="px-4 py-2 transition-colors hover:bg-[#30304b]" style={{ cursor: 'pointer' }}>
      <div className="flex items-start space-x-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold" style={{ background: '#23233b', color: '#60a5fa' }}>
  {notification.user.first_name.charAt(0)}{notification.user.last_name.charAt(0)}
</div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              {notification.user.first_name} {notification.user.last_name}
            </p>
            <span className="text-xs text-white">
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-gray-300">{notification.content}</p>
        </div>
      </div>
    </div>
  );
}

export interface LikeNotificationProps {
  notification: Notification;
}

export function LikeNotification({ notification }: LikeNotificationProps) {
  return (
    <div className="px-4 py-2 transition-colors hover:bg-[#30304b]" style={{ cursor: 'pointer' }}>
      <div className="flex items-start space-x-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold" style={{ background: '#23233b', color: '#60a5fa' }}>
  {notification.user.first_name.charAt(0)}{notification.user.last_name.charAt(0)}
</div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              {notification.user.first_name} {notification.user.last_name}
            </p>
            <span className="text-xs text-white">
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-gray-300">{notification.content}</p>
        </div>
      </div>
    </div>
  );
}
