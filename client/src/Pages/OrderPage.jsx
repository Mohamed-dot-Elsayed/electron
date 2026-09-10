import React, { useEffect, useState } from "react";
import Card from "./Card/Card";
import Item from "./Item";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { areProductsEqual } from "./ProductModal";
import { useTranslation } from "react-i18next";

export default function OrderPage({
  fetchEndpoint,
  initialCart = [],
  allowQuantityEdit = true,
  propOrderType,
  propTableId,
  propUserId,
  discountData = { discount: 0, module: [] },
}) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [ordersByTable, setOrdersByTable] = useState({});
  const [ordersByUser, setOrdersByUser] = useState({});
  const [takeAwayItems, setTakeAwayItems] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingOrderLoaded, setPendingOrderLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pendingOrder = location.state?.pendingOrder;

  const currentOrderType =
    propOrderType ||
    location.state?.orderType ||
    sessionStorage.getItem("order_type") ||
    "take_away";
  const currentTableId =
    propTableId ||
    location.state?.tableId ||
    sessionStorage.getItem("table_id") ||
    null;
  const currentUserId =
    propUserId ||
    location.state?.delivery_user_id ||
    sessionStorage.getItem("delivery_user_id") ||
    null;

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const {
    data: dineInData,
    loading: dineInLoading,
    refetch: refetchDineIn,
  } = useGet(
    isDineIn && currentTableId
      ? `cashier/dine_in_table_order/${currentTableId}`
      : null,
  );

  // ✅ FIXED: تحميل الطلب المتكرر من sessionStorage للـ take_away
  useEffect(() => {
    if (pendingOrder && pendingOrder.orderDetails && !pendingOrderLoaded) {
      const mappedItems = pendingOrder.orderDetails.map((detail, index) => ({
        id: detail.product_id || `pending_${index}`,
        temp_id: `pending_${detail.product_id || index}_${Date.now()}`,
        name: detail.product_name || "Unknown Product",
        price: parseFloat(detail.price || 0),
        originalPrice: parseFloat(detail.price || 0),
        count: parseInt(detail.count || 1),
        selectedVariation: detail.variation_name || null,
        selectedExtras: Array.isArray(detail.addons) ? detail.addons : [],
        selectedVariations: detail.variation_name
          ? [detail.variation_name]
          : [],
        selectedExcludes: [],
        preparation_status: "pending",
        type: "main_item",
        addons: Array.isArray(detail.addons)
          ? detail.addons.map((addon, addonIndex) => ({
              id: `addon_${addonIndex}_${Date.now()}`,
              name: addon.name || "Unknown Addon",
              price: parseFloat(addon.price || 0),
              originalPrice: parseFloat(addon.price || 0),
              count: parseInt(addon.count || 1),
              preparation_status: "pending",
            }))
          : [],
      }));
      setTakeAwayItems(mappedItems);
      setPendingOrderLoaded(true);
      sessionStorage.setItem("cart", JSON.stringify(mappedItems));
      sessionStorage.setItem("order_type", "take_away");
      sessionStorage.setItem(
        "pending_order_info",
        JSON.stringify({
          orderId: pendingOrder.orderId,
          orderNumber: pendingOrder.orderNumber,
          amount: pendingOrder.amount,
          notes: pendingOrder.notes,
        }),
      );
    } else if (!pendingOrderLoaded && currentOrderType === "take_away") {
      const storedCartString = sessionStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          console.log(
            "📦 Loading cart from sessionStorage in OrderPage:",
            storedCart,
          );
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
        } catch (error) {
          console.error("Error parsing cart JSON from sessionStorage:", error);
          setTakeAwayItems([]);
        }
      }
    }
  }, [pendingOrder, pendingOrderLoaded, currentOrderType]);

  // dine-in: أضف originalPrice و temp_id
  useEffect(() => {
    if (isDineIn && currentTableId && dineInData?.success) {
      const mappedItems = Array.isArray(dineInData.success)
        ? dineInData.success.map((item) => ({
            ...item,
            originalPrice: item.originalPrice ?? item.price ?? 0,
            temp_id: item.temp_id || `dinein_${item.id}_${Date.now()}`,
            count: parseInt(item.count || 1),
            price: parseFloat(item.price || 0),
            preparation_status:
              item.prepration || item.preparation_status || "pending",
          }))
        : [];

      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: mappedItems,
      }));
    }
  }, [isDineIn, currentTableId, dineInData]);

  // delivery: أضف originalPrice و temp_id
  useEffect(() => {
    if (isDelivery && currentUserId && dineInData?.success) {
      const mappedItems = Array.isArray(dineInData.success)
        ? dineInData.success.map((item) => ({
            ...item,
            originalPrice: item.originalPrice ?? item.price ?? 0,
            temp_id: item.temp_id || `delivery_${item.id}_${Date.now()}`,
            count: parseInt(item.count || 1),
            price: parseFloat(item.price || 0),
            preparation_status:
              item.prepration || item.preparation_status || "pending",
          }))
        : [];

      setOrdersByUser((prev) => ({
        ...prev,
        [currentUserId]: mappedItems,
      }));
    }
  }, [isDelivery, currentUserId, dineInData]);

  const clearOrderData = () => {
    if (currentOrderType === "take_away") {
      setTakeAwayItems([]);
      sessionStorage.removeItem("cart");
      sessionStorage.removeItem("pending_order_info");
    } else if (currentOrderType === "dine_in" && currentTableId) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: [] }));
    } else if (currentOrderType === "delivery" && currentUserId) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: [] }));
      sessionStorage.removeItem("selected_user_id");
      sessionStorage.removeItem("selected_address_id");
    }
  };

  const refreshCartData = async () => {
    try {
      setIsLoading(true);
      if (isDineIn && currentTableId && refetchDineIn) {
        await refetchDineIn();
      } else if (currentOrderType === "take_away") {
        const storedCartString = sessionStorage.getItem("cart");
        if (storedCartString && storedCartString !== "undefined") {
          try {
            const storedCart = JSON.parse(storedCartString);
            console.log("🔄 Refreshing cart from sessionStorage:", storedCart);
            setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
          } catch (error) {
            console.error("Error parsing cart JSON:", error);
            setTakeAwayItems([]);
          }
        }
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing cart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentOrderItems = isDineIn
    ? ordersByTable[currentTableId] || []
    : isDelivery
      ? ordersByUser[currentUserId] || []
      : takeAwayItems;

  const updateOrderItems = (newItemsOrUpdater) => {
    if (isDineIn) {
      setOrdersByTable((prev) => {
        const currentList = prev[currentTableId] || [];
        const safeNew = typeof newItemsOrUpdater === "function" ? newItemsOrUpdater(currentList) : newItemsOrUpdater;
        return { ...prev, [currentTableId]: Array.isArray(safeNew) ? safeNew : [] };
      });
    } else if (isDelivery) {
      setOrdersByUser((prev) => {
        const currentList = prev[currentUserId] || [];
        const safeNew = typeof newItemsOrUpdater === "function" ? newItemsOrUpdater(currentList) : newItemsOrUpdater;
        return { ...prev, [currentUserId]: Array.isArray(safeNew) ? safeNew : [] };
      });
    } else {
      setTakeAwayItems((prev) => {
        const currentList = Array.isArray(prev) ? prev : [];
        const safeNew = typeof newItemsOrUpdater === "function" ? newItemsOrUpdater(currentList) : newItemsOrUpdater;
        const validArray = Array.isArray(safeNew) ? safeNew : [];
        sessionStorage.setItem("cart", JSON.stringify(validArray));
        console.log("💾 Updated cart in sessionStorage:", validArray);
        return validArray;
      });
    }
  };

  const handleAddItem = (productOrProducts, options = {}) => {
    const productsToAdd = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];
    if (productsToAdd.length === 0) return;

    if (options.updateExisting && options.index !== undefined) {
      updateOrderItems((prevItems) => {
        const safeCurrentItems = Array.isArray(prevItems) ? [...prevItems] : [];
        safeCurrentItems[options.index] = productsToAdd[0];
        return safeCurrentItems;
      });
      return;
    }

    updateOrderItems((prevItems) => {
      let updatedItems = Array.isArray(prevItems) ? [...prevItems] : [];

      for (const product of productsToAdd) {
        const existingItemIndex = updatedItems.findIndex((item) => areProductsEqual(item, product));
        const pCount = Number(product.count || product.quantity || 1);
        const pPrice = parseFloat(product.price || 0);

        if (existingItemIndex !== -1) {
          const existingItem = updatedItems[existingItemIndex];
          const newCount = Number(existingItem.count || existingItem.quantity || 1) + pCount;
          updatedItems[existingItemIndex] = {
            ...existingItem,
            count: newCount,
            quantity: newCount,
            totalPrice: existingItem.price * newCount,
          };
        } else {
          updatedItems.push({
            ...product,
            count: pCount,
            quantity: pCount,
            totalPrice: pPrice * pCount,
            preparation_status: product.preparation_status || "pending",
          });
        }
      }

      return updatedItems;
    });
  };

  const handleClose = () => {
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("order_type");
    sessionStorage.removeItem("table_id");
    sessionStorage.removeItem("delivery_user_id");
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("pending_order_info");
    setPendingOrderLoaded(false);
    navigate("/");
  };

  console.log("📋 OrderPage Current Items:", currentOrderItems);
  console.log("🎯 OrderPage Order Type:", currentOrderType);

  return (
    <div
      className="flex flex-col lg:flex-row gap-4 p-4 w-full h-full"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="w-full lg:w-[70%] flex-1 min-h-0 lg:h-full overflow-hidden">
        <Item
          onAddToOrder={handleAddItem}
          fetchEndpoint={fetchEndpoint}
          onClose={handleClose}
          refreshCartData={refreshCartData}
          orderItems={currentOrderItems}
        />
      </div>
      <div className="w-full lg:w-[30%] flex-1 min-h-0 lg:h-full overflow-y-auto">
        <Card
          key={refreshTrigger}
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          allowQuantityEdit={allowQuantityEdit}
          orderType={currentOrderType}
          clearOrderData={clearOrderData}
          tableId={currentTableId}
          userId={currentUserId}
          isLoading={dineInLoading || isLoading}
          discountData={discountData}
        />
      </div>
    </div>
  );
}
