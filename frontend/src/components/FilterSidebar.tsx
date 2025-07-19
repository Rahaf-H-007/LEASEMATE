"use client";
import React, { useState } from "react";

export type FilterValues = {
  price: string;
  type: string;
  furnishing: string;
  amenities: string[];
  verified: boolean;
};

interface FilterSidebarProps {
  values: FilterValues;
  onSubmit: (filters: FilterValues) => void;
}

const amenityOptions = [
  { value: "hasAC", label: "تكييف" },
  { value: "hasWifi", label: "إنترنت" },
  { value: "hasTV", label: "تلفزيون" },
  { value: "hasKitchenware", label: "أدوات مطبخ" },
  { value: "hasHeating", label: "تدفئة" },
  { value: "hasPool", label: "مسبح" },
  { value: "isFurnished", label: "مفروش" },
];

const FilterSidebar: React.FC<FilterSidebarProps> = ({ values, onSubmit }) => {
  const [local, setLocal] = useState<FilterValues>(values);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox" && name === "verified") {
      const checked = (e.target as HTMLInputElement).checked;
      setLocal((prev) => ({ ...prev, verified: checked }));
    } else if (type === "checkbox" && name.startsWith("amenity-")) {
      const amenity = value;
      setLocal((prev) => {
        const exists = prev.amenities.includes(amenity);
        return {
          ...prev,
          amenities: exists
            ? prev.amenities.filter((a) => a !== amenity)
            : [...prev.amenities, amenity],
        };
      });
    } else {
      setLocal((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(local);
  };

  return (
    <form dir="rtl" className="space-y-6" onSubmit={handleSubmit}>
      <h2 className="text-[var(--dark-brown)] text-2xl font-bold leading-tight tracking-tight mb-6 text-right">
        الفلاتر
      </h2>
      <div>
        <label
          className="text-[var(--dark-brown)] text-base font-medium"
          htmlFor="price-range"
        >
          نطاق السعر
        </label>
        <div className="relative pt-3">
          <div className="relative">
            <div className="w-full h-3 bg-gray-300 rounded-lg shadow-inner">
              <div
                className="h-full bg-[var(--terracotta)] rounded-lg transition-all duration-200"
                style={{
                  width: `${
                    (((Number(local.price) || 800) - 800) / (6000 - 800)) * 100
                  }%`,
                }}
              ></div>
            </div>
            <input
              className="absolute top-0 w-full h-3 bg-transparent appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)] focus:ring-opacity-50 rounded-lg"
              id="price-range"
              name="price"
              max={6000}
              min={800}
              type="range"
              value={local.price || 800}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-between text-sm text-[var(--light-brown)] mt-2">
            <span>800</span>
            <span>6000+ جنيه</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-[var(--dark-brown)] font-medium bg-gray-100 px-2 py-1 rounded">
              {local.price || 800} جنيه
            </span>
          </div>
        </div>
      </div>
      <div>
        <label
          className="text-[var(--dark-brown)] text-base font-medium"
          htmlFor="apartment-type"
        >
          نوع الشقة
        </label>
        <select
          className="form-select mt-2 w-full rounded-lg text-[var(--dark-brown)] dark:text-white border border-[var(--light-gray)] bg-[var(--eggshell)] dark:bg-gray-800 h-12 px-4 text-base font-normal"
          id="apartment-type"
          name="type"
          value={local.type}
          onChange={handleChange}
        >
          <option value="">أي</option>
          <option value="apartment">شقة</option>
          <option value="villa">فيلا</option>
        </select>
      </div>
      <div>
        <label
          className="text-[var(--dark-brown)] text-base font-medium"
          htmlFor="furnishing-status"
        >
          حالة التأثيث
        </label>
        <select
          className="form-select mt-2 w-full rounded-lg text-[var(--dark-brown)] dark:text-white border border-[var(--light-gray)] bg-[var(--eggshell)] dark:bg-gray-800 h-12 px-4 text-base font-normal"
          id="furnishing-status"
          name="furnishing"
          value={local.furnishing}
          onChange={handleChange}
        >
          <option value="">أي</option>
          <option value="true">مفروش</option>
          <option value="false">غير مفروش</option>
        </select>
      </div>
      <div>
        <h3 className="text-[var(--dark-brown)] text-base font-medium">
          المرافق
        </h3>
        <div className="mt-2 space-y-2">
          {amenityOptions.map((a) => (
            <label key={a.value} className="flex items-center gap-x-3">
              <input
                className="h-5 w-5 rounded border-[var(--light-gray)] border-2 bg-transparent text-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]"
                type="checkbox"
                name={`amenity-${a.value}`}
                value={a.value}
                checked={local.amenities.includes(a.value)}
                onChange={handleChange}
              />
              <span className="text-[var(--dark-brown)] text-base font-normal">
                {a.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <label
          className="text-[var(--dark-brown)] text-base font-medium"
          htmlFor="verified-only"
        >
          موثوق فقط
        </label>
        <label className="relative inline-flex h-8 w-14 cursor-pointer items-center">
          <input
            className="sr-only peer"
            id="verified-only"
            name="verified"
            type="checkbox"
            checked={local.verified}
            onChange={handleChange}
          />
          <div className="w-full h-full bg-gray-300 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-orange-400 peer-checked:to-orange-600 transition-all duration-300 shadow-inner"></div>
          <div className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-6 shadow-lg border border-gray-200 peer-checked:border-orange-200"></div>
        </label>
      </div>
      <div className="pt-6 border-t border-gray-200">
        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          تطبيق الفلاتر
        </button>
      </div>
    </form>
  );
};

export default FilterSidebar;