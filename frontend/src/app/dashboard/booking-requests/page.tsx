"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from '@/components/ProtectedRoute';

interface BookingRequest {
  _id: string;
  tenantId: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  unitId: {
    _id: string;
    name: string;
    pricePerMonth?: number;
    securityDeposit?: number;
  };
  message?: string;
  status: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  price?: number;
}

export default function BookingRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingRequest | null>(null);
  const [form, setForm] = useState({
    rentAmount: "",
    depositAmount: "",
    startDate: "",
    endDate: "",
    paymentTerms: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);

  useEffect(() => {
    // التحقق من دور المستخدم
    if (user && user.role !== 'landlord') {
      toast.error("هذه الصفحة متاحة للملاك فقط");
      router.push('/dashboard');
      return;
    }

    // إذا لم يتم تحميل المستخدم بعد، انتظر
    if (!user) {
      return;
    }

    const fetchRequests = async () => {
      // setLoading(true);
      try {
        console.log("=== BOOKING REQUESTS PAGE DEBUG ===");
        console.log("User:", user);
        console.log("User role:", user?.role);
        console.log("================================");
        
        const res = (await apiService.getLandlordBookingRequests()) as any;
        console.log("API Response:", res);
        const requests = res.data?.requests || [];
        // Sort requests in descending order (newest first)
        const sortedRequests = requests.sort((a: BookingRequest, b: BookingRequest) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setRequests(sortedRequests);
      } catch (err: any) {
        console.error("Error fetching booking requests:", err);
        toast.error(err.message || "فشل في جلب الطلبات");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user, router]);

  const handleOpenForm = (req: BookingRequest) => {
    setSelected(req);
    setForm({
      rentAmount: req.unitId?.pricePerMonth?.toString() || "",
      depositAmount: req.unitId?.securityDeposit?.toString() || "",
      startDate: "",
      endDate: "",
      paymentTerms: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiService.createLeaseForBooking(selected._id, {
        rentAmount: Number(form.rentAmount),
        depositAmount: Number(form.depositAmount),
        startDate: selected.startDate ? selected.startDate : "",
        endDate: selected.endDate ? selected.endDate : "",
        paymentTerms: form.paymentTerms,
      });
      toast.success("تم إنشاء العقد بنجاح!");
      setRequests((prev) => prev.filter((r) => r._id !== selected._id));
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || "فشل إنشاء العقد");
    } finally {
      setSubmitting(false);
    }
  };

  // دالة رفض الطلب
  const handleRejectClick = (bookingId: string) => {
    setPendingRejectId(bookingId);
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async () => {
    if (!pendingRejectId) return;
    try {
      await apiService.rejectBookingRequest(pendingRejectId);
      toast.custom(
        (t) => (
          <div className="flex items-center max-w-md p-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border-l-4 border-red-600 animate-fade-in">
            <svg
              className="h-6 w-6 text-red-600 mr-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div className="flex-1">
              <div className="text-lg font-bold text-red-600 mb-1">تم رفض الطلب</div>
              <div className="text-gray-700 dark:text-gray-300">تم رفض الطلب وحذفه بنجاح.</div>
            </div>
            <button
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              onClick={() => toast.dismiss(t.id)}
              aria-label="إغلاق"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ),
        { duration: 5000, position: "top-center" }
      );
      setRequests((prev) => prev.filter((r) => r._id !== pendingRejectId));
    } catch (err: any) {
      toast.custom(
        (t) => (
          <div className="flex items-center max-w-md p-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border-l-4 border-red-600 animate-fade-in">
            <svg
              className="h-6 w-6 text-red-600 mr-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <div className="flex-1">
              <div className="text-lg font-bold text-red-600 mb-1">فشل في رفض الطلب</div>
              <div className="text-gray-700 dark:text-gray-300">{err.message || "فشل في رفض الطلب"}</div>
            </div>
            <button
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              onClick={() => toast.dismiss(t.id)}
              aria-label="إغلاق"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ),
        { duration: 5000, position: "top-center" }
      );
    } finally {
      setShowRejectConfirm(false);
      setPendingRejectId(null);
    }
  };

  return (
    <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="max-w-7xl mx-auto pt-32 px-4">
        <h1 className="text-3xl font-bold mb-8 text-orange-600 dark:text-orange-400 text-center">طلبات الإيجار الجديدة</h1>
        
        {/* معلومات المستخدم للتشخيص */}
        {user && (
          <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              المستخدم: {user.name} | الدور: {user.role} | ID: {user._id}
            </p>
          </div>
        )}
        
        {/* التحقق من دور المستخدم */}
        {user && user.role !== 'landlord' && (
          <div className="text-center py-12">
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
              هذه الصفحة متاحة للملاك فقط. دورك الحالي: {user.role}
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-200">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-200">لا توجد طلبات جديدة حالياً</div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-gray-900">
            <table className="min-w-full text-right">
              <thead>
                <tr className="bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200">
                  <th className="py-3 px-4 dark:text-white">الوحدة</th>
                  <th className="py-3 px-4 dark:text-white">المستأجر</th>
                  <th className="py-3 px-4 dark:text-white">المدة (شهور)</th>
                  <th className="py-3 px-4 dark:text-white">تاريخ البداية</th>
                  <th className="py-3 px-4 dark:text-white">تاريخ النهاية</th>
                  <th className="py-3 px-4 dark:text-white">السعر الإجمالي</th>
                  <th className="py-3 px-4 dark:text-white">معلومات المستأجر</th>
                  <th className="py-3 px-4 dark:text-white">تاريخ الطلب</th>
                  <th className="py-3 px-4 dark:text-white">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="py-2 px-4 font-semibold dark:text-white">{req.unitId?.name}</td>
                    <td className="py-2 px-4 dark:text-white">{req.tenantId?.name}</td>
                    <td className="py-2 px-4 dark:text-white">{req.durationMonths || '-'}</td>
                    <td className="py-2 px-4 dark:text-white">{req.startDate ? new Date(req.startDate).toLocaleDateString() : '-'}</td>
                    <td className="py-2 px-4 dark:text-white">{req.endDate ? new Date(req.endDate).toLocaleDateString() : '-'}</td>
                    <td className="py-2 px-4 dark:text-white">{req.price ? req.price.toLocaleString() + ' جنيه' : '-'}</td>
                    <td className="py-2 px-4 text-center dark:text-white">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/profile/${req.tenantId?._id}`)
                          }
                          title="عرض ملف المستأجر"
                          className="focus:outline-none"
                        >
                          <svg
                            className="w-5 h-5 text-orange-600 inline-block align-middle"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                      <td className="py-2 px-4 dark:text-white">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        <button
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                          onClick={() => handleOpenForm(req)}
                        >
                          إنشاء عقد
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
                          onClick={() => handleRejectClick(req._id)}
                        >
                          رفض
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* فورم تعبئة العقد */}
        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                className="absolute top-3 left-3 text-gray-500 hover:text-red-500 text-2xl"
                onClick={() => setSelected(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4 text-orange-600 dark:text-orange-400 text-center">تعبئة بيانات العقد</h2>
              {/* تفاصيل الحجز */}
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-800 rounded-lg text-orange-900 dark:text-orange-100">
                <div>المدة المطلوبة: <b>{selected.durationMonths || '-'}</b> شهر</div>
                <div>تاريخ البداية: <b>{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '-'}</b></div>
                <div>تاريخ النهاية: <b>{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : '-'}</b></div>
                <div>السعر الإجمالي: <b>{selected.price ? selected.price.toLocaleString() + ' جنيه' : '-'}</b></div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium dark:text-white">قيمة الإيجار الشهري</label>
                  <div className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white bg-gray-100 text-lg font-bold text-orange-700">
                    {selected.unitId.pricePerMonth ? `${selected.unitId.pricePerMonth} جنيه مصري` : "-"}
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-medium dark:text-white">قيمة التأمين</label>
                  <div className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white bg-gray-100 text-lg font-bold text-orange-700">
                    {selected.unitId.securityDeposit ? `${selected.unitId.securityDeposit} جنيه مصري` : "-"}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block mb-1 font-medium dark:text-white">تاريخ بداية العقد</label>
                    <input
                      type="text"
                      name="startDate"
                      value={selected.startDate ? new Date(selected.startDate).toLocaleDateString() : "-"}
                      readOnly
                      className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white bg-gray-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 font-medium dark:text-white">تاريخ نهاية العقد</label>
                    <input
                      type="text"
                      name="endDate"
                      value={selected.endDate ? new Date(selected.endDate).toLocaleDateString() : "-"}
                      readOnly
                      className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white bg-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-medium dark:text-white">شروط الدفع</label>
                  <textarea
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
                  disabled={submitting}
                >
                  {submitting ? "جاري إنشاء العقد..." : "إنشاء العقد"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* مودال تأكيد الرفض */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md relative animate-fade-in">
            <button
              className="absolute top-3 left-3 text-gray-500 hover:text-red-500 text-2xl"
              onClick={() => { setShowRejectConfirm(false); setPendingRejectId(null); }}
              aria-label="إغلاق"
            >
              ×
            </button>
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">تأكيد رفض الطلب</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-200 mb-6">هل أنت متأكد أنك تريد رفض هذا الطلب؟ سيتم حذف الطلب نهائيًا.</p>
            <div className="flex gap-4 mt-6">
              <button
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-700 dark:text-white font-bold py-2 px-4 rounded-lg"
                onClick={() => { setShowRejectConfirm(false); setPendingRejectId(null); }}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
                onClick={handleRejectConfirm}
                type="button"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
    
  );
} 
