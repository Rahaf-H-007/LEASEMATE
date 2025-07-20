import React from "react";
// import { Star } from '@mui/icons-material'; // Uncomment if using MUI icons

interface UnitDetailsProps {
  title: string;
  // rating: number;
  reviews: number;
  location: string;
  description: string;
}

const UnitDetails: React.FC<UnitDetailsProps> = ({
  title,
  // rating,
  reviews,
  location,
  description,
}) => (
  <div className="flex flex-col gap-2 bg-white dark:bg-gray-900 p-4 rounded-xl">
    <h1 className="text-4xl font-bold leading-tight text-right text-gray-900 dark:text-white tracking-tight">
      {title}
    </h1>
    <p className="text-base font-normal leading-normal mt-2 flex items-center gap-1 text-right text-gray-700 dark:text-gray-200">
      {/* <svg
        className="w-5 h-5 text-yellow-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg> */}
      <span className="text-gray-700 dark:text-gray-200">{location}</span>
    </p>
    <p className="text-lg font-normal leading-relaxed mt-6 text-right text-gray-900 dark:text-white">
      {description}
    </p>
  </div>
);

export default UnitDetails;