import React, { useState } from 'react';
import { useStripeService } from '@/services/stripe';

interface SubscriptionPlanCardProps {
  planName: string; // backend key
  displayName: string; // Arabic for display
  planDescription: string;
  priceLabel: string;
  unitLimit: number;
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({ planName, displayName, planDescription, priceLabel, unitLimit }) => {
  const { createCheckoutSession } = useStripeService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckoutSession(planName); // always send backend key
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء بدء الدفع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center w-full max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{displayName}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">{planDescription}</p>
      <div className="text-2xl font-semibold text-orange-500 mb-2">{priceLabel}</div>
      <div className="mb-4 text-gray-700 dark:text-gray-200">عدد الوحدات المسموح بها: <span className="font-bold">{unitLimit}</span></div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="px-6 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-60 w-full"
      >
        {loading ? 'جاري التحويل...' : 'اشترك الآن'}
      </button>
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    </div>
  );
};

export default SubscriptionPlanCard;
