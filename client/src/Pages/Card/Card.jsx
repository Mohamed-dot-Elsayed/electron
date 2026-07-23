// ============================================
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { usePost } from "@/Hooks/usePost";

// Component
import Loading from "@/components/Loading";
import CheckOut from "../Checkout/CheckOut";
import CardHeader from "./CardHeader";
import BulkActionsBar from "./BulkActionsBar";
import OrderTable from "./OrderTable";
import DoneItemsSection from "./DoneItemsSection";
import OrderSummary from "./OrderSummary";
import OfferModal from "./OfferModal";
import DealModal from "./DealModal";
import VoidItemModal from "./VoidItemModal";
import ClearAllConfirmModal from "./ClearAllConfirmModal";
import ClearAllManagerModal from "./ClearAllManagerModal";

// Hooks & Utils
import { useOrderCalculations } from "./Hooks/useOrderCalculations";
import { useOrderActions } from "./Hooks/useOrderActions";
import { useOfferManagement } from "./Hooks/useOfferManagement";
import { useDealManagement } from "./Hooks/useDealManagement";
import { OTHER_CHARGE } from "./constants";
import { useServiceFee } from "./Hooks/useServiceFee";
export default function Card({
  orderItems,
  updateOrderItems,
  allowQuantityEdit = true,
  orderType,
  tableId,
}) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { loading: apiLoading, postData } = usePost();

  // State Management
  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedPaymentItems, setSelectedPaymentItems] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [itemLoadingStates, setItemLoadingStates] = useState({});
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true); // ← جديد
  // Preset discount values from card panel
  const [presetFreeDiscount, setPresetFreeDiscount] = useState("");
  const [presetDiscountId, setPresetDiscountId] = useState(null);
  const [presetAppliedDiscount, setPresetAppliedDiscount] = useState(0);
  const [presetDiscountCode, setPresetDiscountCode] = useState("");
  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidItemId, setVoidItemId] = useState(null);
  const [managerId, setManagerId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  // Clear All Modals
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showClearAllManagerModal, setShowClearAllManagerModal] =
    useState(false);
  const [clearAllManagerId, setClearAllManagerId] = useState("");
  const [clearAllManagerPassword, setClearAllManagerPassword] = useState("");
  const { data: serviceFeeData } =
    useServiceFee();
  // Custom Hooks
  const calculations = useOrderCalculations(
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData
  );
  const offerManagement = useOfferManagement(
    orderItems,
    updateOrderItems,
    postData,
    t
  );
  const dealManagement = useDealManagement(orderItems, updateOrderItems, t);
  const orderActions = useOrderActions({
    orderItems,
    updateOrderItems,
    tableId,
    orderType,
    postData,
    navigate,
    t,
    itemLoadingStates,
    setItemLoadingStates,
  });
  const allItemsDone =
    orderType === "dine_in" &&
    orderItems.length > 0 &&
    calculations.doneItems.length === orderItems.length;
  const printRef = useRef();
  // Add temp_id to items if missing
  useEffect(() => {
    const needsUpdate = orderItems.some((item) => !item.temp_id);
    if (needsUpdate) {
      const updatedItemsWithTempId = orderItems.map((item) => ({
        ...item,
        temp_id:
          item.temp_id ||
          `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      updateOrderItems(updatedItemsWithTempId);
    }
  }, [orderItems]);

  const clearCart = () => {
    updateOrderItems([]);
    sessionStorage.removeItem("cart");
    setSelectedItems([]);
    setSelectedPaymentItems([]);
    toast.success(t("Allitemsclearedfromtheorder"));
  };
  // Clear cart function
  const clearPaidItemsOnly = () => {
    // نحذف بس العناصر اللي تم اختيارها للدفع (selectedPaymentItems)
    const paidItemIds = new Set(selectedPaymentItems);

    const remainingItems = orderItems.filter(
      (item) => !paidItemIds.has(item.temp_id)
    );

    // نعمل تحديث للسلة بالعناصر الباقية فقط
    updateOrderItems(remainingItems);

    // نحدث sessionStorage بالباقي
    if (remainingItems.length > 0) {
      sessionStorage.setItem("cart", JSON.stringify(remainingItems));
    } else {
      sessionStorage.removeItem("cart");
    }

    // نرست التحديدات
    setSelectedItems([]);
    setSelectedPaymentItems([]);

    toast.success(
      remainingItems.length > 0
        ? t("PaiditemshavebeenremovedRemainingitemsstillintheorder")
        : t("Allselecteditemshavebeenpaidandremoved")
    );
  };

  // Handlers
  const handleCheckOut = (print = true) => {
    setShouldPrintReceipt(print);   // نحفظ هل نطبع أم لا
    setShowModal(true);             // نفتح المودال
  };

  const handleClearAllItems = () => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstoclear"));
      return;
    }

    if (orderType === "dine_in" && hasAnyItemInPreparationOrLater()) {
      // فيه عناصر بدأت → يطلب مدير
      setShowClearAllManagerModal(true);
    } else {
      // كله لسة Pending → يمسح عادي
      setShowClearAllConfirm(true);
    }
  };

  const confirmClearAllWithManager = async () => {
    if (!clearAllManagerId || !clearAllManagerPassword) {
      toast.error(t("PleasefillinallrequiredfieldsManagerIDandPassword"));
      return;
    }

    const allValidCartIds = orderItems
      .flatMap((item) => {
        if (Array.isArray(item.cart_id)) return item.cart_id;
        if (typeof item.cart_id === "string")
          return item.cart_id.split(",").map((id) => id.trim());
        if (item.cart_id) return [item.cart_id.toString()];
        return [];
      })
      .filter(Boolean);

    if (allValidCartIds.length === 0) {
      toast.error(t("Noitemswithcartidtovoid"));
      return;
    }

    const formData = new FormData();
    allValidCartIds.forEach((id) => formData.append("cart_ids[]", id));
    formData.append("manager_id", clearAllManagerId);
    formData.append("manager_password", clearAllManagerPassword);
    formData.append("table_id", tableId.toString());

    try {
      setItemLoadingStates((prev) => ({ ...prev, clearAll: true }));
      await postData("cashier/order_void", formData);
      clearPaidItemsOnly();
      toast.success(t("Allitemsvoidedsuccessfully"));
      setShowClearAllManagerModal(false);
      setClearAllManagerId("");
      setClearAllManagerPassword("");
    } catch (err) {
      let errorMessage = t("Failedtovoidallitems");
      if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage = t("InvalidManagerIDorPasswordAccessdenied");
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, clearAll: false }));
    }
  };
  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
    <html>
      <head>
        <title>Print Order</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const hasAnyItemInPreparationOrLater = () => {
    return orderItems.some(item => {
      const status = item.preparation_status || "Pending";
      return ["preparing", "pick_up", "done"].includes(status);
    });
  };

  return (
    <div
      ref={printRef}
      className={`flex flex-col h-full ${isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
        }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header Section */}
      <CardHeader
        orderType={orderType}
        orderItems={orderItems}
        handleClearAllItems={handleClearAllItems}
        handleViewOrders={() => navigate("/orders")}
        handleViewPendingOrders={() => navigate("/pending-orders")}
        onSaveAsPending={() => orderActions.handleSaveAsPending(calculations.amountToPay, calculations.order_tax)}
        onShowOfferModal={() => offerManagement.setShowOfferModal(true)}
        onShowDealModal={() => dealManagement.setShowDealModal(true)}
        isLoading={apiLoading}
        t={t}
      />

      {/* Bulk Actions Bar (Dine-in only) */}
      {orderType === "dine_in" && (
        <BulkActionsBar
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          selectedItems={selectedItems}
          onApplyStatus={() =>
            orderActions.applyBulkStatus(
              selectedItems,
              bulkStatus,
              setBulkStatus,
              setSelectedItems
            )
          }
          onTransferOrder={orderActions.handleTransferOrder}
          isLoading={apiLoading}
          currentLowestStatus={calculations.currentLowestSelectedStatus}
          t={t}
        />
      )}

      {/* Order Table */}
      <div className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {apiLoading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}

        <OrderTable
          orderItems={orderItems}
          orderType={orderType}
          selectedItems={selectedItems}
          selectedPaymentItems={selectedPaymentItems}
          onToggleSelectItem={(id) =>
            setSelectedItems((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onToggleSelectPaymentItem={(id) =>
            setSelectedPaymentItems((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onSelectAll={() => {
            const allIds = orderItems.map((item) => item.temp_id);
            setSelectedItems((prev) =>
              prev.length === allIds.length ? [] : allIds
            );
          }}
          onIncrease={orderActions.handleIncrease}
          onDecrease={orderActions.handleDecrease}
          onUpdateStatus={orderActions.handleUpdatePreparationStatus}
          onVoidItem={(itemId) => {
            const item = orderItems.find(i => i.temp_id === itemId);
            const status = item?.preparation_status || "Pending";

            if (orderType === "dine_in" && ["preparing", "pick_up", "done"].includes(status)) {
              // بدأ التحضير → يطلب مدير
              setVoidItemId(itemId);
              setShowVoidModal(true);
            } else {
              // لسة Pending أو Waiting → يمسح فورًا بدون باسوورد
              orderActions.handleRemoveFrontOnly(itemId); // أو أي دالة بتمسح من الواجهة فقط
              // أو لو عايزة تعمل void للـ backend برضو بدون باسوورد:
              // orderActions.confirmVoidItem(itemId, null, null, () => {});
            }
          }}
          onRemoveFrontOnly={orderActions.handleRemoveFrontOnly}
          allowQuantityEdit={allowQuantityEdit}
          itemLoadingStates={itemLoadingStates}
          updateOrderItems={updateOrderItems}
          t={t}
        />

        {/* Done Items Section (Dine-in only) */}
        {orderType === "dine_in" && calculations.doneItems.length > 0 && (
          <DoneItemsSection
            doneItems={calculations.doneItems}
            selectedPaymentItems={selectedPaymentItems}
            handleSelectAllPaymentItems={() => {
              const allDoneIds = calculations.doneItems.map(
                (item) => item.temp_id
              );
              setSelectedPaymentItems((prev) =>
                prev.length === allDoneIds.length ? [] : allDoneIds
              );
            }}
          />
        )}
      </div>

      {/* Order Summary */}
      <OrderSummary
        orderType={orderType}
        subTotal={calculations.subTotal}
        order_tax={calculations.order_tax}
        totalOtherCharge={calculations.totalOtherCharge}
        serviceFeeData={serviceFeeData}
        taxDetails={calculations.taxDetails}
        totalAmountDisplay={calculations.totalAmountDisplay}
        amountToPay={calculations.amountToPay}
        selectedPaymentCount={selectedPaymentItems.length}
        onCheckout={handleCheckOut}
        onSaveAsPending={() => orderActions.handleSaveAsPending(calculations.amountToPay, calculations.order_tax)}
        offerManagement={offerManagement}   // ده المهم
        isLoading={apiLoading}
        orderItemsLength={orderItems.length}
        allItemsDone={allItemsDone}
        t={t}
        onPrint={handlePrint}
        orderItems={orderItems}
        tableId={tableId}
        onSetFreeDiscount={setPresetFreeDiscount}
        onSetDiscountId={setPresetDiscountId}
        onSetAppliedDiscount={setPresetAppliedDiscount}
        onSetDiscountCode={setPresetDiscountCode}
        presetDiscountId={presetDiscountId}
        presetAppliedDiscount={presetAppliedDiscount}
        presetFreeDiscount={presetFreeDiscount}
      />

      {/* Modals */}
      <VoidItemModal
        open={showVoidModal}
        onOpenChange={setShowVoidModal}
        managerId={managerId}
        setManagerId={setManagerId}
        managerPassword={managerPassword}
        setManagerPassword={setManagerPassword}
        confirmVoidItem={() =>
          orderActions.confirmVoidItem(
            voidItemId,
            managerId,
            managerPassword,
            () => {
              setShowVoidModal(false);
              setManagerId("");
              setManagerPassword("");
              setVoidItemId(null);
            }
          )
        }
        isLoading={apiLoading}
      />

      <ClearAllConfirmModal
        open={showClearAllConfirm}
        onOpenChange={setShowClearAllConfirm}
        onConfirm={() => {
          updateOrderItems([]);                    // نمسح الكل من السلة
          sessionStorage.removeItem("cart");       // نمسح من الـ session
          setSelectedItems([]);                    // نرست التحديد
          setSelectedPaymentItems([]);             // نرست تحديد الدفع
          toast.success(t("Allitemsclearedfromtheorder"));
          setShowClearAllConfirm(false);
        }}
        itemCount={orderItems.length}
        t={t}
      />

      <ClearAllManagerModal
        open={showClearAllManagerModal}
        onOpenChange={setShowClearAllManagerModal}
        managerId={clearAllManagerId}
        setManagerId={setClearAllManagerId}
        managerPassword={clearAllManagerPassword}
        setManagerPassword={setClearAllManagerPassword}
        onConfirm={confirmClearAllWithManager}
        isLoading={itemLoadingStates.clearAll}
        t={t}
      />

      <OfferModal
        isOpen={offerManagement.showOfferModal}
        onClose={() => offerManagement.setShowOfferModal(false)}
        offerCode={offerManagement.offerCode}
        setOfferCode={offerManagement.setOfferCode}
        onApply={offerManagement.handleApplyOffer}
        pendingApproval={offerManagement.pendingOfferApproval}
        onApprove={offerManagement.handleApproveOffer}
        onCancelApproval={() => {
          offerManagement.setPendingOfferApproval(null);
          offerManagement.setOfferCode("");
        }}
        isLoading={apiLoading}
        t={t}
      />

      <DealModal
        isOpen={dealManagement.showDealModal}
        onClose={() => dealManagement.setShowDealModal(false)}
        dealCode={dealManagement.dealCode}
        setDealCode={dealManagement.setDealCode}
        onApply={dealManagement.handleApplyDeal}
        pendingApproval={dealManagement.pendingDealApproval}
        onApprove={dealManagement.handleApproveDeal}
        onCancelApproval={() => {
          dealManagement.setPendingDealApproval(null);
          dealManagement.setDealCode("");
        }}
        isLoading={apiLoading}
        t={t}
      />

      {showModal && (
        <CheckOut
          totalDineInItems={orderItems.length}
          onClose={() => setShowModal(false)}
          amountToPay={calculations.amountToPay}
          orderItems={calculations.checkoutItems}
          updateOrderItems={updateOrderItems}
          order_tax={calculations.order_tax}
          totalDiscount={OTHER_CHARGE}
          notes="Customer requested no plastic bag."
          source="web"
          orderType={orderType}
          tableId={tableId}
          onClearCart={clearCart}
          clearPaidItemsOnly={clearPaidItemsOnly}
          selectedPaymentItemIds={selectedPaymentItems}
          service_fees={calculations.totalOtherCharge}
          shouldPrintReceipt={shouldPrintReceipt}
          initialFreeDiscount={presetFreeDiscount}
          initialDiscountId={presetDiscountId}
          initialAppliedDiscount={presetAppliedDiscount}
          initialDiscountCode={presetDiscountCode}
        />
      )}

      <div style={{ display: "none" }}>
        <div ref={printRef} className="print-area">
          <h2 style={{ textAlign: "center" }}>Order Summary</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Product</th>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Qty</th>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Price</th>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.temp_id}>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{item.name}</td>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{item.quantity}</td>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{item.price.toFixed(2)}</td>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px", textAlign: "right" }}>
            <p>Tax: {calculations.order_tax.toFixed(2)}</p>
            <p>Service Fee: {calculations.totalOtherCharge.toFixed(2)}</p>
            <p><strong>Total: {calculations.amountToPay.toFixed(2)}</strong></p>
          </div>
        </div>
      </div>

    </div>
  );
}
