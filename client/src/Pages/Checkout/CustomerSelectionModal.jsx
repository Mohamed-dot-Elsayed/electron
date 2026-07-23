import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const CustomerSelectionModal = ({
  isOpen,
  onClose,
  onSelectCustomer,
  searchQuery,
  setSearchQuery,
  customers,
  loading,
  requiredTotal,
}) => {
  if (!isOpen) return null;

  // عرض معلومات المديونية الحالية فقط (بدون حد ائتماني لأنه مش موجود في الـ API)
  const handleCustomerClick = (customer) => {
    // إما نسمح بالاختيار دائمًا، أو نعرض تحذير ودي
    if (customer.amount_Due > 0) {
      toast.info(
        `العميل مدين حاليًا بـ ${(customer.amount_Due ?? 0).toFixed(2)} ج.م`
      );
    }

    onSelectCustomer(customer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-[95%] max-w-md bg-white p-6 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto mx-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-light"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center text-purple-600">
          اختر العميل للطلب الآجل
        </h2>

        <p className="text-center text-sm mb-4 text-gray-700">
          إجمالي الطلب: <strong>{(requiredTotal ?? 0).toFixed(2)} ج.م</strong>
        </p>

        {/* حقل البحث */}
        <Input
          placeholder="ابحث بالاسم أو رقم التليفون..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {loading && (
          <p className="text-center text-sm text-gray-500 my-4">جاري البحث...</p>
        )}

        {/* قائمة العملاء */}
        <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <div
                key={customer._id} // ← استخدمنا _id الصحيح
                className="flex justify-between items-center p-3 bg-white border rounded-lg hover:bg-gray-100 cursor-pointer transition-all"
                onClick={() => handleCustomerClick(customer)}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">
                    {customer.name || "غير محدد"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {customer.phone_number || "لا يوجد تليفون"}
                  </span>
                  {customer.amount_Due !== undefined && (
                    <span className="text-xs mt-1 text-red-600 font-medium">
                      مدين حاليًا: {(customer.amount_Due ?? 0).toFixed(2)} ج.م
                    </span>
                  )}
                </div>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  اختيار
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-gray-500 py-8">
              لا توجد عملاء مطابقة للبحث.
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline" onClick={onClose} className="w-full">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectionModal;