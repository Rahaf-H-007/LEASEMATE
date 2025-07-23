"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UnitCardProps {
  id: string;
  title: string;
  price: number;
  location: string;
  address: string;
  imageUrl: string;
  available: boolean;
  isVerified: boolean;
}

const UnitCard: React.FC<UnitCardProps> = ({
  id,
  title,
  price,
  location,
  address,
  imageUrl,
  available,
  isVerified,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Link
      href={`/unit/${id}`}
      className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group"
      dir="rtl"
    >
      <div className="relative">
        <Image
          alt={title}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
          src={imageUrl}
          width={400}
          height={256}
        />
        {isVerified && (
          <div className="absolute top-3 right-3 bg-green-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
            موثوق
          </div>
        )}
        {/* {!available && (
        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
          غير متاح
        </div>
      )} */}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-black mb-2 text-right">
          {title}
        </h3>
        <div className="text-gray-600 dark:text-black text-sm mb-4 text-right space-y-1">
          <p className="font-medium">{location}</p>
          {address && <p className="text-xs opacity-80">{address}</p>}
        </div>
        <div className="flex justify-between items-center mb-4">
          <span
            className={`font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap ${
              price >= 10000 ? "text-[1.3rem]" : "text-2xl"
            }`}
          >
            {price.toLocaleString()} جنيه/شهر
          </span>
          <span
            className={`rounded-full text-sm font-medium whitespace-nowrap ${
              available
                ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-3 py-1"
                : "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 px-4 py-1"
            }`}
          >
            {available ? "متوفر" : "غير متوفر"}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            if (user?.role === "landlord") {
              router.push(`/unit/${id}/manage`);
            } else {
              router.push(`/unit/${id}`);
            }
          }}
          className="w-full bg-orange-500 dark:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors"
        >
          عرض التفاصيل
        </button>
      </div>
    </Link>
  );
};

export default UnitCard;
