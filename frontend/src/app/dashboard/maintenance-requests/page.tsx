"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { io, Socket } from "socket.io-client";

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

// Add Unit interface
interface Unit {
  _id: string;
  name: string;
  address?: string;
}

export default function MaintenanceRequestsPage() {
  const { user, token, socket } = useAuth();
  // Add unitId and contractId to form state
  const [form, setForm] = useState({ title: "", description: "", image: null as File | null, unitId: "", contractId: "" });
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]); // Store tenant's units
  const [leases, setLeases] = useState<any[]>([]); // Store tenant's leases
  const [formLoading, setFormLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localDates, setLocalDates] = useState<{ [id: string]: string }>({});
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [buttonLoading, setButtonLoading] = useState<{ [id: string]: boolean }>({});

  // Listen for maintenance request events using the shared socket
  useEffect(() => {
    console.log('🔌 Socket status:', socket?.connected ? 'Connected' : 'Disconnected');
    console.log('🔌 Socket ID:', socket?.id);
    
    if (socket) {
      const handleRequestCreated = (data: any) => {
        console.log('🆕 New maintenance request:', data);
        // Add the new request to the list
        setRequests(prev => [data.request, ...prev]);
        // Show success message
        setSuccess(data.message);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      };

      const handleRequestUpdated = (data: any) => {
        console.log('🔄 Maintenance request updated:', data);
        // Update the request in the list
        setRequests(prev => prev.map(req => 
          req._id === data.request._id ? data.request : req
        ));
        // Show success message
        setSuccess(data.message);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      };

      // Add event listeners
      socket.on('maintenanceRequestCreated', handleRequestCreated);
      socket.on('maintenanceRequestUpdated', handleRequestUpdated);

      // Cleanup event listeners
      return () => {
        socket.off('maintenanceRequestCreated', handleRequestCreated);
        socket.off('maintenanceRequestUpdated', handleRequestUpdated);
      };
    }
  }, [socket]);

  // Fetch tenant's units on mount (if tenant)
  useEffect(() => {
    if (user?.role === "tenant" && token) {
      fetchUnits();
    }
  }, [user?.role, token]);

  // جلب الطلبات عند التحميل
  useEffect(() => {
    if (token) {
      fetchRequests();
    }
  }, [token]);

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
      setDataLoading(true);
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
      setDataLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      setUnitsLoading(true);
      // Fetch tenant's leases to get their units
      const res = await axios.get("http://localhost:5000/api/leases/my-leases", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      const leases = res.data.data?.leases || [];
      setLeases(leases);
      
      // Extract units from leases
      const tenantUnits = leases.map((lease: any) => ({
        _id: lease.unitId._id,
        name: lease.unitId.name,
        address: lease.unitId.address
      }));
      
      setUnits(tenantUnits);
    } catch (err) {
      console.error("Error fetching tenant units:", err);
      setError("حدث خطأ أثناء جلب الوحدات");
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'unitId') {
      // Find the corresponding lease for the selected unit
      const selectedLease = leases.find(lease => lease.unitId._id === value);
      setForm({ 
        ...form, 
        unitId: value,
        contractId: selectedLease?._id || ""
      });
    } else {
      setForm({ ...form, [name]: value });
    }
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
    if (!form.title || !form.description || !form.unitId) {
      setError("يرجى إدخال جميع البيانات واختيار الوحدة");
      return;
    }
    if (!token) {
      setError("يجب تسجيل الدخول أولاً");
      return;
    }
    try {
      setFormLoading(true);
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("unitId", form.unitId);
      if (form.contractId) formData.append("contractId", form.contractId);
      if (form.image) formData.append("image", form.image);
      await axios.post("http://localhost:5000/api/maintenance", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setSuccess("تم إرسال الطلب بنجاح");
      setForm({ title: "", description: "", image: null, unitId: "", contractId: "" });
      // Remove fetchRequests() - let real-time update handle it
    } catch (err) {
      console.error("Error submitting request:", err); // للتشخيص
      setError("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="mt-20 pt-32 pb-16 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">طلبات الصيانة</h1>
        {user?.role === "tenant" && (
          <form
            onSubmit={handleSubmit}
            className="relative bg-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl p-10 mb-12 border-2 border-orange-200 dark:border-orange-700 max-w-xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 mb-2 tracking-tight">طلب صيانة جديد</h2>
              <p className="text-gray-500 dark:text-gray-400 text-base">يرجى تعبئة جميع الحقول المطلوبة بدقة.</p>
            </div>
            <div className="mb-7">
              <label className="block mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">الوحدة</label>
              <select
                name="unitId"
                value={form.unitId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-orange-200 dark:border-orange-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-sm text-lg"
                required
                disabled={unitsLoading}
              >
                <option value="">
                  {unitsLoading ? "جاري تحميل الوحدات..." : "اختر الوحدة"}
                </option>
                {units.map((unit) => (
                  <option key={unit._id} value={unit._id}>
                    {unit.name} {unit.address ? `- ${unit.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-7">
              <label className="block mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">عنوان العطل</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-orange-200 dark:border-orange-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-sm text-lg"
                required
                disabled={formLoading}
              />
            </div>
            <div className="mb-7">
              <label className="block mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">وصف العطل</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-orange-200 dark:border-orange-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-sm min-h-[90px] resize-none text-lg"
                required
                disabled={formLoading}
              />
            </div>
            <div className="mb-7">
              <label className="block mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">صورة العطل (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-base file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 dark:file:bg-gray-800 dark:file:text-orange-200 dark:hover:file:bg-gray-700 transition-all duration-200"
                disabled={formLoading}
              />
            </div>
            {error && <div className="mb-5 text-red-600 text-center font-bold text-lg animate-shake">{error}</div>}
            {success && <div className="mb-5 text-green-600 text-center font-bold text-lg animate-fade-in">{success}</div>}
            <button
              type="submit"
              disabled={formLoading || unitsLoading || units.length === 0}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white py-3 rounded-xl font-bold text-xl mt-2 shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-[1.03]"
            >
              {formLoading ? "...جاري الإرسال" : "إرسال الطلب"}
            </button>
          </form>
        )}
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">الطلبات السابقة</h2>
        {dataLoading ? (
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
                    {req.status !== 'resolved' && (
                      <textarea
                        placeholder="اكتب ملاحظة للمستأجر..."
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                        value={req._landlordNote || ''}
                        onChange={e => {
                          setRequests(prev => prev.map(r => r._id === req._id ? { ...r, _landlordNote: e.target.value } : r));
                        }}
                      />
                    )}
                    <div className="flex gap-2">
                      {req.status === 'pending' && (
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          disabled={buttonLoading[req._id]}
                          onClick={async () => {
                            setButtonLoading(prev => ({ ...prev, [req._id]: true }));
                            setError("");
                            try {
                              await axios.patch(`http://localhost:5000/api/maintenance/${req._id}`,
                                { status: 'in progress', notes: req._landlordNote || '' },
                                { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                              );
                              // UI will update via socket
                            } catch (error) {
                              console.error('Error updating request:', error);
                              setError('حدث خطأ أثناء تحديث الطلب');
                            } finally {
                              setButtonLoading(prev => ({ ...prev, [req._id]: false }));
                            }
                          }}
                        >
                          {buttonLoading[req._id] ? '...جاري التنفيذ' : 'قبول الطلب (جاري التنفيذ)'}
                        </button>
                      )}
                      {req.status !== 'resolved' && (
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          disabled={buttonLoading[req._id]}
                          onClick={async () => {
                            setButtonLoading(prev => ({ ...prev, [req._id]: true }));
                            setError("");
                            try {
                              console.log('PATCH /api/maintenance/:id', req._id, { status: 'resolved', notes: req._landlordNote || '' });
                              await axios.patch(`http://localhost:5000/api/maintenance/${req._id}`,
                                { status: 'resolved', notes: req._landlordNote || '' },
                                { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                              );
                              // UI will update via socket
                            } catch (error) {
                              console.error('Error updating request:', error);
                              setError('حدث خطأ أثناء تحديث الطلب');
                            } finally {
                              setButtonLoading(prev => ({ ...prev, [req._id]: false }));
                            }
                          }}
                        >
                          {buttonLoading[req._id] ? '...جاري الحل' : 'تم الحل'}
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
