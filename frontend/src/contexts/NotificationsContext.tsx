"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const [loading, setLoading] = useState(true); // Only for initial load
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fallbackFetched = useRef(false);
  const socketReceived = useRef(false);

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

  // Fallback HTTP fetch if socket doesn't deliver notifications in time
  const fallbackFetchNotifications = () => {
    if (!user?._id || !token) return;
    fetch(`${BASE_URL}/api/notifications/${user._id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
      })
      .then((data) => {
        setNotifications(data.data || []);
      })
      .catch((error) => {
        console.error('❌ Error fetching notifications (fallback):', error);
      })
      .finally(() => setLoading(false));
  };

  // On user change, clear notifications and set loading
  useEffect(() => {
    setNotifications([]);
    setLoading(true);
    fallbackFetched.current = false;
    socketReceived.current = false;
  }, [user?._id]);

  // Listen for socket events (real-time and initial load)
  useEffect(() => {
    if (!socket || !user?._id) {
      console.log('🔌 Socket or user not available:', { socket: !!socket, userId: user?._id });
      return;
    }

    console.log('🔌 Setting up notification listener for user:', user._id);

    const handleNewNotification = (notification: Notification) => {
      console.log('📧 Received new notification:', notification);
      socketReceived.current = true;
      setLoading(false);
      setNotifications((prev) => {
        // Deduplicate by _id
        const exists = prev.some(n => n._id === notification._id);
        if (exists) {
          console.log('🔄 Notification already exists, skipping duplicate');
          return prev;
        }
        console.log('✅ Adding new notification to list');
        return [notification, ...prev];
      });
      if (notification.title) {
        showToast(`New notification: ${notification.title}`);
      }
    };

    socket.on("newNotification", handleNewNotification);
    console.log('✅ Notification listener attached');

    // Fallback: if no notifications received via socket in 2 seconds, fetch via HTTP
    const fallbackTimeout = setTimeout(() => {
      if (!socketReceived.current && !fallbackFetched.current) {
        console.log('⏰ Fallback: No socket notifications received, fetching via HTTP');
        fallbackFetched.current = true;
        fallbackFetchNotifications();
      }
    }, 2000);

    return () => {
      console.log('🔌 Cleaning up notification listener');
      socket.off("newNotification", handleNewNotification);
      clearTimeout(fallbackTimeout);
    };
  }, [socket, user?._id, token]);

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

  // Helper to check if review exists for a lease and reviewee
  const checkReviewExists = async (leaseId?: string, revieweeId?: string) => {
    if (!leaseId || !revieweeId || !token) return false;
    try {
      const res = await fetch(
        `${BASE_URL}/api/reviews/check/${leaseId}/${revieweeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking review existence:', error);
      return false;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read
    markSingleAsRead(notification._id);

    // Navigate based on notification type
    if (notification.type === 'MAINTENANCE_REQUEST' || notification.type === 'MAINTENANCE_UPDATE') {
      router.push('/dashboard/maintenance-requests');
    } else if (notification.type === 'LEASE_EXPIRED') {
      // For LEASE_EXPIRED, check if review already exists
      // Assume notification.link is the leave-review page with leaseId and tenantId/landlordId
      const leaseId = notification.leaseId;
      // Determine revieweeId: if user is tenant, reviewee is landlord; if user is landlord, reviewee is tenant
      let revieweeId = undefined;
      if (user?._id && notification.landlordId && notification.tenantId) {
        revieweeId = user._id === notification.landlordId ? notification.tenantId : notification.landlordId;
      }
      const alreadyReviewed = await checkReviewExists(leaseId, revieweeId);
      if (!alreadyReviewed && notification.link) {
        router.push(notification.link);
      }
      // If already reviewed, do nothing
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
