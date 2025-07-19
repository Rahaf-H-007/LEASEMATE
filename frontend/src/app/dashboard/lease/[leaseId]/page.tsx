"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";

// CSS للطباعة
const printStyles = `
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .bg-white { background: white !important; }
    .text-right { text-align: right !important; }
    .border { border: 1px solid #000 !important; }
    .shadow-lg { box-shadow: none !important; }
    .rounded-xl { border-radius: 0 !important; }
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
        const res = await apiService.getMyLeases() as any;
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

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800"><Navbar /><div className="text-center pt-32 text-lg">جاري التحميل...</div></div>;
  }
  if (!lease) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800"><Navbar /><div className="text-center pt-32 text-lg text-red-600">لم يتم العثور على العقد</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Navbar />
      <div className="max-w-4xl mx-auto pt-20 px-4">
        <div className="flex justify-between items-center mb-6 no-print">
          <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-400">عقد إيجار وحدة سكنية</h1>
          <div className="flex gap-3">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
              onClick={() => window.print()}
            >
              طباعة مباشرة
            </button>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold text-lg"
              onClick={handleDownload}
            >
              تحميل PDF
            </button>
          </div>
        </div>
        
        {/* عقد HTML */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-right" dir="rtl">
          {/* الطرفين */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">الطرف الأول (المالك)</h3>
              <p className="mb-2"><span className="font-semibold">الاسم:</span> {lease.landlordId?.name}</p>
              <p className="mb-2"><span className="font-semibold">رقم الهاتف:</span> {lease.landlordId?.phone}</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">الطرف الثاني (المستأجر)</h3>
              <p className="mb-2"><span className="font-semibold">الاسم:</span> {lease.tenantId?.name}</p>
              <p className="mb-2"><span className="font-semibold">رقم الهاتف:</span> {lease.tenantId?.phone}</p>
            </div>
          </div>

          {/* بيانات الوحدة */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">بيانات الوحدة</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <p><span className="font-semibold">اسم الوحدة:</span> {lease.unitId?.name}</p>
              <p><span className="font-semibold">العنوان:</span> {lease.unitId?.address}</p>
              <p><span className="font-semibold">النوع:</span> {lease.unitId?.type}</p>
            </div>
          </div>

          {/* بيانات العقد */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">بيانات العقد</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <p><span className="font-semibold">قيمة الإيجار الشهري:</span> {lease.rentAmount} جنيه مصري</p>
              <p><span className="font-semibold">قيمة التأمين:</span> {lease.depositAmount} جنيه مصري</p>
              <p><span className="font-semibold">تاريخ بداية العقد:</span> {lease.startDate ? new Date(lease.startDate).toLocaleDateString('ar-EG') : '-'}</p>
              <p><span className="font-semibold">تاريخ نهاية العقد:</span> {lease.endDate ? new Date(lease.endDate).toLocaleDateString('ar-EG') : '-'}</p>
              <p><span className="font-semibold">شروط الدفع:</span> {lease.paymentTerms || '-'}</p>
              <p><span className="font-semibold">حالة العقد:</span> {lease.status === 'active' ? 'نشط' : 'منتهي'}</p>
            </div>
          </div>

          {/* التوقيعات */}
          <div className="border-t-2 border-orange-500 pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <h4 className="font-bold mb-4">توقيع الطرف الأول (المالك)</h4>
                <div className="border-b-2 border-gray-400 w-48 mx-auto h-8 mb-2"></div>
                <p className="text-sm">{lease.landlordId?.name}</p>
              </div>
              <div className="text-center">
                <h4 className="font-bold mb-4">توقيع الطرف الثاني (المستأجر)</h4>
                <div className="border-b-2 border-gray-400 w-48 mx-auto h-8 mb-2"></div>
                <p className="text-sm">{lease.tenantId?.name}</p>
              </div>
            </div>
          </div>

          {/* الخلاصة */}
          <div className="text-center mt-8 p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 italic">
              تم تحرير هذا العقد بين الطرفين ويخضع لأحكام القانون المصري.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 