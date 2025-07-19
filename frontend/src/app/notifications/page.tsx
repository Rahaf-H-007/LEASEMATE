"use client";

import { useState } from "react";
// import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CheckCheck, Check } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useAuth } from "@/contexts/AuthContext";

export default function NotificationsPage() {
  // const { t, language } = useLanguage();
  const router = useRouter();
  const { notifications, markAllAsRead, markSingleAsRead } = useNotifications();
  const [filter, setFilter] = useState("ALL");
  const { user, token } = useAuth();

  const filteredNotifications =
    filter === "ALL"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markSingleAsRead(notification._id);
    }

    let targetLink = notification.link;

    if (
      notification.type === "LEASE_EXPIRED" &&
      notification.leaseId
    ) {
      // Determine who the current user wants to review
      let revieweeId = null;

      if (user?.role === "tenant") {
        revieweeId = notification.landlordId;
      } else if (user?.role === "landlord") {
        revieweeId = notification.tenantId;
      }

      if (revieweeId) {
        try {
          const res = await fetch(
            `http://localhost:5000/api/reviews/check/${notification.leaseId}/${revieweeId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await res.json();

          if (data.exists) {
            return;
          } else {
            targetLink = `/leave-review?leaseId=${notification.leaseId}&revieweeId=${revieweeId}`;
          }
        } catch (error) {
          console.error("Error checking review existence:", error);
          alert("Error checking review existence.");
          return;
        }
      }
    }

    if (targetLink) {
      router.push(targetLink);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />

      <main className="pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {"الإشعارات"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {"ابق على اطلاع بالتنبيهات والتذكيرات الهامة."}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {"تصفية حسب:"}
              </span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-3 pr-8 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              >
                <option value="ALL">{"الكل"}</option>
                {/* <option value="MAINTENANCE_UPDATE">
                  {"الصيانة"}
                </option> */}
                <option value="LEASE_EXPIRED">
                  {"العقود"}
                </option>
                {/* <option value="GENERAL">
                  {t("notifications.general")}
                </option> */}
              </select>
            </div>

            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition"
            >
              {"تحديد الكل كمقروء"}
            </button>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <p className="text-gray-700 dark:text-gray-300">
                {"لا توجد إشعارات."}
              </p>
            ) : (
              filteredNotifications.map((notification, index) => (
                <div
                  key={index}
                  className={`relative rounded-xl p-4 pb-10 shadow border transition-all bg-white dark:bg-gray-800 cursor-pointer ${
                    notification.isRead
                      ? "opacity-80 border-gray-200 dark:border-gray-700"
                      : "border-orange-300"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {notification.message}
                      </p>
                      {/* {notification.senderId?.name && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t("notifications.from")} {notification.senderId.name}
                        </p>
                      )} */}
                    </div>
                  </div>

                  {/* Date */}
                  <span
                    className="absolute top-3 left-4 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>

                  {/* Check icon */}
                  <div
                    className="absolute bottom-3 left-4"
                  >
                    {notification.isRead ? (
                      <span
                        className="text-green-500 dark:text-green-400"
                        title={"تحديد كمقروء"}
                      >
                        <Check size={20} />
                      </span>
                    ) : (
                      <CheckCheck
                        size={20}
                        className="text-orange-500 hover:text-orange-600 dark:hover:text-orange-400"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
