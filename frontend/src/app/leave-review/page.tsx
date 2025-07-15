"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LeaveReviewPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const leaseId = searchParams.get("leaseId");
  const revieweeId = searchParams.get("revieweeId");

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Check if review already exists
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
            setErrorMessage("You have posted a review before.");
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

    if (!leaseId || !revieweeId || !token) {
      setErrorMessage("Missing required information.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
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
        throw new Error(data.message || "Failed to submit review.");
      }

      setSuccessMessage("Review submitted successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Error submitting review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-20 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Leave a Review
      </h1>

      {successMessage && (
        <div className="bg-green-100 text-green-800 p-3 mb-4 rounded">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 text-red-800 p-3 mb-4 rounded">
          {errorMessage}
        </div>
      )}

      {alreadyReviewed ? (
        <div className="text-center py-8 px-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 font-medium">
          You have already reviewed this user for this lease.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
              Rating
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full border-gray-300 dark:border-gray-600 rounded p-2"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Stars
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
              Comment (optional)
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 rounded p-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
}
