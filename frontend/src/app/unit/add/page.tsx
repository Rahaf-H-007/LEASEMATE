"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import UnitForm from "@/components/UnitForm";
import AmenitiesForm from "../../../components/AmentiesForm";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {  useStripeService } from '@/services/stripe';
import Navbar from "@/components/Navbar";
import SubscriptionPlanCard from '@/components/stripe/SubscriptionPlanCard';
import { useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const plans = [
  {
    planName: 'basic', // backend key
    displayName: 'أساسي', // Arabic for display
    planDescription: 'خطة أساسية: إضافة وحدة واحدة فقط شهريًا',
    priceLabel: '500 جنيه/شهر',
    unitLimit: 1,
  },
  {
    planName: 'standard',
    displayName: 'قياسي',
    planDescription: 'خطة قياسية: إضافة وحدتين فقط شهريًا',
    priceLabel: '900 جنيه/شهر',
    unitLimit: 2,
  },
  {
    planName: 'premium',
    displayName: 'مميز',
    planDescription: 'خطة مميزة: إضافة حتى 4 وحدات شهريًا',
    priceLabel: '1200 جنيه/شهر',
    unitLimit: 4,
  },
];

interface UnitData {
  name: string;
  type: string;
  description: string;
  pricePerMonth: string;
  securityDeposit: string;
  numRooms: string;
  space: string;
  address: string;
  city: string;
  governorate: string;
  postalCode: string;
  isFurnished: boolean;
  isFurnishedSelected: boolean;
  images: File[];
}

interface AmenitiesData {
  hasPool: boolean;
  hasAC: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasKitchenware: boolean;
  hasHeating: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function AddUnitPage() {
  const { user, token, refreshUser, socket } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { createCheckoutSession } = useStripeService();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [unitLimitReached, setUnitLimitReached] = useState(false);
  const [canAddUnit, setCanAddUnit] = useState<boolean | null>(null);
  const [addUnitReason, setAddUnitReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All form and amenities state hooks at the top
  const [unitData, setUnitData] = useState<UnitData>({
    name: "",
    type: "",
    description: "",
    pricePerMonth: "",
    securityDeposit: "",
    numRooms: "",
    space: "",
    address: "",
    city: "",
    governorate: "",
    postalCode: "",
    isFurnished: false,
    isFurnishedSelected: false,
    images: [],
  });

  const [amenities, setAmenities] = useState<AmenitiesData>({
    hasPool: false,
    hasAC: false,
    hasTV: false,
    hasWifi: false,
    hasKitchenware: false,
    hasHeating: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  // Cache configuration
  const CACHE_KEYS = {
    CAN_ADD_UNIT: `canAddUnit_${user?._id}`,
    ADD_UNIT_REASON: `addUnitReason_${user?._id}`,
    CACHE_TIMESTAMP: `canAddUnitTimestamp_${user?._id}`
  };

  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  // Cache utility functions
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < CACHE_EXPIRY_MS;
  };

  const loadFromCache = () => {
    if (!user || !isCacheValid()) return false;
    
    const cachedCanAdd = localStorage.getItem(CACHE_KEYS.CAN_ADD_UNIT);
    const cachedReason = localStorage.getItem(CACHE_KEYS.ADD_UNIT_REASON);
    
    if (cachedCanAdd !== null) {
      setCanAddUnit(JSON.parse(cachedCanAdd));
      setAddUnitReason(cachedReason || "");
      return true;
    }
    return false;
  };

  const saveToCache = (canAdd: boolean, reason: string) => {
    if (!user) return;
    localStorage.setItem(CACHE_KEYS.CAN_ADD_UNIT, JSON.stringify(canAdd));
    localStorage.setItem(CACHE_KEYS.ADD_UNIT_REASON, reason);
    localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
  };

  // Enhanced checkCanAddUnit with caching
  const checkCanAddUnit = async (skipCache = false) => {
    if (!user || user.role !== 'landlord') {
      const canAdd = false;
      const reason = "هذه الصفحة متاحة فقط لأصحاب العقارات";
      setCanAddUnit(canAdd);
      setAddUnitReason(reason);
      if (!skipCache) saveToCache(canAdd, reason);
      return;
    }

    try {
      const authToken = token || localStorage.getItem('leasemate_token');
      if (!authToken) {
        const canAdd = false;
        const reason = "لم يتم العثور على رمز المصادقة";
        setCanAddUnit(canAdd);
        setAddUnitReason(reason);
        if (!skipCache) saveToCache(canAdd, reason);
        return;
      }

      const res = await apiService.canAddUnit(authToken);
      setCanAddUnit(res.canAdd);
      setAddUnitReason(res.reason || "");
      
      // Save to cache for future visits
      if (!skipCache) {
        saveToCache(res.canAdd, res.reason || "");
      }
    } catch (err) {
      console.error("Error checking canAddUnit:", err);
      const canAdd = false;
      const reason = "حدث خطأ في التحقق من إمكانية إضافة الوحدة";
      setCanAddUnit(canAdd);
      setAddUnitReason(reason);
      if (!skipCache) saveToCache(canAdd, reason);
    }
  };

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleUnitStatusChanged = async (data: { status: string }) => {
      console.log(" Unit status changed via WebSocket:", data);
      // Refresh canAddUnit status when unit status changes
      await checkCanAddUnit();
      
      // Show toast notification
      toast("تم تحديث حالة الوحدة: " + (data.status === 'approved' ? 'تمت الموافقة' : data.status === 'rejected' ? 'تم الرفض' : data.status), {
        icon: data.status === 'approved' ? '✅' : data.status === 'rejected' ? '❌' : 'ℹ️',
      });
    };

    const handleSubscriptionChanged = async () => {
      console.log(" Subscription changed via WebSocket");
      // Refresh user data and canAddUnit status
      await Promise.all([refreshUser(), checkCanAddUnit()]);
      toast.success("تم تحديث حالة الاشتراك");
    };

    // Listen for WebSocket events
    socket.on("unitStatusChanged", handleUnitStatusChanged);
    socket.on("subscriptionUpdated", handleSubscriptionChanged);
    socket.on("subscriptionExpired", handleSubscriptionChanged);

    return () => {
      socket.off("unitStatusChanged", handleUnitStatusChanged);
      socket.off("subscriptionUpdated", handleSubscriptionChanged);
      socket.off("subscriptionExpired", handleSubscriptionChanged);
    };
  }, [socket, user, token]);

  // Main initialization with cache + background refresh
  useEffect(() => {
    const initializePage = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to load from cache first for instant display
      const cacheLoaded = loadFromCache();
      if (cacheLoaded) {
        console.log(" Loaded canAddUnit from cache - instant display!");
        setLoading(false);
        
        // Refresh in background to ensure data is current
        setTimeout(async () => {
          console.log(" Background refresh started...");
          await Promise.all([refreshUser(), checkCanAddUnit()]);
        }, 100);
        return;
      }

      // No valid cache available, do full load
      console.log(" No cache found, loading fresh data...");
      try {
        await Promise.all([refreshUser(), checkCanAddUnit()]);
      } catch (error) {
        console.error(" Error during initialization:", error);
        setCanAddUnit(false);
        setAddUnitReason("حدث خطأ في التحقق من إمكانية إضافة الوحدة");
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [user, token, refreshUser]);

  // Conditional rendering after all hooks
  if (loading) {
    return <p className="text-center mt-10">جارٍ التحميل...</p>;
  }

  // Check if user is authorized to create units (landlords only)
  if (user && user.role !== "landlord") {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4 font-cairo">
            غير مسموح
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-200 font-cairo">
            هذه الصفحة متاحة فقط لأصحاب العقارات
          </p>
        </div>
      </main>
    );
  }

  // If landlord is not subscribed, show subscribe button
  if (user && user.role === 'landlord' && !user.isSubscribed) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 py-8 text-gray-900 dark:text-white pt-14">
        <Navbar/>
        <Toaster />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <h1 className="text-3xl font-bold mb-6 text-center">الاشتراك مطلوب لإضافة وحدة جديدة</h1>
          <p className="mb-8 text-center text-gray-600 dark:text-gray-300">يرجى الاشتراك في خطة للوصول إلى ميزة إضافة الوحدات العقارية.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <SubscriptionPlanCard key={plan.planName} {...plan} />
            ))}
          </div>
        </div>
      </main>
    )}    

  // Check if landlord is verified
  if (
    user &&
    user.role === "landlord" &&
    user.verificationStatus?.status !== "approved"
  ) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-8 mb-8">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 font-cairo">
              في انتظار التوثيق
            </h1>
            <p className="text-lg text-yellow-700 dark:text-yellow-300 mb-6 font-cairo">
              يجب أن تكون مالك عقار موثق لإضافة وحدات جديدة. يرجى إكمال عملية
              التوثيق أولاً.
            </p>
            <div className="text-sm text-yellow-600 dark:text-yellow-400 font-cairo">
              <p>
                حالة التوثيق الحالية:{" "}
                <span className="font-semibold">
                  {user.verificationStatus?.status === "pending"
                    ? "قيد المراجعة"
                    : user.verificationStatus?.status === "rejected"
                    ? "مرفوض"
                    : "غير مكتمل"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (unitLimitReached) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-800 dark:text-red-200 mb-4 font-cairo">
              لقد وصلت للحد الأقصى للوحدات في خطتك
            </h1>
            <p className="text-lg text-red-700 dark:text-red-300 mb-6 font-cairo">
              لا يمكنك إضافة وحدات جديدة حتى يتم رفض أو حذف وحدة أو حتى يوافق المشرف على وحدة قيد المراجعة.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // If landlord cannot add unit, show reason and subscribe button if plan limit
  if (canAddUnit === false) {
    // If the reason is that the last unit is pending, show a card for under review
    if (addUnitReason.includes('مراجعة وحدتك الحالية') || addUnitReason.includes('قيد المراجعة')) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 py-8 text-gray-900 dark:text-white pt-14">
          <Navbar />
          <Toaster />
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center max-w-lg">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-yellow-600 mb-4">
                وحدتك قيد المراجعة
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                لا يمكنك إضافة وحدة جديدة حتى يتم مراجعة وحدتك الحالية من الأدمن.
              </p>
            </div>
          </div>
        </main>
      );
    }
    // If the reason is plan limit, show subscribe card (but not after successful submission)
    if (addUnitReason.includes('الحد الأقصى') || addUnitReason.includes('خطة جديدة')) {
      return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 mb-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-red-800 dark:text-red-200 mb-4 font-cairo">
                {addUnitReason}
              </h1>
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold mt-4"
                onClick={() => router.push("/dashboard/stripe/subscribe")}
              >
                الاشتراك في خطة جديدة
              </button>
            </div>
          </div>
        </main>
      );
    }
    // Otherwise, show the reason only
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-800 dark:text-red-200 mb-4 font-cairo">
              {addUnitReason}
            </h1>
          </div>
        </div>
      </main>
    );
  }

  // Only show the form if canAddUnit is true or null (null = loading)

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Required text fields
    if (!unitData.name.trim()) {
      newErrors.name = "اسم الوحدة مطلوب";
    }
    if (!unitData.type) {
      newErrors.type = "نوع الوحدة مطلوب";
    }
    if (!unitData.description.trim()) {
      newErrors.description = "وصف الوحدة مطلوب";
    }
    if (!unitData.address.trim()) {
      newErrors.address = "العنوان مطلوب";
    }
    if (!unitData.city.trim()) {
      newErrors.city = "المدينة مطلوبة";
    }
    if (!unitData.governorate.trim()) {
      newErrors.governorate = "المحافظة مطلوبة";
    }

    // Required number fields
    if (!unitData.pricePerMonth || Number(unitData.pricePerMonth) <= 0) {
      newErrors.pricePerMonth = "السعر الشهري مطلوب ويجب أن يكون أكبر من صفر";
    }
    if (!unitData.securityDeposit || Number(unitData.securityDeposit) <= 0) {
      newErrors.securityDeposit = "مبلغ التأمين مطلوب ويجب أن يكون أكبر من صفر";
    }
    if (!unitData.numRooms || Number(unitData.numRooms) <= 0) {
      newErrors.numRooms = "عدد الغرف مطلوب ويجب أن يكون أكبر من صفر";
    }
    if (!unitData.space || Number(unitData.space) <= 0) {
      newErrors.space = "المساحة مطلوبة ويجب أن تكون أكبر من صفر";
    }

    // Postal code validation (optional but if provided, must be valid)
    if (unitData.postalCode && Number(unitData.postalCode) <= 0) {
      newErrors.postalCode = "الرقم البريدي غير صحيح";
    }

    // Image validation (temporarily disabled for testing)
    if (unitData.images.length === 0) {
      newErrors.images = "يجب رفع صورة واحدة على الأقل للوحدة";
    }

    // Furnished status validation
    if (!unitData.isFurnishedSelected) {
      newErrors.isFurnished = "يجب اختيار حالة الفرش";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveUnit = async () => {
    if (!validateForm()) {
      // Just return without showing alert - errors are displayed in the form
      return;
    }

    if (!user || !token) {
      toast.error("يجب تسجيل الدخول أولاً", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart form submission
      const formData = new FormData();

      // Add unit data fields
      formData.append("name", unitData.name);
      formData.append("type", unitData.type);
      formData.append("description", unitData.description);
      formData.append("pricePerMonth", unitData.pricePerMonth);
      formData.append("securityDeposit", unitData.securityDeposit);
      formData.append("numRooms", unitData.numRooms);
      formData.append("space", unitData.space);
      formData.append("address", unitData.address);
      formData.append("city", unitData.city);
      formData.append("governorate", unitData.governorate);
      formData.append("isFurnished", unitData.isFurnished.toString());

      // Add postal code if provided
      if (unitData.postalCode) {
        formData.append("postalCode", unitData.postalCode);
      }

      // Add amenities
      formData.append("hasPool", amenities.hasPool.toString());
      formData.append("hasAC", amenities.hasAC.toString());
      formData.append("hasTV", amenities.hasTV.toString());
      formData.append("hasWifi", amenities.hasWifi.toString());
      formData.append("hasKitchenware", amenities.hasKitchenware.toString());
      formData.append("hasHeating", amenities.hasHeating.toString());

      // Add images
      unitData.images.forEach((image) => {
        formData.append("images", image);
      });

      // Call API to create unit
      const createdUnit = await apiService.createUnit(formData, token);

      console.log("Unit created successfully:", createdUnit);

      // Show success toast immediately after unit creation
      toast.success("تم إرسال إعلانك بنجاح! إعلانك الآن قيد المراجعة من الأدمن.", {
        duration: 4000,
        position: "top-center",
      });

      // After successful submission, re-fetch canAddUnit to update UI
      const authToken = token || localStorage.getItem('leasemate_token');
      if (authToken) {
        const res = await apiService.canAddUnit(authToken);
        setCanAddUnit(res.canAdd);
        setAddUnitReason(res.reason || "");
      }

      // Reset form after successful submission
      setUnitData({
        name: "",
        type: "",
        description: "",
        pricePerMonth: "",
        securityDeposit: "",
        numRooms: "",
        space: "",
        address: "",
        city: "",
        governorate: "",
        postalCode: "",
        isFurnished: false,
        isFurnishedSelected: false,
        images: [],
      });
      setAmenities({
        hasPool: false,
        hasAC: false,
        hasTV: false,
        hasWifi: false,
        hasKitchenware: false,
        hasHeating: false,
      });
      setErrors({});
    } catch (error) {
      console.error("Error saving unit:", error);
      if (error instanceof Error) {
        // Check for plan limit error from backend
        if (
          error.message.includes("الحد الأقصى لعدد الوحدات") ||
          error.message.includes("تجاوزت الحد الأقصى")
        ) {
          toast.error("لقد تجاوزت الحد الأقصى لعدد الوحدات في خطتك. يرجى الترقية أو تجديد الاشتراك.", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#EF4444",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          });
          setTimeout(() => {
            router.push("/dashboard/stripe/subscribe");
          }, 2000);
          return;
        }
        // Check for no active subscription error
        if (error.message.includes("لا يوجد اشتراك نشط")) {
          toast.error("يجب أن يكون لديك اشتراك نشط لإضافة وحدة. يرجى الاشتراك أولاً.", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#EF4444",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          });
          setTimeout(() => {
            router.push("/dashboard/stripe/subscribe");
          }, 2000);
          return;
        }
        
        // Check for pending unit error (unit under review)
        if (error.message.includes("مراجعة وحدتك الحالية") || error.message.includes("قيد المراجعة")) {
          toast.error("لا يمكنك إضافة وحدة جديدة أثناء مراجعة وحدتك الحالية. يرجى انتظار موافقة الإدارة.", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#F59E0B",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          });
          setTimeout(() => {
            router.push("/my-units");
          }, 2000);
          return;
        }
        
        // Check for rejected unit error (unit was rejected)
        if (error.message.includes("تحديث الوحدة المرفوضة") || error.message.includes("مرفوضة")) {
          toast.error("لا يمكنك إضافة وحدة جديدة حتى تقوم بتحديث أو حذف الوحدة المرفوضة.", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#EF4444",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          });
          setTimeout(() => {
            router.push("/my-units");
          }, 2000);
          return;
        }
        
        // Check for maintenance unit error
        if (error.message.includes("تحت الصيانة")) {
          toast.error("لا يمكنك إضافة وحدة جديدة أثناء وجود وحدة تحت الصيانة.", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#F59E0B",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          });
          setTimeout(() => {
            router.push("/my-units");
          }, 2000);
          return;
        }
      }

      // Generic error message for any other errors
      toast.error("حدث خطأ أثناء حفظ الوحدة. حاول مرة أخرى.", {
        duration: 3000,
        position: "top-center",
      });
  } finally {
    setIsSubmitting(false);
  }
  }

  return (
  <ProtectedRoute>
       <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 py-8 text-gray-900 dark:text-white pt-14">
      <Navbar />
      <Toaster />
      <div className="max-w-4xl pt-20 mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 font-cairo">
              إضافة وحدة جديدة
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-200 font-cairo">
              أدخل تفاصيل الوحدة المراد إضافتها إلى النظام
            </p>
          </header>

          <div className="space-y-8">
            <UnitForm 
              data={unitData} 
              onChange={(newData) => {
                console.log("Parent received new data:", newData);
                setUnitData(newData);
              }} 
              errors={errors} 
            />
            <AmenitiesForm
              data={amenities}
              onChange={setAmenities}
              unitType={unitData.type}
            />

            <div className="flex justify-center pt-8">
              <button
                onClick={handleSaveUnit}
                disabled={isSubmitting}
                className={`px-8 py-4 text-white text-lg font-bold rounded-xl shadow-lg transform transition-all duration-200 font-cairo min-w-[200px] ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 hover:shadow-xl hover:scale-105"
                }`}
                suppressHydrationWarning
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ الوحدة"}
              </button>
            </div>
          </div>
        </div>
    </main>
    </ProtectedRoute>
  );
}
