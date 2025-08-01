'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface BlockGuardProps {
  children: React.ReactNode;
}

const BlockGuard: React.FC<BlockGuardProps> = ({ children }) => {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isBlockedFromStorage, setIsBlockedFromStorage] = useState<boolean>(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState<boolean>(false);

  // Check localStorage for blocked status immediately on mount
  useEffect(() => {
    const blockedStatus = localStorage.getItem('leasemate_user_blocked');
    const hasToken = localStorage.getItem('leasemate_token');
    
    if (blockedStatus === 'true' && hasToken) {
      setIsBlockedFromStorage(true);
    }
    setHasCheckedStorage(true);
  }, []);

  // List of paths that blocked users should not be able to access
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/units',
    '/bookings',
    '/maintenance',
    '/messages',
    '/notifications',
    '/admin',
    '/landlord',
    '/tenant',
    '/subscription',
    '/payment',
    '/support'
  ];

  // Paths that are allowed even when blocked (like logout, login, etc.)
  const allowedPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
    '/dashboard/support-chat' // Allow blocked users to access support chat
  ];

  useEffect(() => {
    // If user is blocked and trying to access protected paths, prevent navigation
    if (user?.isBlocked && token) {
      const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
      const isAllowedPath = allowedPaths.some(path => pathname === path || pathname.startsWith(path));
      
      if (isProtectedPath && !isAllowedPath) {
        // Prevent navigation by replacing the current URL
        router.replace('/blocked');
      }
    }
  }, [user?.isBlocked, pathname, router, token]);

  // Show loading while checking authentication and storage
  if (isLoading || !hasCheckedStorage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Check if user is blocked (either from user data or localStorage)
  const isUserBlocked = user?.isBlocked || isBlockedFromStorage;
  
  console.log('🛡️ BlockGuard check:', {
    pathname,
    isUserBlocked,
    userBlocked: user?.isBlocked,
    storageBlocked: isBlockedFromStorage,
    hasToken: !!(token || localStorage.getItem('leasemate_token'))
  });
  
  // If user is blocked and authenticated, show blocked screen immediately
  if (isUserBlocked && (token || localStorage.getItem('leasemate_token'))) {
    // Allow access to certain paths even when blocked
    const isAllowedPath = allowedPaths.some(path => pathname === path || pathname.startsWith(path));
    
    console.log('🚫 Blocked user navigation:', {
      pathname,
      isAllowedPath,
      allowedPaths: allowedPaths.filter(path => pathname === path || pathname.startsWith(path))
    });
    
    if (!isAllowedPath) {
      console.log('❌ Path not allowed for blocked user, redirecting to /blocked');
      // Redirect to blocked page
      router.push('/blocked');
      return null;
    } else {
      console.log('✅ Path allowed for blocked user, continuing...');
    }
  }

  // Otherwise, render children normally
  return <>{children}</>;
};

export default BlockGuard;
