"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import axios from "axios";

interface MaintenanceRequest {
  _id: string;
  title: string;
  description: string;
  image?: string;
  status: "pending" | "in progress" | "resolved";
  notes?: string;
  createdAt: string;
  _landlordNote?: string; // Added for landlord's note
}

export default function MaintenanceRequestsPage() {
  const { user, token } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", image: null as File | null });
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localDates, setLocalDates] = useState<{ [id: string]: string }>({});
  const [openImage, setOpenImage] = useState<string | null>(null);

  // جلب الطلبات عند التحميل
  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    // بعد جلب الطلبات، احسبي التواريخ المحلية
    const dates: { [id: string]: string } = {};
    requests.forEach((req) => {
      dates[req._id] = new Date(req.createdAt).toLocaleString();
    });
    setLocalDates(dates);
  }, [requests]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log("Current token:", token); // للتشخيص
      if (!token) {
        setError("يجب تسجيل الدخول أولاً");
        return;
      }
      const res = await axios.get("http://localhost:5000/api/maintenance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching requests:", err); // للتشخيص
      setError("حدث خطأ أثناء جلب الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, image: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.title || !form.description) {
      setError("يرجى إدخال جميع البيانات");
      return;
    }
    if (!token) {
      setError("يجب تسجيل الدخول أولاً");
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      if (form.image) formData.append("image", form.image);
      // يمكن إضافة unitId وcontractId هنا إذا كانت متوفرة
      await axios.post("http://localhost:5000/api/maintenance", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setSuccess("تم إرسال الطلب بنجاح");
      setForm({ title: "", description: "", image: null });
      fetchRequests();
    } catch (err) {
      console.error("Error submitting request:", err); // للتشخيص
      setError("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="mt-12 pt-4 pb-16 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">طلبات الصيانة</h1>
        {user?.role === "tenant" && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-8">
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">عنوان العطل</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white" required />
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">وصف العطل</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white" required />
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">صورة العطل (اختياري)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
            </div>
            {error && <div className="mb-2 text-red-600 text-center">{error}</div>}
            {success && <div className="mb-2 text-green-600 text-center">{success}</div>}
            <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg mt-2 disabled:opacity-50">
              {loading ? "...جاري الإرسال" : "إرسال الطلب"}
            </button>
          </form>
        )}
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">الطلبات السابقة</h2>
        {loading ? (
          <div className="text-center">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="text-center text-gray-500">لا توجد طلبات صيانة بعد.</div>
        ) : (
          <ul className="space-y-4">
            {requests.map((req) => (
              <li key={req._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">{req.title}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${req.status === "pending" ? "bg-yellow-100 text-yellow-800" : req.status === "in progress" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>{req.status === "pending" ? "قيد الانتظار" : req.status === "in progress" ? "جاري التنفيذ" : "تم الحل"}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 mb-2">{req.description}</div>
                {req.image && (
                  <img
                    src={req.image}
                    alt="صورة العطل"
                    className="w-40 h-40 object-contain rounded mb-2 cursor-pointer transition-transform hover:scale-105"
                    style={{ background: "#f3f3f3" }}
                    onClick={() => setOpenImage(req.image || "")}
                  />
                )}
                {req.notes && <div className="text-sm text-gray-500 mt-2">ملاحظة: {req.notes}</div>}
                {user?.role === 'landlord' && (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      placeholder="اكتب ملاحظة للمستأجر..."
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                      value={req._landlordNote || ''}
                      onChange={e => {
                        setRequests(prev => prev.map(r => r._id === req._id ? { ...r, _landlordNote: e.target.value } : r));
                      }}
                    />
                    <div className="flex gap-2">
                      {req.status === 'pending' && (
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          onClick={async () => {
                            await axios.patch(`http://localhost:5000/api/maintenance/${req._id}`,
                              { status: 'in progress', notes: req._landlordNote || '' },
                              { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                            );
                            fetchRequests();
                          }}
                        >
                          قبول الطلب (جاري التنفيذ)
                        </button>
                      )}
                      {req.status !== 'resolved' && (
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          onClick={async () => {
                            await axios.patch(`http://localhost:5000/api/maintenance/${req._id}`,
                              { status: 'resolved', notes: req._landlordNote || '' },
                              { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                            );
                            fetchRequests();
                          }}
                        >
                          تم الحل
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* <div className="text-xs text-gray-400 mt-1">
                  تاريخ الإرسال: {localDates[req._id] || ""}
                </div> */}
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Modal لعرض الصورة */}
      {openImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative">
            <button
              onClick={() => setOpenImage(null)}
              className="absolute top-2 left-2 bg-white rounded-full p-1 shadow hover:bg-gray-200"
              aria-label="إغلاق"
            >
              <span className="text-2xl font-bold text-gray-700">&times;</span>
            </button>
            <img
              src={openImage}
              alt="صورة العطل بالحجم الكامل"
              className="max-w-[90vw] max-h-[80vh] rounded shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
} 