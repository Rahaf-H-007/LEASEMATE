'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [showVerifiedAlert, setShowVerifiedAlert] = useState(true);
  const [showApprovedBanner, setShowApprovedBanner] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | undefined>(undefined);

  // Watch for status change from pending to approved
  useEffect(() => {
    if (user?.verificationStatus?.status !== prevStatus) {
      if (prevStatus === 'pending' && user?.verificationStatus?.status === 'approved') {
        setShowApprovedBanner(true);
        setTimeout(() => setShowApprovedBanner(false), 3000); // Hide after 3s
      }
      setPrevStatus(user?.verificationStatus?.status);
    }
  }, [user?.verificationStatus?.status, prevStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show pending banner if verification is pending
  if (user && user.verificationStatus?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">في انتظار موافقة الإدارة</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">تم إرسال مستندات التحقق بنجاح. يرجى الانتظار حتى يتم مراجعتها من قبل الإدارة.</p>
        </div>
      </div>
    );
  }

  // Show rejected banner with images and edit button
  if (user && user.verificationStatus?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
         
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">تم رفض التحقق الخاص بك. يرجى إعادة رفع المستندات بشكل صحيح.</p>
          <div className="flex flex-col items-center gap-4 mb-4">
            {/* Show previously uploaded images if available */}
            {user.verificationStatus?.uploadedIdUrl && (
              <img
                src={user.verificationStatus.uploadedIdUrl}
                alt="Uploaded ID"
                className="w-48 h-32 object-cover rounded border"
              />
            )}
            {user.verificationStatus?.selfieUrl && (
              <img
                src={user.verificationStatus.selfieUrl}
                alt="Uploaded Selfie"
                className="w-32 h-32 object-cover rounded-full border"
              />
            )}
          </div>
          <button
            onClick={() => router.push('/auth/verification')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            تعديل وإعادة رفع المستندات
          </button>
        </div>
      </div>
    );
  }

  // Show approved banner (toast) when status changes from pending to approved
  const showVerified = user && user.verificationStatus && user.verificationStatus.status === 'approved' && showVerifiedAlert;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      {showApprovedBanner && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center">
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-xl p-4 shadow-md gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-green-800 dark:text-green-200">تمت الموافقة على التحقق الخاص بك من قبل الإدارة</span>
                <p className="text-sm text-green-700 dark:text-green-300">يمكنك الآن الوصول إلى جميع الميزات.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <main className="pt-14 pb-16 px-4"> {/* pt-14 matches new Navbar height */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
           
           
            <div className="m-8">
              <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold text-lg md:text-2xl rounded-lg px-6 py-3 shadow">
                LeaseMate – خليك مطمن.. إيجارك في إيد أمينة
              </span>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              منصتك الذكية لإيجار أسهل وأسرع وأمان أكتر
            </h3>
           
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <button className="bg-orange-500 dark:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  ابدأ الآن
                </button>
              </Link>
              <Link href="/properties">
                <button className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-gray-300 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors shadow-lg">
                  تصفح العقارات
                </button>
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">دفعات رقمية</h3>
              <p className="text-gray-600 dark:text-gray-300">تمكنك من إدارة جميع عمليات الدفع بأمان وسرعة.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">طلبات الصيانة</h3>
              <p className="text-gray-600 dark:text-gray-300">قم بطلب الصيانة والتواصل مع المالك بسهولة.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">عقود رقمية</h3>
              <p className="text-gray-600 dark:text-gray-300">تمكنك من إدارة جميع عقود الإيجار بأمان وسهولة.</p>
            </div>
          </div>

          {/* Featured Properties */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">العقارات المميزة</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">اكتشف أفضل العقارات المتاحة للإيجار.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <img 
                  alt="The Urban Loft" 
                  className="w-full h-64 object-cover" 
                  src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">The Urban Loft</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">123 Main Street, Downtown</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">$1,200/mo</span>
                    <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm font-medium">متوفر</span>
                  </div>
                  <button className="w-full bg-orange-500 dark:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                    عرض التفاصيل
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <img 
                  alt="Sunset Villa" 
                  className="w-full h-64 object-cover" 
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sunset Villa</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">456 Ocean View Drive, Seaside</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">$1,800/mo</span>
                    <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm font-medium">متوفر</span>
                  </div>
                  <button className="w-full bg-orange-500 dark:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                    عرض التفاصيل
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <img 
                  alt="The Garden House" 
                  className="w-full h-64 object-cover" 
                  src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">The Garden House</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">789 Pine Street, Suburbia</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">$1,500/mo</span>
                    <span className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-3 py-1 rounded-full text-sm font-medium">قريباً</span>
                  </div>
                  <button className="w-full bg-orange-500 dark:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg mb-20">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">لماذا تختار LeaseMate؟</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">500+</div>
                <div className="text-gray-600 dark:text-gray-300">عملاء سعداء</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">200+</div>
                <div className="text-gray-600 dark:text-gray-300">عقارات</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">98%</div>
                <div className="text-gray-600 dark:text-gray-300">معدل الرضا</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">24/7</div>
                <div className="text-gray-600 dark:text-gray-300">دعم</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <Image src="/leasemate-logo.png" alt="LeaseMate Logo" width={60} height={60} />
                </div>
               
              <p className="text-gray-400 dark:text-gray-300 mb-4">تم إنشاء منصة LeaseMate لتسهيل عمليات الإيجار الذكية في مصر.</p>
            </div>
            <div className='flex flex-col items-center'>
              <h4 className="text-lg font-semibold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 flex flex-col items-center">
                <li><Link href="/" className="text-gray-400 dark:text-gray-300 hover:text-white transition-colors">الرئيسية</Link></li>
                <li><Link href="/properties" className="text-gray-400 dark:text-gray-300 hover:text-white transition-colors">العقارات</Link></li>
              </ul>
            </div>
           
          
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LeaseMate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
