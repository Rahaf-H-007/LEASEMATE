"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService, Unit } from "@/services/api";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

export default function MyUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("leasemate_token");
        if (!token) throw new Error("لم يتم العثور على التوكن");
        const res = await apiService.getMyUnits(token);
        setUnits(res.data.units);
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء جلب الممتلكات");
      } finally {
        setLoading(false);
      }
    };
    fetchUnits();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white pt-14">
      <Toaster position="top-center" />
      <Navbar />
      <div className="max-w-7xl mx-auto pt-20 px-4 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">ممتلكاتي</h1>
        {loading ? (
          <div className="text-center text-gray-600 dark:text-gray-300">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center text-red-600 dark:text-red-400">{error}</div>
        ) : units.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-300">لا توجد ممتلكات بعد.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {units.map((unit) => (
              <div key={unit._id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
                  {unit.images && unit.images.length > 0 && (unit.images[0]?.url || unit.images[0]) ? (
                    <Image
                      src={unit.images[0]?.url ? unit.images[0].url : unit.images[0]}
                      alt={unit.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Image
                      src="/fallback.png"
                      alt="صورة غير متوفرة"
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-lg font-bold mb-2 truncate">{unit.name}</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 truncate">{unit.address}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{unit.pricePerMonth} جنيه/شهر</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{unit.status === 'available' ? 'نشط' : unit.status === 'booked' ? 'محجوز' : 'تحت الصيانة'}</div>
                  <button
                    className="mt-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 w-full"
                    onClick={() => router.push(`/unit/${unit._id}/manage`)}
                  >
                    اظهر التفاصيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
