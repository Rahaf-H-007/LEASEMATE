"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiService } from "@/services/api";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import ChatBox from "@/components/ChatBox";
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfilePage() {
  const { landlordId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isCheckingChat, setIsCheckingChat] = useState(false);

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
          setUserProfile(userRes.data || userRes); // fallback if .data missing
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
            const fetchedUnits = unitsRes.data?.units || unitsRes.units || [];
            // Filter to only show available and approved units
            const filteredUnits = fetchedUnits.filter((unit: any) => 
              unit.status === 'available' || unit.status === 'approved'
            );
            setUnits(filteredUnits);
          } catch (err: any) {
            console.error('Error fetching units:', err);
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

  // فتح الشات مباشرة بين المستأجر والمالك
  const handleOpenChat = async () => {
    if (!user || !userProfile || !landlordId) return;
    
    // لا تسمح بالشات مع نفس الشخص
    if (user._id === landlordId) return;
    
    setIsCheckingChat(true);
    
    try {
      // البحث عن محادثة عامة موجودة بين المستخدمين
      const response = await fetch(`http://localhost:5000/api/chat/find-general/${user._id}/${landlordId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.exists && data.chatId) {
        // إذا وجدت محادثة عامة، انتقل إلى صفحة الرسائل وافتح المحادثة
        console.log('Found existing general chat, redirecting to messages page');
        router.push(`/dashboard/messages?chatId=${data.chatId}`);
      } else {
        // إذا لم توجد محادثة عامة، افتح شات بوكس جديد
        console.log('No existing general chat found, opening new chat box');
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error checking for existing chat:', error);
      // في حالة الخطأ، افتح شات بوكس جديد
      setShowChat(true);
    } finally {
      setIsCheckingChat(false);
    }
  };

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

  // Calculate overall average rating
  const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  // Function to render stars
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className="text-yellow-400 text-xl">★</span>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className="text-yellow-400 text-xl relative">
            <span className="absolute inset-0 overflow-hidden w-1/2">★</span>
            <span className="text-gray-300 dark:text-gray-600">★</span>
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="text-gray-300 dark:text-gray-600 text-xl">★</span>
        );
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-gray-700 dark:text-gray-200 text-lg">جاري التحميل...</span>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-stone-900">
        <span className="text-red-600 dark:text-red-300 text-lg">{error || "لم يتم العثور على المستخدم"}</span>
      </div>
    );
  }

  // التحقق من إمكانية عرض زر الشات
  const canShowChat = user && user._id !== landlordId;

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
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="الصورة الشخصية" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-4xl text-orange-500 font-bold shadow-lg">
                    {userProfile.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 tracking-tight mt-2">{userProfile.name}</h1>
            {/* Overall Star Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {renderStars(averageRating)}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {reviews.length > 0 ? `${averageRating.toFixed(1)} (${reviews.length} مراجعة)` : 'لا توجد مراجعات بعد'}
              </span>
            </div>
            <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-4 py-1 rounded-full font-semibold text-base shadow-sm mt-1">
              {userProfile.role === 'landlord' ? 'مالك عقار' : userProfile.role === 'tenant' ? 'مستأجر' : userProfile.role}
            </span>
          </div>
          <div className="space-y-6">
            
            <div className="flex items-center gap-2">
              <span className="text-xl font-medium text-gray-700 dark:text-gray-200">حالة التحقق:</span>
              <span className={
                userProfile.verificationStatus?.status === 'approved'
                  ? 'text-xl font-medium text-green-600 dark:text-green-400'
                  : userProfile.verificationStatus?.status === 'pending'
                  ? 'text-xl font-medium text-yellow-600 dark:text-yellow-400'
                  : 'text-xl font-medium text-red-600 dark:text-red-400'
              }>
                {userProfile.verificationStatus?.status === 'approved'
                  ? 'تم التحقق'
                  : userProfile.verificationStatus?.status === 'pending'
                  ? 'قيد الانتظار'
                  : userProfile.verificationStatus?.status === 'rejected'
                  ? 'مرفوض'
                  : 'غير معروف'}
              </span>
            </div>
            {/* Units Section - Only for landlords */}
            {userProfile.role === 'landlord' && (
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
                  {userProfile.role === 'landlord' ? 'المراجعات عن المالك' : 'المراجعات عن المستأجر'}
                </span>
              </h2>
              {reviewsError && <div className="text-red-600 dark:text-red-400 text-center mb-4">{reviewsError}</div>}
              <div className="mb-8 animate-fade-in">
                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    {reviews.length > 0 ? (
                      `لديه ${Math.round((positive / reviews.length) * 100)}% مراجعات إيجابية، ${Math.round((neutral / reviews.length) * 100)}% مراجعات محايدة، ${Math.round((negative / reviews.length) * 100)}% مراجعات سلبية من ${reviews.length} مستخدم`
                    ) : (
                      `لا يوجد مراجعات بعد`
                    )}
                  </p>
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
      
             {/* Chat Button - Only show if user is logged in and not viewing their own profile */}
       {canShowChat && (
         <div className="fixed bottom-6 right-6 z-50">
           <button
             onClick={handleOpenChat}
             disabled={isCheckingChat}
             className={`fixed bottom-8 right-8 z-50 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center group transition-all duration-200 ${
               isCheckingChat ? 'opacity-75 cursor-not-allowed' : ''
             }`}
             aria-label="Chat with user"
           >
             {isCheckingChat ? (
               <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white"></div>
             ) : (
               <MessageCircle className="w-7 h-7" />
             )}
             <span
               className="absolute right-16 bottom-1/2 translate-y-1/2 bg-orange-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap"
               style={{ minWidth: 'max-content' }}
             >
               {isCheckingChat ? 'جاري البحث عن محادثة...' : `التواصل مع ${userProfile.name}`}
             </span>
           </button>
         </div>
       )}
      
      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md relative">
            <button
              className="absolute top-2 left-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowChat(false)}
            >✕</button>
            <h2 className="text-lg font-bold mb-2 text-center">محادثة مع {userProfile.name}</h2>
            <ChatBox
              chatId={chatId}
              setChatId={setChatId}
              userId={user?._id}
              receiverId={landlordId as string}
              unitId=""
              receiverName={userProfile.name}
              userRole={user?.role}
              receiverRole={userProfile.role}
            />
          </div>
        </div>
      )}
    </div>
  );
} 