'use client';

import { useEffect, useState } from 'react';
import { syncManager, SyncEvent } from '@/lib/syncManager';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

/**
 * Notifications Bell Component
 * Shows notification count and manages alerts across windows
 */
export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.length;

  // Listen for notifications from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.NOTIFICATION, (data: unknown) => {
      // Validate notification structure
      if (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'type' in data &&
        'message' in data &&
        'timestamp' in data
      ) {
        const notification = data as Notification;
        setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
      }
    });

    return unsubscribe;
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={clearNotifications}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">
                      {notification.type === 'success' && '✅'}
                      {notification.type === 'error' && '❌'}
                      {notification.type === 'warning' && '⚠️'}
                      {notification.type === 'info' && 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <p className="text-white text-sm">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
