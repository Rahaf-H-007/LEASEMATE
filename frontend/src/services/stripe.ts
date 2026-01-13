'use client';
import { API_BASE_URL } from './api';
import { useAuth } from '@/contexts/AuthContext';

export const useStripeService = () => {
  const { token } = useAuth();

  const createConnectLink = async () => {
    const res = await fetch(`${API_BASE_URL}/stripe/connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.url;
  };

const createCheckoutSession = async (planName: string) => {
  // const token = localStorage.getItem('leasemate_token');

  const res = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planName }), // Send planName, not priceId
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Checkout session creation failed:", error);
    throw new Error(error.message || "Failed to create session");
  }

  const data = await res.json();
  return data.url;
};


  const refundSubscription = async () => {
    const res = await fetch(`${API_BASE_URL}/stripe/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  };

  return {
    createConnectLink,
    createCheckoutSession,
    refundSubscription,
  };
};
