"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiService, Unit } from "@/services/api";
import Navbar from "@/components/Navbar";
import AmenitiesForm from "@/components/AmentiesForm";
import ImageSlider from "@/components/ImageSlider";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ManageUnitPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const unitId = params.unitId as string;
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editAmenities, setEditAmenities] = useState({
    hasPool: false,
    hasAC: false,
    hasTV: false,
    hasWifi: false,
    hasKitchenware: false,
    hasHeating: false,
  });
  const [editImages, setEditImages] = useState<File[]>([]);

  useEffect(() => {
    const fetchUnit = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("leasemate_token");
        if (!token) throw new Error("لم يتم العثور على التوكن");
        const data = await apiService.getUnitById(unitId, token);
        setUnit(data);
        setEditAmenities({
          hasPool: data.hasPool,
          hasAC: data.hasAC,
          hasTV: data.hasTV,
          hasWifi: data.hasWifi,
          hasKitchenware: data.hasKitchenware,
          hasHeating: data.hasHeating,
        });
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء جلب بيانات الوحدة");
      } finally {
        setLoading(false);
      }
    };
    if (unitId) fetchUnit();
  }, [unitId]);

  const handleDelete = async () => {
    toast((t) => (
      <span>
        هل أنت متأكد أنك تريد حذف هذه الوحدة؟ لا يمكن التراجع!
        <div className="flex gap-2 mt-4">
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-4 rounded"
            onClick={async () => {
              toast.dismiss(t.id);
              setIsDeleting(true);
              setDeleteError(null);
              try {
                const token = localStorage.getItem("leasemate_token");
                if (!token) throw new Error("لم يتم العثور على التوكن");
                await fetch(`http://localhost:5000/api/units/${unitId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                toast.success("تم حذف الوحدة بنجاح!");
                router.push("/dashboard");
              } catch (err: any) {
                toast.error(err.message || "حدث خطأ أثناء الحذف");
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            نعم، احذف
          </button>
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-1 px-4 rounded"
            onClick={() => toast.dismiss(t.id)}
          >
            إلغاء
          </button>
        </div>
      </span>
    ), { duration: 10000 });
  };

  // يمكنك لاحقًا استبدال هذا بفورم تعديل متكامل
  const handleEdit = () => {
    setShowEdit(true);
    // يمكنك هنا فتح فورم التعديل أو التوجيه لصفحة تعديل منفصلة
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white pt-14">
      <Toaster position="top-center" />
      <Navbar />
      <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
        {loading ? (
          <div className="text-center text-gray-600 dark:text-gray-300">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center text-red-600 dark:text-red-400">{error}</div>
        ) : unit ? (
          <>
            <h1 className="text-2xl font-bold mb-4">إدارة الوحدة: {unit.name}</h1>
            <div className="mb-4">
              <div className="mb-2">العنوان: {unit.address}</div>
              <div className="mb-2">المدينة: {unit.city}</div>
              <div className="mb-2">المحافظة: {unit.governorate}</div>
              <div className="mb-2">السعر الشهري: {unit.pricePerMonth} جنيه</div>
              <div className="mb-2">عدد الغرف: {unit.numRooms}</div>
              <div className="mb-2">المساحة: {unit.space} متر</div>
              <div className="mb-2">الحالة: {unit.status === 'available' ? 'نشط' : unit.status === 'booked' ? 'محجوز' : unit.status === 'rejected' ? 'مرفوض' : 'تحت الصيانة'}</div>
              <div className="mb-2">نوع الوحدة: {unit.type === 'villa' ? 'فيلا' : 'شقة'}</div>
              <div className="mb-2">مفروش: {unit.isFurnished ? 'نعم' : 'لا'}</div>
              {unit.status === 'rejected' && unit.rejectionReason && (
                <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-red-800 dark:text-red-200 font-semibold mb-1">سبب الرفض:</div>
                  <div className="text-red-700 dark:text-red-300">{unit.rejectionReason}</div>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-6">
              {user?.role === "landlord" && (
                <>
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors duration-200"
                    onClick={handleEdit}
                    disabled={showEdit}
                  >
                    إعادة رفع الوحدة
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition-colors duration-200"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "جاري الحذف..." : "حذف"}
                  </button>
                </>
              )}
            </div>
            {deleteError && <div className="mt-4 text-red-600 dark:text-red-400">{deleteError}</div>}
            {showEdit && unit && (
              <form
                className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 space-y-6 animate-fade-in"
                                 onSubmit={async (e) => {
                   e.preventDefault();
                   setError(null);
                   try {
                     const token = localStorage.getItem("leasemate_token");
                     if (!token) throw new Error("لم يتم العثور على التوكن");
                     
                     // إعداد البيانات للتحديث
                     const updateData = {
                       name: (e.target as any).name.value,
                       address: (e.target as any).address.value,
                       city: (e.target as any).city.value,
                       governorate: (e.target as any).governorate.value,
                       pricePerMonth: Number((e.target as any).pricePerMonth.value),
                       numRooms: Number((e.target as any).numRooms.value),
                       space: Number((e.target as any).space.value),
                       status: (e.target as any).status.value,
                       type: (e.target as any).type.value,
                       isFurnished: (e.target as any).isFurnished.value === "true",
                       ...editAmenities,
                     };

                     // إذا كان هناك صور جديدة، استخدم FormData
                     if (editImages.length > 0) {
                       const formData = new FormData();
                       Object.entries(updateData).forEach(([key, value]) => {
                         formData.append(key, String(value));
                       });
                       editImages.forEach((file) => {
                         formData.append("images", file);
                       });
                       
                       await apiService.updateUnit(unitId, formData, token);
                     } else {
                       // إذا لم تكن هناك صور جديدة، استخدم JSON
                       await apiService.updateUnit(unitId, updateData, token);
                     }

                     setShowEdit(false);
                     setEditImages([]);
                     
                     // إعادة جلب بيانات الوحدة المحدثة
                     const updatedUnit = await apiService.getUnitById(unitId, token);
                     setUnit(updatedUnit);
                     
                     // تحديث حالة المرافق المحلية
                     setEditAmenities({
                       hasPool: updatedUnit.hasPool,
                       hasAC: updatedUnit.hasAC,
                       hasTV: updatedUnit.hasTV,
                       hasWifi: updatedUnit.hasWifi,
                       hasKitchenware: updatedUnit.hasKitchenware,
                       hasHeating: updatedUnit.hasHeating,
                     });
                     
                     if (unit?.status === 'rejected') {
                       toast.success("تم إعادة رفع الوحدة بنجاح! سيتم مراجعتها من قبل الإدارة.");
                     } else {
                       toast.success("تم تحديث الوحدة بنجاح!");
                     }
                   } catch (err: any) {
                     setError(err.message || "حدث خطأ أثناء التعديل");
                     toast.error(err.message || "حدث خطأ أثناء التعديل");
                   }
                 }}
                encType="multipart/form-data"
              >
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
                  {unit.status === 'rejected' ? 'إعادة رفع الوحدة المرفوضة' : 'تعديل بيانات الوحدة'}
                </h2>
                {unit.status === 'rejected' && (
                  <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="text-orange-800 dark:text-orange-200 font-semibold mb-2">ملاحظة مهمة:</div>
                    <div className="text-orange-700 dark:text-orange-300">
                      عند رفع صور جديدة، سيتم إعادة إرسال الوحدة للمراجعة من قبل الإدارة.
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">اسم الوحدة <span className="text-red-500">*</span></label>
                    <input name="name" defaultValue={unit.name} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">العنوان <span className="text-red-500">*</span></label>
                    <input name="address" defaultValue={unit.address} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">المدينة <span className="text-red-500">*</span></label>
                    <input name="city" defaultValue={unit.city} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">المحافظة <span className="text-red-500">*</span></label>
                    <input name="governorate" defaultValue={unit.governorate} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">السعر الشهري <span className="text-red-500">*</span></label>
                    <input name="pricePerMonth" type="number" defaultValue={unit.pricePerMonth} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">عدد الغرف <span className="text-red-500">*</span></label>
                    <input name="numRooms" type="number" defaultValue={unit.numRooms} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">المساحة (متر) <span className="text-red-500">*</span></label>
                    <input name="space" type="number" defaultValue={unit.space} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">الحالة</label>
                    <select name="status" defaultValue={unit.status} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition">
                      <option value="available">نشط</option>
                      <option value="booked">محجوز</option>
                      <option value="under maintenance">تحت الصيانة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">نوع الوحدة</label>
                    <select name="type" defaultValue={unit.type} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition">
                      <option value="apartment">شقة</option>
                      <option value="villa">فيلا</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">مفروش</label>
                    <select name="isFurnished" defaultValue={unit.isFurnished ? "true" : "false"} className="w-full rounded-lg p-3 text-gray-900 dark:text-gray-900 border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition">
                      <option value="true">نعم</option>
                      <option value="false">لا</option>
                    </select>
                  </div>
                </div>
                {/* صور الوحدة */}
                <div className="mt-6">
                  <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">صور الوحدة الحالية</label>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
                    <ImageSlider images={unit.images} />
                  </div>
                  <label className="block mb-2 text-gray-700 dark:text-gray-200 font-semibold">رفع صور جديدة (سيتم استبدال الصور القديمة)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setEditImages(Array.from(e.target.files || []))}
                    className="w-full rounded-lg p-3 mt-2 text-gray-900 bg-white border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition"
                  />
                  {editImages.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {editImages.map((file, idx) => (
                        <img
                          key={idx}
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow"
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* مرافق الوحدة */}
                <div className="mt-8">
                  <AmenitiesForm data={editAmenities} onChange={setEditAmenities} unitType={unit.type} />
                </div>
                <button type="submit" className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all duration-200 w-full text-lg tracking-wide">
                  {unit.status === 'rejected' ? 'إعادة رفع الوحدة للمراجعة' : 'حفظ التعديلات'}
                </button>
                <button type="button" className="mt-3 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 px-8 rounded-xl shadow transition-all duration-200 w-full text-lg" onClick={() => setShowEdit(false)}>إلغاء</button>
                {error && <div className="mt-4 text-red-600 dark:text-red-400 text-center font-bold">{error}</div>}
              </form>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
} 