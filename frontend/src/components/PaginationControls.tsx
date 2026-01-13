import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav
      aria-label="Pagination"
      className="flex justify-center mt-12"
      dir="rtl"
    >
      <ul className="flex items-center -space-x-px h-10 text-base">
        <li>
          <button
            className="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-[var(--dark-brown)] bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-[var(--terracotta)]"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-label="السابق"
            disabled={currentPage === 1}
          >
            <svg
              aria-hidden="true"
              className="w-3 h-3 rtl:rotate-180"
              fill="none"
              viewBox="0 0 6 10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 1 1 5l4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </button>
        </li>
        {pages.map((page) => (
          <li key={page}>
            <button
              className={`flex items-center justify-center px-4 h-10 leading-tight font-semibold transition-all duration-200 ${
                page === currentPage
                  ? "text-white bg-orange-500 border border-orange-500 shadow-lg transform scale-105"
                  : "text-gray-700 bg-white border border-gray-300 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
              }`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          </li>
        ))}
        <li>
          <button
            className="flex items-center justify-center px-4 h-10 leading-tight text-[var(--dark-brown)] bg-white border border-s-0 border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-[var(--terracotta)]"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-label="التالي"
            disabled={currentPage === totalPages}
          >
            <svg
              aria-hidden="true"
              className="w-3 h-3 rtl:rotate-180"
              fill="none"
              viewBox="0 0 6 10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m1 9 4-4-4-4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default PaginationControls;