import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { apiService } from "@/services/api";
import toast from "react-hot-toast";

interface Manager {
  name: string;
  phone: string;
  email: string;
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

  const handleInquireClick = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (user.verificationStatus?.status !== "approved") {
      toast.error("يجب التحقق من هويتك أولاً للتقديم على الوحدة");
      router.push("/auth/verification");
      return;
    }
    
    console.log("=== RENT SIDEBAR CARD DEBUG ===");
    console.log("User:", user);
    console.log("UnitId:", unitId);
    console.log("User verification status:", user.verificationStatus?.status);
    console.log("=================================");
    
    setLoading(true);
    try {
      const result = await apiService.sendBookingRequest(unitId);
      console.log("Booking request result:", result);
      toast.success("تم إرسال طلب الحجز بنجاح! سيتم التواصل معك قريباً.");
      setRequested(true);
      setSuccess(true); // set success state
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
        disabled={loading || requested}
      >
        {loading ? "جاري الإرسال..." : success ? "تم إرسال الطلب" : (
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