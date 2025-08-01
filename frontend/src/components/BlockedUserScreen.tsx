'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';

const BlockedUserScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  const handleContactSupport = () => {
    // Navigate to support chat using Next.js router (maintains auth state)
    console.log('🎯 Navigating to support chat with user:', user?._id);
    router.push('/dashboard/support-chat');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full rounded-2xl shadow-2xl p-8 text-center ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size={80} />
        </div>

        {/* Block Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          حسابك محظور
        </h1>

        {/* Message */}
        <div className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-lg mb-3">
            عذراً، تم حظر حسابك مؤقتاً
          </p>
          <p className="text-sm leading-relaxed">
            تم حظر حسابك بسبب انتهاك شروط الاستخدام أو السلوك غير المناسب. 
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع فريق الدعم.
          </p>
        </div>

        {/* User Info */}
        {user && (
          <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.name}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user.phone || user.email}
                </p>
              </div>
            </div>
            <div className={`text-xs px-3 py-1 rounded-full inline-block ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
              محظور
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContactSupport}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            التواصل مع الدعم
          </button>
          
          <button
            onClick={handleLogout}
            className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Footer */}
        <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            إذا كان لديك أي استفسارات، يرجى التواصل مع فريق الدعم
          </p>
        </div>
      </div>

    </div>
  );
};

export default BlockedUserScreen;
