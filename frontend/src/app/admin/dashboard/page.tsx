'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { Pie } from 'react-chartjs-2';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'landlord' | 'tenant' | 'admin';
  verificationStatus?: {
    status: 'pending' | 'approved' | 'rejected';
    uploadedIdUrl?: string;
    selfieUrl?: string;
  };
  createdAt: string;
}

interface AbusiveUser {
  _id: string;
  name: string;
  phone?: string;
  role: 'landlord' | 'tenant';
  abusiveCommentsCount: number;
  isBlocked?: boolean;
}

export default function AdminDashboard() {
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6; // Number of users per page
 
  const [activeTab, setActiveTab] = useState<'table' | 'dashboard' | 'images' | 'abusive' | 'subscriptions'>('table');

  // State for pending images (now pending units)
  const [pendingUnits, setPendingUnits] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageActionLoading, setImageActionLoading] = useState<string | null>(null);
  // State for unit review modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingRejectUnit, setPendingRejectUnit] = useState<any>(null);
  // State for image preview modal
  const [selectedImage, setSelectedImage] = useState<null | { url: string; unitName: string; ownerName?: string }>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [abusiveUsers, setAbusiveUsers] = useState<AbusiveUser[]>([]);
  const [loadingAbusive, setLoadingAbusive] = useState(false);
  const [blockLoadingId, setBlockLoadingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State for subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null);
  const [subscriptionSearchId, setSubscriptionSearchId] = useState<string>('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  
  // State for refund confirmation modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [pendingRefundSubscription, setPendingRefundSubscription] = useState<any>(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchUsers();
      fetchAbusiveUsers();
    }
  }, [token, user]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await apiService.getUsers(token) as { users: User[] };
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationAction = async (userId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      await apiService.updateVerificationStatus(userId, action, token);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  // Fetch pending images for admin
  const fetchPendingImages = async () => {
    if (!token) return;
    setLoadingImages(true);
    try {
      const res = await apiService.getPendingUnitImages(token) as { data: { pendingUnits?: any[], pendingImages?: any[] } };
      setPendingUnits(res.data.pendingUnits || res.data.pendingImages || []);
    } catch (err) {
      setPendingUnits([]);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'images' && token && user?.role === 'admin') {
      fetchPendingImages();
    }
  }, [activeTab, token, user]);

  useEffect(() => {
    if (activeTab === 'subscriptions' && token && user?.role === 'admin') {
      fetchSubscriptions();
    }
  }, [activeTab, token, user]);

  const handleImageReview = async (unitId: string, imageUrl: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setImageActionLoading(unitId + imageUrl + action);
    try {
      await apiService.reviewUnitImage({ unitId, imageUrl, action, token });
      // Remove image from list after action
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Approve unit handler
  const handleApproveUnit = async (unitId: string) => {
    if (!token) return;
    setImageActionLoading(unitId + 'approve');
    try {
      await apiService.approveUnit({ unitId, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Approve all images for a unit
  const handleApproveAll = async (unitId: string) => {
    if (!token) return;
    setImageActionLoading(unitId + 'approveAll');
    try {
      await apiService.approveAllUnitImages({ unitId, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Reject unit handler (open modal)
  const handleRejectUnitClick = (unit: any) => {
    setPendingRejectUnit(unit);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Reject all images for a unit (open modal)
  const handleRejectAllClick = (unit: any) => {
    setPendingRejectUnit(unit);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Confirm reject unit
  const handleRejectUnitConfirm = async () => {
    if (!token || !pendingRejectUnit) return;
    setImageActionLoading(pendingRejectUnit.unitId + 'reject');
    try {
      await apiService.rejectUnit({ unitId: pendingRejectUnit.unitId, reason: rejectReason, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== pendingRejectUnit.unitId));
      setShowRejectModal(false);
      setPendingRejectUnit(null);
      setRejectReason('');
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Confirm reject all images
  const handleRejectAllConfirm = async () => {
    if (!token || !pendingRejectUnit) return;
    setImageActionLoading(pendingRejectUnit.unitId + 'rejectAll');
    try {
      await apiService.rejectAllUnitImages({ unitId: pendingRejectUnit.unitId, reason: rejectReason, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== pendingRejectUnit.unitId));
      setShowRejectModal(false);
      setPendingRejectUnit(null);
      setRejectReason('');
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  const fetchAbusiveUsers = async () => {
    if (!token) return;
    setLoadingAbusive(true);
    try {
      const res = await apiService.getAbusiveUsers(token);
      setAbusiveUsers(res.users || []);
    } catch (err) {
      setAbusiveUsers([]);
    } finally {
      setLoadingAbusive(false);
    }
  };

  // fetching the subscription
  const fetchSubscriptions = async () => {
    if (!token) return;
    setLoadingSubscriptions(true);
    try {
      const res = await apiService.getSubscriptions(token);
      setSubscriptions(res.subscriptions || []);
    } catch (err: any) {
      setSubscriptions([]);
      toast.error(err.message || 'حدث خطأ أثناء جلب الاشتراكات');
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleRefundSubscription = async (subscriptionId: string) => {
    if (!token) return;
    
    // Find the subscription to show in modal
    const subscription = subscriptions.find(sub => sub._id === subscriptionId);
    if (subscription) {
      setPendingRefundSubscription(subscription);
      setShowRefundModal(true);
    }
  };

  const confirmRefundSubscription = async () => {
    if (!token || !pendingRefundSubscription) return;
    
    setRefundLoadingId(pendingRefundSubscription._id);
    try {
      const result = await apiService.refundSubscription(pendingRefundSubscription._id, token);
      // Update local state immediately for better UX
      setSubscriptions(prev => prev.map(sub => {
        if (sub._id === pendingRefundSubscription._id) {
          return {
            ...sub,
            status: 'refunded',
            refunded: true
          };
        }
        return sub;
      }));
      toast.success(result.message || 'تم استرداد الاشتراك بنجاح');
      setShowRefundModal(false);
      setPendingRefundSubscription(null);
    } catch (err: any) {
      console.error('Error refunding subscription:', err);
      toast.error(err.message || 'حدث خطأ أثناء استرداد الاشتراك');
    } finally {
      setRefundLoadingId(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!token) return;
    setBlockLoadingId(userId);
    try {
      await apiService.blockUser(userId, token);
      fetchAbusiveUsers();
      fetchUsers();
    } catch (err) {
      // handle error
    } finally {
      setBlockLoadingId(null);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const filteredUsers = users.filter(user => {
    const statusMatch = selectedStatus === 'all' || user.verificationStatus?.status === selectedStatus;
    const roleMatch = selectedRole === 'all' || user.role === selectedRole;
    return statusMatch && roleMatch;
  });

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  // استبعاد الأدمن من الظهور في الجدول
  const filteredNonAdminUsers = filteredUsers.filter(user => user.role !== 'admin');
  const currentUsers = filteredNonAdminUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredNonAdminUsers.length / usersPerPage);

  // Stats for dashboard
  const pendingCount = users.filter(u => u.verificationStatus?.status === 'pending').length;
  const approvedCount = users.filter(u => u.verificationStatus?.status === 'approved').length;
  const rejectedCount = users.filter(u => u.verificationStatus?.status === 'rejected').length;
  const totalUsers = users.length;
  const totalLandlords = users.filter(u => u.role === 'landlord').length;
  const totalTenants = users.filter(u => u.role === 'tenant').length;

  // Pie chart data
  const pieData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [
      {
        data: [pendingCount, approvedCount, rejectedCount],
        backgroundColor: [
          'rgba(251, 191, 36, 0.7)', // yellow
          'rgba(34, 197, 94, 0.7)',  // green
          'rgba(239, 68, 68, 0.7)',  // red
        ],
        borderColor: [
          'rgba(251, 191, 36, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-inset ring-green-200">
            تم التأكيد
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
            قيد الانتظار
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
            تم الرفض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200">
            لم يتم التقديم
          </span>
        );
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className={`relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>
      <div className="flex h-full grow">
        {/* Sidebar */}
        <aside className={`flex flex-col w-64 border-r p-6 shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-8">
            <Logo size={80} />
          </div>
          
          <nav className="flex flex-col gap-2">
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg className={`${activeTab === 'dashboard' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <p className="text-sm font-semibold">لوحة التحكم</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'table' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('table')}
            >
              <svg className={`${activeTab === 'table' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
              </svg>
              <p className="text-sm font-medium">جدول المستخدمين</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'images' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('images')}
            >
              <svg className={`${activeTab === 'images' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-2 0H5V5h14ZM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5Z" />
              </svg>
              <p className="text-sm font-semibold">مراجعة صور الشقق</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'abusive' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('abusive')}
            >
              <svg className={`${activeTab === 'abusive' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p className="text-sm font-semibold">المستخدمون المسيئون</p>
            </button>
            {/* اشتراكات */}
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'subscriptions' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              <svg className={`${activeTab === 'subscriptions' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <p className="text-sm font-semibold">اشتراكات الملاك</p>
            </button>
          
          </nav>
          
          <div className="mt-auto">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors w-full mb-2 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100'}`}
            >
              {isDarkMode ? (
                <svg className="text-yellow-400" fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                  <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                </svg>
              ) : (
                <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM6.166 17.834a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 10-1.06-1.061l-1.591 1.59zM2.25 12a.75.75 0 01.75-.75H5a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zM6.166 6.166a.75.75 0 001.06-1.06L5.636 3.515a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              )}
              <p className="text-sm font-medium">{isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</p>
            </button>
            
            <button
              onClick={() => {
                logout();
                router.push('/auth/login');
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors w-full ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100'}`}
            >
              <svg className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <p className="text-sm font-medium">تسجيل الخروج</p>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-orange-50'}`}>
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="flex flex-col items-center gap-8">
                <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>لوحة التحكم</h1>
                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-8">
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalUsers}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>إجمالي المستخدمين</p>
                  </div>
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalLandlords}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>المالكون</p>
                  </div>
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalTenants}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>المستأجرون</p>
                  </div>
                </div>
                {/* Pie Chart */}
                <div className={`rounded-xl shadow p-8 w-full max-w-xl flex flex-col items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>توزيع حالة التأكيد</h2>
                  <Pie data={pieData} />
                </div>
              </div>
            ) : activeTab === 'images' ? (
              <div>
                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>صور الشقق قيد المراجعة</h1>
                {loadingImages ? (
                  <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري التحميل...</div>
                ) : pendingUnits.length === 0 ? (
                  <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد صور قيد المراجعة حالياً</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-500 bg-gray-50'}`}>
                        <tr>
                          <th className="px-4 py-3">الصور</th>
                          <th className="px-4 py-3">اسم الوحدة</th>
                          <th className="px-4 py-3">المالك</th>
                          <th className="px-4 py-3">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingUnits.map((unit) => (
                          <tr key={unit.unitId} className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-900 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                            <td className="py-2 px-4">
                              <div className="flex gap-2 flex-wrap">
                                {unit.images.map((img: any, idx: number) => (
                                  <img
                                    key={idx}
                                    src={img.url}
                                    alt="صورة"
                                    className="w-24 h-20 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => {
                                      setSelectedImage({ url: img.url, unitName: unit.unitName, ownerName: unit.owner?.name });
                                      setShowImageModal(true);
                                    }}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className={`py-2 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unit.unitName}</td>
                            <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{unit.owner?.name || '-'}</td>
                            <td className="py-2 px-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                                  disabled={imageActionLoading === unit.unitId + 'approveAll'}
                                  onClick={() => handleApproveAll(unit.unitId)}
                                >
                                  {imageActionLoading === unit.unitId + 'approveAll' ? '...' : 'موافقة على كل الصور'}
                                </button>
                                <button
                                  type="button"
                                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                                  disabled={imageActionLoading === unit.unitId + 'rejectAll'}
                                  onClick={() => handleRejectAllClick(unit)}
                                >
                                  {imageActionLoading === unit.unitId + 'rejectAll' ? '...' : 'رفض كل الصور'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
               {/* مودال سبب الرفض */}
               {showRejectModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                   <div className={`rounded-xl shadow-xl p-8 max-w-md w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                     <button
                       className={`absolute top-3 left-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                       onClick={() => setShowRejectModal(false)}
                       aria-label="إغلاق"
                     >
                       ×
                     </button>
                     <h2 className="text-xl font-bold mb-4 text-red-600 text-center">سبب رفض الإعلان</h2>
                     <textarea
                       className={`w-full px-3 py-2 rounded-lg border mb-4 ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                       rows={3}
                       placeholder="اكتب سبب الرفض هنا..."
                       value={rejectReason}
                       onChange={e => setRejectReason(e.target.value)}
                     />
                     <div className="flex gap-4 mt-6">
                       <button
                         className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                         onClick={() => setShowRejectModal(false)}
                         type="button"
                       >
                         إلغاء
                       </button>
                       <button
                         className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
                         onClick={handleRejectAllConfirm}
                         type="button"
                         disabled={!rejectReason.trim() || imageActionLoading === (pendingRejectUnit?.unitId + 'rejectAll')}
                       >
                         {imageActionLoading === (pendingRejectUnit?.unitId + 'rejectAll') ? '...' : 'تأكيد الرفض'}
                       </button>
                     </div>
                   </div>
                 </div>
               )}
              {/* مودال عرض الصورة */}
              {showImageModal && selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className={`rounded-xl shadow-xl p-6 max-w-lg w-full relative flex flex-col items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <button
                      className={`absolute top-3 left-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
                      onClick={() => setShowImageModal(false)}
                      aria-label="إغلاق"
                    >
                      ×
                    </button>
                    <img
                      src={selectedImage.url}
                      alt="صورة الشقة"
                      className="rounded-lg max-h-[60vh] mb-4 border mx-auto"
                      style={{ maxWidth: '100%' }}
                    />
                    <div className="text-center">
                      <p className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedImage.unitName}</p>
                      {selectedImage.ownerName && (
                        <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>المالك: {selectedImage.ownerName}</p>
                      )}
                      <a
                        href={selectedImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline text-xs mt-2 inline-block"
                      >
                        فتح الصورة في نافذة جديدة
                      </a>
                    </div>
                  </div>
                </div>
              )}
              </div>
            ) : activeTab === 'abusive' ? (
              <div>
                <header className="mb-8">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>المستخدمون ذوو التعليقات المسيئة</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>إدارة المستخدمين الذين لديهم تعليقات مسيئة.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 border ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                  {loadingAbusive ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري التحميل...</div>
                  ) : abusiveUsers.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا يوجد مستخدمين لديهم أكثر من 3 تعليقات مسيئة حالياً</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className={`text-xs uppercase ${isDarkMode ? 'text-red-300 bg-red-900/50' : 'text-red-700 bg-red-100'}`}>
                          <tr>
                            <th className="px-4 py-3">الاسم</th>
                            <th className="px-4 py-3">رقم الهاتف</th>
                            <th className="px-4 py-3">الدور</th>
                            <th className="px-4 py-3">عدد التعليقات المسيئة</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abusiveUsers.map((u) => (
                            <tr key={u._id} className={`border-b ${isDarkMode ? 'border-red-700 bg-gray-900 hover:bg-red-900/20' : 'border-red-200 bg-white hover:bg-red-50'}`}>
                              <td className={`py-2 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.name}</td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.phone || '-'}</td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.role}</td>
                              <td className={`py-2 px-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.abusiveCommentsCount}</td>
                              <td className="py-2 px-4">
                                {u.isBlocked ? (
                                  <span className="text-red-400 font-bold">محظور</span>
                                ) : (
                                  <span className="text-green-400 font-bold">نشط</span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {!u.isBlocked && (
                                  <button
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                                    disabled={blockLoadingId === u._id}
                                    onClick={() => handleBlockUser(u._id)}
                                  >
                                    {blockLoadingId === u._id ? '...' : 'بلوك'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'subscriptions' ? (
              <div className="h-full flex flex-col">
                <header className="mb-8 flex-shrink-0">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الاشتراكات</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>إدارة اشتراكات الملاك.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Search Bar and Filters */}
                  <div className="mb-4">
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="text"
                          placeholder="البحث برقم الاشتراك..."
                          value={subscriptionSearchId}
                          onChange={(e) => setSubscriptionSearchId(e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'}`}
                        />
                        {subscriptionSearchId && (
                          <button
                            onClick={() => setSubscriptionSearchId('')}
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Status Filter Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSubscriptionStatusFilter('all')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'all'
                              ? 'bg-orange-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          الكل
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('active')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'active'
                              ? 'bg-green-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          نشط
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('expired')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'expired'
                              ? 'bg-red-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          منتهي الصلاحية
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('refunded')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'refunded'
                              ? 'bg-gray-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          تم الاسترداد
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingSubscriptions ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الاشتراكات...</div>
                  ) : subscriptions.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد اشتراكات في النظام حالياً</div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="w-full text-sm text-right">
                        <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-500 bg-gray-50'}`}>
                          <tr>
                            <th className="px-4 py-3">رقم الاشتراك</th>
                            <th className="px-4 py-3">المالك</th>
                            <th className="px-4 py-3">خطة الاشتراك</th>
                            <th className="px-4 py-3">حالة الاشتراك</th>
                            <th className="px-4 py-3">تاريخ البداية</th>
                            <th className="px-4 py-3">تاريخ الانتهاء</th>
                            <th className="px-4 py-3">عدد الوحدات المسموحة</th>
                            <th className="px-4 py-3">تم الاسترداد</th>
                            <th className="px-4 py-3">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions
                            .filter(subscription => {
                              // Search filter
                              const searchMatch = !subscriptionSearchId || 
                                subscription._id.toLowerCase().includes(subscriptionSearchId.toLowerCase());
                              
                              // Status filter
                              const statusMatch = subscriptionStatusFilter === 'all' || 
                                subscription.status === subscriptionStatusFilter;
                              
                              return searchMatch && statusMatch;
                            })
                            .map((subscription) => (
                            <tr key={subscription._id} className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-900 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription._id}
                              </td>
                              <td className={`py-2 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {subscription.landlordId?.name || 'غير محدد'}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription.planName === 'basic' ? 'أساسي' : 
                                 subscription.planName === 'standard' ? 'قياسي' : 
                                 subscription.planName === 'premium' ? 'مميز' : subscription.planName}
                              </td>
                              <td className="py-2 px-4">
                                {subscription.status === 'active' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-inset ring-green-200">
                                    نشط
                                  </span>
                                ) : subscription.status === 'expired' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
                                    منتهي الصلاحية
                                  </span>
                                ) : subscription.status === 'refunded' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200">
                                    تم الاسترداد
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-200">
                                    {subscription.status}
                                  </span>
                                )}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(subscription.startDate).toLocaleDateString()}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(subscription.endDate).toLocaleDateString()}
                              </td>
                              <td className={`py-2 px-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription.unitLimit}
                              </td>
                              <td className="py-2 px-4 text-center">
                                {subscription.refunded ? (
                                  <span className="text-green-600 font-bold">نعم</span>
                                ) : (
                                  <span className="text-red-600 font-bold">لا</span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {subscription.status === 'expired' && !subscription.refunded && (
                                  <button
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                                    disabled={refundLoadingId === subscription._id}
                                    onClick={() => handleRefundSubscription(subscription._id)}
                                  >
                                    {refundLoadingId === subscription._id ? '...' : 'استرداد'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <header className="mb-8">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>التأكيدات</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>إدارة التأكيدات والتقارير.</p>
                </header>

       

                <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <div className="flex gap-3 flex-wrap">
                      <div className="relative">
                        <select 
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-4 pr-3 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          <option value="all">الكل</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="approved">تم التأكيد</option>
                          <option value="rejected">تم الرفض</option>
                        </select>
                      </div>
                      <div className="relative">
                        <select 
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-4 pr-3 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          <option value="all">الكل</option>
                          <option value="landlord">المالك</option>
                          <option value="tenant">المستأجر</option>
                        </select>
                      </div>
                    </div>
                   
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-500 bg-gray-50'}`}>
                        <tr>
                          <th className="px-6 py-3" scope="col">المستخدم</th>
                          <th className="px-6 py-3" scope="col">الدور</th>
                          <th className="px-6 py-3" scope="col">الحالة</th>
                          <th className="px-6 py-3" scope="col">تاريخ الانضمام</th>
                          <th className="px-6 py-3 text-right" scope="col">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={`px-6 py-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              لا يوجد مستخدمين
                            </td>
                          </tr>
                        ) : (
                          currentUsers.map((user) => (
                            <tr key={user._id} className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                              <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {user.name}
                              </td>
                              <td className={`px-6 py-4 capitalize ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {user.role}
                              </td>
                              <td className="px-6 py-4">
                                {getStatusBadge(user.verificationStatus?.status || 'not_submitted')}
                              </td>
                              <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                          
                                  <button
                                    className="text-orange-600 bg-orange-50 p-3 hover:text-orange-800 font-medium text-sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowModal(true);
                                    }}
                                  >
                                    عرض الوثائق
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                        >
                          السابق
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                          <button
                            key={idx + 1}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`px-3 py-1 rounded ${currentPage === idx + 1 ? 'bg-orange-500 text-white' : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Refund Confirmation Modal */}
      {showRefundModal && pendingRefundSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`rounded-xl shadow-xl p-8 max-w-xl w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              className={`absolute top-3 right-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
              onClick={() => {
                setShowRefundModal(false);
                setPendingRefundSubscription(null);
              }}
              aria-label="إغلاق"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-100'}`}>
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>تأكيد استرداد الاشتراك</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                هل أنت متأكد من استرداد هذا الاشتراك؟
              </p>
            </div>

            <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>المالك:</span>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pendingRefundSubscription.landlordId?.name || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>خطة الاشتراك:</span>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pendingRefundSubscription.planName === 'basic' ? 'أساسي' : 
                     pendingRefundSubscription.planName === 'standard' ? 'قياسي' : 
                     pendingRefundSubscription.planName === 'premium' ? 'مميز' : pendingRefundSubscription.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>رقم الاشتراك:</span>
                  <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {pendingRefundSubscription._id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg mb-6 ${isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                  <strong>تحذير:</strong> سيتم حذف جميع الوحدات المرتبطة بهذا الاشتراك نهائياً.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setPendingRefundSubscription(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                إلغاء
              </button>
              <button
                onClick={confirmRefundSubscription}
                disabled={refundLoadingId === pendingRefundSubscription._id}
                className="flex-1 px-4 py-2 rounded-lg font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refundLoadingId === pendingRefundSubscription._id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الاسترداد...
                  </div>
                ) : (
                  'تأكيد الاسترداد'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`rounded-xl shadow-xl p-8 max-w-md w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              className={`absolute top-3 right-3 ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
              onClick={() => setShowModal(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</h2>
            <div className="mb-4">
              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.email}</p>
              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.phone}</p>
            </div>
            <div className="mb-4 flex flex-col gap-4 items-center">
              {selectedUser.verificationStatus?.uploadedIdUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">صورة الهوية</p>
                  <img src={selectedUser.verificationStatus.uploadedIdUrl} alt="ID" className="rounded-lg max-h-40 border" />
                </div>
              )}
              {selectedUser.verificationStatus?.selfieUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">صورة التصوير الشخصي</p>
                  <img src={selectedUser.verificationStatus.selfieUrl} alt="Selfie" className="rounded-lg max-h-40 border" />
                </div>
              )}
            </div>
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={async () => {
                  await handleVerificationAction(selectedUser._id, 'approve');
                  setShowModal(false);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                تأكيد
              </button>
              <button
                onClick={async () => {
                  await handleVerificationAction(selectedUser._id, 'reject');
                  setShowModal(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                رفض
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
} 