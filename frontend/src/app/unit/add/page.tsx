"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import UnitForm from "@/components/UnitForm";
import AmenitiesForm from "../../../components/AmentiesForm";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

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
  const { user, token } = useAuth();
  const router = useRouter();

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPendingMessage, setShowPendingMessage] = useState(false);

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

      setShowPendingMessage(true);

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

      // لا تعيد التوجيه تلقائياً
    } catch (error) {
      console.error("Error saving unit:", error);
      if (
        error instanceof Error &&
        error.message.includes("Access denied. Only verified landlords")
      ) {
        toast.error("يجب أن تكون مالك عقار موثق لإضافة وحدات جديدة", {
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
      } else if (
        error instanceof Error &&
        (error.message.includes(
          "Only JPEG, JPG, PNG, and WebP image files are allowed"
        ) ||
          error.message.includes("Only image files are allowed"))
      ) {
        toast.error("يُسمح فقط برفع ملفات الصور (JPEG, JPG, PNG, WebP)", {
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
      } else if (error instanceof Error) {
        toast.error(`حدث خطأ أثناء حفظ بيانات الوحدة: ${error.message}`, {
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
      } else {
        toast.error(
          "حدث خطأ أثناء حفظ بيانات الوحدة. يرجى المحاولة مرة أخرى.",
          {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#EF4444",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
              borderRadius: "8px",
            },
          }
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
 
       <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 py-8 text-gray-900 dark:text-white pt-14">
      <Navbar />
      <Toaster />
      {showPendingMessage ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center max-w-lg">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">
              تم إرسال إعلانك بنجاح!
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              إعلانك الآن قيد المراجعة من الأدمن.
              <br />
              سيتم إرسال إشعار لك عند الموافقة أو الرفض.
            </p>
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold mt-4"
              onClick={() => router.push("/")}
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </main>
  );
}
