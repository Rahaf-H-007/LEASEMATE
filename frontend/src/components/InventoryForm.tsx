interface InventoryData {
  appliances: string;
  kitchenItems: string;
  homeEssentials: string;
}

interface InventoryFormProps {
  data: InventoryData;
  onChange: (data: InventoryData) => void;
}

export default function InventoryForm({ data, onChange }: InventoryFormProps) {
  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <section className="p-8 border border-gray-200 rounded-lg shadow-sm bg-white">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">
        مخزون العقار المفروش
      </h3>
      <p className="mb-6 text-gray-600">
        يمكن للمستأجرين التحقق من هذا المخزون وتأكيده عند الانتقال للسكن وعند
        المغادرة
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="font-medium text-gray-900" htmlFor="appliances">
            الأجهزة الكهربائية
          </label>
          <textarea
            className="form-textarea w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-200 min-h-32"
            id="appliances"
            placeholder="مثال: ثلاجة، فرن، مايكروويف، غسالة أطباق"
            rows={4}
            value={data.appliances}
            onChange={(e) => handleInputChange("appliances", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-gray-900" htmlFor="kitchen-items">
            أدوات المطبخ
          </label>
          <textarea
            className="form-textarea w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-200 min-h-32"
            id="kitchen-items"
            placeholder="مثال: أطباق، كؤوس، أدوات المائدة، أواني الطبخ"
            rows={4}
            value={data.kitchenItems}
            onChange={(e) => handleInputChange("kitchenItems", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label
            className="font-medium text-gray-900"
            htmlFor="home-essentials"
          >
            ضروريات المنزل
          </label>
          <textarea
            className="form-textarea w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-200 min-h-32"
            id="home-essentials"
            placeholder="مثال: أغطية السرير، المناشف، الستائر"
            rows={4}
            value={data.homeEssentials}
            onChange={(e) =>
              handleInputChange("homeEssentials", e.target.value)
            }
          />
        </div>
      </div>
    </section>
  );
}