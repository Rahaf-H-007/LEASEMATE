"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
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
  _landlordNote?: string;
}

interface Unit {
  _id: string;
  name: string;
  address?: string;
}

export default function MaintenanceRequestsPage() {
  const { user, token, socket } = useAuth();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ title: "", description: "", image: null as File | null, unitId: "", contractId: "" });
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localDates, setLocalDates] = useState<{ [id: string]: string }>({});
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [buttonLoading, setButtonLoading] = useState<{ [id: string]: boolean }>({});
  
  // New state for sidebar and selected request
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [highlightedRequest, setHighlightedRequest] = useState<string | null>(null);

  // Handle URL parameter for specific request selection
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    console.log('🔍 URL requestId:', requestId);
    if (requestId && requests.length > 0) {
      const targetRequest = requests.find(req => req._id === requestId);
      console.log('🎯 Target request found:', targetRequest);
      if (targetRequest) {
        setSelectedRequest(targetRequest);
        setHighlightedRequest(requestId);
        setSidebarOpen(true);
        // Scroll to the selected request details
        setTimeout(() => {
          const detailsElement = document.getElementById('request-details');
          if (detailsElement) {
            detailsElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [searchParams, requests]);

  // Listen for maintenance request events using the shared socket
  useEffect(() => {
    console.log('🔌 Socket status:', socket?.connected ? 'Connected' : 'Disconnected');
    console.log('🔌 Socket ID:', socket?.id);
    
    if (socket) {
      const handleRequestCreated = (data: any) => {
        console.log('🆕 New maintenance request:', data);
        setRequests(prev => [data.request, ...prev]);
        setSuccess(data.message);
        setTimeout(() => setSuccess(""), 3000);
        
        // If landlord, automatically select and highlight the new request
        if (user?.role === 'landlord') {
          setHighlightedRequest(data.request._id);
          setSelectedRequest(data.request);
          setSidebarOpen(true);
          // Scroll to the selected request details
          setTimeout(() => {
            const detailsElement = document.getElementById('request-details');
            if (detailsElement) {
              detailsElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      };

      const handleRequestUpdated = (data: any) => {
        console.log('🔄 Maintenance request updated:', data);
        setRequests(prev => prev.map(req => 
          req._id === data.request._id ? data.request : req
        ));
        setSuccess(data.message);
        setTimeout(() => setSuccess(""), 3000);
        
        // Update selected request if it's the one being viewed
        if (selectedRequest?._id === data.request._id) {
          setSelectedRequest(data.request);
        }
      };

      socket.on('maintenanceRequestCreated', handleRequestCreated);
      socket.on('maintenanceRequestUpdated', handleRequestUpdated);

      return () => {
        socket.off('maintenanceRequestCreated', handleRequestCreated);
        socket.off('maintenanceRequestUpdated', handleRequestUpdated);
      };
    }
  }, [socket, user?.role, selectedRequest]);

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
    const dates: { [id: string]: string } = {};
    requests.forEach((req) => {
      dates[req._id] = new Date(req.createdAt).toLocaleString();
    });
    setLocalDates(dates);
  }, [requests]);

  const fetchRequests = async () => {
    try {
      setDataLoading(true);
      console.log("Current token:", token);
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
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      setError("حدث خطأ أثناء جلب الطلبات");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      setUnitsLoading(true);
      const res = await axios.get("http://localhost:5000/api/leases/my-leases?forMaintenance=true", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      const leases = res.data.data?.leases || [];
      setLeases(leases);
      
      const tenantUnits = leases
        .filter((lease: any) => lease.status === 'active')
        .map((lease: any) => ({
          _id: lease.unitId._id,
          name: lease.unitId.name,
          address: lease.unitId.address
        }));
      
      setUnits(tenantUnits);
    } catch (err: any) {
      console.error("Error fetching tenant units:", err);
      setError("حدث خطأ أثناء جلب الوحدات");
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'unitId') {
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
    } catch (err: any) {
      console.error("Error submitting request:", err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("حدث خطأ أثناء إرسال الطلب");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'in progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'in progress': return 'جاري التنفيذ';
      case 'resolved': return 'تم الحل';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <div className="mt-20 pt-4 pb-16 flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            {sidebarOpen && (
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">طلبات الصيانة</h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Requests List */}
          <div className="overflow-y-auto h-full">
            {dataLoading ? (
              <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
            ) : requests.length === 0 ? (
              <div className="p-4 text-center text-gray-500">لا توجد طلبات صيانة</div>
            ) : (
              <div className="p-2">
                {requests.map((req) => (
                  <div
                    key={req._id}
                    className={`mb-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedRequest?._id === req._id
                        ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
                        : highlightedRequest === req._id
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 animate-pulse'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    } border`}
                    onClick={() => {
                      setSelectedRequest(req);
                      setHighlightedRequest(null);
                    }}
                  >
                    {sidebarOpen ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {req.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                            {getStatusText(req.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {req.description}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {localDates[req._id]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                          req.status === 'pending' ? 'bg-yellow-500' :
                          req.status === 'in progress' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {req.title.substring(0, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            {/* Form Section */}
            {user?.role === "tenant" && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-1">طلب صيانة جديد</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">يرجى تعبئة جميع الحقول المطلوبة بدقة.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">الوحدة</label>
                    <select
                      name="unitId"
                      value={form.unitId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-orange-200 dark:border-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white transition-all duration-200"
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
                    {!unitsLoading && units.length === 0 && (
                      <div className="mt-2 text-orange-600 text-sm">
                        لا توجد وحدات متاحة للصيانة. تأكد من أن لديك عقود إيجار نشطة.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">عنوان العطل</label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-orange-200 dark:border-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white transition-all duration-200"
                      required
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">وصف العطل</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-orange-200 dark:border-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white transition-all duration-200 min-h-[80px] resize-none"
                      required
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">صورة العطل (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 dark:file:bg-gray-700 dark:file:text-orange-200 dark:hover:file:bg-gray-600 transition-all duration-200"
                      disabled={formLoading}
                    />
                  </div>

                  {error && <div className="text-red-600 text-center font-bold text-base animate-shake">{error}</div>}
                  {success && <div className="text-green-600 text-center font-bold text-base animate-fade-in">{success}</div>}

                  <button
                    type="submit"
                    disabled={formLoading || unitsLoading || units.length === 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white py-2 rounded-lg font-bold text-base shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                  >
                    {formLoading ? "...جاري الإرسال" : "إرسال الطلب"}
                  </button>
                </form>
              </div>
            )}

            {/* Selected Request Details */}
            {selectedRequest && (
              <div id="request-details" className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">تفاصيل الطلب</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusText(selectedRequest.status)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{selectedRequest.title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedRequest.description}</p>
                  </div>

                  {selectedRequest.image && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">صورة العطل</h4>
                      <img
                        src={selectedRequest.image}
                        alt="صورة العطل"
                        className="w-48 h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer transition-transform hover:scale-105"
                        onClick={() => setOpenImage(selectedRequest.image || "")}
                      />
                    </div>
                  )}

                  {selectedRequest.notes && (
                    <div className={`p-4 rounded-lg border ${
                      selectedRequest.status === 'in progress' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : selectedRequest.status === 'resolved'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-5 h-5 ${
                          selectedRequest.status === 'in progress'
                            ? 'text-blue-600 dark:text-blue-400'
                            : selectedRequest.status === 'resolved'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className={`font-semibold text-base ${
                          selectedRequest.status === 'in progress'
                            ? 'text-blue-700 dark:text-blue-300'
                            : selectedRequest.status === 'resolved'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          ملاحظة المالك:
                        </span>
                      </div>
                      <p className={`leading-relaxed ${
                        selectedRequest.status === 'in progress'
                          ? 'text-blue-800 dark:text-blue-200'
                          : selectedRequest.status === 'resolved'
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {selectedRequest.notes}
                      </p>
                    </div>
                  )}

                  {user?.role === 'landlord' && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">إدارة الطلب</h4>
                      <div className="space-y-3">
                        {selectedRequest.status !== 'resolved' && (
                          <textarea
                            placeholder="اكتب ملاحظة للمستأجر..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white"
                            value={selectedRequest._landlordNote || ''}
                            onChange={e => {
                              setSelectedRequest(prev => prev ? { ...prev, _landlordNote: e.target.value } : null);
                              setRequests(prev => prev.map(r => r._id === selectedRequest._id ? { ...r, _landlordNote: e.target.value } : r));
                            }}
                          />
                        )}
                        <div className="flex gap-2">
                          {selectedRequest.status === 'pending' && (
                            <button
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                              disabled={buttonLoading[selectedRequest._id]}
                              onClick={async () => {
                                setButtonLoading(prev => ({ ...prev, [selectedRequest._id]: true }));
                                setError("");
                                try {
                                  await axios.patch(`http://localhost:5000/api/maintenance/${selectedRequest._id}`,
                                    { status: 'in progress', notes: selectedRequest._landlordNote || '' },
                                    { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                                  );
                                } catch (error: any) {
                                  console.error('Error updating request:', error);
                                  setError('حدث خطأ أثناء تحديث الطلب');
                                } finally {
                                  setButtonLoading(prev => ({ ...prev, [selectedRequest._id]: false }));
                                }
                              }}
                            >
                              {buttonLoading[selectedRequest._id] ? '...جاري التنفيذ' : 'قبول الطلب (جاري التنفيذ)'}
                            </button>
                          )}
                          {selectedRequest.status !== 'resolved' && (
                            <button
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                              disabled={buttonLoading[selectedRequest._id]}
                              onClick={async () => {
                                setButtonLoading(prev => ({ ...prev, [selectedRequest._id]: true }));
                                setError("");
                                try {
                                  await axios.patch(`http://localhost:5000/api/maintenance/${selectedRequest._id}`,
                                    { status: 'resolved', notes: selectedRequest._landlordNote || '' },
                                    { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
                                  );
                                } catch (error: any) {
                                  console.error('Error updating request:', error);
                                  setError('حدث خطأ أثناء تحديث الطلب');
                                } finally {
                                  setButtonLoading(prev => ({ ...prev, [selectedRequest._id]: false }));
                                }
                              }}
                            >
                              {buttonLoading[selectedRequest._id] ? '...جاري الحل' : 'تم الحل'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                    تاريخ الإرسال: {localDates[selectedRequest._id]}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!selectedRequest && (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">🔧</div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">اختر طلب صيانة</h3>
                <p className="text-gray-500 dark:text-gray-500 text-sm">اضغط على أي طلب من القائمة الجانبية لعرض تفاصيله</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
