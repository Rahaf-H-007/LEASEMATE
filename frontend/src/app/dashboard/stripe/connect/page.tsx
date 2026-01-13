'use client';
import { useStripeService } from '@/services/stripe';
import { useEffect, useState } from 'react';

export default function ConnectPage() {
  const { createConnectLink } = useStripeService();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createConnectLink()
      .then((url) => {
        window.location.href = url;
      })
      .catch((err) => {
        setError(err.message || 'حدث خطأ أثناء التوجيه إلى Stripe');
        setIsLoading(false);
      });
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-red-100 dark:border-gray-700 p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">حدث خطأ</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
            >
              المحاولة مرة أخرى
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-blue-100 dark:border-gray-700 p-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">جاري التوجيه إلى Stripe</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">يرجى الانتظار بينما نقوم بتوجيهك لإكمال عملية الربط مع Stripe...</p>
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
