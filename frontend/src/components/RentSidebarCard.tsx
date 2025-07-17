import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface Manager {
  name: string;
  phone: string;
  email: string;
}

interface RentSidebarCardProps {
  rent: number;
  leaseDuration: string;
  securityDeposit: number;
  availableFrom: string;
  manager: Manager;
}

const RentSidebarCard: React.FC<RentSidebarCardProps> = ({
  rent,
  leaseDuration,
  securityDeposit,
  availableFrom,
  manager,
}) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleInquireClick = () => {
    if (!user) {
      // User is not authenticated, redirect to login
      router.push("/auth/login");
      return;
    }

    // Check if user's verification is approved
    if (user.verificationStatus?.status !== "approved") {
      alert("يجب التحقق من هويتك أولاً للتواصل مع المالك");
      router.push("/auth/verification");
      return;
    }

    // TODO: Redirect to inquiry page when teammate completes it
    alert("سيتم توجيهك إلى صفحة الاستفسار قريباً");
    // redirectToInquiry();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-10 text-right">
      <h3 className="text-[var(--dark-brown)] text-2xl font-bold leading-tight">
        {rent.toLocaleString()} جنيه
        <span className="text-base font-normal">/شهريًا</span>
      </h3>
      <div className="mt-6 border-t border-[#f3ece8] pt-6 space-y-4 text-base">
        <div className="flex justify-between">
          <p className="text-[var(--light-brown)]">مدة الإيجار</p>
          <p className="text-[var(--dark-brown)] font-medium">
            {leaseDuration}
          </p>
        </div>
        <div className="flex justify-between">
          <p className="text-[var(--light-brown)]">التأمين</p>
          <p className="text-[var(--dark-brown)] font-medium">
            {securityDeposit.toLocaleString()} جنيه
          </p>
        </div>
        <div className="flex justify-between">
          <p className="text-[var(--light-brown)]">متاح من</p>
          <p className="text-[var(--dark-brown)] font-medium">
            {availableFrom}
          </p>
        </div>
      </div>
      <button
        className="mt-6 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold leading-normal tracking-[0.015em] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        onClick={handleInquireClick}
      >
        <span className="truncate">قدم الآن</span>
      </button>
      <div className="mt-6 border-t border-[#f3ece8] pt-6">
        <h4 className="text-[var(--dark-brown)] text-xl font-bold">
          التواصل مع المدير
        </h4>
        <p className="text-[var(--dark-brown)] text-base mt-3">
          {manager.name || "أحمد محمد"}
        </p>
        <a
          href={`tel:${manager.phone || "+201234567890"}`}
          className="text-[var(--light-brown)] text-base hover:text-orange-500 transition-colors duration-200 flex items-center gap-2 mt-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <span dir="ltr">{manager.phone || "+20 123 456 7890"}</span>
        </a>
        <a
          href={`mailto:${manager.email || "contact@leasemate.com"}`}
          className="text-[var(--light-brown)] text-base hover:text-orange-500 transition-colors duration-200 flex items-center gap-2 mt-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          <span dir="ltr">{manager.email || "contact@leasemate.com"}</span>
        </a>
      </div>
    </div>
  );
};

export default RentSidebarCard;
