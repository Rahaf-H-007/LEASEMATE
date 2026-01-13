'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function RefundPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const subscriptionId = params.subscriptionId as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const refund = async () => {
      try {
        
        const res = await fetch(`http://localhost:5000/api/stripe/refund-specific`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ subscriptionId }),
        });

        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 3000); // Redirect after 3s
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    if (subscriptionId && token) {
      refund();
    }
  }, [subscriptionId, token, router]);

  return (
    <div className="p-4 text-center">
      {status === 'loading' && <p>جارٍ تنفيذ الاسترداد...</p>}
      {status === 'success' && (
        <p className="text-green-600">✅ تم استرداد الاشتراك بنجاح. سيتم تحويلك قريباً.</p>
      )}
      {status === 'error' && (
        <p className="text-red-600">❌ حدث خطأ أثناء الاسترداد.</p>
      )}
    </div>
  );
}
