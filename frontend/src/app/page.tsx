"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [showVerifiedAlert, setShowVerifiedAlert] = useState(true);
  const [showApprovedBanner, setShowApprovedBanner] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | undefined>(undefined);

  // Watch for status change from pending to approved
  useEffect(() => {
    if (user?.verificationStatus?.status !== prevStatus) {
      if (
        prevStatus === "pending" &&
        user?.verificationStatus?.status === "approved"
      ) {
        setShowApprovedBanner(true);
        setTimeout(() => setShowApprovedBanner(false), 3000); // Hide after 3s
      }
      setPrevStatus(user?.verificationStatus?.status);
    }
  }, [user?.verificationStatus?.status, prevStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show pending banner if verification is pending
  if (user && user.verificationStatus?.status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
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
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            في انتظار موافقة الإدارة
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            تم إرسال مستندات التحقق بنجاح. يرجى الانتظار حتى يتم مراجعتها من قبل
            الإدارة.
          </p>
        </div>
      </div>
    );
  }

  // Show rejected banner with images and edit button
  if (user && user.verificationStatus?.status === "rejected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            تم رفض التحقق الخاص بك. يرجى إعادة رفع المستندات بشكل صحيح.
          </p>
          <div className="flex flex-col items-center gap-4 mb-4">
            {/* Show previously uploaded images if available */}
            {user.verificationStatus?.uploadedIdUrl && (
              <img
                src={user.verificationStatus.uploadedIdUrl}
                alt="Uploaded ID"
                className="w-48 h-32 object-cover rounded border"
              />
            )}
            {user.verificationStatus?.selfieUrl && (
              <img
                src={user.verificationStatus.selfieUrl}
                alt="Uploaded Selfie"
                className="w-32 h-32 object-cover rounded-full border"
              />
            )}
          </div>
          <button
            onClick={() => router.push("/auth/verification")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            تعديل وإعادة رفع المستندات
          </button>
        </div>
      </div>
    );
  }

  // Show approved banner (toast) when status changes from pending to approved
  const showVerified =
    user &&
    user.verificationStatus &&
    user.verificationStatus.status === "approved" &&
    showVerifiedAlert;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      {showApprovedBanner && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center">
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-xl p-4 shadow-md gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
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
              </div>
              <div>
                <span className="font-semibold text-green-800 dark:text-green-200">
                  تمت الموافقة على التحقق الخاص بك من قبل الإدارة
                </span>
                <p className="text-sm text-green-700 dark:text-green-300">
                  يمكنك الآن الوصول إلى جميع الميزات.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <main className="pt-14 pb-16 px-4">
        {" "}
        {/* pt-14 matches new Navbar height */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="m-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 md:p-12 ">
                  {/* النص والزرار */}
                  <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-right">
                    <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold text-2xl md:text-3xl rounded-lg px-6 py-3 shadow mb-4">
                      LeaseMate – خليك مطمن.. إيجارك في إيد أمينة
                    </span>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      منصتك الذكية لإيجار أسهل وأسرع وأمان أكتر
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-center mt-8">
                      <Link href="/auth/register">
                        <button className="bg-orange-500 dark:bg-orange-600 text-white px-4 py-4 rounded-lg font-semibold text-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                          ابدأ الآن
                        </button>
                      </Link>
                      <Link href="/properties">
                        <button className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-4 rounded-lg font-semibold text-lg border-2 border-gray-300 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors shadow-lg">
                          تصفح العقارات
                        </button>
                      </Link>
                    </div>
                  </div>
                  {/* الصورة الدائرية بدون بوردر */}
                  <div className="w-80 h-80 md:w-56 md:h-56 rounded-full overflow-hidden shadow-2xl flex-shrink-0 bg-white dark:bg-gray-200 border border-gray-200 dark:border-gray-300 flex items-center justify-center">
                    <Image
                      src="/search2.png"
                      alt="بحث عن عقار"
                      width={520}
                      height={520}
                      className="object-cover w-full h-full bg-white dark:bg-gray-200"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          {/* قسم مميزات المستأجر والمالك */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="max-w-4xl mx-auto my-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10 text-orange-600 drop-shadow-lg">
                ليه تختار LeaseMate؟
              </h2>
              <div className="overflow-x-auto rounded-2xl shadow-lg bg-white dark:bg-gray-900">
                <table className="min-w-full text-center">
                  <thead>
                    <tr className="bg-orange-500 text-white">
                      <th className="py-4 px-2 text-lg text-white">
                        مميزات للمستأجر
                      </th>
                      <th className="py-4 px-2 text-lg text-white">
                        مميزات للمالك
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        🔒 توثيق هوية المالك لضمان الأمان
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        👤 توثيق هوية المستأجرين
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        🏠 تصفح عقارات متنوعة بسهولة
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        📈 إدارة عقاراتك بسهولة{" "}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        🛠️ طلب صيانة مباشر من المنصة
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        📝 توقيع عقود رقمية بسرعة
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        📝 ضمان حق المستاجر من خلال توافر نسخة الكترونية للعقد
                        الإيجاري
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        📈 متابعة الايجار من خلال المنصة{" "}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        ⭐بعد انتهاء العقد يتم تقييم الملاك بناءً على سرعة
                        الاستجابة وجودة التعامل
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        ⭐بعد انتهاء العقد يتم تقييم المستأجرين بناءً على
                        الالتزام بمواعيد الدفع وحسن التعامل
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        🧠 نبذة مختصرة عن المالك يتم توليدها تلقائيًا من خلال
                        الذكاء الاصطناعي وتحليل التعليقات
                      </td>
                      <td className="py-4 px-2 text-gray-900 dark:text-gray-100">
                        🧠 نبذة مختصرة عن المستأجر يتم توليدها تلقائيًا من خلال
                        الذكاء الاصطناعي وتحليل التعليقات
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Stats Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg mb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  500+
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  عملاء سعداء
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  200+
                </div>
                <div className="text-gray-600 dark:text-gray-300">عقارات</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  98%
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  معدل الرضا
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  24/7
                </div>
                <div className="text-gray-600 dark:text-gray-300">دعم</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-gray-900 via-gray-950 to-black text-white py-12 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          {/* شعار واسم المنصة */}
          <div className="flex items-center gap-3 mb-6 md:mb-0">
            <Image
              src="/logo.png"
              alt="LeaseMate Logo"
              width={80}
              height={80}
            />
           
          </div>
          {/* روابط سريعة */}
          <ul className="flex gap-8 text-lg font-medium mb-6 md:mb-0">
            <li>
              <Link href="/" className="hover:text-orange-400 transition">
                الرئيسية
              </Link>
            </li>
            <li>
              <Link
                href="/properties"
                className="hover:text-orange-400 transition"
              >
                العقارات
              </Link>
            </li>
          </ul>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
          &copy; 2024 LeaseMate. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
