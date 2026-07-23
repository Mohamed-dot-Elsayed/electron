import { toast } from "react-toastify";
import { buildProductPayload } from "@/services/productProcessor";
import { PREPARATION_STATUSES } from "../constants";

export function useOrderActions({
  orderItems,
  updateOrderItems,
  tableId,
  postData,
  navigate,
  t,
  setItemLoadingStates,
}) {
  const handleIncrease = (itemTempId) => {
    const updatedItems = orderItems.map((item) =>
      item.temp_id === itemTempId ? { ...item, count: (item.count || 0) + 1 } : item
    );
    updateOrderItems(updatedItems);
  };

  const handleDecrease = (itemTempId) => {
    const updatedItems = orderItems
      .map((item) => {
        if (item.temp_id === itemTempId) {
          const newCount = (item.count || 0) - 1;
          return newCount > 0 || item.preparation_status === "done"
            ? { ...item, count: Math.max(newCount, 1) }
            : null;
        }
        return item;
      })
      .filter(Boolean);
    updateOrderItems(updatedItems);
  };

  const handleRemoveFrontOnly = (temp_id) => {
    const updatedItems = orderItems.filter((item) => item.temp_id !== temp_id);
    updateOrderItems(updatedItems);
    toast.success(t("Itemremovedsuccessfully"));
  };

  const handleUpdatePreparationStatus = async (itemTempId) => {
    const itemToUpdate = orderItems.find((item) => item.temp_id === itemTempId);

    if (!itemToUpdate) {
      toast.error("المنتج غير موجود");
      return;
    }

    if (!itemToUpdate.cart_id) {
      toast.error("لا يمكن تحديث الحالة: المنتج غير موجود على الخادم");
      return;
    }

    const currentStatus = itemToUpdate.preparation_status || "pending";
    const nextStatus = PREPARATION_STATUSES[currentStatus]?.nextStatus;

    if (!nextStatus || !PREPARATION_STATUSES[nextStatus]?.canSendToAPI) {
      toast.info("لا يمكن تحديث هذه الحالة الآن");
      return;
    }

    setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: true }));

    const formData = new FormData();
    formData.append("table_id", tableId);

    const cartIds = Array.isArray(itemToUpdate.cart_id)
      ? itemToUpdate.cart_id
      : [itemToUpdate.cart_id.toString()];

    cartIds.forEach((id, index) => {
      formData.append(`preparing[${index}][cart_id]`, id);
      formData.append(
        `preparing[${index}][status]`,
        PREPARATION_STATUSES[nextStatus].apiValue || nextStatus
      );
    });

    try {
      await postData("cashier/preparing", formData);

      const updatedItems = orderItems.map((item) =>
        item.temp_id === itemTempId
          ? { ...item, preparation_status: nextStatus }
          : item
      );

      updateOrderItems(updatedItems);
      toast.success(`تم تحديث الحالة إلى ${PREPARATION_STATUSES[nextStatus].label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تحديث الحالة");
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: false }));
    }
  };

  const confirmVoidItem = async (
    voidItemId,
    managerId,
    managerPassword,
    onSuccess
  ) => {
    const itemToVoid = orderItems.find((item) => item.temp_id === voidItemId);
    if (!itemToVoid?.cart_id || !tableId || !managerId || !managerPassword) {
      setTimeout(() => {
        toast.error(t("PleasefillinallrequiredfieldsManagerIDandPassword"));
      }, 100);
      return;
    }

    setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: true }));

    const formData = new FormData();
    const cartIds = Array.isArray(itemToVoid.cart_id)
      ? itemToVoid.cart_id
      : typeof itemToVoid.cart_id === "string"
      ? itemToVoid.cart_id.split(",").map((id) => id.trim())
      : [itemToVoid.cart_id];

    cartIds.forEach((id) => formData.append("cart_ids[]", id.toString()));
    formData.append("manager_id", managerId);
    formData.append("manager_password", managerPassword);
    formData.append("table_id", tableId.toString());

    try {
      await postData("cashier/order_void", formData);

      const updatedItems = orderItems.filter((item) => item.temp_id !== voidItemId);
      updateOrderItems(updatedItems);

      setTimeout(() => {
        toast.success(t("Itemvoidedsuccessfully"));
      }, 100);

      onSuccess();
    } catch (err) {
      let errorMessage = "Failed to void item.";

      if (err.response) {
        const { status, data } = err.response;
        if (data?.errors) {
          errorMessage = data.errors;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if ([401, 403, 400].includes(status)) {
          errorMessage = t("InvalidManagerIDorPasswordAccessdenied");
        }
      }

      setTimeout(() => {
        toast.error(errorMessage);
      }, 100);
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: false }));
    }
  };

  const applyBulkStatus = async (
    selectedItems,
    bulkStatus,
    setBulkStatus,
    setSelectedItems
  ) => {
    if (!bulkStatus || selectedItems.length === 0 || !tableId) {
      toast.warning(
        t("PleaseselectitemschooseastatusandensureaTableIDisset")
      );
      return;
    }

    const itemsToUpdate = orderItems.filter((item) =>
      selectedItems.includes(item.temp_id)
    );

    if (itemsToUpdate.length === 0) {
      toast.warning(t("Novaliditemstoupdate"));
      return;
    }

    const itemsForApi = itemsToUpdate.filter(
      (item) => PREPARATION_STATUSES[bulkStatus]?.canSendToAPI && item.cart_id
    );

    if (itemsForApi.length > 0) {
      const formData = new FormData();
      formData.append("table_id", tableId.toString());
      itemsForApi.forEach((item, index) => {
        formData.append(`preparing[${index}][cart_id]`, item.cart_id.toString());
        formData.append(
          `preparing[${index}][status]`,
          PREPARATION_STATUSES[bulkStatus].apiValue
        );
      });

      try {
        await postData("cashier/preparing", formData);
        toast.success(
          `Successfully updated ${itemsForApi.length} items to ${PREPARATION_STATUSES[bulkStatus].label}`
        );
      } catch (err) {
        toast.error(err.response?.data?.message || t("Failedtoupdatestatus"));
        return;
      }
    }

    const updatedItems = orderItems.map((item) =>
      selectedItems.includes(item.temp_id)
        ? { ...item, preparation_status: bulkStatus }
        : item
    );
    updateOrderItems(updatedItems);
    setSelectedItems([]);
    setBulkStatus("");
  };

  const handleTransferOrder = () => {
    const allCartIds = orderItems.map((item) => item.cart_id).filter(Boolean);

    if (!tableId || allCartIds.length === 0) {
      toast.error(t("CannottransferorderTableIDorCartIDsaremissing"));
      return;
    }

    sessionStorage.setItem("transfer_cart_ids", JSON.stringify(allCartIds));
    sessionStorage.setItem("transfer_source_table_id", tableId.toString());
    sessionStorage.setItem("transfer_pending", "true");

    toast.info(t("Pleaseselectanewtabletotransfertheorder"));

    navigate("/", {
      state: {
        initiateTransfer: true,
        sourceTableId: tableId,
        cartIds: allCartIds,
        timestamp: Date.now(),
      },
      replace: false,
    });
  };

const handleSaveAsPending = async (amountToPay, order_tax) => {
  if (orderItems.length === 0) {
    toast.warning(t("Noitemstosaveaspending"));
    return;
  }

  const productsToSend = orderItems.map(buildProductPayload);

  const payload = {
    customer_id: sessionStorage.getItem("customer_id") || null, // أو خديه من state
    order_pending: 1, // أو 0 حسب اللي عايزاه
    grand_total: amountToPay.toString(),
    products: productsToSend,
    bundles: [],
    account_id: [],
    order_tax: order_tax > 0 ? "68e618dcdfe31bffaf5299d0" : null, // أو الـ id الفعلي بتاع الـ tax
    order_discount: null,        // أو الـ id لو فيه خصم
    coupon_id: null,             // أو الـ id لو فيه كوبون
    gift_card_id: null,          // أو الـ id لو فيه كارت هدايا
  };

  // إزالة أي key قيمتها null (اختياري حسب الـ API)
  Object.keys(payload).forEach(key => {
    if (payload[key] === null || payload[key] === undefined) {
      delete payload[key];
    }
  });

  try {
    await postData("api/pos/sales", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });

    toast.success(t("Ordersavedaspending"));
    updateOrderItems([]);
    sessionStorage.removeItem("cart");
  } catch (e) {
    toast.error(e.response?.data?.message || t("Failedtosaveaspending"));
  }
};

  return {
    handleIncrease,
    handleDecrease,
    handleRemoveFrontOnly,
    handleUpdatePreparationStatus,
    confirmVoidItem,
    applyBulkStatus,
    handleTransferOrder,
    handleSaveAsPending,
  };
}