import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { apiService } from "@/services/api";
import toast from "react-hot-toast";
import Link from 'next/link';
import Modal from "react-modal";

interface Manager {
  name: string;
  phone: string;
  email: string;
  landlordId?: string;
}

interface RentSidebarCardProps {
  unitId: string;
  rent: number;
  leaseDuration: string;
  securityDeposit: number;
  availableFrom: string;
  manager: Manager;
  onBookingSuccess?: () => void;
}

const RentSidebarCard: React.FC<RentSidebarCardProps> = ({
  unitId,
  rent,
  availableFrom,
  manager,
  onBookingSuccess,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  // Add a state for success feedback
  const [success, setSuccess] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [alreadyReason, setAlreadyReason] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [durationMonths, setDurationMonths] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState(rent);

  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!user || !unitId) return;
      try {
        const res = await apiService.getMyBookingRequestsByUnit(unitId) as { data?: { requests?: any[] } };
        const requests = res.data?.requests || [];
        // ابحث عن طلب حجز غير مرفوض
        const activeRequest = requests.find((r: any) => r.status !== "rejected");
        if (activeRequest) {
          setAlreadyRequested(true);
          setAlreadyReason("تم التقديم بالفعل");
        } else {
          setAlreadyRequested(false);
          setAlreadyReason("");
        }
      } catch (err) {
        setAlreadyRequested(false);
        setAlreadyReason("");
      }
    };
    checkExistingRequest();
  }, [user, unitId]);

  // حساب تاريخ النهاية تلقائياً عند تغيير المدة أو تاريخ البداية
  useEffect(() => {
    if (startDate && durationMonths) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(durationMonths));
      setEndDate(end.toISOString().split("T")[0]);
      setCalculatedPrice(rent * Number(durationMonths));
    }
  }, [startDate, durationMonths, rent]);

  const handleInquireClick = () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (user.verificationStatus?.status !== "approved") {
      toast.error("يجب التحقق من هويتك أولاً للتقديم على الوحدة");
      router.push("/auth/verification");
      return;
    }
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // إرسال الطلب مع البيانات الجديدة
      const result = await apiService.sendBookingRequest(unitId, {
        startDate,
        endDate,
        durationMonths,
        price: calculatedPrice,
      });
      toast.success("تم إرسال طلب الحجز بنجاح! سيتم التواصل معك قريباً.");
      setRequested(true);
      setSuccess(true);
      setShowModal(false);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err: any) {
      console.error("Booking request error:", err);
      toast.error(err.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sticky top-10 text-right hover:shadow-2xl transition-shadow duration-300">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 mb-6">
        <h3 className="text-gray-800 dark:text-white text-2xl font-bold leading-tight">
          {rent.toLocaleString()} جنيه
          <span className="text-base font-normal text-gray-600 dark:text-gray-200">/شهريًا</span>
        </h3>
      </div>

      

      <button
        className={`w-full text-lg font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-60 disabled:cursor-not-allowed 
          ${success ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'}`}
        onClick={handleInquireClick}
        disabled={loading || requested || alreadyRequested}
      >
        {loading ? "جاري الإرسال..." : alreadyRequested ? alreadyReason : success ? "تم إرسال الطلب" : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            قدم الآن
          </span>
        )}
      </button>

      {/* مودال اختيار مدة الإيجار */}
      <Modal
        isOpen={showModal}
        onRequestClose={() => setShowModal(false)}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
        ariaHideApp={false}
      >
        <form onSubmit={handleModalSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md relative">
          <button
            type="button"
            className="absolute top-3 left-3 text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-2xl"
            onClick={() => setShowModal(false)}
            aria-label="إغلاق"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-orange-600 dark:text-orange-400 text-center">حدد مدة الإيجار</h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">تاريخ البداية</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={startDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">مدة الإيجار (بالشهور)</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={durationMonths}
              min={1}
              max={36}
              onChange={e => setDurationMonths(Number(e.target.value))}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">تاريخ النهاية</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white bg-gray-100"
              value={endDate}
              readOnly
            />
          </div>
          <div className="mb-6">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">السعر الإجمالي</label>
            <div className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-lg font-bold text-orange-700 dark:text-white">
              {calculatedPrice.toLocaleString()} جنيه مصري
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
            disabled={loading}
          >
            {loading ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </form>
      </Modal>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <h4 className="text-gray-800 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-orange-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
          التواصل مع المالك
        </h4>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
                        {manager.landlordId ? (
              <Link href={`/profile/${manager.landlordId}`} className="flex items-center gap-3 group cursor-pointer">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-orange-400 transition">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-gray-800 dark:text-white text-base font-semibold group-hover:text-orange-600 transition">
                  {manager.name || "أحمد محمد"}
                </p>
              </Link>
            ) : (
              <>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-gray-800 dark:text-white text-base font-semibold">
                  {manager.name || "أحمد محمد"}
                </p>
              </>
            )}
          </div>

          {manager.phone && (
            <a
              href={`tel:${manager.phone}`}
              className="text-gray-700 dark:text-gray-200 text-sm hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-900 group"
            >
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 group-hover:bg-green-200 dark:group-hover:bg-green-800 rounded-full flex items-center justify-center transition-colors duration-200">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <span dir="ltr" className="font-medium">
                {manager.phone}
              </span>
            </a>
          )}

          {manager.email && (
            <a
              href={`mailto:${manager.email}`}
              className="text-gray-700 dark:text-gray-200 text-sm hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-900 group"
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 rounded-full flex items-center justify-center transition-colors duration-200">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <span dir="ltr" className="font-medium break-all">
                {manager.email}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentSidebarCard;
