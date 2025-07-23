"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterSidebar, { FilterValues } from "../../components/FilterSidebar";
import UnitCard from "../../components/UnitCard";
import PaginationControls from "../../components/PaginationControls";
import Navbar from "../../components/Navbar";
import { apiService, Unit } from "../../services/api";

export default function UnitsPage() {
  const router = useRouter();
  const params = useSearchParams();

  // State for units data
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAvailableUnits, setTotalAvailableUnits] = useState(0);

  // Function to format unit count in Arabic
  const formatUnitCount = (count: number) => {
    if (count === 0) {
      return "لا توجد وحدات متاحة";
    } else if (count > 1 && count <= 10) {
      return `${count} وحدات متاحة`;
    } else {
      return `${count} وحدة متاحة`;
    }
  };

  // Location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isLocationInitialized, setIsLocationInitialized] = useState(false);

  // Controlled state for filters
  const [filters, setFilters] = useState({
    price: params.get("price") || "",
    type: params.get("type") || "",
    furnishing: params.get("furnishing") || "",
    amenities: params.getAll("amenities"),
    governorate: params.get("governorate") || "",
  });

  const currentPage = Number(params.get("page")) || 1;

  // Get user location function
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);
        setLocationLoading(false);
        setIsLocationInitialized(true);

        // Save location to sessionStorage for persistence across navigation
        sessionStorage.setItem("userLocation", JSON.stringify(location));
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
        setIsLocationInitialized(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Get user location on component mount
  useEffect(() => {
    // Check if we already have location in sessionStorage (for persistence across navigation)
    const savedLocation = sessionStorage.getItem("userLocation");
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
        setIsLocationInitialized(true);
      } catch {
        getUserLocation();
      }
    } else {
      getUserLocation();
    }
  }, []);

  // Fetch units on component mount and when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch until location is initialized (either found or failed)
      if (!isLocationInitialized) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Prepare API parameters
        const apiParams: {
          page?: number;
          limit?: number;
          search?: string;
          minPrice?: number;
          maxPrice?: number;
          type?: string;
          lat?: number;
          lng?: number;
          radius?: number;
          governorate?: string;
          hasAC?: boolean;
          hasWifi?: boolean;
          hasTV?: boolean;
          hasKitchenware?: boolean;
          hasHeating?: boolean;
          hasPool?: boolean;
          isFurnished?: boolean;
        } = {
          page: currentPage,
          limit: 9, // Show 9 units per page to match the 3x3 grid
        };

        // Map filters to API parameters
        if (filters.price) {
          // Use the price as a maximum price filter
          apiParams.maxPrice = Number(filters.price);
        }

        if (filters.type) apiParams.type = filters.type;

        if (filters.governorate) apiParams.governorate = filters.governorate;

        // Add furnishing filter from dropdown
        if (filters.furnishing === "true") {
          apiParams.isFurnished = true;
        } else if (filters.furnishing === "false") {
          apiParams.isFurnished = false;
        }

        // Add amenity filters (convert to boolean for API service)
        if (filters.amenities.includes("hasAC")) apiParams.hasAC = true;
        if (filters.amenities.includes("hasWifi")) apiParams.hasWifi = true;
        if (filters.amenities.includes("hasTV")) apiParams.hasTV = true;
        if (filters.amenities.includes("hasKitchenware"))
          apiParams.hasKitchenware = true;
        if (filters.amenities.includes("hasHeating"))
          apiParams.hasHeating = true;
        if (filters.amenities.includes("hasPool")) apiParams.hasPool = true;

        // Add location parameters if user location is available (no search restriction needed anymore)
        if (userLocation) {
          apiParams.lat = userLocation.lat;
          apiParams.lng = userLocation.lng;
          apiParams.radius = 10000; // 10km radius in meters
        }

        const response = await apiService.getUnits(undefined, apiParams);

        // Extract units and pagination from response
        const unitsArray = response.data.units || [];
        const pagination = response.data.pagination;

        setUnits(unitsArray);
        setTotalPages(pagination?.totalPages || 1);
        setTotalAvailableUnits(pagination?.totalAvailableUnits || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch units");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    currentPage,
    filters.price,
    filters.type,
    filters.furnishing,
    filters.governorate,
    filters.amenities,
    userLocation,
    isLocationInitialized,
  ]);

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
  const handleFilterSubmit = (newFilters: FilterValues) => {
    setFilters(newFilters);
    updateQuery({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateQuery({ page });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white pt-14">
      <Navbar />
      <div className="mt-4 pt-8">
        <main className="grid grid-cols-12 flex-1">
          <aside className="col-span-12 md:col-span-3 border-r border-[var(--light-gray)] p-6">
            <FilterSidebar values={filters} onSubmit={handleFilterSubmit} />
          </aside>
          <section className="col-span-12 md:col-span-9 p-4 md:p-8">
            {/* Location Status */}
            <div className="mb-4 p-3 rounded-lg bg-white shadow-sm border">
              {locationLoading && (
                <div className="flex items-center text-amber-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                  جاري تحديد موقعك...
                </div>
              )}
              {userLocation && !locationLoading && (
                <div className="flex items-center text-green-600">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  يتم عرض الوحدات القريبة أولاً، ثم باقي الوحدات
                </div>
              )}
              {locationError && !locationLoading && (
                <div className="flex items-center text-amber-600">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  لم يتم تحديد الموقع - يتم عرض جميع الوحدات
                  <button
                    onClick={() => {
                      // Clear saved location and try again
                      sessionStorage.removeItem("userLocation");
                      setUserLocation(null);
                      setIsLocationInitialized(false);
                      getUserLocation();
                    }}
                    className="mr-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>

            <h2
              className="text-[var(--dark-brown)] text-3xl font-bold leading-tight tracking-tight mb-6 text-right"
              data-units-header
            >
              {loading
                ? "جاري التحميل..."
                : totalAvailableUnits === 0
                ? formatUnitCount(totalAvailableUnits)
                : `عرض ${formatUnitCount(totalAvailableUnits)}`}
            </h2>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(9)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse"
                  >
                    <div className="h-48 bg-gray-300"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Units Grid */}
            {!loading && !error && (
              <>
                {units.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد وحدات متاحة حالياً
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {units
                      .filter((unit) => unit.status === "available") // Only show available units
                      .map((unit) => {
                        const isOwnerVerified = true;

                        return (
                          <UnitCard
                            key={unit._id}
                            id={unit._id}
                            title={unit.name || "اسم غير متوفر"}
                            price={unit.pricePerMonth || 0}
                            location={unit.governorate || "الموقع غير محدد"}
                            address={unit.address || ""}
                            imageUrl={
                              unit.images && unit.images.length > 0
                                ? unit.images[0]
                                : "/placeholder-image.jpg"
                            }
                            available={true} // All displayed units are available
                            isVerified={isOwnerVerified}
                          />
                        );
                      })}
                  </div>
                )}

                {/* Pagination - only show if there are units and multiple pages */}
                {units.length > 0 && totalPages > 1 && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
