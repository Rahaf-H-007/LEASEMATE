'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import Navbar from '@/components/Navbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const { notifications, loading, handleNotificationClick, markAllAsRead, isProcessingClick } = useNotifications();

  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'support'>('all');
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

  // Show loading state for initial load or auth loading
  if (isLoading || (!user && !loading)) {
    return (
      <div className="text-center py-8">
        <p>جاري تحميل الإشعارات...</p>
      </div>
    );
  }

  // Show loading state for notifications loading
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>جاري تحميل الإشعارات...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredNotifications = filter === 'all' 
      ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : filter === 'support'
    ? notifications.filter(n => n.type === 'SUPPORT_MESSAGE_TO_USER' || n.type === 'SUPPORT_MESSAGE_TO_ADMIN')
    : notifications;

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'LEASE_APPROVED':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'BOOKING_REQUEST':
        return (
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'PAYMENT_SUCCESS':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        );
      case 'REFUND_ELIGIBLE':
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'REFUND_SUCCESS':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'UNIT_REJECTED':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case 'SUPPORT_MESSAGE_TO_USER':
      case 'SUPPORT_MESSAGE_TO_ADMIN':
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
      case 'LEASE_APPROVED':
        return 'تمت الموافقة على عقد الإيجار';
      case 'BOOKING_REQUEST':
        return 'طلب حجز جديد';
      case 'PAYMENT_SUCCESS':
        return 'عميلة دفع ناجحة';
      case 'REFUND_ELIGIBLE':
        return 'استرداد الاشتراك متاح';
      case 'REFUND_SUCCESS':
        return 'تم استرداد الاشتراك';
      case 'UNIT_REJECTED':
        return 'رفض وحدة';
      case 'SUPPORT_MESSAGE_TO_USER':
        return 'رسالة دعم من الإدارة';
      case 'SUPPORT_MESSAGE_TO_ADMIN':
        return 'رسالة دعم من المستخدم';
      case 'GENERAL':
        return 'إشعار عام';
      default:
        return 'إشعار';
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
                <button
                  onClick={() => setFilter('support')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'support'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  رسائل الدعم
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
                  {filter === 'all' ? 'لا توجد إشعارات' : 
                   filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' :
                   filter === 'support' ? 'لا توجد رسائل دعم' : 'لا توجد إشعارات'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const isLeaseExpired = notification.type === 'LEASE_EXPIRED';
                  const reviewSubmitted = isLeaseExpired ? reviewStatus[notification._id] : undefined;
                  const isRefundDisabled = notification.type === 'REFUND_ELIGIBLE' && (notification as any).disabled;
                  return (
                    <div
                      key={notification._id}
                      onClick={async () => {
                        if (isRefundDisabled || isProcessingClick) return;
                        if (isLeaseExpired && reviewSubmitted) return;
                        
                        try {
                          await handleNotificationClick(notification);
                        } catch (error) {
                          console.error('Error handling notification click:', error);
                        }
                      }}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border transition-all ${
                        isRefundDisabled || isProcessingClick
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : 'cursor-pointer hover:shadow-md ' + (!notification.isRead ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200')
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
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(notification.createdAt).toLocaleString('ar-EG', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  hour12: true,
                                })}
                              </span>

                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              )}
                              {isProcessingClick && (
                                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {getNotificationTypeText(notification.type)}
                            </span>
                            {(notification.type === 'MAINTENANCE_REQUEST' || notification.type === 'MAINTENANCE_UPDATE') && notification.senderId && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
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
