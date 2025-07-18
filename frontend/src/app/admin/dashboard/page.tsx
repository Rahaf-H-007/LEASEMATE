'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { Pie } from 'react-chartjs-2';
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
 
  const [activeTab, setActiveTab] = useState<'table' | 'dashboard'>('table');

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

  const filteredUsers = users.filter(user => {
    const statusMatch = selectedStatus === 'all' || user.verificationStatus?.status === selectedStatus;
    const roleMatch = selectedRole === 'all' || user.role === selectedRole;
    return statusMatch && roleMatch;
  });

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
    <div className="relative flex size-full min-h-screen flex-col bg-stone-50 group/design-root overflow-x-hidden">
      <div className="flex h-full grow">
        {/* Sidebar */}
        <aside className="flex flex-col w-64 bg-white border-r border-gray-200 p-6 shrink-0">
          <div className="flex items-center gap-3 mb-8">
            <Logo size={40} />
          </div>
          
          <nav className="flex flex-col gap-2">
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-600 hover:bg-stone-100'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg className="text-orange-500" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <circle cx="128" cy="128" r="96" fill="currentColor" opacity="0.2" />
                <path d="M128,32A96,96,0,1,0,224,128,96.11,96.11,0,0,0,128,32Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,208Z" />
              </svg>
              <p className="text-sm font-semibold">لوحة التحكم</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'table' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-600 hover:bg-stone-100'}`}
              onClick={() => setActiveTab('table')}
            >
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <rect width="256" height="256" fill="none" />
                <rect x="40" y="56" width="176" height="144" rx="8" fill="none" stroke="currentColor" strokeWidth="16" />
                <line x1="40" y1="104" x2="216" y2="104" fill="none" stroke="currentColor" strokeWidth="16" />
                <line x1="40" y1="152" x2="216" y2="152" fill="none" stroke="currentColor" strokeWidth="16" />
              </svg>
              <p className="text-sm font-medium">جدول المستخدمين</p>
            </button>
          
          </nav>
          
          <div className="mt-auto">
          
            <button
              onClick={() => {
                logout();
                router.push('/auth/login');
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors w-full mt-2"
            >
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z"></path>
              </svg>
              <p className="text-sm font-medium">تسجيل الخروج</p>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-orange-50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="flex flex-col items-center gap-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">لوحة التحكم</h1>
                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-8">
                  <div className="bg-white rounded-xl shadow p-6 text-center">
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalUsers}</p>
                    <p className="text-gray-700">إجمالي المستخدمين</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6 text-center">
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalLandlords}</p>
                    <p className="text-gray-700">المالكون</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6 text-center">
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalTenants}</p>
                    <p className="text-gray-700">المستأجرون</p>
                  </div>
                </div>
                {/* Pie Chart */}
                <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl flex flex-col items-center">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">توزيع حالة التأكيد</h2>
                  <Pie data={pieData} />
                </div>
              </div>
            ) : (
              <>
                <header className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">التأكيدات</h1>
                  <p className="text-gray-600 mt-1">إدارة التأكيدات والتقارير.</p>
                </header>

       

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <div className="flex gap-3 flex-wrap">
                      <div className="relative">
                        <select 
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-200 bg-white pl-4 pr-3 text-gray-600 hover:bg-gray-50"
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
                          className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-200 bg-white pl-4 pr-3 text-gray-600 hover:bg-gray-50"
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
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50">
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
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              لا يوجد مستخدمين
                            </td>
                          </tr>
                        ) : (
                          currentUsers.map((user) => (
                            <tr key={user._id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {user.name}
                              </td>
                              <td className="px-6 py-4 text-gray-600 capitalize">
                                {user.role}
                              </td>
                              <td className="px-6 py-4">
                                {getStatusBadge(user.verificationStatus?.status || 'not_submitted')}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
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
                          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                        >
                          السابق
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                          <button
                            key={idx + 1}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`px-3 py-1 rounded ${currentPage === idx + 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
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

      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-orange-600"
              onClick={() => setShowModal(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center">{selectedUser.name}</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{selectedUser.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{selectedUser.phone}</p>
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
    </div>
  );
} 