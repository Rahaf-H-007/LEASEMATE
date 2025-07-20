'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import Navbar from '@/components/Navbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const { notifications, loading, markAllAsRead, handleNotificationClick } = useNotifications();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [reviewStatus, setReviewStatus] = useState<{ [notificationId: string]: boolean }>({});

  // Check review status for LEASE_EXPIRED notifications
  useEffect(() => {
    const checkReviews = async () => {
      const checks: { [notificationId: string]: boolean } = {};
      const promises = notifications
        .filter(n => n.type === 'LEASE_EXPIRED')
        .map(async (n) => {
          // Extract leaseId and revieweeId from notification
          const leaseId = n.leaseId;
          // Determine revieweeId: if user is tenant, reviewee is landlord; if user is landlord, reviewee is tenant
          let revieweeId = '';
          if (user && user._id === n.tenantId && n.landlordId) {
            revieweeId = n.landlordId;
          } else if (user && user._id === n.landlordId && n.tenantId) {
            revieweeId = n.tenantId;
          }
          if (leaseId && revieweeId) {
            try {
              const res = await fetch(`http://localhost:5000/api/reviews/check/${leaseId}/${revieweeId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('leasemate_token') || ''}` },
              });
              const data = await res.json();
              checks[n._id] = !!data.exists;
            } catch {
              checks[n._id] = false;
            }
          }
        });
      await Promise.all(promises);
      setReviewStatus(checks);
    };
    if (user && notifications.length > 0) {
      checkReviews();
    }
  }, [user, notifications]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const filteredNotifications = filter === 'all' 
      ? notifications
    : notifications.filter(n => !n.isRead);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE_REQUEST':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case 'MAINTENANCE_UPDATE':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'LEASE_EXPIRED':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z" />
            </svg>
          </div>
        );
    }
  };

  const getNotificationTypeText = (type: string) => {
    switch (type) {
      case 'MAINTENANCE_REQUEST':
        return 'طلب صيانة جديد';
      case 'MAINTENANCE_UPDATE':
        return 'تحديث طلب الصيانة';
      case 'LEASE_EXPIRED':
        return 'انتهاء عقد الإيجار';
      default:
        return 'إشعار عام';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الإشعارات</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                جميع الإشعارات
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                غير المقروءة
              </button>
              {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
                  تحديد الكل كمقروء
            </button>
              )}
            </div>
          </div>

          {loading ? null : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">
                {filter === 'all' ? 'لا توجد إشعارات' : 'لا توجد إشعارات غير مقروءة'}
              </p>
            </div>
            ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const isLeaseExpired = notification.type === 'LEASE_EXPIRED';
                const reviewSubmitted = isLeaseExpired ? reviewStatus[notification._id] : undefined;
                return (
                  <div
                    key={notification._id}
                    onClick={() => {
                      if (isLeaseExpired && reviewSubmitted) return; // Do nothing if review exists
                      if (isLeaseExpired) {
                        handleNotificationClick(notification, !!reviewSubmitted);
                      } else {
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                      !notification.isRead ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString('ar-SA')}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {getNotificationTypeText(notification.type)}
                          </span>
                          {notification.senderId && (
                            <span className="text-xs text-gray-500">
                              من: {notification.senderId.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
    
  );
}
