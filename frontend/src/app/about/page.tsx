"use client";

import Navbar from '@/components/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-6 text-center">من نحن</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
            منصة <span className="font-bold text-orange-500">LeaseMate</span> هي منصة إلكترونية مبتكرة تهدف إلى تسهيل وتطوير عمليات الإيجار العقاري في مصر، من خلال حلول رقمية ذكية وآمنة تربط بين المالك والمستأجر بكل سهولة وشفافية.
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">رؤيتنا</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            أن نصبح الخيار الأول لإدارة عمليات الإيجار العقاري في العالم العربي، عبر تقديم تجربة رقمية متكاملة وآمنة للجميع.
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">رسالتنا</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            تمكين المالكين والمستأجرين من إدارة العقود والمدفوعات والتواصل بكل سهولة واحترافية، مع ضمان الأمان والشفافية في كل خطوة.
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">فريق العمل</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            يضم فريقنا نخبة من المطورين وخبراء العقارات وخدمة العملاء، يعملون معًا لتقديم أفضل الحلول الرقمية وتوفير دعم متواصل للمستخدمين.
          </p>
          <div className="mt-10 text-center text-white font-bold text-2xl">
            <span className="text-orange-600 font-bold">LeaseMate</span> - مستقبل الإيجار الذكي يبدأ من هنا.
          </div>
        </div>
      </main>
    </div>
  );
} 