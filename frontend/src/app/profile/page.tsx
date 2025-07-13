"use client";

import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import React from 'react';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-gray-700 dark:text-gray-200 text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-red-600 dark:text-red-300 text-lg">You must be logged in to view your profile.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-stone-900">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">{/* Adjust height for navbar */}
        <main className="max-w-2xl w-full p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-orange-200 dark:border-orange-700" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-4xl text-orange-500 font-bold">
                {user.name?.charAt(0) || '?'}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <span className="text-gray-600 dark:text-gray-300">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
          </div>
          <div className="space-y-4">
            {user.email && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">Email:</span>
                <span className="text-gray-900 dark:text-white">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">Phone:</span>
                <span className="text-gray-900 dark:text-white">{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-200">Verification Status:</span>
              <span className={
                user.verificationStatus?.status === 'approved'
                  ? 'text-green-600 dark:text-green-400'
                  : user.verificationStatus?.status === 'pending'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }>
                {user.verificationStatus?.status ? user.verificationStatus.status.charAt(0).toUpperCase() + user.verificationStatus.status.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 