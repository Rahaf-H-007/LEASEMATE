import React from "react";
import Link from "next/link";
import Image from "next/image";

interface UnitCardProps {
  id: string;
  title: string;
  price: number;
  size: number;
  imageUrl: string;
  available: boolean;
  isVerified: boolean;
}

const UnitCard: React.FC<UnitCardProps> = ({
  id,
  title,
  price,
  size,
  imageUrl,
  available,
  isVerified,
}) => (
  <Link
    href={`/units/${id}`}
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
        <div className="absolute top-3 right-3 bg-[var(--olive)] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
          موثوق
        </div>
      )}
      {!available && (
        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
          غير متاح
        </div>
      )}
    </div>
    <div className="p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-right">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 text-right">
        {size} قدم²
      </p>
      <div className="flex justify-between items-center mb-4">
        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {price.toLocaleString()} جنيه/شهر
        </span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            available
              ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100"
              : "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100"
          }`}
        >
          {available ? "متوفر" : "غير متوفر"}
        </span>
      </div>
      <button className="w-full bg-orange-500 dark:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
        عرض التفاصيل
      </button>
    </div>
  </Link>
);

export default UnitCard;
