'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiService } from '@/services/api';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

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
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/admin/login');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-inset ring-green-200">
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200">
            Not Submitted
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
            <a className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors" href="#">
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l.11-.1L128,40l79.9,75.43.11.1Z"></path>
              </svg>
              <p className="text-sm font-medium">Dashboard</p>
            </a>
            <a className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-orange-50 text-gray-900 transition-colors" href="#">
              <svg className="text-orange-500" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M208,40H48A16,16,0,0,0,32,56v58.77c0,89.61,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.78,91-124.39V56A16,16,0,0,0,208,40Zm-34.34,69.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.68l50.34-50.34a8,8,0,0,1,11.32,11.32Z"></path>
              </svg>
              <p className="text-sm font-semibold">Verifications</p>
            </a>
            <a className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors" href="#">
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M34.76,42A8,8,0,0,0,32,48V216a8,8,0,0,0,16,0V171.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V48A8,8,0,0,0,210.76,42c-28,24.23-51.72,12.49-79.21-1.12C103.07,26.76,70.78,10.79,34.76,42ZM208,164.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V51.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z"></path>
              </svg>
              <p className="text-sm font-medium">Flagged Content</p>
            </a>
            <a className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors" href="#">
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z"></path>
              </svg>
              <p className="text-sm font-medium">Usage Stats</p>
            </a>
          </nav>
          
          <div className="mt-auto">
            <a className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors" href="#">
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"></path>
              </svg>
              <p className="text-sm font-medium">Settings</p>
            </a>
            <button
              onClick={() => {
                logout();
                router.push('/admin/login');
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-stone-100 transition-colors w-full mt-2"
            >
              <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                <path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z"></path>
              </svg>
              <p className="text-sm font-medium">{t('admin.logout')}</p>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-orange-50">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">User Verifications</h1>
              <p className="text-gray-600 mt-1">Manage user verifications and reports.</p>
            </header>

            <div className="border-b border-gray-200 mb-6">
              <nav className="flex -mb-px gap-8">
                <a className="py-4 px-1 border-b-2 border-orange-500 text-orange-500 font-semibold text-sm" href="#">
                  User Table
                </a>
                <a className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm" href="#">
                  Verification Queue
                </a>
                <a className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm" href="#">
                  Reports
                </a>
              </nav>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="relative">
                    <select 
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-200 bg-white pl-4 pr-3 text-gray-600 hover:bg-gray-50"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-200 bg-white pl-4 pr-3 text-gray-600 hover:bg-gray-50"
                    >
                      <option value="all">All Roles</option>
                      <option value="landlord">Landlord</option>
                      <option value="tenant">Tenant</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border border-gray-200 bg-white px-4 text-gray-600 hover:bg-gray-50">
                    <p className="text-sm font-medium">Bulk Actions</p>
                  </button>
                  <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-orange-500 px-4 text-white shadow-sm hover:opacity-90">
                    <p className="text-sm font-medium">Export</p>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" x2="12" y1="15" y2="3"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3" scope="col">User</th>
                      <th className="px-6 py-3" scope="col">Role</th>
                      <th className="px-6 py-3" scope="col">Status</th>
                      <th className="px-6 py-3" scope="col">Joined Date</th>
                      <th className="px-6 py-3 text-right" scope="col">Actions</th>
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
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
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
                              {user.verificationStatus?.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleVerificationAction(user._id, 'approve')}
                                    className="text-green-600 hover:text-green-800 font-medium text-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleVerificationAction(user._id, 'reject')}
                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowModal(true);
                                }}
                              >
                                {t('admin.view')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal لعرض صور المستخدم */}
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
                  <p className="text-xs text-gray-500 mb-1">{t('admin.idImage')}</p>
                  <img src={selectedUser.verificationStatus.uploadedIdUrl} alt="ID" className="rounded-lg max-h-40 border" />
                </div>
              )}
              {selectedUser.verificationStatus?.selfieUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('admin.selfieImage')}</p>
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
                {t('admin.approve')}
              </button>
              <button
                onClick={async () => {
                  await handleVerificationAction(selectedUser._id, 'reject');
                  setShowModal(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {t('admin.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 