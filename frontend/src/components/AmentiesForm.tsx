interface AmenitiesData {
  hasPool: boolean;
  hasAC: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasKitchenware: boolean;
  hasHeating: boolean;
}

interface AmenitiesFormProps {
  data: AmenitiesData;
  onChange: (data: AmenitiesData) => void;
  unitType?: string; // Add unit type to control pool visibility
}

export default function AmenitiesForm({ data, onChange, unitType }: AmenitiesFormProps) {
  const handleCheckboxChange = (field: string, checked: boolean) => {
    onChange({
      ...data,
      [field]: checked,
    });
  };

  const amenities = [
    { key: 'hasPool', label: 'حمام سباحة', icon: '🏊‍♂️', showOnlyForVilla: true },
    { key: 'hasAC', label: 'تكييف هواء', icon: '❄️', showOnlyForVilla: false },
    { key: 'hasTV', label: 'تلفزيون', icon: '📺', showOnlyForVilla: false },
    { key: 'hasWifi', label: 'واي فاي', icon: '📶', showOnlyForVilla: false },
    { key: 'hasKitchenware', label: 'أدوات مطبخ', icon: '🍽️', showOnlyForVilla: false },
    { key: 'hasHeating', label: 'تدفئة', icon: '🔥', showOnlyForVilla: false },
  ];

  // Filter amenities based on unit type
  const visibleAmenities = amenities.filter(amenity => 
    !amenity.showOnlyForVilla || unitType === 'villa'
  );

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <h3 className="text-xl font-bold mb-8 text-gray-900 font-cairo border-b border-gray-200 pb-4">
        المرافق والخدمات
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleAmenities.map((amenity) => (
          <label
            key={amenity.key}
            className="flex items-center space-x-4 space-x-reverse p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all duration-200 cursor-pointer bg-gray-50 hover:bg-orange-50 group"
          >
            <input
              className="w-5 h-5 rounded border-gray-300 text-orange-500 checked:bg-orange-500 checked:border-orange-500 focus:ring-orange-500 focus:ring-2"
              type="checkbox"
              checked={data[amenity.key as keyof AmenitiesData]}
              onChange={(e) => handleCheckboxChange(amenity.key, e.target.checked)}
              suppressHydrationWarning
            />
            <span className="text-2xl">{amenity.icon}</span>
            <span className="text-gray-900 font-bold text-sm font-cairo group-hover:text-orange-600 transition-colors">
              {amenity.label}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}