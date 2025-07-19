'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import VerificationCheck from '@/components/VerificationCheck';
import Navbar from '@/components/Navbar';
import Link from "next/link";
// تم حذف useLanguage
import { apiService, Unit } from '@/services/api';


export default function Dashboard() {
  const { user } = useAuth();
  const [showVerificationStatus, setShowVerificationStatus] = useState(true);
  const [myUnits, setMyUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [errorUnits, setErrorUnits] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    const fetchMyUnits = async () => {
      if (user?.role !== 'landlord') return;
      setLoadingUnits(true);
      setErrorUnits(null);
      try {
        // يفترض أن التوكن محفوظ في localStorage
        const token = localStorage.getItem('leasemate_token');
        if (!token) throw new Error('لم يتم العثور على التوكن');
        const res = await apiService.getMyUnits(token);
        setMyUnits(res.data.units);
      } catch (err: any) {
        setErrorUnits(err.message || 'حدث خطأ أثناء جلب الممتلكات');
      } finally {
        setLoadingUnits(false);
      }
    };

    const fetchPendingRequests = async () => {
      if (user?.role !== 'landlord') return;
      setLoadingRequests(true);
      try {
        const res = await apiService.getLandlordBookingRequests() as any;
        // حساب الطلبات المعلقة (pending)
        const pendingCount = res.data?.bookingRequests?.filter((request: any) => request.status === 'pending').length || 0;
        setPendingRequests(pendingCount);
      } catch (err: any) {
        console.error('Error fetching pending requests:', err);
        setPendingRequests(0);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchMyUnits();
    fetchPendingRequests();
  }, [user]);

  return (
    <ProtectedRoute>
      <VerificationCheck>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
          <Navbar />
        
        <main className="pt-14 px-4"> 
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {`مرحبًا ${user?.name || ''} في لوحة التحكم`}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {user?.role === 'landlord' ? 'هذه ممتلكاتك المعروضة' : 'هذه عقود الإيجار الخاصة بك'}
              </p>
            </div>

            {/* Verification Status */}
            {user?.verificationStatus && showVerificationStatus && (
              <div className="mb-6">
                <div className={`rounded-xl p-4 shadow-lg relative ${
                  user.verificationStatus.status === 'approved' 
                    ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
                    : user.verificationStatus.status === 'rejected'
                    ? 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700'
                    : 'bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700'
                }`}>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowVerificationStatus(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.verificationStatus.status === 'approved'
                        ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                        : user.verificationStatus.status === 'rejected'
                        ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {user.verificationStatus.status === 'approved' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : user.verificationStatus.status === 'rejected' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.verificationStatus.status === 'approved' 
                          ? 'تم التوثيق'
                          : user.verificationStatus.status === 'rejected'
                          ? 'مرفوض'
                          : 'قيد المراجعة'
                        }
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {user.verificationStatus.status === 'approved'
                          ? 'تم توثيق هويتك بنجاح.'
                          : user.verificationStatus.status === 'rejected'
                          ? 'تم رفض التوثيق. يرجى التواصل مع الدعم.'
                          : 'يتم الآن مراجعة مستنداتك من قبل فريقنا.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إحصائيات سريعة</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{user?.role === 'landlord' ? 'عدد الممتلكات النشطة' : 'عدد العقود النشطة'}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{user?.role === 'landlord' ? myUnits.length : 3}</span>
                  </div>
                  {user?.role === 'landlord' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">طلبات الإيجار المعلقة</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {loadingRequests ? '...' : pendingRequests}
                      </span>
                    </div>
                  )}
                  {user?.role === 'tenant' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">إجمالي الإيجار</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">$3,600</span>
                    </div>
                  )}
                </div>
              </div>

             

              {/* Quick Actions */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">إجراءات سريعة</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/maintenance-requests">
                    <button className="w-full text-left p-3 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                      طلبات الصيانة
                    </button>
                  </Link>
                  <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {user?.role === 'landlord' ? (
                    <>
                      <a
                        href="/unit/add"
                        className="w-full block text-center p-3 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors"
                      >
                        إضافة وحدة جديدة
                      </a>
                      <a
                        href="/dashboard/booking-requests"
                        className="w-full block text-center p-3 rounded-lg bg-blue-500 dark:bg-blue-600 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors mt-2"
                      >
                        طلبات الإيجار الجديدة
                      </a>
                    </>
                  ) : (
                    <button className="w-full text-center p-3 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                      ارسال طلب صيانة
                    </button>
                  )}
                  <button className="w-full text-center p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    عرض المستندات
                  </button>
                </div>
              </div>
            </div>

            {/* قسم العقود الجديد */}
            <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">عقودي</h2>
              <div className="flex flex-col items-center gap-4">
                <p className="text-gray-700 dark:text-gray-200">يمكنك الآن عرض جميع عقودك وتحميلها كملفات PDF.</p>
                <a
                  href="/dashboard/leases"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  عرض العقود
                </a>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {user?.role === 'landlord' ? 'ممتلكاتك' : 'عقودك'}
              </h2>
              {user?.role === 'landlord' && loadingUnits && (
                <div className="text-center text-gray-600 dark:text-gray-300">جاري التحميل...</div>
              )}
              {user?.role === 'landlord' && errorUnits && (
                <div className="text-center text-red-600 dark:text-red-400">{errorUnits}</div>
              )}
              {user?.role === 'landlord' && !loadingUnits && !errorUnits && myUnits.length === 0 && (
                <div className="text-center text-gray-600 dark:text-gray-300">لا توجد ممتلكات بعد.</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user?.role === 'landlord'
                  ? myUnits.map((unit) => (
                      <div key={unit._id} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{unit.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{unit.address}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-600 dark:text-orange-400 font-bold">{unit.pricePerMonth} جنيه/شهر</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${unit.status === 'available' ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100' : unit.status === 'booked' ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{unit.status === 'available' ? 'نشط' : unit.status === 'booked' ? 'محجوز' : 'تحت الصيانة'}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">رقم الوحدة: {unit._id}</div>
                        <button
                          className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                          onClick={() => window.location.href = `/unit/${unit._id}/manage`}
                        >
                          اظهر التفاصيل
                        </button>
                      </div>
                    ))
                  : /* عقود المستأجر أو غيره */
                    <div className="text-center text-gray-600 dark:text-gray-300">عرض العقود غير مفعل حالياً.</div>
                }
              </div>
            </div>
          </div>
        </main>
      </div>
      </VerificationCheck>
    </ProtectedRoute>
  );
} 