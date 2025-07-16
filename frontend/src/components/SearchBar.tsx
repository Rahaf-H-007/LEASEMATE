import React from "react";

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => (
  <div className="w-full" dir="rtl">
    <div className="relative flex items-center">
      <div className="absolute right-4 z-10 text-[var(--light-brown)] pointer-events-none">
        <svg
          fill="currentColor"
          height="20px"
          viewBox="0 0 256 256"
          width="20px"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-60"
        >
          <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
        </svg>
      </div>
      <input
        className="w-full h-14 pr-12 pl-6 text-[var(--dark-brown)] bg-white border-2 border-gray-200 rounded-2xl shadow-lg focus:outline-none focus:border-[var(--terracotta)] focus:ring-4 focus:ring-[var(--terracotta)]/20 placeholder:text-[var(--light-brown)] text-base font-normal transition-all duration-300 hover:shadow-xl hover:border-gray-300"
        placeholder="ابحث بالمدينة أو الحي أو العنوان"
        value={value}
        onChange={onChange}
      />
      {value && (
        <button
          onClick={() =>
            onChange({
              target: { value: "" },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          className="absolute left-4 z-10 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          type="button"
          aria-label="مسح البحث"
        >
          <svg
            fill="none"
            height="18px"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="18px"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      )}
    </div>
  </div>
);

export default SearchBar;
