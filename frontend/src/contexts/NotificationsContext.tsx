"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

export interface Notification {
  index?:number;
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  leaseId?: string;
  maintenanceRequestId?: string;
  landlordId?:string;
  tenantId?:string;
  isRead: boolean;
  createdAt: string;
  senderId?: {
    _id: string;
    name: string;
  };
}

interface NotificationsContextType {
  notifications: Notification[];
  markAllAsRead: () => void;
  markSingleAsRead: (id: string) => void;
  handleNotificationClick: (notification: Notification) => void;
  loading: boolean;
  showToast: (message: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};

const BASE_URL = 'http://localhost:5000';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, socket } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
    
    // Play notification sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const fetchNotifications = () => {
    if (!user?._id || !token) return;

    console.log('🔍 Fetching notifications for user:', user._id);
    setLoading(true);
    fetch(`${BASE_URL}/api/notifications/${user._id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then((res) => {
        console.log('📡 Response status:', res.status);
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
      })
      .then((data) => {
        console.log('📋 Notifications data received:', data);
        console.log('📋 Notifications count:', data.data?.length || 0);
        setNotifications(data.data || []);
      })
      .catch((error) => {
        console.error('❌ Error fetching notifications:', error);
      })
      .finally(() => setLoading(false));
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [user?._id, token]);

  // Poll every 5 seconds instead of 30
  useEffect(() => {
    if (!user?._id || !token) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5_000); // 5 seconds instead of 30

    return () => clearInterval(interval);
  }, [user?._id, token]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      console.log("🔔 New notification received:", notification);
      // Immediately add the new notification to the list
      setNotifications((prev) => {
        // Check if notification already exists to avoid duplicates
        const exists = prev.some(n => n._id === notification._id);
        if (exists) {
          return prev;
        }
        return [notification, ...prev];
      });
      showToast(`New notification: ${notification.title}`);
    };

    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket]);

  const markAllAsRead = () => {
    if (!user?._id || !token) return;

    fetch(`${BASE_URL}/api/notifications/mark-all-read/${user._id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to mark all as read");
        return res.json();
      })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      })
      .catch(console.error);
  };

  const markSingleAsRead = (id: string) => {
    if (!token) return;

    fetch(`${BASE_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to mark as read");
        return res.json();
      })
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      })
      .catch(console.error);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark notification as read
    markSingleAsRead(notification._id);

    // Navigate based on notification type
    if (notification.type === 'MAINTENANCE_REQUEST' || notification.type === 'MAINTENANCE_UPDATE') {
      // Navigate to maintenance requests page
      router.push('/dashboard/maintenance-requests');
    } else if (notification.type === 'LEASE_EXPIRED') {
      // Navigate to leases page
      router.push('/dashboard');
    } else if (notification.link) {
      // Use the provided link
      router.push(notification.link);
    } else {
      // Default to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        markAllAsRead,
        markSingleAsRead,
        handleNotificationClick,
        loading,
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </NotificationsContext.Provider>
  );
};
