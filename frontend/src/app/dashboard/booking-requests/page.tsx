"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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
  };
  message?: string;
  status: string;
  createdAt: string;
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
      setLoading(true);
      try {
        console.log("=== BOOKING REQUESTS PAGE DEBUG ===");
        console.log("User:", user);
        console.log("User role:", user?.role);
        console.log("================================");
        
        const res = await apiService.getLandlordBookingRequests() as any;
        console.log("API Response:", res);
        setRequests(res.data?.requests || []);
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
      rentAmount: "",
      depositAmount: "",
      startDate: "",
      endDate: "",
      paymentTerms: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        startDate: form.startDate,
        endDate: form.endDate,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-20 px-4">
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
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-300">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-300">لا توجد طلبات جديدة حالياً</div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-gray-900">
            <table className="min-w-full text-right">
              <thead>
                <tr className="bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200">
                  <th className="py-3 px-4">الوحدة</th>
                  <th className="py-3 px-4">المستأجر</th>
                  <th className="py-3 px-4">الرسالة</th>
                  <th className="py-3 px-4">تاريخ الطلب</th>
                  <th className="py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="py-2 px-4 font-semibold">{req.unitId?.name}</td>
                    <td className="py-2 px-4">{req.tenantId?.name}</td>
                    <td className="py-2 px-4">{req.message || "-"}</td>
                    <td className="py-2 px-4">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-4">
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
                        onClick={() => handleOpenForm(req)}
                      >
                        إنشاء عقد
                      </button>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">قيمة الإيجار الشهري</label>
                  <input type="number" name="rentAmount" value={form.rentAmount} onChange={handleChange} required min={0}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">قيمة التأمين</label>
                  <input type="number" name="depositAmount" value={form.depositAmount} onChange={handleChange} required min={0}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">تاريخ بداية العقد</label>
                  <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">تاريخ نهاية العقد</label>
                  <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">شروط الدفع</label>
                  <textarea name="paymentTerms" value={form.paymentTerms} onChange={handleChange} required rows={2}
                    className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-lg mt-2 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "جاري الحفظ..." : "حفظ العقد"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 