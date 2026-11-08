import React, { useState, useEffect, useCallback, useMemo } from "react";

import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

// 1. دالة ذكية لتحديد الحالة الابتدائية فور تحميل الصفحة
const getInitialState = (locationState) => {
  // الأولوية القصوى: إذا كان هناك طلب معلق قادم من صفحة الـ Pending
  if (locationState?.pendingOrder) {
    return {
      tabValue: "take_away",
      orderType: "take_away",
      tableId: null,
      deliveryUserId: null,
      isTransferring: false,
      transferSourceTableId: null,
      transferCartIds: null,
      pendingOrderData: locationState.pendingOrder, // تخزين بيانات الطلب القادم
    };
  }

  // الحالة الطبيعية: القراءة من التخزين المؤقت (sessionStorage)
  const storedOrderType = sessionStorage.getItem("order_type") || "take_away";
  const storedTab = sessionStorage.getItem("tab") || storedOrderType;
  const storedTableId = sessionStorage.getItem("table_id") || null;
  const storedDeliveryUserId = sessionStorage.getItem("selected_user_id") || null;
  const transferSourceTableId = sessionStorage.getItem("transfer_source_table_id") || null;
  const transferCartIds = JSON.parse(sessionStorage.getItem("transfer_cart_ids")) || null;
  const isTransferring = !!(transferSourceTableId && transferCartIds && transferCartIds.length > 0);

  return {
    tabValue: storedTab,
    orderType: storedOrderType,
    tableId: storedTableId,
    deliveryUserId: storedDeliveryUserId,
    isTransferring,
    transferSourceTableId,
    transferCartIds,
    pendingOrderData: null,
  };
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // ضبط الحالة الابتدائية باستخدام location.state
  const [state, setState] = useState(() => getInitialState(location.state));

  // 2. مراقبة التغييرات في الرابط (خاصة عند الانتقال من صفحات أخرى)
  useEffect(() => {
    const { state: locationState } = location;

    // حالة (A): وصول طلب معلق
    if (locationState?.pendingOrder) {
      setState((prevState) => ({
        ...prevState,
        orderType: "take_away",
        tabValue: "take_away",
        pendingOrderData: locationState.pendingOrder,
      }));
      // تنظيف الـ state من الرابط لمنع تكرار التحميل عند عمل Refresh
      window.history.replaceState({}, document.title);
      return;
    }

    // حالة (B): إعادة طلب سابق (Repeated Order)
    if (locationState?.repeatedOrder && locationState?.tabValue === "take_away") {
      setState((prevState) => ({
        ...prevState,
        orderType: "take_away",
        tabValue: "take_away",
      }));
      return;
    }

    // حالة (C): اختيار عميل دليفري
    if (locationState?.userId) {
      setState((prevState) => ({
        ...prevState,
        deliveryUserId: locationState.userId,
        orderType: locationState.orderType || "delivery",
        tabValue: locationState.orderType || "delivery",
      }));
      return;
    }
  }, [location]);

  // دالة لاختيار الطاولة (خاصة بقسم Dine-In)
  const handleTableSelect = useCallback((tableObj) => {
    const newTableId = typeof tableObj === 'object' ? tableObj.id : tableObj;
    setState((prevState) => ({
      ...prevState,
      tableId: newTableId,
      orderType: "dine_in",
      tabValue: "dine_in",
    }));
    sessionStorage.setItem("table_id", newTableId);
    sessionStorage.setItem("tab", "dine_in");
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center w-full">

      {/* 1. قسم السفري (TakeAway) - يعرض الطلب المعلق إذا وجد */}
      {state.tabValue === "take_away" && (
        <TakeAway
          orderType={state.orderType}
          pendingOrderData={state.pendingOrderData}
        />
      )}



    </div>
  );
}