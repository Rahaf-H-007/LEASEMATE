"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterSidebar, { FilterValues } from "../../components/FilterSidebar";
import SearchBar from "../../components/SearchBar";
import UnitCard from "../../components/UnitCard";
import PaginationControls from "../../components/PaginationControls";
import Navbar from "../../components/Navbar";

// Mock data for demonstration
const mockUnits = [
  {
    id: "1",
    title: "شقة مجددة في الحي التاريخي",
    price: 2000,
    size: 900,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCIvCDUhVJsOd0-278tE5y85XV_LavAtgilxjyT4PrqDanH4-ESj8O4q0spSY8ewRdmEX19apbF6Hq99JRY4_1xdr8WQMBfuK2gD_V8866TGiOHc1VcDWqTEEUXN00JxLgNXf7lTybIwzaycYWGjJnu-VIhZgVsrfMiODvCqOjGfcj41cxn60dboJgBtqMxT103YVwXXqA5obNw2fmNAROAJv96zWOvhiw0Ai39iKgKIc61qMWAi-832jbVptGg750OxUiQfWxL3Mjy",
    available: true,
    isVerified: true,
  },
  // Add more mock units as needed
];

export default function UnitsPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Controlled state for search and filters
  const [search, setSearch] = useState(params.get("search") || "");
  const [filters, setFilters] = useState({
    price: params.get("price") || "",
    type: params.get("type") || "",
    furnishing: params.get("furnishing") || "",
    amenities: params.getAll("amenities"),
    occupancy: params.get("occupancy") || "",
    verified: params.get("verified") === "true",
  });

  const totalPages = 5;
  const currentPage = Number(params.get("page")) || 1;
  const units = mockUnits; // Replace with fetched data

  // Update query params helper
  const updateQuery = (
    newParams: Record<string, string | number | boolean | string[] | undefined>
  ) => {
    const url = new URL(window.location.href);
    Object.entries(newParams).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        url.searchParams.delete(key);
      } else if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
    router.push(url.pathname + url.search);
  };

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    updateQuery({ search: e.target.value, page: 1 });
  };

  const handleFilterSubmit = (newFilters: FilterValues) => {
    setFilters(newFilters);
    updateQuery({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateQuery({ page });
  };

  return (
    <div dir="rtl" className="bg-[var(--eggshell)] min-h-screen flex flex-col">
      <Navbar />
      <div className="mt-28">
        <main className="grid grid-cols-12 flex-1">
          <aside className="col-span-12 md:col-span-3 border-r border-[var(--light-gray)] p-6">
            <FilterSidebar values={filters} onSubmit={handleFilterSubmit} />
          </aside>
          <section className="col-span-12 md:col-span-9 p-4 md:p-8">
            <div className="mb-6">
              <SearchBar value={search} onChange={handleSearchChange} />
            </div>
            <h2 className="text-[var(--dark-brown)] text-3xl font-bold leading-tight tracking-tight mb-6 text-right">
              عرض ٢٬٤٨٢ شقة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {units.map((unit) => (
                <UnitCard key={unit.id} {...unit} />
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
