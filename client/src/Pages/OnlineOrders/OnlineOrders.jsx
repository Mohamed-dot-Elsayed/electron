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
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building,
  Truck,
  Store,
  Tag,
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut"; // Imported custom usePut hook[cite: 10]

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState("");

  // Initialize the usePut hook for status updating[cite: 10]
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

  // Synchronize local select state whenever selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      setNewStatusValue(selectedOrder.status || "pending");
    }
  }, [selectedOrder]);

  const orderStatuses = [
    "pending",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
    "refund",
    "rejected",
  ];

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

  // Handler for updating order status using the usePut hook[cite: 10]
  const handleUpdateStatus = async () => {
    if (!selectedOrder || isUpdatingStatus) return;

    try {
      await putData(`api/online-order/${selectedOrder._id}/status`, {
        status: newStatusValue,
      });

      // Update local states seamlessly
      const updatedOrders = orders.map((o) =>
        o._id === selectedOrder._id ? { ...o, status: newStatusValue } : o,
      );
      setOrders(updatedOrders);
      setSelectedOrder((prev) => ({ ...prev, status: newStatusValue }));

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
  const firstCartItem = selectedOrder?.cartItems?.[0];
  const productData = firstCartItem?.product;

  return (
    <div
      className="min-h-screen bg-gray-50 p-4 md:p-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {t("OnlineOrders") || "Online Orders"}
        </h1>
        <p className="text-gray-600">
          {t("TotalOrders") || "Total"}:{" "}
          <span className="font-semibold">{safeList.length}</span>
        </p>
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
                "Search by order ID, city, or address..."
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
              {orderStatuses.map((status) => (
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
                  {t("OrderNumber") || "Order #"}
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
                const firstProduct = order.cartItems?.[0]?.product;
                const productName = firstProduct?.name || "Deleted Product";

                return (
                  <tr
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-blue-600 hover:underline truncate max-w-[140px]">
                          {productName}
                        </span>
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
                      <div className="flex items-center text-sm font-medium text-gray-900">
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
          const firstProduct = order.cartItems?.[0]?.product;
          const productName = firstProduct?.name || "Deleted Product";

          return (
            <div
              key={order._id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center mb-1">
                    <Package className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-semibold text-blue-600 truncate max-w-[140px]">
                      {productName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.shippingAddress
                      ? `${order.shippingAddress.city}, ${order.shippingAddress.zone}`
                      : "Pickup"}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                >
                  {t(order.status) || order.status?.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium">
                    {order.totalPriceAfterDiscount != null
                      ? Number(order.totalPriceAfterDiscount).toFixed(2)
                      : Number(order.totalOrderPrice || 0).toFixed(2)}{" "}
                    EGP
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  <span>{order.warehouse?.name || "N/A"}</span>
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

      {/* Modern Professional Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative bg-white w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[90vh] border border-gray-100">
            {/* Top Header / Hero Image Section */}
            <div className="relative w-full h-56 bg-gray-100 overflow-hidden flex-shrink-0">
              {productData?.image ? (
                <img
                  src={productData.image}
                  alt={productData?.name || "Product"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                  <Package className="w-16 h-16 mb-2 text-gray-300" />
                  <span className="text-sm font-medium">
                    {t("NoImageAvailable") || "No Image Available"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/80 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-gray-700 shadow-lg transition-transform hover:scale-105"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end text-white">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold truncate drop-shadow-md">
                    {productData?.name ||
                      t("DeletedProduct") ||
                      "Deleted Product"}
                  </h2>
                  <p className="text-xs text-gray-200 mt-0.5">
                    ID: {selectedOrder._id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm ${getStatusColor(selectedOrder.status)}`}
                  >
                    {t(selectedOrder.status) ||
                      selectedOrder.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
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

              {/* Product Information Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  {t("ProductInformation") || "Product Information"}
                </h3>
                <div className="divide-y divide-gray-100 text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("ProductName") || "Product Name"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {productData?.name ||
                        t("DeletedProduct") ||
                        "Deleted Product"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("UnitPrice") || "Unit Price"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {Number(
                        productData?.price ?? firstCartItem?.price ?? 0,
                      ).toFixed(2)}{" "}
                      EGP
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("Quantity") || "Quantity"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {firstCartItem?.quantity || 1}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">
                      {t("ItemTotal") || "Item Total"}
                    </span>
                    <span className="font-bold text-gray-900">
                      {(
                        Number(
                          productData?.price ?? firstCartItem?.price ?? 0,
                        ) * (firstCartItem?.quantity || 1)
                      ).toFixed(2)}{" "}
                      EGP
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Summary Card */}
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

              {/* Order Details Specification Card */}
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

              {/* Fulfillment Information */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <span className="block text-xs text-gray-400">
                        {t("City") || "City"}
                      </span>
                      <span className="font-medium text-gray-800">
                        {selectedOrder.shippingAddress.city || "N/A"}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <span className="block text-xs text-gray-400">
                        {t("Zone") || "Zone"}
                      </span>
                      <span className="font-medium text-gray-800">
                        {selectedOrder.shippingAddress.zone || "N/A"}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2.5 sm:col-span-3 rounded-xl">
                      <span className="block text-xs text-gray-400">
                        {t("AddressDetails") || "Address Details"}
                      </span>
                      <span className="font-medium text-gray-800">
                        {selectedOrder.shippingAddress.details || "N/A"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update Section */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {t("UpdateOrderStatus") || "Update Order Status"}
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={newStatusValue}
                    onChange={(e) => setNewStatusValue(e.target.value)}
                    disabled={isUpdatingStatus}
                    className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                  >
                    {orderStatuses.map((st) => (
                      <option key={st} value={st}>
                        {t(st) || st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center justify-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
