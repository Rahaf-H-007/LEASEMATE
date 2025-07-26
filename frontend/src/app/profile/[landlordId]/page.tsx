"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiService } from "@/services/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UserProfilePage() {
  const { landlordId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setUnitsError(null);
      setReviewsError(null);
      // Validate landlordId
      if (!landlordId || typeof landlordId !== "string" || landlordId.length < 12) {
        setError("معرف المالك غير صالح أو مفقود.");
        setLoading(false);
        return;
      }
      try {
        // Fetch user info
        let userRes: any;
        try {
          userRes = await apiService.getUserById(landlordId);
          setUser(userRes.data || userRes); // fallback if .data missing
        } catch (err: any) {
          if (err.message?.includes("404") || err.message?.includes("not found") || err.message?.includes("User not found")) {
            setError("لم يتم العثور على المستخدم.");
          } else if (err.message?.includes("Network error")) {
            setError("تعذر الاتصال بالخادم. يرجى التحقق من الاتصال.");
          } else {
            setError(err.message || "حدث خطأ أثناء جلب بيانات المستخدم.");
          }
          setLoading(false);
          return;
        }
        // Fetch units owned by user (if landlord)
        if (userRes.data?.role === 'landlord' || userRes.role === 'landlord') {
          try {
            const unitsRes: any = await apiService.getUnitsByLandlord(landlordId);
            setUnits(unitsRes.data?.units || unitsRes.units || []);
          } catch (err: any) {
            setUnitsError("تعذر جلب وحدات المستخدم.");
          }
        }
        // Fetch reviews about user
        try {
          const reviewsRes: any = await apiService.getReviewsForUser(landlordId);
          setReviews(reviewsRes.data || reviewsRes);
        } catch (err: any) {
          setReviewsError("تعذر جلب مراجعات المستخدم.");
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [landlordId]);

  // Calculate sentiment distribution based on database sentiment field
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  
  reviews.forEach((r) => {
    // Use sentiment from database, fallback to rating only if sentiment is null/undefined
    let actualSentiment = r.sentiment;
    
    if (!actualSentiment || actualSentiment === null || actualSentiment === undefined) {
      // Fallback to rating-based sentiment only if no sentiment from database
      if (r.rating >= 4) {
        actualSentiment = 'ايجابي';
      } else if (r.rating <= 2) {
        actualSentiment = 'سلبية';
      } else {
        actualSentiment = 'محايد';
      }
    }
    
    if (actualSentiment === 'ايجابي') {
      positive++;
    } else if (actualSentiment === 'سلبية') {
      negative++;
    } else {
      neutral++;
    }
  });

  const chartData = {
    labels: ["إيجابي", "محايد", "سلبية"],
    datasets: [
      {
        label: "عدد المراجعات",
        data: [positive, neutral, negative],
        backgroundColor: [
          "#22c55e", // positive - green
          "#fbbf24", // neutral - yellow
          "#ef4444", // negative - red
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "توزيع تقييمات المراجعات",
        font: { size: 14 }
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        precision: 0,
        ticks: { font: { size: 12 } }
      },
      x: {
        ticks: { font: { size: 12 } }
      }
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-gray-700 dark:text-gray-200 text-lg">جاري التحميل...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-red-600 dark:text-red-300 text-lg">{error || "لم يتم العثور على المستخدم"}</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-100/80 via-amber-100/60 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-x-hidden">
      {/* Blurred background accent */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-amber-200/40 rounded-full blur-3xl" />
      </div>
      <Navbar />
      <div className="flex pt-20 items-center justify-center min-h-[calc(100vh-80px)] relative z-10">
        <main className="max-w-5xl w-full p-8 bg-white/70 dark:bg-gray-900/70 rounded-3xl shadow-2xl border border-orange-200 dark:border-orange-800 backdrop-blur-xl relative">
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="relative">
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 rounded-full blur-sm opacity-60" />
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-orange-200 via-amber-200 to-white dark:from-orange-900 dark:via-amber-900 dark:to-gray-900 p-1 shadow-xl mx-auto flex items-center justify-center relative">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="الصورة الشخصية" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-4xl text-orange-500 font-bold shadow-lg">
                    {user.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 tracking-tight mt-2">{user.name}</h1>
            <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-4 py-1 rounded-full font-semibold text-base shadow-sm mt-1">
              {user.role === 'landlord' ? 'مالك عقار' : user.role === 'tenant' ? 'مستأجر' : user.role}
            </span>
          </div>
          <div className="space-y-6">
            
            <div className="flex items-center gap-2">
              <span className="text-xl font-medium text-gray-700 dark:text-gray-200">حالة التحقق:</span>
              <span className={
                user.verificationStatus?.status === 'approved'
                  ? 'text-xl font-medium text-green-600 dark:text-green-400'
                  : user.verificationStatus?.status === 'pending'
                  ? 'text-xl font-medium text-yellow-600 dark:text-yellow-400'
                  : 'text-xl font-medium text-red-600 dark:text-red-400'
              }>
                {user.verificationStatus?.status === 'approved'
                  ? 'تم التحقق'
                  : user.verificationStatus?.status === 'pending'
                  ? 'قيد الانتظار'
                  : user.verificationStatus?.status === 'rejected'
                  ? 'مرفوض'
                  : 'غير معروف'}
              </span>
            </div>
            {/* Units Section - Only for landlords */}
            {user.role === 'landlord' && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-6">الوحدات المملوكة</h2>
                {unitsError && <div className="text-red-600 dark:text-red-400 text-center mb-4">{unitsError}</div>}
                {units.length === 0 && !unitsError ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">لا توجد وحدات بعد.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                    {units.map((unit) => (
                      <Link
                        key={unit._id}
                        href={`/unit/${unit._id}`}
                        className="block bg-white/80 dark:bg-gray-800/80 rounded-2xl p-5 shadow-xl border border-orange-100 dark:border-orange-800 hover:shadow-2xl hover:-translate-y-1 hover:border-orange-400 dark:hover:border-orange-400 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                      >
                        {unit.images && unit.images.length > 0 && unit.images[0].url ? (
                          <img
                            src={unit.images[0].url}
                            alt={unit.name}
                            className="w-full h-32 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-32 bg-orange-50 dark:bg-gray-900 rounded-xl mb-3 flex items-center justify-center text-4xl text-orange-200 dark:text-orange-800">🏠</div>
                        )}
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">{unit.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 truncate">{unit.address}</p>
                        <span className="text-orange-600 dark:text-orange-400 font-extrabold text-xl block mb-1">{unit.pricePerMonth} جنيه/شهر</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Reviews Section */}
            <div className="mt-12" dir="rtl">
              <h2 className="text-2xl font-extrabold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <span className="border-r-4 border-orange-400 pr-3">
                  {user.role === 'landlord' ? 'المراجعات عن المالك' : 'المراجعات عن المستأجر'}
                </span>
              </h2>
              {reviewsError && <div className="text-red-600 dark:text-red-400 text-center mb-4">{reviewsError}</div>}
              <div className="mb-8 animate-fade-in">
                <div className="h-64 w-8/12 mx-auto">
                  <Bar data={chartData} options={chartOptions} />
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900 px-3 py-1 rounded-full">إيجابي: {positive}</span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold bg-yellow-50 dark:bg-yellow-900 px-3 py-1 rounded-full">محايد: {neutral}</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900 px-3 py-1 rounded-full">سلبي: {negative}</span>
                </div>
              </div>
              <div className="border-t border-orange-200 dark:border-orange-700 mb-8"></div>
              <div className="bg-orange-50/60 dark:bg-stone-800 rounded-2xl p-4">
                {reviewsError ? (
                  <div className="text-red-600 dark:text-red-400 text-center py-8">{reviewsError}</div>
                ) : reviews.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">لا توجد مراجعات بعد.</div>
                ) : (
                  <ul className="grid gap-6">
                    {reviews.map((review) => {
                      let sentimentColor = 'bg-gray-200 text-gray-700';
                      let sentimentIcon = '😐';
                      let sentimentText = 'محايد';
                      let actualSentiment = review.sentiment;
                      if (!actualSentiment || actualSentiment === null || actualSentiment === undefined) {
                        if (review.rating >= 4) {
                          actualSentiment = 'ايجابي';
                        } else if (review.rating <= 2) {
                          actualSentiment = 'سلبية';
                        } else {
                          actualSentiment = 'محايد';
                        }
                      }
                      console.log('Review ID:', review._id, 'Rating:', review.rating, 'Backend sentiment:', review.sentiment, 'Final sentiment:', actualSentiment);
                      
                      if (actualSentiment === 'ايجابي') {
                        sentimentColor = 'bg-green-100 text-green-700';
                        sentimentIcon = '😊';
                        sentimentText = 'إيجابي';
                      } else if (actualSentiment === 'سلبية') {
                        sentimentColor = 'bg-red-100 text-red-700';
                        sentimentIcon = '😞';
                        sentimentText = 'سلبية';
                      }
                      const avatar = review.reviewerId?.avatarUrl ? (
                        <img src={review.reviewerId.avatarUrl} alt="الصورة الشخصية" className="w-10 h-10 rounded-full object-cover border-2 border-orange-300" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-lg font-bold text-orange-700">
                          {review.reviewerId?.name?.charAt(0) || '?'}
                        </div>
                      );
                      return (
                        <li key={review._id} className="transition-shadow hover:shadow-xl bg-white dark:bg-gray-900 rounded-xl p-6 flex gap-4 items-start shadow-md">
                          {review.reviewerId?._id ? (
                            <Link href={`/profile/${review.reviewerId._id}`} className="group cursor-pointer">
                              <div className="group-hover:ring-2 group-hover:ring-orange-400 group-hover:scale-105 transition-all duration-200">
                                {avatar}
                              </div>
                            </Link>
                          ) : (
                            avatar
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {review.reviewerId?._id ? (
                                <Link href={`/profile/${review.reviewerId._id}`} className="group">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-lg group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors cursor-pointer">{review.reviewerId?.name || 'مجهول'}</span>
                                </Link>
                              ) : (
                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{review.reviewerId?.name || 'مجهول'}</span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">({new Date(review.createdAt).toLocaleDateString('ar-EG')})</span>
                              <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${sentimentColor}`}>{sentimentIcon} {sentimentText}</span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < review.rating ? 'text-yellow-400 text-xl' : 'text-gray-300 text-xl'}>★</span>
                              ))}
                            </div>
                            <div className="text-gray-700 dark:text-gray-200 text-base leading-relaxed">{review.comment || <span className="italic text-gray-400">لا يوجد تعليق</span>}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 