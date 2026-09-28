import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loading from "@/components/Loading";
import {
  Search,
  Filter,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  X,
  Loader2,
  CreditCard,
  Building,
  Truck,
  Store,
  Tag,
  Wifi,
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [statusDescription, setStatusDescription] = useState("");

  const { putData, loading: isUpdatingStatus } = usePut();

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const { data, isLoading, error } = useGet("api/online-order");

  // Extract orders safely from payload
  useEffect(() => {
    if (data) {
      let extractedOrders = [];

      if (Array.isArray(data)) {
        extractedOrders = data;
      } else if (Array.isArray(data.orders)) {
        extractedOrders = data.orders;
      } else if (Array.isArray(data.data?.orders)) {
        extractedOrders = data.data.orders;
      } else if (Array.isArray(data.data)) {
        extractedOrders = data.data;
      }

      setOrders(extractedOrders);
      setFilteredOrders(extractedOrders);
    }

    if (error) {
      toast.error(t("FailedToFetchOrders") || "Failed to fetch orders");
    }
  }, [data, error, t]);

  // Sync local status select state
  useEffect(() => {
    if (selectedOrder) {
      setNewStatusValue(selectedOrder.status || "processing");
      setStatusDescription(selectedOrder.statusDescription || "");
    }
  }, [selectedOrder]);

  // ✅ الحالات اللي بتتعرض في الفلتر (بتشمل processing للعرض)
  const filterStatuses = [
    "processing",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
  ];

  // ✅ تحديد الحالات المتاحة حسب الحالة الحالية
  const getAvailableStatuses = (currentStatus) => {
    const transitions = {
      processing: ["confirmed", "canceled", "scheduled"],
      confirmed: [
        "out_for_delivery",
        "delivered",
        "failed_to_deliver",
        "returned",
      ],
      out_for_delivery: ["delivered", "failed_to_deliver", "returned"],
      delivered: ["returned"],
      scheduled: ["confirmed", "canceled"],
      canceled: [],
      returned: [],
      failed_to_deliver: [],
    };

    return transitions[currentStatus] || [];
  };

  useEffect(() => {
    let filtered = Array.isArray(orders) ? orders : [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.cartItems?.some((item) =>
            item.product?.name?.toLowerCase().includes(term),
          ) ||
          order.shippingAddress?.city?.toLowerCase().includes(term) ||
          order.shippingAddress?.zone?.toLowerCase().includes(term) ||
          order.shippingAddress?.details?.toLowerCase().includes(term) ||
          order.warehouse?.name?.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-blue-100 text-blue-800 border-blue-300",
      processing: "bg-purple-100 text-purple-800 border-purple-300",
      out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-300",
      delivered: "bg-green-100 text-green-800 border-green-300",
      returned: "bg-orange-100 text-orange-800 border-orange-300",
      failed_to_deliver: "bg-red-100 text-red-800 border-red-300",
      canceled: "bg-gray-100 text-gray-800 border-gray-300",
      scheduled: "bg-teal-100 text-teal-800 border-teal-300",
      refund: "bg-pink-100 text-pink-800 border-pink-300",
      rejected: "bg-rose-100 text-rose-800 border-rose-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ build variant label (زي "Color: Red / Size: XL")
  const buildVariantLabel = (variant) => {
    if (!variant?.options?.length) return null;

    return variant.options
      .map((opt) => {
        const variationName = isArabic
          ? opt.ar_variationName || opt.variationName
          : opt.variationName;
        return variationName
          ? `${variationName}: ${opt.optionName}`
          : opt.optionName;
      })
      .join(" / ");
  };

  // ✅ helper: يجيب أول منتج من الأوردر
  const getFirstItem = (order) => {
    const item = order?.cartItems?.[0];
    if (!item) return { product: null, variant: null, quantity: 0, price: 0 };
    return {
      product: item.product,
      variant: item.variant,
      quantity: item.quantity || 0,
      price: item.price || item.product?.price || 0,
    };
  };

  // Handler for updating order status
  const handleUpdateStatus = async () => {
    if (!selectedOrder || isUpdatingStatus) return;

    try {
      await putData(`api/online-order/${selectedOrder._id}/status`, {
        status: newStatusValue,
        statusDescription: statusDescription || undefined,
      });

      const updatedOrders = orders.map((o) =>
        o._id === selectedOrder._id
          ? { ...o, status: newStatusValue, statusDescription }
          : o,
      );
      setOrders(updatedOrders);
      setSelectedOrder((prev) => ({
        ...prev,
        status: newStatusValue,
        statusDescription,
      }));

      toast.success(
        t("StatusUpdatedSuccessfully") || "Status updated successfully!",
      );
    } catch (err) {
      toast.error(
        t("FailedToUpdateStatus") || "Failed to update order status.",
      );
    }
  };

  if (isLoading) return <Loading />;

  const safeList = Array.isArray(filteredOrders) ? filteredOrders : [];

  return (
    <div
      className="min-h-screen bg-gray-50 p-4 md:p-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
            {t("OnlineOrders") || "Online Orders"}
          </h1>
          <p className="text-gray-600">
            {t("TotalOrders") || "Total"}:{" "}
            <span className="font-semibold">{safeList.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-amber-50/90 border border-amber-200/90 text-amber-900 px-4 py-2.5 rounded-xl shadow-xs max-w-md">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm leading-snug">
            <span className="font-bold text-amber-950 block">
              {isArabic
                ? "تنبيه اتصال الإنترنت:"
                : "Internet Connection Notice:"}
            </span>
            <span className="text-amber-800">
              {isArabic
                ? "يُفضل إبقاء الإنترنت متصلاً لتحديث واستقبال الطلبات بدقة لحظية."
                : "Please stay connected to the internet for real-time, accurate order sync."}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={
                t("SearchByOrderNumber") ||
                "Search by product, city, or address..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary focus:border-transparent appearance-none"
            >
              <option value="all">{t("AllStatuses") || "All Statuses"}</option>
              {filterStatuses.map((status) => (
                <option key={status} value={status}>
                  {t(status) || status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Product") || "Product"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Destination") || "Destination"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Warehouse") || "Warehouse"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Amount") || "Amount"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Status") || "Status"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("DateTime") || "Date/Time"}
                </th>
                <th
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("Type") || "Type"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safeList.map((order) => {
                const { product, variant, quantity } = getFirstItem(order);
                const variantLabel = buildVariantLabel(variant);

                return (
                  <tr
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product?.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                            {product?.name || "Deleted Product"}
                          </div>
                          {variantLabel && (
                            <div className="text-xs text-gray-500 truncate max-w-[180px]">
                              {variantLabel}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            × {quantity}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {order.shippingAddress ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {order.shippingAddress.city},{" "}
                              {order.shippingAddress.zone}
                            </div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px]">
                              {order.shippingAddress.details}
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {t("Pickup") || "Pickup"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {order.warehouse?.name || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.totalPriceAfterDiscount != null
                          ? Number(order.totalPriceAfterDiscount).toFixed(2)
                          : Number(order.totalOrderPrice || 0).toFixed(2)}{" "}
                        EGP
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                      >
                        {t(order.status) || order.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${order.orderType === "pickup" ? "bg-teal-50 text-teal-700" : "bg-indigo-50 text-indigo-700"}`}
                      >
                        {order.orderType?.replace(/_/g, " ") || "N/A"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {safeList.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {t("NoOrdersFound") || "No orders found"}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {safeList.map((order) => {
          const { product, variant, quantity } = getFirstItem(order);
          const variantLabel = buildVariantLabel(variant);

          return (
            <div
              key={order._id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex gap-3 mb-3">
                {product?.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">
                        {product?.name || "Deleted Product"}
                      </div>
                      {variantLabel && (
                        <div className="text-xs text-gray-500 truncate">
                          {variantLabel}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">× {quantity}</div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${getStatusColor(order.status)}`}
                    >
                      {t(order.status) || order.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {order.shippingAddress
                      ? `${order.shippingAddress.city}, ${order.shippingAddress.zone}`
                      : "Pickup"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center text-gray-700 font-medium">
                  {order.totalPriceAfterDiscount != null
                    ? Number(order.totalPriceAfterDiscount).toFixed(2)
                    : Number(order.totalOrderPrice || 0).toFixed(2)}{" "}
                  EGP
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="truncate">
                    {order.warehouse?.name || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(order.createdAt)}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          );
        })}

        {safeList.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {t("NoOrdersFound") || "No orders found"}
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative bg-white w-full max-w-3xl rounded-[24px] shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[90vh] border border-gray-100">
            {/* Header */}
            <div className="relative w-full bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 flex-shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg transition-all"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">
                    {t("OrderDetails") || "Order Details"}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    ID: {selectedOrder._id}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm ${getStatusColor(selectedOrder.status)}`}
                >
                  {t(selectedOrder.status) ||
                    selectedOrder.status?.replace(/_/g, " ")}
                </span>
                {selectedOrder.previousStatus && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white border border-white/20">
                    ← {selectedOrder.previousStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col">
                  <span className="text-xs text-gray-400 font-medium mb-1">
                    {t("OrderType") || "Order Type"}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 uppercase">
                    {selectedOrder.orderType?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col">
                  <span className="text-xs text-gray-400 font-medium mb-1">
                    {t("PaymentStatus") || "Payment Status"}
                  </span>
                  <span
                    className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-semibold uppercase ${selectedOrder.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {selectedOrder.paymentStatus || "unpaid"}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col">
                  <span className="text-xs text-gray-400 font-medium mb-1">
                    {t("PaymentMethod") || "Payment Method"}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {isArabic
                      ? selectedOrder.paymentMethod?.ar_name ||
                        selectedOrder.paymentMethod?.name
                      : selectedOrder.paymentMethod?.name ||
                        selectedOrder.paymentGateway ||
                        "N/A"}
                  </span>
                </div>
              </div>

              {/* ✅ Products Section (كل الـ cartItems) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  {t("Products") || "Products"} (
                  {selectedOrder.cartItems?.length || 0})
                </h3>

                <div className="space-y-3">
                  {(selectedOrder.cartItems || []).map((item, idx) => {
                    const variantLabel = buildVariantLabel(item.variant);
                    const unitPrice = Number(
                      item.price ?? item.product?.price ?? 0,
                    );
                    const qty = Number(item.quantity || 0);

                    return (
                      <div
                        key={item._id || idx}
                        className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {item.product?.name ||
                              t("DeletedProduct") ||
                              "Deleted Product"}
                          </div>

                          {variantLabel && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {variantLabel}
                            </div>
                          )}

                          {item.variant?.code && (
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {t("Code") || "Code"}: {item.variant.code}
                            </div>
                          )}

                          {/* variant options badges */}
                          {item.variant?.options?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.variant.options.map((opt, i) => {
                                const vName = isArabic
                                  ? opt.ar_variationName || opt.variationName
                                  : opt.variationName;
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                  >
                                    {vName ? `${vName}: ` : ""}
                                    {opt.optionName}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-2 text-sm">
                            <div className="text-gray-500">
                              {unitPrice.toFixed(2)} EGP × {qty}
                            </div>
                            <div className="font-bold text-gray-900">
                              {(unitPrice * qty).toFixed(2)} EGP
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!selectedOrder.cartItems ||
                    selectedOrder.cartItems.length === 0) && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      {t("NoProducts") || "No products in this order"}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  {t("OrderSummary") || "Order Summary"}
                </h3>
                <div className="divide-y divide-gray-100 text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("Subtotal") || "Subtotal"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {Number(
                        selectedOrder.totalOrderPrice || 0,
                      ).toLocaleString()}{" "}
                      EGP
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("ServiceFee") || "Service Fee"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {Number(selectedOrder.serviceFee || 0).toFixed(2)} EGP
                    </span>
                  </div>
                  {selectedOrder.couponDiscount > 0 && (
                    <div className="flex justify-between py-2 text-green-600">
                      <span>{t("CouponDiscount") || "Coupon Discount"}</span>
                      <span className="font-medium">
                        -{Number(selectedOrder.couponDiscount).toFixed(2)} EGP
                      </span>
                    </div>
                  )}
                  {selectedOrder.shippingPrice > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">
                        {t("ShippingPrice") || "Shipping Price"}
                      </span>
                      <span className="font-medium text-gray-900">
                        {Number(selectedOrder.shippingPrice).toFixed(2)} EGP
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 text-base font-bold text-gray-900">
                    <span>
                      {t("TotalPriceAfterDiscount") ||
                        "Total Price After Discount"}
                    </span>
                    <span className="text-blue-600">
                      {Number(
                        selectedOrder.totalPriceAfterDiscount ??
                          selectedOrder.totalOrderPrice ??
                          0,
                      ).toFixed(2)}{" "}
                      EGP
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  {t("OrderDetails") || "Order Details"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="block text-xs text-gray-400">
                      {t("Warehouse") || "Warehouse"}
                    </span>
                    <span className="font-medium text-gray-800">
                      {selectedOrder.warehouse?.name || "N/A"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="block text-xs text-gray-400">
                      {t("PaymentGateway") || "Payment Gateway"}
                    </span>
                    <span className="font-medium text-gray-800 uppercase">
                      {selectedOrder.paymentGateway || "N/A"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="block text-xs text-gray-400">
                      {t("CreatedDate") || "Created Date"}
                    </span>
                    <span className="font-medium text-gray-800">
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="block text-xs text-gray-400">
                      {t("OrderStatus") || "Order Status"}
                    </span>
                    <span className="font-medium text-gray-800 uppercase">
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fulfillment */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  {t("FulfillmentInformation") || "Fulfillment Information"}
                </h3>

                {selectedOrder.orderType === "pickup" ||
                !selectedOrder.shippingAddress ? (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                    <Store className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <span className="font-bold block text-sm">
                        {t("PickupOrder") || "Store Pickup Order"}
                      </span>
                      <span className="text-xs text-amber-700">
                        {t("CustomerWillPickupFromWarehouse") ||
                          "Customer will pick up this order directly from the selected warehouse."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* City */}
                    {selectedOrder.shippingAddress.city && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("City") || "City"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.city}
                        </span>
                      </div>
                    )}

                    {/* Zone */}
                    {selectedOrder.shippingAddress.zone && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("Zone") || "Zone"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.zone}
                        </span>
                      </div>
                    )}

                    {/* Street */}
                    {selectedOrder.shippingAddress.street && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("Street") || "Street"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.street}
                        </span>
                      </div>
                    )}

                    {/* Building Number */}
                    {selectedOrder.shippingAddress.buildingNumber != null && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("BuildingNumber") || "Building Number"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.buildingNumber}
                        </span>
                      </div>
                    )}

                    {/* Floor Number */}
                    {selectedOrder.shippingAddress.floorNumber != null && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("FloorNumber") || "Floor Number"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.floorNumber}
                        </span>
                      </div>
                    )}

                    {/* Apartment Number */}
                    {selectedOrder.shippingAddress.apartmentNumber != null && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("ApartmentNumber") || "Apartment Number"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.apartmentNumber}
                        </span>
                      </div>
                    )}

                    {/* Unique Identifier */}
                    {selectedOrder.shippingAddress.uniqueIdentifier && (
                      <div className="bg-gray-50 p-2.5 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("UniqueIdentifier") || "Unique Identifier"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.uniqueIdentifier}
                        </span>
                      </div>
                    )}

                    {/* Address Details (full width) */}
                    {selectedOrder.shippingAddress.details && (
                      <div className="bg-gray-50 p-2.5 sm:col-span-2 rounded-xl">
                        <span className="block text-xs text-gray-400">
                          {t("AddressDetails") || "Address Details"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {selectedOrder.shippingAddress.details}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Update */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {t("UpdateOrderStatus") || "Update Order Status"}
                </h3>

                {/* Current Status Info */}
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="font-medium">
                    {t("OrderStatus") || "Order Status"}:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(selectedOrder.status)}`}
                  >
                    {t(selectedOrder.status) ||
                      selectedOrder.status?.replace(/_/g, " ")}
                  </span>
                </div>

                {/* New Status Select */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    {t("NewStatus") || "New Status"}
                  </label>
                  {getAvailableStatuses(selectedOrder.status).length === 0 ? (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      {t("NoTransitionsAvailable") ||
                        "No status transitions available for this order."}
                    </div>
                  ) : (
                    <select
                      value={newStatusValue}
                      onChange={(e) => setNewStatusValue(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 transition-all cursor-pointer hover:border-gray-400"
                    >
                      <option value="">
                        {t("SelectNewStatus") || "Select new status..."}
                      </option>
                      {getAvailableStatuses(selectedOrder.status).map((st) => (
                        <option key={st} value={st}>
                          {t(st) || st.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Status Description */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    {t("StatusDescription") || "Status Description"}{" "}
                    <span className="text-gray-400 font-normal">
                      ({t("Optional") || "Optional"})
                    </span>
                  </label>
                  <textarea
                    value={statusDescription}
                    onChange={(e) => setStatusDescription(e.target.value)}
                    disabled={isUpdatingStatus}
                    rows={2}
                    placeholder={
                      t("StatusDescriptionPlaceholder") ||
                      "Add a note about this status change..."
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 transition-all resize-none placeholder:text-gray-400"
                  />
                </div>

                {/* Update Button */}
                <button
                  onClick={handleUpdateStatus}
                  disabled={
                    isUpdatingStatus ||
                    !newStatusValue ||
                    newStatusValue === selectedOrder.status
                  }
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("Updating") || "Updating..."}
                    </>
                  ) : (
                    t("UpdateStatus") || "Update Status"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
