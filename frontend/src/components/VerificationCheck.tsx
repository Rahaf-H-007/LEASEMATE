'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface VerificationCheckProps {
  children: React.ReactNode;
}

export default function VerificationCheck({ children }: VerificationCheckProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has verification status and if it's not approved
      if (!user.verificationStatus || user.verificationStatus.status === 'pending') {
        // If user has pending verification, redirect to homepage to show pending message
        if (user.verificationStatus && user.verificationStatus.status === 'pending') {
          if (window.location.pathname !== '/') {
            router.push('/');
          }
        }
        // If user has no verification status, redirect to verification page
        else if (!user.verificationStatus) {
          if (window.location.pathname !== '/auth/verification') {
            router.push('/auth/verification');
          }
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#FF6B35]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If verification is pending or not started, don't render children
  if (!user.verificationStatus || user.verificationStatus.status === 'pending') {
    return null;
  }

  return <>{children}</>;
} 