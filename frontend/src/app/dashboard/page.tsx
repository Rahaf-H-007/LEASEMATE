"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationCheck from "@/components/VerificationCheck";
import Navbar from "@/components/Navbar";
import { apiService, Unit } from "@/services/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function Dashboard() {
  const { user } = useAuth();
  const [showVerificationStatus, setShowVerificationStatus] = useState(true);
  const [myUnits, setMyUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [errorUnits, setErrorUnits] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(false);
  const router = useRouter();
  const [currentUnitsPage, setCurrentUnitsPage] = useState(1);
  const unitsPerPage = 6;
  const totalUnitsPages = Math.ceil(myUnits.length / unitsPerPage);
  const paginatedUnits = myUnits.slice(
    (currentUnitsPage - 1) * unitsPerPage,
    currentUnitsPage * unitsPerPage
  );

 

  useEffect(() => {
    const fetchMyUnits = async () => {
      if (user?.role !== "landlord") return;
      setLoadingUnits(true);
      setErrorUnits(null);
      try {
        const token = localStorage.getItem("leasemate_token");
        if (!token) throw new Error("لم يتم العثور على التوكن");
        const res = await apiService.getMyUnits(token);
        setMyUnits(res.data.units);
      } catch (err: any) {
        setErrorUnits(err.message || "حدث خطأ أثناء جلب الممتلكات");
      } finally {
        setLoadingUnits(false);
      }
    };

    const fetchPendingRequests = async () => {
      if (user?.role !== "landlord") return;
      setLoadingRequests(true);
      try {
        const res = (await apiService.getLandlordBookingRequests()) as any;
        const pendingCount =
          res.data?.bookingRequests?.filter(
            (request: any) => request.status === "pending"
          ).length || 0;
        setPendingRequests(pendingCount);
      } catch (err: any) {
        console.error("Error fetching pending requests:", err);
        setPendingRequests(0);
      } finally {
        setLoadingRequests(false);
      }
    };

    const fetchLeases = async () => {
      setLoadingLeases(true);
      try {
        const res = await apiService.getMyLeases();
        if (res && typeof res === "object" && "data" in res && res.data && typeof res.data === "object" && "leases" in res.data) {
          setLeases((res.data as any).leases || []);
        } else {
          setLeases([]);
          toast.error("الاستجابة غير متوقعة من الخادم");
        }
      } catch (err: any) {
          toast.error(err?.message || "فشل في جلب العقود");
      } finally {
        setLoadingLeases(false);
      }
    };

    fetchMyUnits();
    fetchPendingRequests();
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
    <ProtectedRoute>
      <VerificationCheck>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
          <Navbar />

          <main className="pt-40 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {`مرحبًا ${user?.name || ""} في لوحة التحكم`}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {user?.role === "landlord"
                    ? "هذه ممتلكاتك المعروضة"
                    : "هذه عقود الإيجار الخاصة بك"}
                </p>
              </div>

              {/* حالة التوثيق */}
              {user?.verificationStatus && showVerificationStatus && (
                <div className="mb-6">
                  <div
                    className={`rounded-xl p-4 shadow-lg relative ${
                      user.verificationStatus.status === "approved"
                        ? "bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700"
                        : user.verificationStatus.status === "rejected"
                        ? "bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700"
                        : "bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700"
                    }`}
                  >
                    {/* Close Button */}
                    <button
                      onClick={() => setShowVerificationStatus(false)}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.verificationStatus.status === "approved"
                            ? "bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400"
                            : user.verificationStatus.status === "rejected"
                            ? "bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-400"
                            : "bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {user.verificationStatus.status === "approved" ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : user.verificationStatus.status === "rejected" ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {user.verificationStatus.status === "approved"
                            ? "تم التوثيق"
                            : user.verificationStatus.status === "rejected"
                            ? "مرفوض"
                            : "قيد المراجعة"}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {user.verificationStatus.status === "approved"
                            ? "تم توثيق هويتك بنجاح."
                            : user.verificationStatus.status === "rejected"
                            ? "تم رفض التوثيق. يرجى التواصل مع الدعم."
                            : "يتم الآن مراجعة مستنداتك من قبل فريقنا."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* محتوى المستأجر */}
              {user?.role === "tenant" && (
                <>
                  {/* قسم مشكلة العقار وزر طلب الصيانة */}
                  <div className="mb-6 bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">هل تواجه مشكلة في العقار؟</h3>
                    <button onClick={()=>router.push("dashboard/maintenance-requests")} className="mt-2 px-6 py-2 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">طلب الصيانة <i className="fa fa-wrench" aria-hidden="true"></i></button>
                  </div>
                  {/* قسم العقود */}
                  <div className="mb-6 bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">عقودك ({leases.length})</h3>
                    {loadingLeases ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">جاري التحميل...</div>
                    ) : leases.length === 0 ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">لا توجد عقود حالياً</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-right">
                          <thead>
                            <tr className="bg-orange-500 text-white">
                              <th className="py-3 px-4 font-bold">الوحدة</th>
                              <th className="py-3 px-4 font-bold">المالك</th>
                              <th className="py-3 px-4 font-bold">تاريخ البداية</th>
                              <th className="py-3 px-4 font-bold">تاريخ النهاية</th>
                              <th className="py-3 px-4 font-bold">تفاصيل العقد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leases.map((lease) => (
                              <tr key={lease._id} className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{lease.unitId?.name}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.landlordId?.name}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : '-'}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : '-'}</td>
                                <td className="py-3 px-4">
                                  <button 
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    onClick={() => handleView(lease._id)}
                                  >
                                    مراجعة العقد وتحميله
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* محتوى المالك */}
              {user?.role === "landlord" && (
                <>
                  {/* أزرار إضافة وحدة ومراجعة الطلبات */}
                  <div className="mb-6 bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إختصارات سريعة</h3>
                    <div className="flex flex-row gap-3 justify-center">
                      <Link href="/unit/add" className="flex items-center gap-2 text-center p-3 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                        <i className="fa fa-plus-circle" aria-hidden="true"></i>
                        إضافة وحدة جديدة
                      </Link>
                     
                      <Link href="/dashboard/booking-requests" className="flex items-center gap-2 text-center p-3 rounded-lg bg-blue-500 dark:bg-blue-600 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors">
                        <i className="fa fa-file-alt" aria-hidden="true"></i>
                        مراجعة طلبات الإيجار
                      </Link>
            </div>
                  </div>
                  {/* قسم الممتلكات */}
                  <div className="mb-6 bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ممتلكاتك</h3>
                    {loadingUnits ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">جاري التحميل...</div>
                    ) : errorUnits ? (
                      <div className="text-center text-red-600 dark:text-red-400">{errorUnits}</div>
                    ) : myUnits.length === 0 ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">لا توجد ممتلكات بعد.</div>
                    ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedUnits.map((unit) => (
                          <div key={unit._id} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{unit.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-200 mb-2">{unit.address}</p>
                        <div className="flex justify-between items-center">
                              <span className="text-orange-600 dark:text-orange-400 font-bold">{unit.pricePerMonth} جنيه/شهر</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${unit.status === "available" ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100" : unit.status === "booked" ? "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100" : unit.status === "pending" ? "bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>{unit.status === "available" ? "نشط" : unit.status === "booked" ? "محجوز" : unit.status === "pending" ? "قيد المراجعة" : "تحت الصيانة"}</span>
                        </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">رقم الوحدة: {unit._id}</div>
                            <button className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200" onClick={() => (window.location.href = `/unit/${unit._id}/manage`)}>اظهر التفاصيل</button>
                        </div>
                        ))}
                      </div>
                  {/* Pagination Controls */}
                  {totalUnitsPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      {Array.from({ length: totalUnitsPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          className={`px-3 py-1 rounded font-bold ${
                            page === currentUnitsPage
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                          }`}
                          onClick={() => setCurrentUnitsPage(page)}
                          disabled={page === currentUnitsPage}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </>
                    )}
                  </div>
                  {/* قسم العقود النشطة */}
                  <div className="mb-6 bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">عقودك النشطة ({leases.length})</h3>
                    {loadingLeases ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">جاري التحميل...</div>
                    ) : leases.length === 0 ? (
                      <div className="text-center text-gray-600 dark:text-gray-200">لا توجد عقود حالياً</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-right">
                          <thead>
                            <tr className="bg-orange-500 text-white">
                              <th className="py-3 px-4 font-bold">الوحدة</th>
                              <th className="py-3 px-4 font-bold">المستأجر</th>
                              <th className="py-3 px-4 font-bold">تاريخ البداية</th>
                              <th className="py-3 px-4 font-bold">تاريخ النهاية</th>
                              <th className="py-3 px-4 font-bold">تفاصيل العقد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leases.map((lease) => (
                              <tr key={lease._id} className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{lease.unitId?.name}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.tenantId?.name}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : '-'}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : '-'}</td>
                                <td className="py-3 px-4">
                                  <button 
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    onClick={() => handleView(lease._id)}
                                  >
                                    مراجعة العقد وتحميله
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  )}
                </div>
                </>
              )}
            </div>
          </main>
        </div>
      </VerificationCheck>
    </ProtectedRoute>
  );
}
