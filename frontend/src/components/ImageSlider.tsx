import React, { useState } from "react";
// import { ChevronLeft, ChevronRight } from '@mui/icons-material'; // Uncomment if using MUI icons

interface ImageSliderProps {
  images: string[]; // expects Cloudinary URLs from props
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const goToPrev = () =>
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const goToNext = () =>
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  return (
    <div
      className="relative group rounded-2xl min-h-[320px] md:min-h-[480px] overflow-hidden flex flex-col justify-end bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 25%), url('${images[current]}')`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={goToNext}
          className="bg-white/90 hover:bg-white transition-all duration-200 rounded-full p-3 shadow-lg hover:shadow-xl"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={goToPrev}
          className="bg-white/90 hover:bg-white transition-all duration-200 rounded-full p-3 shadow-lg hover:shadow-xl"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div className="flex justify-center gap-2 p-5 z-10">
        {images.map((_, idx) => (
          <div
            key={idx}
            className={`size-2 rounded-full bg-[var(--eggshell)] ${
              current === idx ? "" : "opacity-50"
            }`}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlider;