import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loading from "@/components/Loading";
// استيراد الـ Custom Hook
import { 
  Search, 
  Filter, 
  Package,
  Clock,
  MapPin,
  ChevronRight
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { t,i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  // ✅ استخدام useGet لجلب البيانات
  const { data, isLoading, error } = useGet("api/online-order"); 

  // معالجة البيانات التي تم جلبها
  useEffect(() => {
    if (data?.orders) {
      setOrders(data.orders);
      setFilteredOrders(data.orders);
    }
    // عرض رسالة خطأ في حال فشل الجلب
    if (error) {
        toast.error(t("FailedToFetchOrders") || "Failed to fetch orders");
    }
  }, [data, error, t]);


  // ✅ تم تصحيح faild_to_deliver إلى failed_to_deliver
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
    "refund"
  ];

  // ✅ فلترة الطلبات حسب البحث والحالة (لم تتغير)
  useEffect(() => {
    let filtered = orders;

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.f_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.phone?.includes(searchTerm)
      );
    }

    // فلترة حسب الحالة
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  // باقي الدوال والتصاميم (getStatusColor, formatDate, handleOrderClick) تبقى كما هي

  const getStatusColor = (status) => {
    const colors = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        confirmed: "bg-blue-100 text-blue-800 border-blue-300",
        processing: "bg-purple-100 text-purple-800 border-purple-300",
        out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-300",
        delivered: "bg-green-100 text-green-800 border-green-300",
        returned: "bg-orange-100 text-orange-800 border-orange-300",
        failed_to_deliver: "bg-purple-100 text-purple-800 border-purple-300", 
        canceled: "bg-gray-100 text-gray-800 border-gray-300",
        scheduled: "bg-teal-100 text-teal-800 border-teal-300",
        refund: "bg-pink-100 text-pink-800 border-pink-300"
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
const handleOrderClick = (id) => {
  navigate(`/online-orders/${id}`);
};


  if (isLoading) return <Loading />; // ✅ استخدام isLoading من الهوك

  // ... (الجزء الخاص بالتصاميم JSX يبقى كما هو)
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir={isArabic?"rtl":"ltr"}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {t("OnlineOrders") || "Online Orders"}
        </h1>
        <p className="text-gray-600">
          {t("TotalOrders") || "Total"}: <span className="font-semibold">{filteredOrders.length}</span>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t("SearchByOrderNumber") || "Search by order number, name, or phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary focus:border-transparent appearance-none"
            >
              <option value="all">{t("AllStatuses") || "All Statuses"}</option>
              {orderStatuses.map(status => (
                <option key={status} value={status}>
                  {t(status) || status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
               <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("OrderNumber") || "Order #"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("Customer") || "Customer"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("Branch") || "Branch"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("Amount") || "Amount"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("Status") || "Status"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("DateTime") || "Date/Time"}
</th>
<th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
  {t("Type") || "Type"}
</th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id}
                  onClick={() => handleOrderClick(order.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {order.user?.f_name} {order.user?.l_name}
                      </div>
                      <div className="text-gray-500">{order.user?.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      {order.branch?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      {order.amount.toFixed(2)} EGP
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.order_status)}`}>
                      {t(order.order_status) || order.order_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {order.order_type.replace(/_/g, ' ')}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("NoOrdersFound") || "No orders found"}</p>
          </div>
        )}
      </div>

      {/* Orders Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => handleOrderClick(order.id)}
            className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center mb-1">
                  <Package className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="font-semibold text-gray-900">{order.order_number}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {order.user?.f_name} {order.user?.l_name}
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.order_status)}`}>
                {t(order.order_status) || order.order_status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex items-center text-gray-600">
                <span className="font-medium">{order.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                <span>{order.branch?.name || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDate(order.created_at)}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("NoOrdersFound") || "No orders found"}</p>
          </div>
        )}
      </div>
    </div>
  );
}