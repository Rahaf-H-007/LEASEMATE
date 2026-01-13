'use client';
import {  useStripeService } from '@/services/stripe';

import { useEffect } from 'react';
import SubscriptionPlanCard from '@/components/stripe/SubscriptionPlanCard';

const plans = [
  {
    planName: 'basic', // backend key
    displayName: 'أساسي', // Arabic display name
    planDescription: 'خطة أساسية: إضافة وحدة واحدة فقط شهريًا',
    priceLabel: '500 جنيه/شهر',
    unitLimit: 1,
  },
  {
    planName: 'standard',
    displayName: 'قياسي',
    planDescription: 'خطة قياسية: إضافة وحدتين فقط شهريًا',
    priceLabel: '900 جنيه/شهر',
    unitLimit: 2,
  },
  {
    planName: 'premium',
    displayName: 'مميز',
    planDescription: 'خطة مميزة: إضافة حتى 4 وحدات شهريًا',
    priceLabel: '1200 جنيه/شهر',
    unitLimit: 4,
  },
];

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 py-8 text-gray-900 dark:text-white pt-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <h1 className="text-3xl font-bold mb-8 text-center">اختر خطة الاشتراك الشهرية</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <SubscriptionPlanCard key={plan.planName} {...plan} />
          ))}
        </div>
      </div>
    </main>
  );
}
