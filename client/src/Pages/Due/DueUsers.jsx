import React, { useState, useEffect, useMemo } from "react";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
import DuePaymentModal from "../Checkout/DuePaymentModal";
import { useConfirmDuePayment } from "../../Hooks/useConfirmDuePayment";
import { useTranslation } from "react-i18next";
import Loader from "@/components/Loading";

const DueUsers = () => {
  const { data, loading, error, refetch } = useGet("api/admin/pos/sales/dues");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (error) {
      toast.error(error?.message || t("Failedtoloaddueusers"));
    }
  }, [error, t]);

  const { handleConfirmDuePayment } = useConfirmDuePayment({
    onClearCart: () => {},
    onClose: () => setIsModalOpen(false),
    setDueSplits: () => {},
    setDueAmount: () => {},
    refetch,
  });

  // التجميع الصحيح للعملاء حسب الدين
  const groupedCustomers = useMemo(() => {
    const sales = data?.data?.sales; // ← هنا السر! data.data.sales

    if (!sales || !Array.isArray(sales)) {
      return [];
    }

    const map = new Map();

    sales.forEach((sale) => {
      const customer = sale.Due_customer_id || sale.customer_id;

      if (!customer?._id) return;

      const key = customer._id;

      if (!map.has(key)) {
        map.set(key, {
          _id: customer._id,
          name: customer.name || "غير معروف",
          email: customer.email || "",
          phone_number: customer.phone_number || "",
          totalDue: 0,
        });
      }

      const existing = map.get(key);
      existing.totalDue += Number(sale.remaining_amount) || 0;
    });

    return Array.from(map.values());
  }, [data]);

  const handlePayClick = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  if (loading) return <Loader />;
  if (error) return <p className="text-red-500">{error?.message || "Error loading data"}</p>;

  if (!groupedCustomers.length) {
    return <p className="text-center text-gray-600 mt-8">{t("Nouserswithdueamounts")}</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6 text-purple-600 text-center">
        {t("DueUsers")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {groupedCustomers.map((customer) => (
          <div
            key={customer._id}
            className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-800">{customer.name}</h3>
            {customer.phone_number && (
              <p className="text-sm text-gray-600 mb-3">{customer.phone_number}</p>
            )}
            <p className="text-purple-600 font-bold text-lg mb-4">
              {t("Due")}: {customer.totalDue.toFixed(2)} {t("EGP")}
            </p>
            <button
              onClick={() => handlePayClick(customer)}
              className="w-full bg-purple-600 text-white font-medium py-3 rounded-lg hover:bg-purple-700 transition duration-200"
            >
              {t("PayNow")}
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && selectedCustomer && (
        <DuePaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={selectedCustomer}
          requiredTotal={selectedCustomer.totalDue}
          onConfirm={(splits, paidNow, remainingDue) => {
            handleConfirmDuePayment(splits, paidNow, selectedCustomer, remainingDue);
          }}
          refetch={refetch}
        />
      )}
    </div>
  );
};

export default DueUsers;