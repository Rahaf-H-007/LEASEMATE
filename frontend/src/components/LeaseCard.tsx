import React from 'react';

interface LeaseCardProps {
  lease: any;
  onView: (leaseId: string) => void;
  onDownload: (leaseId: string) => void;
  onAccept?: (leaseId: string) => void;
  onReject?: (leaseId: string) => void;
  userRole?: string;
}

const LeaseCard: React.FC<LeaseCardProps> = ({
  lease,
  onView,
  onDownload,
  onAccept,
  onReject,
  userRole
}) => {
  const getStatusBadge = (status: string, endDate?: string) => {
    const now = new Date();
    let statusText = "";
    let badgeClass = "";
    
    if (status === "rejected") {
      statusText = "مرفوض";
      badgeClass = "bg-red-100 text-red-800 border-red-200";
    } else if (status === "pending") {
      statusText = "قيد الانتظار";
      badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
    } else if (endDate && new Date(endDate) < now) {
      statusText = "منتهي";
      badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
    } else if (status === "active") {
      statusText = "نشط";
      badgeClass = "bg-green-100 text-green-800 border-green-200";
    } else {
      statusText = status || "-";
      badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${badgeClass}`}>
        {statusText}
      </span>
    );
  };

  // حساب عدد الشهور بين البداية والنهاية
  let months = 1;
  if (lease.startDate && lease.endDate) {
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months < 1) months = 1;
  }
  const totalAmount = lease.rentAmount && months ? lease.rentAmount * months : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* رأس البطاقة */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">{lease.unitId?.name}</h3>
          {getStatusBadge(lease.status, lease.endDate)}
        </div>
        <p className="text-blue-100 text-sm mt-1">
          رقم العقد: {lease._id.slice(-8)}
        </p>
      </div>
      
      {/* محتوى البطاقة */}
      <div className="p-6">
        {/* معلومات الطرفين */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">المالك:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {lease.landlordId?.name}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">المستأجر:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {lease.tenantId?.name}
            </span>
          </div>
        </div>
        
        {/* التواريخ */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">تاريخ البداية:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {lease.startDate ? new Date(lease.startDate).toLocaleDateString("ar-EG") : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">تاريخ النهاية:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {lease.endDate ? new Date(lease.endDate).toLocaleDateString("ar-EG") : "-"}
            </span>
          </div>
        </div>
        
        {/* المبالغ */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">الإيجار الشهري:</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">
              {lease.rentAmount?.toLocaleString()} جنيه
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">التأمين:</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">
              {lease.depositAmount?.toLocaleString()} جنيه
            </span>
          </div>
          <div className="border-t border-orange-200 dark:border-orange-700 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm">المبلغ الإجمالي:</span>
              <span className="font-bold text-lg text-orange-700 dark:text-orange-300">
                {totalAmount.toLocaleString()} جنيه
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              مدة العقد: {months} شهر
            </p>
          </div>
        </div>
        
        {/* الأزرار */}
        <div className="space-y-2">
          <button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            onClick={() => onView(lease._id)}
          >
            مراجعة العقد
          </button>
          
         
          
          {lease.status === "pending" && userRole === "tenant" && onAccept && onReject && (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                onClick={() => onAccept(lease._id)}
              >
                قبول العقد
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                onClick={() => onReject(lease._id)}
              >
                رفض العقد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaseCard; 