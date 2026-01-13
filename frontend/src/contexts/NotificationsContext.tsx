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
  disabled?: boolean;
  meta?: any;
}

interface NotificationsContextType {
  notifications: Notification[];
  markAllAsRead: () => void;
  markSingleAsRead: (id: string) => void;
  handleNotificationClick: (notification: Notification) => void;
  loading: boolean;
  showToast: (message: string) => void;
  isProcessingClick: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, socket } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessingClick, setIsProcessingClick] = useState(false);
  const fallbackFetched = useRef(false);
  const socketReceived = useRef(false);

  const BASE_URL = 'http://localhost:5000';

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
    try {
      const audio = new Audio('data:audio/wav;base64,...');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const fetchNotifications = () => {
    if (!user?._id || !token) return;
    
    setLoading(true);
    
    fetch(`${BASE_URL}/api/notifications/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setNotifications(data.data || []);
      })
      .catch(err => {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setNotifications([]);
    setLoading(true);
    fallbackFetched.current = false;
    socketReceived.current = false;
    
    if (user?._id && token) {
      fetchNotifications();
    }
  }, [user?._id, token]);

  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleNewNotification = (notification: Notification) => {
      socketReceived.current = true;
      setLoading(false);
      setNotifications((prev) => {
        if (prev.some(n => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });

      if (notification.title) showToast(`📢 ${notification.title}`);
    };

    socket.on("newNotification", handleNewNotification);

    const fallbackTimeout = setTimeout(() => {
      if (!socketReceived.current && !fallbackFetched.current) {
        fallbackFetched.current = true;
        fetchNotifications();
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
        "Content-Type": "application/json"
      },
      credentials: "include"
    })
      .then(res => res.json())
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
    
    // Don't navigate for these notification types
    if (notification.type === 'REFUND_SUCCESS' || notification.type === 'PAYMENT_SUCCESS') {
      return;
    }
    
    let targetLink = notification.link || '/dashboard';

    // Navigate based on notification type
    if (notification.type === 'MAINTENANCE_REQUEST' || notification.type === 'MAINTENANCE_UPDATE') {
      // Add maintenance request ID to URL if available
      if (notification.maintenanceRequestId) {
        router.push(`/dashboard/maintenance-requests?requestId=${notification.maintenanceRequestId}`);
      } else {
        router.push('/dashboard/maintenance-requests');
      }
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
    } else if (notification.type === 'UNIT_REJECTED') {
      // For unit rejection, navigate to unit management page
      if (notification.link) {
        router.push(notification.link);
      } else {
        router.push('/dashboard');
      }
    } else if (notification.type === 'SUPPORT_MESSAGE_TO_USER') {
      // For support messages to user, navigate to support chat
      router.push('/dashboard/support-chat');
    } else if (notification.type === 'SUPPORT_MESSAGE_TO_ADMIN') {
      // For support messages to admin, navigate to admin dashboard with support tab
      router.push('/admin/dashboard?tab=support');
    } else if (notification.link) {
      // Use the provided link
      router.push(notification.link);
    } else {
      // Default to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      markAllAsRead,
      markSingleAsRead,
      handleNotificationClick,
      loading,
      showToast,
      isProcessingClick
    }}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </NotificationsContext.Provider>
  );
};
