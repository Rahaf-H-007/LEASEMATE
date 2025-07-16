"use client";
import React from "react";
import ImageSlider from "../../../components/ImageSlider";
import UnitDetails from "../../../components/UnitDetails";
import AmenitiesSection from "../../../components/AmenitiesSection";
import RentSidebarCard from "../../../components/RentSidebarCard";
import Navbar from "../../../components/Navbar";

// Example props (replace with real data fetching logic)
const unitData = {
  images: [
    // Using the same image from the unit card for consistency
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCIvCDUhVJsOd0-278tE5y85XV_LavAtgilxjyT4PrqDanH4-ESj8O4q0spSY8ewRdmEX19apbF6Hq99JRY4_1xdr8WQMBfuK2gD_V8866TGiOHc1VcDWqTEEUXN00JxLgNXf7lTybIwzaycYWGjJnu-VIhZgVsrfMiODvCqOjGfcj41cxn60dboJgBtqMxT103YVwXXqA5obNw2fmNAROAJv96zWOvhiw0Ai39iKgKIc61qMWAi-832jbVptGg750OxUiQfWxL3Mjy",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  ],
  title: "شقة ساحرة من غرفتين في وسط المدينة",
  rating: 4.8,
  reviews: 23,
  location: "وسط المدينة، القاهرة",
  description:
    "تقدم هذه الشقة الفسيحة المكونة من غرفتي نوم مزيجًا من التصميم الحديث والراحة، مثالية للحياة الحضرية. تقع في قلب وسط المدينة، وستكون على بُعد خطوات من المقاهي العصرية والمتاجر والنقاط الثقافية. تتميز الشقة بمنطقة معيشة مفتوحة، ومطبخ مجهز بالكامل بأجهزة من الستانلس ستيل، وغرفتي نوم كبيرتين مع مساحة خزانات واسعة. استمتع بإطلالات المدينة من الشرفة الخاصة واستفد من مرافق المبنى مثل النادي الرياضي وشرفة السطح.",
  amenities: [
    { icon: "Bed", label: "غرفتي نوم" },
    { icon: "Bathtub", label: "حمامين" },
    { icon: "SquareFoot", label: "١٢٠٠ قدم مربع" },
    { icon: "DirectionsCar", label: "موقف سيارات مغطى" },
    { icon: "LocalLaundryService", label: "غسالة ومجففة داخل الوحدة" },
    { icon: "Balcony", label: "شرفة خاصة" },
  ],
  rent: 3500,
  leaseDuration: "١٢ شهر",
  securityDeposit: 3500,
  availableFrom: "١ أغسطس ٢٠٢٤",
  manager: {
    name: "سارة أحمد",
    phone: "٠١٠١٢٣٤٥٦٧٨",
    email: "sara.ahmed@example.com",
  },
};

export default function UnitDetailPage() {
  return (
    <div
      dir="rtl"
      className="bg-gradient-to-br from-orange-50 to-amber-50 min-h-screen"
    >
      <Navbar />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <ImageSlider images={unitData.images} />
            <div className="p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <UnitDetails
                    title={unitData.title}
                    rating={unitData.rating}
                    reviews={unitData.reviews}
                    location={unitData.location}
                    description={unitData.description}
                  />
                  <div className="border-t border-gray-200 pt-8">
                    <AmenitiesSection amenities={unitData.amenities} />
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    <RentSidebarCard
                      rent={unitData.rent}
                      leaseDuration={unitData.leaseDuration}
                      securityDeposit={unitData.securityDeposit}
                      availableFrom={unitData.availableFrom}
                      manager={unitData.manager}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
