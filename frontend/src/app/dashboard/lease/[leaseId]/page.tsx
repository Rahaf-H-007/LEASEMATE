"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import OfficialLeaseView from "@/components/OfficialLeaseView";
import toast from "react-hot-toast";
import Link from "next/link";
// CSS للطباعة
const printStyles = `
  @media print {
    body { 
      margin: 0; 
      background: white !important;
      color: black !important;
    }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .bg-white { background: white !important; }
    .text-right { text-align: right !important; }
    .border { border: 1px solid black !important; }
    .shadow-lg { box-shadow: none !important; }
    .rounded-xl { border-radius: 0 !important; }
    .bg-gradient-to-br { background: white !important; }
    .dark\\:from-gray-900 { background: white !important; }
    .dark\\:to-gray-800 { background: white !important; }
    .dark\\:text-gray-200 { color: black !important; }
    .dark\\:text-gray-400 { color: black !important; }
    .dark\\:text-gray-600 { color: black !important; }
    .dark\\:bg-gray-800 { background: white !important; }
    .dark\\:border-gray-700 { border-color: black !important; }
    .dark\\:border-gray-200 { border-color: black !important; }
    .dark\\:text-orange-400 { color: black !important; }
    .text-orange-600 { color: black !important; }
    .text-gray-600 { color: black !important; }
    .text-gray-500 { color: black !important; }
    .text-gray-700 { color: black !important; }
    .bg-orange-50 { background: white !important; }
    .bg-amber-50 { background: white !important; }
    
    .contract-header { 
      background: white !important;
      color: black !important;
      padding: 20px !important;
      text-align: center !important;
      border-radius: 0 !important;
      border-bottom: 2px solid black !important;
    }
    
    .official-stamp {
      position: absolute !important;
      top: 50px !important;
      right: 50px !important;
      width: 120px !important;
      height: 120px !important;
      border: 3px solid black !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-weight: bold !important;
      font-size: 12px !important;
      color: black !important;
      background: white !important;
      transform: rotate(-15deg) !important;
    }
    
    /* إخفاء العناصر غير المطلوبة للطباعة */
    .no-print { display: none !important; }
    
    /* تحسين مظهر النص للطباعة */
    * { 
      color: black !important; 
      background: white !important;
    }
    
    /* تحسين الحدود للطباعة */
    .border-2 { border: 2px solid black !important; }
    .border-black { border-color: black !important; }
    
    /* تحسين المسافات للطباعة */
    .p-8 { padding: 20px !important; }
    .pt-20 { padding-top: 20px !important; }
    .mb-6 { margin-bottom: 15px !important; }
    .gap-8 { gap: 20px !important; }
    
    /* تحسين الخطوط للطباعة */
    .text-3xl { font-size: 24px !important; }
    .text-xl { font-size: 18px !important; }
    .text-lg { font-size: 16px !important; }
    .text-sm { font-size: 14px !important; }
    
    /* إزالة الظلال والتأثيرات */
    .shadow-lg { box-shadow: none !important; }
    .hover\\:shadow-xl { box-shadow: none !important; }
    .transition-all { transition: none !important; }
    .duration-300 { transition-duration: 0s !important; }
    
    /* تحسين العرض للطباعة */
    .max-w-5xl { max-width: none !important; }
    .mx-auto { margin: 0 !important; }
    .px-4 { padding-left: 0 !important; padding-right: 0 !important; }
  }
`;

export default function LeaseDetailsPage() {
  const { leaseId } = useParams();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLease = async () => {
      setLoading(true);
      try {
        // جلب كل عقود المستخدم ثم إيجاد العقد المطلوب
        const res = (await apiService.getMyLeases()) as any;
        const found = res.data?.leases?.find((l: any) => l._id === leaseId);
        setLease(found || null);
      } catch (err: any) {
        toast.error(err.message || "فشل في جلب بيانات العقد");
      } finally {
        setLoading(false);
      }
    };
    if (leaseId) fetchLease();
  }, [leaseId]);

  const handleDownload = async () => {
    try {
      await apiService.downloadLeasePDF(leaseId as string);
      toast.success("تم تحميل العقد بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل في تحميل العقد");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="text-center pt-32">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-200">جاري التحميل...</p>
        </div>
      </div>
    );
  }
  
  if (!lease) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="text-center pt-32">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
              لم يتم العثور على العقد
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              يبدو أن العقد المطلوب غير موجود أو تم حذفه
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
   
      <div className="max-w-5xl mx-auto pt-20 px-4">
        <div className="flex justify-between items-center mb-6 no-print">
          <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            عقد إيجار وحدة سكنية
          </h1>
          <div className="flex gap-3">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
              onClick={handlePrint}
            >
              طباعة العقد
            </button>
           <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200">
            <Link href="/dashboard/leases">
              العودة إلى العقود
            </Link>
           </button>
          </div>
        </div>

        <OfficialLeaseView
          lease={lease}
          onPrint={handlePrint}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
