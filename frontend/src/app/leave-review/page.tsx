"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Star, StarIcon } from "lucide-react";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function LeaveReviewPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const leaseId = searchParams.get("leaseId");
  const revieweeId = searchParams.get("revieweeId");

  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    const checkExistingReview = async () => {
      if (leaseId && revieweeId && token) {
        try {
          const res = await fetch(
            `http://localhost:5000/api/reviews/check/${leaseId}/${revieweeId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await res.json();

          if (data.exists) {
            setAlreadyReviewed(true);
            setErrorMessage("لقد قمت بنشر مراجعة من قبل.");
          }
        } catch (error) {
          console.error("Error checking review existence:", error);
        }
      }
    };

    checkExistingReview();
  }, [leaseId, revieweeId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setRatingError(null);
    setCommentError(null);
    setErrorMessage(null);

    // Validate rating is required
    if (!rating) {
      setRatingError("برجاء ادخال تقييمك");
      return;
    }

    // Validate comment is required
    if (!comment.trim()) {
      setCommentError("برجاء كتابة تعليقك");
      return;
    }

    if (!leaseId || !revieweeId || !token) {
      setErrorMessage("معلومات غير مكتملة.");
      return;
    }

    setLoading(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("http://localhost:5000/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaseId,
          revieweeId,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "فشل إرسال المراجعة.");
      }

      setSuccessMessage("تم إرسال المراجعة بنجاح!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "حدث خطأ أثناء إرسال المراجعة.");
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
    setRatingError(null); // Clear error when user selects a rating
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (e.target.value.trim()) {
      setCommentError(null); // Clear error when user starts typing
    }
  };

  return (
    <ProtectedRoute>
       <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="pt-24 px-4">
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-10">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white text-center">
            اترك مراجعة
          </h1>

          {successMessage && (
            <div className="bg-green-100 text-green-800 p-3 mb-4 rounded text-center">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 text-red-800 p-3 mb-4 rounded text-center">
              {errorMessage}
            </div>
          )}

          {alreadyReviewed ? (
            <div className="text-center py-8 px-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 font-medium">
              لقد قمت بالفعل بمراجعة هذا المستخدم لهذا العقد.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center">
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                  التقييم 
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled =
                      hoverRating !== null
                        ? star <= hoverRating
                        : (rating !== null && star <= rating);

                    const Icon = isFilled ? StarIcon : Star;

                    return (
                      <Icon
                        key={star}
                        size={40}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className={`cursor-pointer transition-colors ${
                          isFilled
                            ? "text-orange-500 dark:text-orange-400 fill-current"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    );
                  })}
                </div>
                {ratingError && (
                  <p className="text-red-500 text-sm mt-2">{ratingError}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  تعليق 
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={handleCommentChange}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  placeholder="اكتب تعليقك هنا..."
                />
                {commentError && (
                  <p className="text-red-500 text-sm mt-2">{commentError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded transition"
              >
                {loading ? "جاري الإرسال..." : "إرسال المراجعة"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
