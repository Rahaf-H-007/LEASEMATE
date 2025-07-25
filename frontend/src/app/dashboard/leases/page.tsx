"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "react-modal";

export default function LeasesPage() {
  const { user } = useAuth();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLeaseId, setRejectingLeaseId] = useState<string | null>(null);
  const router = useRouter();

  const fetchLeases = async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiService.getMyLeases(page, 5);
      if (
        res &&
        typeof res === "object" &&
        "data" in res &&
        res.data &&
        typeof res.data === "object" &&
        "leases" in res.data &&
        "pagination" in res.data
      ) {
        setLeases(Array.isArray(res.data.leases) ? res.data.leases : []);
        const pagination = res.data.pagination as {
          totalPages: number;
          currentPage: number;
        };
        setPagination(pagination);
        setTotalPages(pagination.totalPages);
        setCurrentPage(pagination.currentPage);
      } else {
        setLeases([]);
        setPagination(null);
        setTotalPages(1);
        setCurrentPage(1);
        toast.error("الاستجابة غير متوقعة من الخادم");
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل في جلب العقود");
      setLeases([]);
      setPagination(null);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeases(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

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

  const openRejectModal = (leaseId: string) => {
    setRejectingLeaseId(leaseId);
    setRejectReason("");
    setShowRejectModal(true);
  };
  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectingLeaseId(null);
    setRejectReason("");
  };
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("يرجى كتابة سبب الرفض");
      return;
    }
    try {
      await apiService.rejectLease(rejectingLeaseId!, rejectReason);
      toast.success("تم رفض العقد وإرسال السبب للمالك.");
      setLeases((prev) =>
        prev.map((l) =>
          l._id === rejectingLeaseId
            ? { ...l, status: "rejected", rejectionReason: rejectReason }
            : l
        )
      );
      closeRejectModal();
    } catch (err: any) {
      toast.error(err.message || "فشل في رفض العقد");
    }
  };

  const handleAccept = async (leaseId: string) => {
    try {
      await apiService.acceptLease(leaseId);
      toast.success("تم قبول العقد وتفعيله بنجاح.");
      setLeases((prev) =>
        prev.map((l) => (l._id === leaseId ? { ...l, status: "active" } : l))
      );
    } catch (err: any) {
      toast.error(err.message || "فشل في قبول العقد");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="max-w-7xl mx-auto pt-32 px-4">
        <h1 className="text-3xl font-bold mb-8 text-orange-600 dark:text-orange-400 text-center">
          عقودي
        </h1>
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-200">
            جاري التحميل...
          </div>
        ) : leases.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-600 dark:text-gray-200">
            لا توجد عقود حالياً
          </div>
        ) : (
          <>
            <div className="rounded-xl shadow bg-white dark:bg-gray-900">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="py-4 px-6 font-bold text-lg">الوحدة</th>
                    <th className="py-4 px-6 font-bold text-lg">المالك</th>
                    <th className="py-4 px-6 font-bold text-lg">المستأجر</th>
                    <th className="py-4 px-6 font-bold text-lg">تاريخ البداية</th>
                    <th className="py-4 px-6 font-bold text-lg">تاريخ النهاية</th>
                    <th className="py-4 px-6 font-bold text-lg">المبلغ الإجمالي</th>
                    <th className="py-4 px-6 font-bold text-lg">تفاصيل العقد</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((lease) => {
                    // حساب عدد الشهور بين البداية والنهاية
                    let months = 1;
                    if (lease.startDate && lease.endDate) {
                      const start = new Date(lease.startDate);
                      const end = new Date(lease.endDate);
                      months =
                        (end.getFullYear() - start.getFullYear()) * 12 +
                        (end.getMonth() - start.getMonth());
                      if (months < 1) months = 1;
                    }
                    const totalAmount =
                      lease.rentAmount && months
                        ? lease.rentAmount * months
                        : "-";
                    return (
                      <tr
                        key={lease._id}
                        className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white text-lg">
                          {lease.unitId?.name}
                        </td>
                        <td className="py-4 px-6 text-gray-900 dark:text-white text-lg">{lease.landlordId?.name}</td>
                        <td className="py-4 px-6 text-gray-900 dark:text-white text-lg">{lease.tenantId?.name}</td>
                        <td className="py-4 px-6 text-gray-900 dark:text-white text-lg">
                          {lease.startDate ? new Date(lease.startDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-4 px-6 text-gray-900 dark:text-white text-lg">
                          {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-4 px-6 text-gray-900 dark:text-white text-lg">
                          {totalAmount !== "-" ? totalAmount.toLocaleString() + " جنيه" : "-"}
                        </td>
                        <td className="py-4 px-6">
                          {user?.role === "landlord" ? (
                            <button
                              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                              onClick={() => handleView(lease._id)}
                            >
                              مراجعة العقد وتحميله
                            </button>
                          ) : (
                            <div className="flex gap-2 flex-nowrap">
                              <button
                                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                                onClick={() => handleView(lease._id)}
                              >
                                مراجعة العقد وتحميله
                              </button>
                              {lease.status === "pending" && (
                                <>
                                  <button
                                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                                    onClick={() => handleAccept(lease._id)}
                                  >
                                    قبول العقد
                                  </button>
                                  {(user?.role as string) === "landlord" ? (
                                    <button
                                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                                      onClick={() => {
                                        toast.custom(
                                          (t) => (
                                            <div className="relative w-full max-w-md p-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border-l-4 border-red-600">
                                              <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                  <svg
                                                    className="h-6 w-6 text-red-600"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                    />
                                                  </svg>
                                                </div>
                                                <div className="ml-3 flex-1">
                                                  <h3 className="text-lg font-bold text-red-600 mb-2">
                                                    تأكيد رفض العقد
                                                  </h3>
                                                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                                                    هل أنت متأكد أنك تريد رفض
                                                    هذا العقد؟ هذا الإجراء لا
                                                    يمكن التراجع عنه.
                                                  </p>
                                                  <div className="flex gap-2 justify-end">
                                                    <button
                                                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
                                                      onClick={() =>
                                                        toast.dismiss(t.id)
                                                      }
                                                    >
                                                      إلغاء
                                                    </button>
                                                    <button
                                                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
                                                      onClick={async () => {
                                                        try {
                                                          await apiService.rejectLease(
                                                            lease._id,
                                                            "تم الرفض من قبل المالك"
                                                          );
                                                          setLeases((prev) =>
                                                            prev.map((l) =>
                                                              l._id ===
                                                              lease._id
                                                                ? {
                                                                    ...l,
                                                                    status:
                                                                      "rejected",
                                                                    rejectionReason:
                                                                      "تم الرفض من قبل المالك",
                                                                  }
                                                                : l
                                                            )
                                                          );
                                                          toast.success(
                                                            <div className="flex items-center">
                                                              <svg
                                                                className="h-5 w-5 text-green-500 mr-2"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                              >
                                                                <path
                                                                  strokeLinecap="round"
                                                                  strokeLinejoin="round"
                                                                  strokeWidth={
                                                                    2
                                                                  }
                                                                  d="M5 13l4 4L19 7"
                                                                />
                                                              </svg>
                                                              تم رفض العقد بنجاح
                                                            </div>
                                                          );
                                                        } catch (err: any) {
                                                          toast.error(
                                                            <div className="flex items-center">
                                                              <svg
                                                                className="h-5 w-5 text-red-500 mr-2"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                              >
                                                                <path
                                                                  strokeLinecap="round"
                                                                  strokeLinejoin="round"
                                                                  strokeWidth={
                                                                    2
                                                                  }
                                                                  d="M6 18L18 6M6 6l12 12"
                                                                />
                                                              </svg>
                                                              {err.message ||
                                                                "فشل في رفض العقد"}
                                                            </div>
                                                          );
                                                        }
                                                        toast.dismiss(t.id);
                                                      }}
                                                    >
                                                      تأكيد الرفض
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ),
                                          {
                                            duration: 10000,
                                            position: "top-center",
                                          }
                                        );
                                      }}
                                    >
                                      رفض العقد
                                    </button>
                                  ) : (
                                    <button
                                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                                      onClick={() => openRejectModal(lease._id)}
                                    >
                                      رفض العقد
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          {lease.status === "rejected" &&
                            lease.rejectionReason && (
                              <div className="mt-2 text-red-600 dark:text-red-400">
                                تم رفض العقد. السبب: {lease.rejectionReason}
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold disabled:opacity-50"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  السابق
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`px-3 py-1 rounded font-bold ${
                        page === currentPage
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                      }`}
                      onClick={() => handlePageChange(page)}
                      disabled={page === currentPage}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold disabled:opacity-50"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {/* مودال رفض العقد */}
      <Modal
        isOpen={showRejectModal}
        onRequestClose={closeRejectModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
        ariaHideApp={false}
      >
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md relative">
          <button
            type="button"
            className="absolute top-3 left-3 text-gray-500 hover:text-red-500 text-2xl"
            onClick={closeRejectModal}
            aria-label="إغلاق"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400 text-center">
            رفض العقد
          </h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium dark:text-white">
              يرجى كتابة سبب الرفض
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:text-white dark:border-gray-700"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="flex gap-4 mt-6">
            <button
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-700 dark:text-white font-bold py-2 px-4 rounded-lg"
              onClick={closeRejectModal}
              type="button"
            >
              إلغاء
            </button>
            <button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
              onClick={handleReject}
              type="button"
            >
              تأكيد الرفض
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
