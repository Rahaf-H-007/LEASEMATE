"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { notifications, loading } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between whitespace-nowrap bg-white/80 px-6 sm:px-10 py-2 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3 text-gray-900">
          <Logo />
        </div>

        <nav className="hidden md:flex flex-1 justify-center items-center gap-6">
          <Link href="/properties" className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-medium">
            {t('navbar.properties')}
          </Link>
          <Link href="/leases" className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-medium">
            {t('navbar.leases')}
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-medium">
            {t('navbar.about')}
          </Link>
        </nav>

        {/* Notification Bell */}
        <div className="mx-5">
          {user && (
            <Link href="/notifications" className="relative">
              <Bell className="w-6 h-6 text-gray-700 hover:text-orange-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Toggle language"
            title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="User Profile"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd"></path>
                  </svg>
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  <div className="px-4 py-2 text-sm text-gray-900">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <hr className="my-2 border-gray-200" />
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navbar.dashboard')}
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navbar.profile')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    {t('navbar.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm text-gray-700 hover:text-orange-600 transition-colors"
              >
                {t('navbar.signIn')}
              </Link>
              <Link
                href="/auth/register"
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-orange-500 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-orange-600 transition-colors"
              >
                <span className="truncate">{t('navbar.signUp')}</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Verification Banner */}
      {user && user.verificationStatus && user.verificationStatus.status !== 'approved' && (
        <div className="mt-[72px] w-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center py-3 px-4 shadow-sm z-40">
          {user.verificationStatus.status === 'pending' &&
            'Your account is under verification. Some features may be limited until approval.'}
          {user.verificationStatus.status === 'rejected' &&
            'Your verification was rejected. Please re-upload your documents.'}
        </div>
      )}
    </>
  );
}
