"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function LeasesPage() {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLeases = async () => {
      setLoading(true);
      try {
        const res = await apiService.getMyLeases();
        // Fix: Ensure 'res' is typed and safe to access
        if (res && typeof res === "object" && "data" in res && res.data && typeof res.data === "object" && "leases" in res.data) {
          setLeases((res.data as any).leases || []);
        } else {
          setLeases([]);
          toast.error("الاستجابة غير متوقعة من الخادم");
        }
      } catch (err: any) {
        toast.error(err?.message || "فشل في جلب العقود");
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, []);

  const handleDownload = async (leaseId: string) => {
    try {
      await apiService.downloadLeasePDF(leaseId);
      toast.success("تم تحميل العقد بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل في تحميل العقد");
    }
  };

  const handleView = (leaseId: string) => {
    router.push(`/dashboard/lease/${leaseId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-32 px-4">
        <h1 className="text-3xl font-bold mb-8 text-orange-600 dark:text-orange-400 text-center">عقودي</h1>
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-300">جاري التحميل...</div>
        ) : leases.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-300">لا توجد عقود حالياً</div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-gray-900">
            <table className="min-w-full text-right">
              <thead>
                <tr className="bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200">
                  <th className="py-3 px-4">الوحدة</th>
                  <th className="py-3 px-4">المالك</th>
                  <th className="py-3 px-4">المستأجر</th>
                  <th className="py-3 px-4">تاريخ البداية</th>
                  <th className="py-3 px-4">تاريخ النهاية</th>
                  <th className="py-3 px-4">تفاصيل العقد</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr key={lease._id} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="py-2 px-4 font-semibold">{lease.unitId?.name}</td>
                    <td className="py-2 px-4">{lease.landlordId?.name}</td>
                    <td className="py-2 px-4">{lease.tenantId?.name}</td>
                    <td className="py-2 px-4">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : '-'}</td>
                    <td className="py-2 px-4">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : '-'}</td>
                
                    <td className="py-2 px-4">
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg font-semibold"
                        onClick={() => handleView(lease._id)}
                      >
                        مراجعة  العقد وتحميله
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 
