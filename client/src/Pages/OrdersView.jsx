import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";
import { format } from "date-fns"; // اختياري لو عايز تنسيق تاريخ أحلى

export default function OrdersView() {
  const { data: apiResponse, error, isLoading } = useGet("api/pos/sales/complete");
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  if (isLoading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">Error loading data.</div>;

  // استخراج الـ sales بشكل آمن من الـ response الفعلي
  const orders = apiResponse?.data?.sales || [];

  const filteredOrders = orders.filter((order) => {
    const reference = order.reference || "";
    const total = order.grand_total || 0;
    const date = order.createdAt || "";
    const customerName = order.customer_id?.name || "";

    const searchLower = search.toLowerCase();

    return (
      reference.toLowerCase().includes(searchLower) ||
      total.toString().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      date.toLowerCase().includes(searchLower)
    );
  });

  // دالة لاستخراج الـ items بطريقة آمنة (حسب أسماء شائعة)
  const getOrderItems = (order) => {
    const items = 
      order.items || 
      order.order_items || 
      order.sale_items || 
      order.products || 
      [];

    return items.map((item) => ({
      name: item.product?.name || item.name || item.product_name || "Unknown Product",
      count: item.quantity || item.qty || item.count || 1,
      price: item.price || item.unit_price || 0,
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <Input
        type="text"
        placeholder={t("Search by order number, customer, or amount")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mx-auto"
      />

      <h2 className="text-2xl font-bold text-center">
        {t("Completed Orders")} ({filteredOrders.length})
      </h2>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center text-lg">{t("No orders found")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredOrders.map((order) => {
            const items = getOrderItems(order);
            const orderDate = order.createdAt 
              ? new Date(order.createdAt).toLocaleDateString("en-GB") 
              : "N/A";
            const orderTime = order.createdAt 
              ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : "";

            return (
              <Card 
                key={order._id} 
                className="border shadow-md hover:shadow-lg transition-shadow bg-white flex flex-col h-full"
              >
                <CardContent className="p-5 space-y-4 flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-blue-700">
                        {order.reference || order._id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.customer_id?.name || "Walk-in Customer"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">
                        {order.grand_total} EGP
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500">
                    {orderDate} — {orderTime}
                  </p>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-700">
                      {t("Items")} ({items.length}):
                    </p>
                    {items.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-600 max-h-32 overflow-y-auto">
                        {items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} × {item.count}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No items details available</p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Warehouse: {order.warehouse_id?.name || "N/A"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}