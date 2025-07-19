import React from "react";
// import { Bed, Bathtub, SquareFoot, DirectionsCar, LocalLaundryService, Balcony } from '@mui/icons-material';

interface Amenity {
  icon: string; // Icon name, e.g., 'Bed', 'Bathtub', etc.
  label: string;
}

interface AmenitiesSectionProps {
  amenities: Amenity[];
}

const iconMap: Record<string, React.ReactNode> = {
  Check: (
    <svg
      className="w-6 h-6 text-green-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Bed: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M4 7a1 1 0 011-1h10a1 1 0 011 1v2a3 3 0 01-3 3H7a3 3 0 01-3-3V7zM2 11a1 1 0 011-1h14a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z" />
    </svg>
  ),
  Bathtub: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M3 12a2 2 0 012-2h10a2 2 0 012 2v1a4 4 0 01-4 4H7a4 4 0 01-4-4v-1zM2 8a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
    </svg>
  ),
  SquareFoot: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  DirectionsCar: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M4 4a2 2 0 00-2 2v1a1 1 0 001 1h14a1 1 0 001-1V6a2 2 0 00-2-2H4zM2 10a1 1 0 011-1h14a1 1 0 011 1v3a2 2 0 01-2 2h-1a2 2 0 01-2-2v-1H7v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-3z" />
    </svg>
  ),
  LocalLaundryService: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h4a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Balcony: (
    <svg
      className="w-6 h-6 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM6 8a1 1 0 000 2h8a1 1 0 100-2H6z" />
    </svg>
  ),
};

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ amenities }) => (
  <>
    
    <div className="grid grid-cols-2 gap-4 mt-4 text-lg bg-white dark:bg-gray-900 p-4 rounded-xl">
    <h2 className="text-2xl font-bold leading-tight tracking-[-0.015em] text-right text-gray-900 dark:text-white">
      المرافق
    </h2>
      {amenities.map((amenity, idx) => (
        <div key={idx} className="flex items-center gap-3 text-right">
          {iconMap[amenity.icon] || (
            <svg
              className="w-6 h-6 text-orange-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="text-gray-900 dark:text-white">{amenity.label}</span>
        </div>
      ))}
    </div>
  </>
);

export default AmenitiesSection;