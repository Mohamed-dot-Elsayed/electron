import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
import { ArrowLeft, Clock, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PendingOrders() {
  const navigate = useNavigate();
  const { data: pendingOrders, loading, error, refetch } = useGet("api/pos/sales/pending");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetailsEndpoint, setOrderDetailsEndpoint] = useState(null);
  const { t, i18n } = useTranslation();

  const {
    data: orderDetailsData,
    loading: orderLoading,
    error: orderError
  } = useGet(orderDetailsEndpoint);

  useEffect(() => {
    if (error) {
      toast.error(`${t("Errorloadingpendingorders")}: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (orderError) {
      toast.error(`${t("Errorloadingorderdetails")}: ${orderError}`);
      setSelectedOrderId(null);
      setOrderDetailsEndpoint(null);
    }
  }, [orderError]);

  useEffect(() => {
    // فحص ما إذا كانت البيانات موجودة مباشرة أو داخل خاصية data
    const actualData = orderDetailsData?.data || orderDetailsData;

    if (actualData && (actualData.id || actualData._id || actualData.sale?._id)) {
      console.log("✅ Data Found, Starting Navigation...");
      const orderRawData = actualData.sale || actualData;

      // المنطق الخاص بجمع المنتجات مع التعامل مع الهيكل المتداخل
      const itemsArray = actualData.products || orderRawData.order || orderRawData.order_details || [];
      const mappedOrderDetails = itemsArray.flatMap((item) => {
        const addons = Array.isArray(item.options) ? item.options : (Array.isArray(item.addons) ? item.addons : []);

        if (item.product && Array.isArray(item.product)) {
          // حالة الهيكل المتداخل: product هو مصفوفة من {product: {...}, count: ...}
          return item.product.map((subItem) => {
            const subProductInfo = subItem.product || subItem || {};
            return {
              product_id: subProductInfo.id || subProductInfo._id || subItem.product_id || subItem._id || item.product_id || item._id,
              product_name: subProductInfo.name || subItem.product_name || item.product_name || "Unknown Product",
              price: parseFloat(subItem.price || item.price || 0),
              count: parseInt(subItem.quantity || subItem.count || item.quantity || item.count || 1),
              variation_name: subItem.variation_name || item.variation_name || null,
              addons: addons, // الإضافات مرتبطة بالعنصر الرئيسي
            };
          });
        } else {
          // الحالة العادية
          const productInfo = item.product || {};
          return [{
            product_id: productInfo.id || productInfo._id || item.product_id || item._id,
            product_name: productInfo.name || item.product_name || "Unknown Product",
            price: parseFloat(item.price || 0),
            count: parseInt(item.quantity || item.count || 1),
            variation_name: item.variation_name || null,
            addons: addons
          }];
        }
      });

      // حفظ في السلة
      sessionStorage.setItem("cart", JSON.stringify(mappedOrderDetails));
      sessionStorage.setItem("pending_order_info", JSON.stringify({
        orderId: orderRawData.id || orderRawData._id,
        orderNumber: orderRawData.reference || "",
        amount: orderRawData.grand_total || 0,
        notes: orderRawData.notes || "",
        prepare_order: orderRawData.prepare_order || "0"
      }));

      // التوجيه - تأكد من المسار هنا! 
      // بما أن basename هو /point-of-sale فإن "/" ستؤدي إلى الصفحة الرئيسية للـ POS
      navigate("/", {
        state: {
          activeTab: "take_away",
          pendingOrder: {
            orderId: orderRawData.id || orderRawData._id,
            orderDetails: mappedOrderDetails
          }
        }
      });

      // تصفير الاختيار لضمان إمكانية الضغط مرة أخرى
      setSelectedOrderId(null);
      setOrderDetailsEndpoint(null);

    } else if (orderDetailsData) {
      console.error("❌ Data returned but no ID found. Structure might be wrong:", orderDetailsData);
    }
  }, [orderDetailsData, navigate, t]);

  const handleSelectOrder = (orderId) => {
    if (orderLoading || selectedOrderId) return;

    console.log("Selecting order:", orderId);
    setSelectedOrderId(orderId);
    setOrderDetailsEndpoint(`api/pos/sales/sales/pending/${orderId}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (err) {
      toast.error("Invalid date format", err);
      return dateString;
    }
  };

  const formatOrderItems = (orderDetails) => {
    if (!Array.isArray(orderDetails)) return "No items";

    const items = [];
    orderDetails.forEach(orderDetail => {
      if (orderDetail.product && Array.isArray(orderDetail.product)) {
        // Handle nested product structure
        orderDetail.product.forEach(productItem => {
          if (productItem.product && productItem.product.name) {
            items.push(`${productItem.product.name} x${productItem.count || 1}`);
          }
        });
      } else if (orderDetail.product_name) {
        // Handle direct product_name structure
        items.push(`${orderDetail.product_name} x${orderDetail.count || 1}`);
      } else if (orderDetail.name) {
        // Handle name field
        items.push(`${orderDetail.name} x${orderDetail.count || 1}`);
      }
    });

    return items.length > 0 ? items.join(", ") : "No items available";
  };

  // ✅ Extract sales array from the new response structure
  const salesData = pendingOrders?.data?.sales || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex m-auto items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-bg-secondary" size={32} />
              {t("PendingOrders")}
            </h1>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}

        {error && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-purple-600">{t("Errorloadingpendingorders")}: {error}</p>
            <Button
              onClick={refetch}
              variant="outline"
              className="mt-2"
              disabled={loading}
            >
              {t("Retry")}
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salesData.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-500 text-lg">{t("Nopendingordersfound")}</p>
              </div>
            ) : (
              salesData.map((sale) => (
                <div
                  key={sale._id}
                  className={`bg-white rounded-lg shadow-md border hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${selectedOrderId === sale._id
                    ? 'ring-2 ring-teal-500 bg-teal-50 shadow-xl'
                    : 'hover:border-teal-200'
                    } ${orderLoading && selectedOrderId === sale._id ? 'pointer-events-none opacity-75' : ''}`}
                  onClick={() => handleSelectOrder(sale._id)}
                >
                  <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {t("Order")} #{sale.reference || sale._id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
                          {sale.order_pending === 0 ? "Pending" : "Processed"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Customer")}:</span>
                        <span className="font-medium">{sale.customer_id?.name || "N/A"}</span>
                      </div>
                      {sale.customer_id?.phone_number && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("Phone")}:</span>
                          <span className="font-medium">{sale.customer_id.phone_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Warehouse")}:</span>
                        <span className="font-medium">{sale.warehouse_id?.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Total")}:</span>
                        <span className="font-bold text-green-600">
                          {parseFloat(sale.grand_total || 0).toFixed(2)} EGP
                        </span>
                      </div>
                      {sale.order_tax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("Tax")}:</span>
                          <span className="font-medium">{sale.order_tax} EGP</span>
                        </div>
                      )}
                    </div>

                    {/* ✅ Loading overlay */}
                    {selectedOrderId === sale._id && orderLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <Loading />
                          <span className="text-sm text-gray-600 font-medium">{t("Loadingorderdetails")}</span>
                        </div>
                      </div>
                    )}

                    {/* ✅ Click indicator */}
                    {!orderLoading && (
                      <div className="absolute bottom-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}