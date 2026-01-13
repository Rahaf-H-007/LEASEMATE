'use client';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-red-100 dark:border-gray-700 p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">تم إلغاء الدفع</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">لم يتم إكمال عملية الدفع. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard/stripe/subscribe')}
              className="w-full bg-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
            >
              المحاولة مرة أخرى
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
