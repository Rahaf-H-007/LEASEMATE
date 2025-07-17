"use client";

import { useState } from "react";
import UnitForm from "@/components/UnitForm";
import AmenitiesForm from "@/components/AmenitiesForm";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface UnitData {
  name: string;
  type: string;
  description: string;
  pricePerMonth: string;
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
  
  const [unitData, setUnitData] = useState<UnitData>({
    name: "",
    type: "",
    description: "",
    pricePerMonth: "",
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

  // Check if user is authorized to create units (landlords only)
  if (user && user.role !== "landlord") {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4 font-cairo">
            غير مسموح
          </h1>
          <p className="text-lg text-gray-600 font-cairo">
            هذه الصفحة متاحة فقط لأصحاب العقارات
          </p>
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
    // if (unitData.images.length === 0) {
    //   newErrors.images = "يجب رفع صورة واحدة على الأقل للوحدة";
    // }

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
      alert("يجب تسجيل الدخول أولاً");
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
      alert("تم حفظ بيانات الوحدة بنجاح!");

      // Reset form after successful submission
      setUnitData({
        name: "",
        type: "",
        description: "",
        pricePerMonth: "",
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

      // Optionally redirect to units list or unit details
      // router.push(`/units/${createdUnit._id}`);
    } catch (error) {
      console.error("Error saving unit:", error);
      if (error instanceof Error) {
        alert(`حدث خطأ أثناء حفظ بيانات الوحدة: ${error.message}`);
      } else {
        alert("حدث خطأ أثناء حفظ بيانات الوحدة. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-cairo">
            إضافة وحدة جديدة
          </h1>
          <p className="text-lg text-gray-600 font-cairo">
            أدخل تفاصيل الوحدة المراد إضافتها إلى النظام
          </p>
        </header>

        <div className="space-y-8">
          <UnitForm data={unitData} onChange={setUnitData} errors={errors} />
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
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ الوحدة"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
