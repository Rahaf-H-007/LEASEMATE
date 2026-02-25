"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SuccessPage() {
  const router = useRouter();
  const { socket, user, token, refreshUser } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [status, setStatus] = useState<"waiting" | "redirecting" | "error">(
    "waiting",
  );
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [buttonWarning, setButtonWarning] = useState("");

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    let pollingInterval: NodeJS.Timeout;
    let redirectTimeout: NodeJS.Timeout;

    const redirectToAddUnit = () => {
      setStatus("redirecting");
      router.replace("/unit/add");
    };

    // If already subscribed, redirect immediately
    if (user?.isSubscribed) {
      console.log("[Initial Check] User already subscribed");
      setButtonDisabled(false);
      redirectToAddUnit();
      return;
    }

    // WebSocket listener
    if (socket && user?._id) {
      console.log("[Socket] Listening for subscriptionUpdated event...");
      const handleSub = (data: { isSubscribed: boolean }) => {
        console.log("[Socket] Received subscriptionUpdated:", data);
        if (data.isSubscribed) {
          setButtonDisabled(false);
          clearInterval(countdownInterval);
          clearInterval(pollingInterval);
          clearTimeout(redirectTimeout);
          redirectToAddUnit();
        }
      };
      socket.on("subscriptionUpdated", handleSub);

      // Clean up
      return () => {
        socket.off("subscriptionUpdated", handleSub);
      };
    } else {
      console.log(
        "[Socket] Not available - socket:",
        !!socket,
        "userId:",
        user?._id,
      );
    }

    // Start countdown
    countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll user data every 3s
    pollingInterval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/me", {
          cache: "no-store",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(
          `[Polling] Status: ${res.status}, isSubscribed: ${(await res.json())?.isSubscribed}`,
        );
        if (res.ok) {
          const freshUser = await res.json();
          console.log("[Polling] User data:", freshUser);
          if (freshUser?.isSubscribed) {
            console.log("[SUCCESS] User subscribed, redirecting...");
            setButtonDisabled(false);
            clearInterval(countdownInterval);
            clearInterval(pollingInterval);
            clearTimeout(redirectTimeout);
            redirectToAddUnit();
          }
        } else {
          console.error(`[Polling] Request failed with status ${res.status}`);
        }
      } catch (err) {
        console.error("[Polling] Error:", err);
      }
    }, 3000);

    // Timeout fallback (15s): stop trying, show error
    redirectTimeout = setTimeout(() => {
      clearInterval(pollingInterval);
      clearInterval(countdownInterval);
      setStatus("error");
      setButtonDisabled(true);
    }, 15000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(pollingInterval);
      clearTimeout(redirectTimeout);
    };
  }, [socket, user, router]);

  const handleManualRedirect = () => {
    if (user?.isSubscribed) {
      router.replace("/unit/add");
    } else {
      setButtonWarning(
        "يرجى الانتظار حتى يتم تفعيل الاشتراك قبل إضافة وحدة جديدة.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 backdrop-blur-sm">
          {status === "waiting" && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
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
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                تم الاشتراك بنجاح!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                سيتم تحويلك تلقائياً لإضافة وحدة جديدة خلال ثواني...
              </p>
              <div className="flex justify-center mb-6">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                جاري التحقق من تفعيل الاشتراك...
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
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
              </div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                حدث تأخير في تفعيل الاشتراك
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                تم الدفع بنجاح، ولكن لم يتم تفعيل الاشتراك بعد. من فضلك انتظر
                دقيقة إضافية ثم حاول مجددًا.
              </p>
              <button
                onClick={() => router.replace("/dashboard")}
                className="w-full bg-gray-500 dark:bg-gray-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                العودة إلى لوحة التحكم
              </button>
            </>
          )}

          {status === "redirecting" && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                جاري التحويل...
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                سيتم تحويلك الآن لإضافة وحدة جديدة
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
