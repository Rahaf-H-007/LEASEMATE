"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { notifications, loading } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between whitespace-nowrap bg-orange-200 border-b border-orange-100 shadow-md px-6 sm:px-10 py-1.5 h-14">
        <div className="flex items-center gap-3 text-gray-900 pl-2">
          {" "}
          {/* Added pl-2 for spacing */}
          <Logo size={70} />
        </div>

        <nav
          key={pathname}
          className="hidden md:flex flex-1 justify-center items-center gap-6"
        >
          {!user ? (
            <>
              <Link
                href="/unit"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                تصفح العقارات
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                معلومات عنا
              </Link>
            </>
          ) : user.role === "landlord" ? (
            <>
              <Link
                href="/dashboard/booking-requests"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                طلبات الإيجار
              </Link>
              <Link
                href="/my-units"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                ممتلكاتي
              </Link>
              <Link
                href="/unit/add"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                إضافة وحدة جديدة
              </Link>
              <Link
                href="/dashboard/leases"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                عقودي
              </Link>
            </>
          ) : user.role === "tenant" ? (
            <>
              <Link
                href="/unit"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                تصفح العقارات
              </Link>
              <Link
                href="/dashboard/leases"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                عقودي
              </Link>
            </>
          ) : user.role === "admin" ? (
            <>
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                لوحة تحكم المشرف
              </Link>
              <Link
                href="/dashboard/leases"
                className="text-gray-700 hover:text-orange-600 transition-colors duration-300 font-bold text-xl"
              >
                عقودي
              </Link>
            </>
          ) : null}
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
          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
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
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      clipRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  <div className="px-4 py-2 text-sm text-gray-900">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-gray-500 capitalize">
                      {user.role === "landlord"
                        ? "مالك"
                        : user.role === "tenant"
                        ? "مستأجر"
                        : user.role === "admin"
                        ? "مشرف"
                        : ""}
                    </p>
                  </div>
                  <hr className="my-2 border-gray-200" />
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-bold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    لوحة التحكم
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-bold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    الملف الشخصي
                  </Link>
                  <Link
                    href='/'
                    onClick={handleLogout}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-bold"
                  >
                    تسجيل الخروج
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className=" text-gray-700 hover:text-orange-600 transition-colors font-bold text-xl"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/auth/register"
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-orange-500 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-orange-600 transition-colors"
              >
                <span className="truncate">التسجيل</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex cursor-pointer items-center justify-center rounded-lg h-10 w-10 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 md:hidden">
            <div className="px-6 py-4 space-y-4">
              {!user ? (
                <>
                  <Link
                    href="/unit"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    تصفح العقارات
                  </Link>
                  <Link
                    href="/about"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    معلومات عنا
                  </Link>
                </>
              ) : user.role === "landlord" ? (
                <>
                  <Link
                    href="/dashboard/booking-requests"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    طلبات الإيجار
                  </Link>
                  <Link
                    href="/my-units"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ممتلكاتي
                  </Link>
                  <Link
                    href="/unit/add"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    إضافة وحدة جديدة
                  </Link>
                  <Link
                    href="/dashboard/leases"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    عقودي
                  </Link>
                </>
              ) : user.role === "tenant" ? (
                <>
                  <Link
                    href="/unit"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    تصفح العقارات
                  </Link>
                  <Link
                    href="/dashboard/leases"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    عقودي
                  </Link>
                </>
              ) : user.role === "admin" ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    لوحة تحكم المشرف
                  </Link>
                  <Link
                    href="/dashboard/leases"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    عقودي
                  </Link>
                </>
              ) : null}
              
              {user && (
                <>
                  <hr className="border-gray-200" />
                  <Link
                    href="/dashboard"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-bold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    لوحة التحكم
                  </Link>
                  <Link
                    href="/profile"
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-bold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    الملف الشخصي
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block text-gray-700 hover:text-orange-600 transition-colors font-bold"
                  >
                    تسجيل الخروج
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      
    </>
  );
}


