import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { X, Trash2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import VoidOrderModal from "./VoidOrderModal";
import { printReceiptSilently } from "@/Pages/utils/printReceipt";

export default function AllOrders() {
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Print States
  const [isPrinting, setIsPrinting] = useState(false);

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const { postData, loading } = usePost();

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return toast.error(t("Pleaseenteryourpassword"));

    try {
      const res = await postData("api/admin/pos/sales/complete", { password });

      if (res?.data?.sales) {
        setOrders(res.data.sales);
        setShowModal(false);
        toast.success(t("Accessgrantedsuccessfully"));
      } else {
        toast.error(t("Incorrectpassword"));
      }
    } catch (err) {
      toast.error(t("totheserver"));
      console.error(err);
    }
  };

  // Handle Void Click
  const handleVoidClick = (order) => {
    setSelectedOrder(order);
    setShowVoidModal(true);
  };

  // Handle Void Success - Refresh Orders
  const handleVoidSuccess = async () => {
    try {
      const res = await postData("api/admin/pos/sales/complete", { password }); 
      
      if (res?.data?.sales) {
        setOrders(res.data.sales);
        toast.success(t("Ordersrefreshedsuccessfully"));
      } else {
        console.error("Refresh Error: Invalid response structure");
      }
    } catch (err) {
      console.error("Refresh Error:", err);
      toast.error(t("Failedtorefreshorders") || "فشل في تحديث الطلبات");
    }
  };

  // =========================================================
  // بناء بيانات الفاتورة من بيانات الـ Sale
  // =========================================================
  const buildReceiptDataFromSale = (sale) => {
    const dateObj = new Date(sale.date || sale.createdAt || Date.now());

    const items = (sale.items || []).map((item) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      return {
        qty,
        name:
          item.product_id?.name ||
          item.bundle_id?.name ||
          (isArabic ? "منتج" : "Item"),
        nameAr: item.product_id?.ar_name || "",
        price,
        total: Number(item.subtotal ?? price * qty),
        notes: "",
        addons: [],
        extras: [],
        variations: [],
      };
    });

    const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0);

    return {
      invoiceNumber: sale.daily_order_number ?? sale.reference ?? "",
      referenceNumber: sale.reference || "",
      dateFormatted: dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
      timeFormatted: dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      orderType: sale.order_type || "sale",
      restaurantName:
        sale.warehouse_id?.name ||
        sessionStorage.getItem("resturant_name") ||
        "",
      restaurantAddress: sessionStorage.getItem("restaurant_address") || "",
      restaurantPhone: sessionStorage.getItem("restaurant_phone") || "",
      receiptFooter:
        sessionStorage.getItem("receipt_footer") ||
        (isArabic ? "شكراً لزيارتكم" : "Thank you for your visit"),
      customer: {
        name:
          sale.customer_id?.name ||
          (isArabic ? "عميل نقدي" : "Cash Customer"),
        phone: sale.customer_id?.phone_number || "",
        email: sale.customer_id?.email || "",
      },
      address: null,
      items,
      subtotal: Number(sale.total ?? itemsSubtotal).toFixed(2),
      discount: Number(sale.discount ?? sale.discount_amount ?? 0).toFixed(2),
      coupon: Number(sale.coupon_amount || 0).toFixed(2),
      tax: Number(sale.tax_amount || 0).toFixed(2),
      serviceFees: Number(sale.service_fee_total || 0).toFixed(2),
      total: Number(sale.grand_total || 0).toFixed(2),
      table: "N/A",
    };
  };

  // Handle Print Click
  const handlePrintClick = (order) => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const receiptData = buildReceiptDataFromSale(order);
      printReceiptSilently(receiptData, { sale: order }, () => {
        setIsPrinting(false);
      });
      toast.success(t("Preparingprint") || "جاري الطباعة...");
    } catch (err) {
      console.error("Print Error:", err);
      toast.error(t("Failedtoloadorderdetails"));
      setIsPrinting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const rawDate = order.date || order.createdAt || order.updatedAt;
      const orderDate = rawDate ? new Date(rawDate).toISOString().split("T")[0] : "";
      const matchDate = orderDate === date;
      const matchSearch = String(order.reference ?? "").includes(search);
      return matchDate && matchSearch;
    });
  }, [orders, search, date]);

  // حساب إجمالي المبلغ المجمع (grand_total) للطلبات المفلترة
  const totalAmountSum = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      return sum + Number(order.grand_total ?? order.total ?? 0);
    }, 0);
  }, [filteredOrders]);

  return (
    <div className="p-4" dir={isArabic ? "rtl" : "ltr"}>
      {/* Password Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DialogClose
            asChild
            onClick={() => setShowModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <button aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </DialogClose>

          <DialogHeader>
            <DialogTitle>{t("EnterPassword")}</DialogTitle>
          </DialogHeader>

          <Input
            type="password"
            placeholder={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />

          <Button
            onClick={handlePasswordSubmit}
            disabled={loading}
            className="mt-3 w-full"
          >
            {loading ? t("Loading") : t("Login")}
          </Button>
        </DialogContent>
      </Dialog>

      {!showModal && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder={t("SearchByOrderNumber")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-1/3"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sm:w-1/3"
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-md border flex flex-col justify-between">
              <span className="text-gray-500 text-sm font-medium">
                {isArabic ? "إجمالي الطلبات" : "Total Orders"}
              </span>
              <span className="text-2xl font-bold text-gray-800 mt-1">
                {filteredOrders.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border flex flex-col justify-between">
              <span className="text-gray-500 text-sm font-medium">
                {isArabic ? "إجمالي المبلغ" : "Total Amount"}
              </span>
              <span className="text-2xl font-bold text-emerald-600 mt-1">
                {totalAmountSum.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto rounded-lg shadow-md border" dir={isArabic ? "rtl" : "ltr"}>
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("OrderNumber")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Amount")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Discount")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Branch")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("DateTime")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Print")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Void")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id || order.reference} className="hover:bg-gray-50 transition-colors">
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.reference}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {Number(order.grand_total ?? order.total ?? 0).toFixed(2)}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {(() => {
                        const manual = Number(order.free_discount || 0);
                        const coupon = Number(order.coupon_amount || 0);
                        const totalDiscount =
                          Number(order.discount ?? order.discount_amount ?? 0) + coupon;

                        if (!totalDiscount) {
                          return <span className="text-gray-300">—</span>;
                        }

                        return (
                          <div className="flex flex-col">
                            <span className="text-rose-600 font-semibold">
                              -{totalDiscount.toFixed(2)}
                            </span>
                            {manual > 0 && (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {isArabic ? "منها يدوي" : "Manual"}: {manual.toFixed(2)}
                              </span>
                            )}
                            {coupon > 0 && (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {isArabic ? "كوبون" : "Coupon"}: {coupon.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.warehouse_id?.name || "—"}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {new Date(order.date || order.createdAt || order.updatedAt).toLocaleString(
                        isArabic ? "ar-EG" : "en-US",
                      )}
                    </td>
                    {/* Print Button */}
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handlePrintClick(order)}
                        disabled={isPrinting}
                        className={`text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50 ${
                          isPrinting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={t("PrintOrder")}
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </td>
                    {/* Void Button */}
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleVoidClick(order)}
                        className="text-purple-600 hover:text-purple-800 transition-colors p-2 rounded-lg hover:bg-purple-50"
                        title={t("VoidOrder")}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500 mt-6">
              {t("NoOrdersFoundForThisDate")}
            </p>
          )}
        </>
      )}

      {/* Void Order Modal */}
      <VoidOrderModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setSelectedOrder(null);
        }}
        orderId={selectedOrder?._id}
        orderNumber={selectedOrder?.reference}
        onSuccess={handleVoidSuccess}
      />
    </div>
  );
}