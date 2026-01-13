"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import Navbar from "@/components/Navbar";
import LeaseCard from "@/components/LeaseCard";
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
        const leases = Array.isArray(res.data.leases) ? res.data.leases : [];
        // Sort leases in descending order (newest first)
        const sortedLeases = leases.sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setLeases(sortedLeases);
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
          عقودي
        </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            إدارة جميع عقود الإيجار الخاصة بك
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-200">جاري التحميل...</p>
          </div>
        ) : leases.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
            لا توجد عقود حالياً
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                سيتم عرض العقود هنا عند إنشائها
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {leases.map((lease) => (
                <LeaseCard
                        key={lease._id}
                  lease={lease}
                  onView={handleView}
                  onDownload={handleDownload}
                  onAccept={handleAccept}
                  onReject={openRejectModal}
                  userRole={user?.role}
                />
              ))}
            </div>
            
            {/* التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  السابق
                </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? "bg-orange-500 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  التالي
                </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal للرفض */}
      <Modal
        isOpen={showRejectModal}
        onRequestClose={closeRejectModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            رفض العقد
          </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب رفض العقد..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-4"
            rows={4}
            />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              رفض العقد
            </button>
            <button
              onClick={closeRejectModal}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
