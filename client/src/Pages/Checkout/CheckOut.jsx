import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePosSelections } from "@/Hooks/usePosSelections";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import CustomerSelectionModal from "./CustomerSelectionModal";
import {
  buildFinancialsPayload,
  getOrderEndpoint,
  buildOrderPayload,
  buildDealPayload,
  validatePaymentSplits,
} from "./processProductItem";
import {
  prepareReceiptData,
  printReceiptSilently,
} from "../utils/printReceipt";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import FreeDiscountPasswordModal from "./FreeDiscountPasswordModal";
import { useDiscountCalculation } from "@/Hooks/useDiscountCalculation";

const roundCurrency = (v) =>
  Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const computeBackendGrandTotal = ({
  subtotal,
  discountData,
  couponData,
  taxData,
  giftCardAmount = 0,
  freeDiscountAmount = 0,
  serviceFeeTotal = 0,
  shipping = 0,
}) => {
  const sub = Number(subtotal) || 0;

  let discountAmount = 0;
  if (discountData) {
    discountAmount =
      discountData.type === "percentage"
        ? roundCurrency(sub * Number(discountData.amount || 0))
        : roundCurrency(Number(discountData.amount || 0));
  }

  let couponAmount = 0;
  if (couponData) {
    couponAmount =
      couponData.type === "percentage"
        ? roundCurrency((sub * Number(couponData.amount || 0)) / 100)
        : roundCurrency(Number(couponData.amount || 0));
  }

  // ✅ الخصم اليدوي (Free discount) — نفس منطق الباك إند
  const requestedFreeDiscount = roundCurrency(
    Math.max(0, Number(freeDiscountAmount) || 0),
  );
  const maxFreeDiscount = Math.max(
    0,
    roundCurrency(sub - discountAmount - couponAmount),
  );
  const appliedFreeDiscount = roundCurrency(
    Math.min(requestedFreeDiscount, maxFreeDiscount),
  );

  let taxAmount = 0;
  if (taxData) {
    taxAmount =
      taxData.type === "percentage"
        ? roundCurrency(sub * Number(taxData.amount || 0))
        : roundCurrency(Number(taxData.amount || 0));
  }

  const raw =
    sub -
    discountAmount -
    couponAmount -
    appliedFreeDiscount -
    Number(giftCardAmount || 0) +
    Number(serviceFeeTotal || 0) +
    taxAmount +
    Number(shipping || 0);

  return {
    discountAmount,
    freeDiscountAmount: appliedFreeDiscount,
    totalDiscountAmount: roundCurrency(discountAmount + appliedFreeDiscount),
    couponAmount,
    taxAmount,
    grandTotal: roundCurrency(Math.max(0, raw)),
  };
};

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  order_tax,
  totalDiscount,
  selectedPaymentItemIds = [],
  onClearCart,
  shouldPrintReceipt = true,
  shouldSendWhatsapp = false,
  initialFreeDiscount = "",
  initialDiscountId = null,
  initialDiscountData = null,
  initialAppliedDiscount = 0,
  initialDiscountCode = "",
}) => {
  const cashierId = sessionStorage.getItem("cashier_id");
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const { data: groupData } = useGet("cashier/group_product");
  const groupProducts = groupData?.group_product || [];
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingFreeDiscountPassword, setPendingFreeDiscountPassword] =
    useState("");

  const isDueModuleAllowed = (() => {
    if (!groupProducts || groupProducts.length === 0) return false;
    const lastSelectedGroupId = sessionStorage.getItem("last_selected_group");
    if (!lastSelectedGroupId || lastSelectedGroupId === "all") return false;
    const groupId = parseInt(lastSelectedGroupId);
    if (isNaN(groupId)) return false;
    const selectedGroup = groupProducts.find((g) => g.id === groupId);
    return selectedGroup?.Due === 1;
  })();

  const { data: taxesData } = useGet("api/admin/pos-home/taxes");
  const { data: nextInvoiceRes } = useGet(
    "api/admin/pos/sales/next-invoice-number",
  );
  const nextInvoiceNumber =
    nextInvoiceRes?.data?.dailyOrderNumber || nextInvoiceRes?.dailyOrderNumber;

  // ═══════════════════════════════════════════════════════════
  // ✅ جلب الـ Service Fees من الباك (إجبارية من الأدمن)
  // ═══════════════════════════════════════════════════════════
  const { data: serviceFeesData } = useGet("api/admin/pos-home/service-fees");
  const availableServiceFees = useMemo(() => {
    const raw = serviceFeesData?.data?.data || serviceFeesData?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [serviceFeesData]);

  // ═══════════════════════════════════════════════════════════
  // ✅ جلب قائمة Discounts
  // ═══════════════════════════════════════════════════════════
  const { data: discountsData } = useGet("api/admin/discount");
  const availableDiscounts = useMemo(() => {
    // الـ API بيرجّع { success, data: { message, discounts: [...] } }
    const raw =
      discountsData?.data?.discounts ||
      discountsData?.data?.data ||
      discountsData?.discounts ||
      (Array.isArray(discountsData?.data) ? discountsData.data : null) ||
      [];
    return Array.isArray(raw) ? raw : [];
  }, [discountsData]);

  const [selectedDiscountId, setSelectedDiscountId] =
    useState(initialDiscountId);
  const [selectedTaxId, setSelectedTaxId] = useState(null);
  const [freeDiscount, setFreeDiscount] = useState(initialFreeDiscount);
  const [discountCode, setDiscountCode] = useState(initialDiscountCode);

  const [appliedCouponData, setAppliedCouponData] = useState(null);
  const [appliedDiscountData, setAppliedDiscountData] = useState(null);

  // ═══════════════════════════════════════════════════════════
  // ✅ استخراج بيانات الـ Discount
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedDiscountId) {
      setAppliedDiscountData(null);
      return;
    }

    const found = availableDiscounts.find(
      (d) => String(d._id) === String(selectedDiscountId),
    );

    if (found) {
      let normalizedAmount = Number(found.amount);
      if (found.type === "percentage" && normalizedAmount > 1) {
        normalizedAmount = normalizedAmount / 100;
      }
      setAppliedDiscountData({
        type: found.type,
        amount: normalizedAmount,
      });
      console.log("✅ Discount loaded from list:", found);
      return;
    }

    // ✅ لو القائمة لسه بتحمّل: استخدم نفس بيانات الخصم المختار من الكارت
    if (initialDiscountData?.type) {
      setAppliedDiscountData(initialDiscountData);
      console.log("✅ Discount loaded from cart selection:", initialDiscountData);
      return;
    }

    if (initialAppliedDiscount && Number(initialAppliedDiscount) > 0) {
      let normalizedAmount = Number(initialAppliedDiscount);
      if (normalizedAmount > 1) normalizedAmount = normalizedAmount / 100;

      setAppliedDiscountData({
        type: "percentage",
        amount: normalizedAmount,
      });
      console.log(
        "✅ Discount loaded from initialAppliedDiscount:",
        normalizedAmount,
      );
      return;
    }

    // مفيش بيانات خصم → مفيش خصم (مش بنفترض 10% غلط)
    console.warn("⚠️ Discount not found in list:", selectedDiscountId);
    setAppliedDiscountData(null);
  }, [
    selectedDiscountId,
    availableDiscounts,
    initialAppliedDiscount,
    initialDiscountData,
  ]);

  const { postData, loading } = usePost();

  const [orderNotes, setOrderNotes] = useState("");
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const {
    data: customersData,
    isLoading: customerSearchLoading,
    refetch: refetchCustomers,
  } = useGet("api/admin/pos-home/customers");

  // 🔎 بحث في كل العملاء (اسم / تليفون) مع debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchCustomers(
        `api/admin/pos-home/customers?search=${encodeURIComponent(
          customerSearchQuery,
        )}`,
      ).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearchQuery]);

  const searchResults = useMemo(() => {
    const customers = customersData?.data?.data || [];
    if (!Array.isArray(customers)) return [];

    return customers.filter(
      (c) =>
        !customerSearchQuery ||
        c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone_number?.includes(customerSearchQuery),
    );
  }, [customersData, customerSearchQuery]);

  // POS-home taxes endpoint returns { data: [...] }; the admin taxes
  // endpoint returns { data: { taxes: [...] } }. Normalize both shapes.
  const taxesList = useMemo(() => {
    const payload = taxesData?.data;
    if (Array.isArray(payload)) return payload;
    return payload?.taxes || [];
  }, [taxesData]);

  const selectedTaxData = useMemo(() => {
    if (!selectedTaxId) return null;
    const tax = taxesList.find((t) => t._id === selectedTaxId);
    if (!tax) return null;

    let normalizedAmount = Number(tax.amount);
    if (tax.type === "percentage" && normalizedAmount > 1) {
      normalizedAmount = normalizedAmount / 100;
    }
    return { type: tax.type, amount: normalizedAmount };
  }, [selectedTaxId, taxesList]);

  const rawSubtotal = useMemo(() => {
    if (selectedPaymentItemIds.length > 0) {
      const selectedItems = orderItems.filter((item) =>
        selectedPaymentItemIds.includes(item.temp_id),
      );
      return roundCurrency(
        selectedItems.reduce((acc, item) => {
          const quantity = item.count ?? item.quantity ?? 1;
          return acc + item.price * quantity;
        }, 0),
      );
    }

    if (Array.isArray(orderItems) && orderItems.length > 0) {
      const fromItems = roundCurrency(
        orderItems.reduce((acc, item) => {
          const quantity = Number(item.count ?? item.quantity ?? 1);
          const price = Number(item.price) || 0;
          return acc + price * quantity;
        }, 0),
      );
      if (fromItems > 0) return fromItems;
    }

    return roundCurrency(Number(amountToPay) || 0);
  }, [amountToPay, orderItems, selectedPaymentItemIds]);

  // ═══════════════════════════════════════════════════════════
  // ✅ حساب الـ Service Fees Total
  //    (إجبارية من الأدمن + بتتضاف على كل فاتورة)
  // ═══════════════════════════════════════════════════════════
  const serviceFeesTotal = useMemo(() => {
    return roundCurrency(
      availableServiceFees.reduce((sum, fee) => {
        if (fee.type === "percentage") {
          return (
            sum + roundCurrency((rawSubtotal * Number(fee.amount || 0)) / 100)
          );
        }
        return sum + roundCurrency(Number(fee.amount || 0));
      }, 0),
    );
  }, [availableServiceFees, rawSubtotal]);

  // ✅ IDs الـ service fees (هنبعتها للباك)
  const serviceFeeIds = useMemo(() => {
    return availableServiceFees.map((fee) => String(fee._id));
  }, [availableServiceFees]);

  // ═══════════════════════════════════════════════════════════
  // ✅ compute — بنضيف service fees عشان requiredTotal = grand_total
  // ═══════════════════════════════════════════════════════════
  const computed = useMemo(() => {
    const result = computeBackendGrandTotal({
      subtotal: rawSubtotal,
      discountData: appliedDiscountData,
      couponData: appliedCouponData,
      taxData: selectedTaxData,
      giftCardAmount: 0,
      freeDiscountAmount: freeDiscount, // ✅ الخصم اليدوي
      serviceFeeTotal: serviceFeesTotal, // ✅ بنضيفها
      shipping: 0,
    });

    return {
      subtotal: rawSubtotal,
      serviceFeesTotal,
      ...result,
      requiredTotal: result.grandTotal,
    };
  }, [
    rawSubtotal,
    appliedDiscountData,
    appliedCouponData,
    selectedTaxData,
    serviceFeesTotal,
    freeDiscount,
  ]);

  const requiredTotal = computed.requiredTotal;
  const taxableAmount = roundCurrency(
    Math.max(0, rawSubtotal - computed.discountAmount - computed.couponAmount),
  );

  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // 🆕 الدفع بالتقسيط
  // ═══════════════════════════════════════════════════════════
  const [isInstallmentOrder, setIsInstallmentOrder] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [installmentDownPayment, setInstallmentDownPayment] = useState("");
  const [installmentSchedule, setInstallmentSchedule] = useState(null);
  const [installmentPreviewError, setInstallmentPreviewError] = useState(null);
  const { postData: previewInstallmentPost } = usePost();

  const { data: installmentSettingsRes } = useGet(
    "api/admin/pos/installments/settings",
  );
  const installmentSettings = installmentSettingsRes?.data?.settings;
  const installmentEnabled = installmentSettings?.enabled !== false;
  const maxInstallmentMonths = Number(
    installmentSettings?.max_installments || 12,
  );
  const minDownPaymentPercent = Number(
    installmentSettings?.min_down_payment_percent || 0,
  );

  // المبلغ المطلوب تحصيله الآن (مقدم التقسيط، أو إجمالي الفاتورة في الدفع الكامل)
  const installmentPayTarget = useMemo(() => {
    if (!isInstallmentOrder) return roundCurrency(requiredTotal);
    const down = Number(installmentDownPayment) || 0;
    return roundCurrency(
      Math.max(0, Math.min(down, Math.max(0, requiredTotal - 0.01))),
    );
  }, [isInstallmentOrder, installmentDownPayment, requiredTotal]);

  // 🧮 معاينة الخطة من الباك (نفس الحساب اللي هيتطبق فعلاً)
  useEffect(() => {
    if (!isInstallmentOrder) {
      setInstallmentSchedule(null);
      setInstallmentPreviewError(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await previewInstallmentPost(
          "api/admin/pos/installments/preview",
          {
            total: requiredTotal,
            months: Number(installmentMonths),
            down_payment: Number(installmentDownPayment) || 0,
          },
        );

        if (!cancelled) {
          setInstallmentSchedule(res?.data?.plan || null);
          setInstallmentPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setInstallmentSchedule(null);
          setInstallmentPreviewError(
            err?.response?.data?.error?.message ||
              err?.response?.data?.message ||
              t("installments.checkout.previewFailed"),
          );
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInstallmentOrder,
    installmentMonths,
    installmentDownPayment,
    requiredTotal,
  ]);

  const totalDiscountValue = useMemo(
    () => roundCurrency(rawSubtotal - taxableAmount),
    [rawSubtotal, taxableAmount],
  );

  // 🐛 DEBUG
  useEffect(() => {
    console.log("=== CHECKOUT COMPUTED ===", {
      amountToPay_from_parent: amountToPay,
      rawSubtotal_calculated: rawSubtotal,
      discountAmount: computed.discountAmount,
      couponAmount: computed.couponAmount,
      taxAmount: computed.taxAmount,
      serviceFeesTotal: computed.serviceFeesTotal,
      serviceFeeIds,
      requiredTotal,
      appliedDiscountData,
      appliedCouponData,
      selectedTaxData,
      selectedDiscountId,
      initialAppliedDiscount,
    });
  }, [
    computed,
    rawSubtotal,
    requiredTotal,
    amountToPay,
    appliedDiscountData,
    appliedCouponData,
    selectedTaxData,
    selectedDiscountId,
    initialAppliedDiscount,
    serviceFeeIds,
  ]);

  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce(
      (acc, split) => acc + (parseFloat(split.amount) || 0),
      0,
    );
    const calculatedRemaining = installmentPayTarget - sum;
    const calculatedChange = sum - installmentPayTarget;
    return {
      totalScheduled: roundCurrency(sum),
      remainingAmount:
        calculatedRemaining > 0 ? roundCurrency(calculatedRemaining) : 0,
      changeAmount: calculatedChange > 0 ? roundCurrency(calculatedChange) : 0,
    };
  }, [paymentSplits, installmentPayTarget]);

  const calculatedChange = useMemo(() => {
    const paid = parseFloat(customerPaid) || 0;
    return paid > requiredTotal ? roundCurrency(paid - requiredTotal) : 0;
  }, [customerPaid, requiredTotal]);

  const isTotalMet = totalScheduled >= installmentPayTarget;

  const { accounts: fetchedAccounts } = usePosSelections();

  useEffect(() => {
    if (
      fetchedAccounts?.length > 0 &&
      !sessionStorage.getItem("financial_accounts")
    ) {
      sessionStorage.setItem(
        "financial_accounts",
        JSON.stringify(fetchedAccounts),
      );
    }
  }, [fetchedAccounts]);

  const financialAccounts = useMemo(() => {
    const item = sessionStorage.getItem("financial_accounts");
    if (item) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed && parsed._id && parsed.name) return [parsed];
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const flat = Object.values(parsed).flat();
          if (flat.length > 0 && flat[0]._id) return flat;
        }
      } catch (e) {
        console.error("Failed to parse financial_accounts:", e);
      }
    }
    if (Array.isArray(fetchedAccounts) && fetchedAccounts.length > 0)
      return fetchedAccounts;
    return [];
  }, [fetchedAccounts]);

  // Init default split
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      installmentPayTarget > 0
    ) {
      // الأولوية لحساب Cash في كل الفروع
      const defaultAccount =
        financialAccounts.find((acc) =>
          /cash|كاش|نقدي/i.test(`${acc.name || ""} ${acc.ar_name || ""}`),
        ) || financialAccounts[0];
      const defaultAccountId = defaultAccount._id;
      setPaymentSplits([
        {
          _id: "split-1",
          account_id: defaultAccountId,
          amount: installmentPayTarget,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  }, [financialAccounts, installmentPayTarget, paymentSplits.length]);

  // Auto-update single split
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0]._id === "split-1") {
      setPaymentSplits((prev) => {
        if (
          prev.length === 1 &&
          prev[0]._id === "split-1" &&
          prev[0].amount !== installmentPayTarget
        ) {
          return prev.map((split) =>
            split._id === "split-1"
              ? { ...split, amount: installmentPayTarget || 0 }
              : split,
          );
        }
        return prev;
      });
    }
  }, [installmentPayTarget]);

  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error(t("PleaseEnterDiscountCode"));
      return;
    }
    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      const response = await postData("api/admin/pos/apply-coupon", {
        coupon_code: discountCode,
        grand_total: rawSubtotal,
      });

      if (response.success) {
        const couponData = response.data?.coupon;
        if (couponData) {
          setAppliedCouponData({
            type: couponData.type,
            amount: Number(couponData.amount),
          });
          toast.success(
            t("DiscountAppliedSuccess", { appliedDiscount: couponData.amount }),
          );
        }
      } else {
        const msg = response.error?.message || t("InvalidOrOffDiscountCode");
        setDiscountError(msg);
        toast.error(msg);
      }
    } catch (e) {
      const backendError =
        e.response?.data?.error?.message ||
        e.response?.data?.message ||
        e.message;
      setAppliedCouponData(null);
      setDiscountError(backendError);
      toast.error(backendError);
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  const handleAmountChange = (_id, value) => {
    const newAmount = parseFloat(value) || 0;
    if (newAmount < 0) {
      toast.error(t("AmountCannotBeNegative"));
      return;
    }
    setPaymentSplits((prevSplits) => {
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s._id === _id ? acc : acc + s.amount),
        0,
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;
      if (newAmount > maxAllowed) {
        toast.error(t("AmountExceedsLimit", { amount: maxAllowed.toFixed(2) }));
        return prevSplits.map((split) =>
          split._id === _id ? { ...split, amount: maxAllowed } : split,
        );
      }
      return prevSplits.map((split) =>
        split._id === _id ? { ...split, amount: newAmount } : split,
      );
    });
  };

  const handleAccountChange = (_id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id
          ? { ...split, account_id: accountId, checkout: "", transition_id: "" }
          : split,
      ),
    );
  };

  const handleDescriptionChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, checkout: value } : split,
      ),
    );
  };

  const handleTransitionIdChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, transition_id: value } : split,
      ),
    );
  };

  const handleAddSplit = () => {
    if (!financialAccounts?.length) {
      return toast.error(t("NoFinancialAccounts"));
    }
    const defaultAccountId = financialAccounts[0]._id;
    setPaymentSplits((prev) => [
      ...prev,
      {
        _id: `split-${Date.now()}`,
        account_id: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        checkout: "",
        transition_id: "",
      },
    ]);
  };

  const handleRemoveSplit = (_id) => {
    setPaymentSplits((prev) => prev.filter((s) => s._id !== _id));
  };

  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  const isVisaAccount = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.name?.toLowerCase().includes("visa");
  };

  const handleSendWhatsappOrder = async (receiptData) => {
    try {
      if (!receiptData) return;
      const isArabic = localStorage.getItem("language") === "ar";
      const targetPhone = "201210724625";

      const itemsText = (receiptData.items || [])
        .map(
          (item) =>
            `• ${item.qty}x ${
              isArabic ? item.nameAr || item.name : item.name
            } - ${item.total} ${t("EGP") || "EGP"}`,
        )
        .join("\n");

      const messageLines = [
        `🧾 *${
          receiptData.restaurantName || (isArabic ? "طلب جديد" : "New Order")
        }*`,
        `${isArabic ? "رقم الفاتورة" : "Invoice No"}: #${
          receiptData.invoiceNumber || ""
        }`,
        `${isArabic ? "التاريخ" : "Date"}: ${receiptData.dateFormatted} ${receiptData.timeFormatted}`,
        "-------------------------",
        `*${isArabic ? "تفاصيل الطلب:" : "Order Items:"}*`,
        itemsText,
        "-------------------------",
        `*${isArabic ? "الإجمالي الكلي" : "Grand Total"}: ${receiptData.total} ${t("EGP") || "EGP"}*`,
      ].filter(Boolean);

      const messageContent = messageLines.join("\n");

      const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(
        messageContent,
      )}`;
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      console.error("Error sending WhatsApp order:", err);
    }
  };

  const buildExactFinancials = () => {
    const target = roundCurrency(installmentPayTarget);

    const lines = paymentSplits
      .filter((s) => Number(s.amount) > 0)
      .map((s) => ({
        account_id: s.account_id || s.accountId,
        amount: roundCurrency(Number(s.amount)),
      }));

    if (lines.length === 0 && target > 0 && financialAccounts?.[0]?._id) {
      return [{ account_id: financialAccounts[0]._id, amount: target }];
    }

    const totalLines = roundCurrency(
      lines.reduce((sum, l) => sum + l.amount, 0),
    );
    const diff = roundCurrency(target - totalLines);

    if (Math.abs(diff) > 0.001 && lines.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].amount > lines[maxIdx].amount) maxIdx = i;
      }
      lines[maxIdx].amount = roundCurrency(lines[maxIdx].amount + diff);
      console.warn("⚠️ Adjusted financials by diff:", diff, "target:", target);
    }

    return lines;
  };

  const proceedWithOrderSubmission = async (
    Due = 0,
    customer_id = undefined,
    dueModuleValue = 0,
    forcedPassword = null,
  ) => {
    const freeDiscountValue = Math.max(0, parseFloat(freeDiscount) || 0);

    if (
      freeDiscountValue > 0 &&
      !forcedPassword &&
      !pendingFreeDiscountPassword
    ) {
      setPasswordModalOpen(true);
      return;
    }

    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const hasDealItems = safeOrderItems.some((item) => item.is_deal);
    const endpoint = getOrderEndpoint(null, safeOrderItems, hasDealItems);
    const financialsPayload = buildExactFinancials();
    const moduleId = sessionStorage.getItem("module_id");

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(safeOrderItems, financialsPayload);
    } else {
      payload = buildOrderPayload({
        orderItems: safeOrderItems,
        amountToPay: rawSubtotal,
        order_tax,
        totalDiscount,
        notes: orderNotes.trim() || "No special instructions",
        financialsPayload,
        cashierId,
        Due,
        customer_id: customer_id || selectedCustomer?._id,
        selectedTaxId: selectedTaxId,
        discount_id: selectedDiscountId,
        module_id: moduleId,
        free_discount: freeDiscountValue > 0 ? freeDiscountValue : undefined,
        due_module: dueModuleValue > 0 ? dueModuleValue.toFixed(2) : undefined,
        password: forcedPassword || pendingFreeDiscountPassword || undefined,
        coupon_code: discountCode || undefined,
        service_fee_ids: serviceFeeIds, // ✅ بنبعتها للباك
      });
    }

    // 🆕 الدفع بالتقسيط
    if (isInstallmentOrder && payload) {
      payload.payment_type = "installment";
      payload.installment = {
        months: Number(installmentMonths),
        down_payment: roundCurrency(Number(installmentDownPayment) || 0),
      };
    }

    const financialsSum = roundCurrency(
      financialsPayload.reduce((s, f) => s + Number(f.amount), 0),
    );
    console.log("=== SENDING PAYLOAD ===", {
      rawSubtotal_used: rawSubtotal,
      computed_discountAmount: computed.discountAmount,
      computed_serviceFees: computed.serviceFeesTotal,
      serviceFeeIds,
      requiredTotal,
      financialsSum,
      match: Math.abs(financialsSum - requiredTotal) < 0.001,
      appliedDiscountData,
      appliedCouponData,
      selectedTaxData,
      payload,
    });

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        const planNumber =
          response?.data?.installment_plan?.plan_number ||
          response?.installment_plan?.plan_number;

        toast.success(
          Due === 1
            ? t("DueOrderCreated")
            : planNumber
              ? t("installments.checkout.created", { number: planNumber })
              : t("OrderPlaced"),
        );
        setPendingFreeDiscountPassword("");

        const completeOrder = () => {
          sessionStorage.removeItem("selected_customer_id");
          window.dispatchEvent(new CustomEvent("reset_selected_customer"));
          window.dispatchEvent(new CustomEvent("refresh_pos_products"));
          queryClient.invalidateQueries({ queryKey: ["categoryProducts"] });
          queryClient.invalidateQueries({ queryKey: ["featured"] });
          queryClient.invalidateQueries({ queryKey: ["brandProducts"] });
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          onClearCart?.();
          onClose();
        };

        if (Due === 0) {
          const receiptData = prepareReceiptData(
            safeOrderItems,
            rawSubtotal,
            order_tax,
            totalDiscount,
            appliedDiscountData?.amount || 0,
            {},
            null,
            requiredTotal,
            response.success,
            response,
            0,
            serviceFeesTotal,
          );

          if (shouldSendWhatsapp) handleSendWhatsappOrder(receiptData);

          if (shouldPrintReceipt) {
            printReceiptSilently(receiptData, response, () => {
              completeOrder();
              toast.success(`${t("OrderCompletedSuccessfully")} — Ref: ${response?.sale?.reference || receiptData?.referenceNumber || ""}`);
            });
          } else {
            completeOrder();
            toast.success(`${t("OrderCompletedSuccessfully")} — Ref: ${response?.sale?.reference || receiptData?.referenceNumber || ""}`);
          }
        } else {
          completeOrder();
          toast.success(`${t("OrderCompletedSuccessfully")} — Ref: ${response?.sale?.reference || ""}`);
        }
      } else {
        // لو الخصم اليدوي اترفض، لازم المستخدم يدخل الباسورد تاني
        setPendingFreeDiscountPassword("");
        toast.error(response?.message || t("FailedToProcessOrder"));
      }
    } catch (e) {
      console.error("Submit error:", e);
      setPendingFreeDiscountPassword("");

      // Permission errors already show a detailed toast from the axios
      // interceptor (which module + which action is missing).
      if (e?.isPermissionError) return;

      const message =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        t("SubmissionFailed");
      toast.error(message);
    }
  };

  const handleSelectCustomer = async (customer) => {
    if (customer.amount_Due && requiredTotal > 0) {
      const newTotalDue = customer.amount_Due + requiredTotal;
      toast.info(
        t("CustomerCurrentDue", {
          current: customer.amount_Due.toFixed(2),
          new: newTotalDue.toFixed(2),
        }),
      );
    }
    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);
    await proceedWithOrderSubmission(1, customer._id);
  };

  const handleSubmitOrder = async () => {
    if (!isTotalMet) {
      return toast.error(
        t("TotalMustEqual", { amount: installmentPayTarget.toFixed(2) }),
      );
    }

    if (!isInstallmentOrder && totalScheduled === 0) {
      return toast.error(
        t("TotalMustEqual", { amount: requiredTotal.toFixed(2) }),
      );
    }

    const validation = validatePaymentSplits(
      paymentSplits,
      getDescriptionStatus,
    );
    if (!validation.valid) {
      return toast.error(validation.error);
    }
    if (isDueOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchCustomers();
        return;
      }
      return;
    }

    // 🆕 التحقق قبل إنشاء فاتورة التقسيط
    if (isInstallmentOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchCustomers();
        return;
      }

      if (!installmentEnabled) {
        return toast.error(t("installments.checkout.notEnabled"));
      }

      if (!installmentMonths || Number(installmentMonths) < 1) {
        return toast.error(t("installments.checkout.monthsRequired"));
      }

      const down = Number(installmentDownPayment) || 0;
      if (down >= requiredTotal) {
        return toast.error(t("installments.checkout.downPaymentTooHigh"));
      }

      const minDown = roundCurrency(
        (requiredTotal * minDownPaymentPercent) / 100,
      );
      if (down < minDown) {
        return toast.error(
          t("installments.checkout.minDownPayment", {
            amount: minDown.toFixed(2),
            percent: minDownPaymentPercent,
          }),
        );
      }

      if (!installmentSchedule) {
        return toast.error(t("installments.checkout.previewPending"));
      }

      return proceedWithOrderSubmission(0, selectedCustomer._id);
    }

    await proceedWithOrderSubmission(0);
  };

  const handleCardSelect = (accountId) => {
    if (accountId === "due") {
      setIsDueOrder(true);
      setIsInstallmentOrder(false);
      return;
    }
    setIsDueOrder(false);

    // 🆕 اختيار الدفع بالتقسيط
    if (accountId === "installment") {
      setIsInstallmentOrder(true);
      setPaymentSplits([]);

      if (!installmentDownPayment) {
        const defaultDown =
          minDownPaymentPercent > 0
            ? String(
                roundCurrency((requiredTotal * minDownPaymentPercent) / 100),
              )
            : "0";
        setInstallmentDownPayment(defaultDown);
      }
      return;
    }

    if (accountId === "split") {
      handleAddSplit();
      return;
    }

    setIsInstallmentOrder(false);

    if (paymentSplits.length === 1) {
      handleAccountChange(paymentSplits[0]._id, accountId);
    } else {
      setPaymentSplits([
        {
          _id: "split-1",
          account_id: accountId,
          amount: requiredTotal,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  };

  const mainAccounts = financialAccounts.slice(0, 3);
  const extraAccounts = financialAccounts.slice(3);

  const getAccountIcon = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("vodafone")) return "📱";
    if (n.includes("instapay")) return "💳";
    if (n.includes("cash")) return "💵";
    if (n.includes("visa")) return "💳";
    return "💰";
  };

  const isCardSelected = (accountId) => {
    if (isDueOrder) return false;
    if (paymentSplits.length > 1) return false;
    return String(paymentSplits[0]?.account_id) === String(accountId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <CustomerSelectionModal
        isOpen={customerSelectionOpen}
        onClose={() => setCustomerSelectionOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        searchQuery={customerSearchQuery}
        setSearchQuery={setCustomerSearchQuery}
        customers={searchResults}
        loading={customerSearchLoading}
        requiredTotal={requiredTotal}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-800">
              {t("Checkout") || "Checkout"}
            </h2>
            {nextInvoiceNumber && (
              <span className="px-2.5 py-1 text-xs sm:text-sm font-bold bg-[#8B2635]/10 text-[#8B2635] rounded-lg border border-[#8B2635]/20">
                #{nextInvoiceNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg transition-all"
          >
            ✕
          </button>
        </div>

        <div className="px-4 sm:px-6 pb-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            {mainAccounts.map((acc) => (
              <button
                key={acc._id}
                onClick={() => handleCardSelect(String(acc._id))}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                  ${
                    isCardSelected(acc._id)
                      ? "border-[#8B2635] bg-red-50 text-[#8B2635]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <span className="text-2xl">{getAccountIcon(acc.name)}</span>
                <span className="text-xs font-medium text-center leading-tight">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            {extraAccounts.map((acc) => (
              <button
                key={acc._id}
                onClick={() => handleCardSelect(String(acc._id))}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                  ${
                    isCardSelected(acc._id)
                      ? "border-[#8B2635] bg-red-50 text-[#8B2635]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <span className="text-2xl">{getAccountIcon(acc.name)}</span>
                <span className="text-xs font-medium text-center leading-tight">
                  {acc.name}
                </span>
              </button>
            ))}

            <button
              onClick={() => handleCardSelect("due")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                ${
                  isDueOrder
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-gray-200 bg-white text-orange-500 hover:border-orange-300 hover:bg-orange-50"
                }`}
            >
              <span className="text-2xl">🕐</span>
              <span className="text-xs font-medium">{t("Due") || "Due"}</span>
            </button>

            {installmentEnabled && (
              <button
                onClick={() => handleCardSelect("installment")}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                  ${
                    isInstallmentOrder
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-amber-600 hover:border-amber-300 hover:bg-amber-50"
                  }`}
              >
                <span className="text-2xl">🧾</span>
                <span className="text-xs font-medium">
                  {t("installments.checkout.option")}
                </span>
              </button>
            )}

            <button
              onClick={() => handleCardSelect("split")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                ${
                  paymentSplits.length > 1
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-white text-blue-500 hover:border-blue-300 hover:bg-blue-50"
                }`}
            >
              <span className="text-2xl">🔀</span>
              <span className="text-xs font-medium">
                {t("Split") || "Split"}
              </span>
            </button>
          </div>

          {/* 🆕 خطة التقسيط */}
          {isInstallmentOrder && (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-800">
                  {t("installments.checkout.heading")}
                </p>
                <span className="text-[11px] text-amber-700">
                  {installmentSettings?.interest_type === "fixed"
                    ? t("installments.checkout.interestFixed", {
                        value: installmentSettings?.interest_value || 0,
                      })
                    : t("installments.checkout.interestPercent", {
                        value: installmentSettings?.interest_value || 0,
                      })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 w-24">
                  {t("installments.checkout.months")}
                </label>
                <select
                  value={installmentMonths}
                  onChange={(e) =>
                    setInstallmentMonths(Number(e.target.value))
                  }
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                >
                  {Array.from(
                    { length: maxInstallmentMonths },
                    (_, i) => i + 1,
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 w-24">
                  {t("installments.checkout.downPayment")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={installmentDownPayment}
                  onChange={(e) => setInstallmentDownPayment(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">{t("EGP")}</span>
              </div>

              {installmentPreviewError ? (
                <p className="text-xs text-red-600">
                  {installmentPreviewError}
                </p>
              ) : installmentSchedule ? (
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>{t("installments.checkout.financed")}</span>
                    <span>
                      {Number(
                        installmentSchedule.financed_amount || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("installments.checkout.interest")}</span>
                    <span>
                      {Number(
                        installmentSchedule.interest_amount || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-amber-800">
                    <span>{t("installments.checkout.totalPayable")}</span>
                    <span>
                      {Number(
                        installmentSchedule.total_payable || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("installments.checkout.monthly")}</span>
                    <span>
                      {Number(
                        installmentSchedule.installments?.[0]?.amount || 0,
                      ).toFixed(2)}
                      {installmentSchedule.installments?.length > 1 &&
                        Math.abs(
                          Number(installmentSchedule.installments[0].amount) -
                            Number(
                              installmentSchedule.installments[
                                installmentSchedule.installments.length - 1
                              ].amount,
                            ),
                        ) > 0.001 && (
                          <span className="text-gray-500">
                            {" "}
                            → {Number(
                              installmentSchedule.installments[
                                installmentSchedule.installments.length - 1
                              ].amount,
                            ).toFixed(2)}
                          </span>
                        )}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-teal-700">
                    <span>{t("installments.checkout.dueNow")}</span>
                    <span>{installmentPayTarget.toFixed(2)}</span>
                  </div>

                  {installmentSchedule.installments?.length > 0 && (
                    <details className="pt-1">
                      <summary className="cursor-pointer text-amber-700">
                        {t("installments.checkout.showSchedule")}
                      </summary>
                      <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                        {installmentSchedule.installments.map((item) => (
                          <li
                            key={item.sequence}
                            className="flex justify-between"
                          >
                            <span>
                              {t("installments.checkout.installmentItem", {
                                number: item.sequence,
                              })}{" "}
                              —{" "}
                              {new Date(item.due_date).toLocaleDateString(
                                i18n.language === "ar" ? "ar-EG" : "en-GB",
                              )}
                            </span>
                            <span>{Number(item.amount).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {t("installments.checkout.calculating")}
                </p>
              )}
            </div>
          )}

          {paymentSplits.length > 1 && (
            <div className="mb-4 space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-600">
                {t("PaymentDetails") || "Payment Details"}
              </p>
              {paymentSplits.map((split, idx) => (
                <div key={split._id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <select
                      value={String(split.account_id)}
                      onChange={(e) =>
                        handleAccountChange(split._id, e.target.value)
                      }
                      className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {financialAccounts.map((acc) => (
                        <option key={acc._id} value={String(acc._id)}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {t("EGP")}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={split.amount === 0 ? "" : String(split.amount)}
                      onChange={(e) =>
                        handleAmountChange(split._id, e.target.value)
                      }
                      className="w-full pl-10 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSplit(split._id)}
                    className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {remainingAmount > 0 && (
                <button
                  onClick={handleAddSplit}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + {t("AddAccountSplit") || "Add Split"}
                </button>
              )}
            </div>
          )}

          {paymentSplits.length === 1 &&
            isVisaAccount(paymentSplits[0]?.account_id) && (
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">
                  {t("TransactionID")}:
                </label>
                <input
                  type="text"
                  placeholder={t("EnterTransactionID")}
                  value={paymentSplits[0]?.transition_id || ""}
                  onChange={(e) =>
                    handleTransitionIdChange(
                      paymentSplits[0]._id,
                      e.target.value,
                    )
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            )}

          {paymentSplits.length === 1 &&
            getDescriptionStatus(paymentSplits[0]?.account_id) && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Last 4 digits"
                  value={paymentSplits[0]?.checkout || ""}
                  onChange={(e) =>
                    handleDescriptionChange(
                      paymentSplits[0]._id,
                      e.target.value,
                    )
                  }
                  maxLength={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            )}

          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">
              {t("AmountPaidByCustomer") || "Amount by Customer"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {t("EGP")}
              </span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                className="w-full pl-14 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B2635]/30"
              />
            </div>
            {parseFloat(customerPaid) > requiredTotal && (
              <p className="mt-1 text-teal-600 text-sm font-semibold">
                {t("ChangeDue", { value: calculatedChange.toFixed(2) })}
              </p>
            )}
          </div>

          {isDueModuleAllowed && remainingAmount > 0.01 && (
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm font-bold text-purple-600 text-center mb-2">
                Due Module:{" "}
                <strong>
                  {remainingAmount.toFixed(2)} {t("EGP")}
                </strong>
              </p>
              <Button
                className="w-full text-white bg-purple-600 hover:bg-purple-700"
                disabled={loading}
                onClick={() =>
                  proceedWithOrderSubmission(0, undefined, remainingAmount)
                }
              >
                {t("ConfirmWithDueModule") ||
                  `Confirm (${remainingAmount.toFixed(2)} ${t("EGP")})`}
              </Button>
            </div>
          )}

          {(computed.discountAmount > 0 ||
            computed.freeDiscountAmount > 0 ||
            computed.couponAmount > 0 ||
            computed.serviceFeesTotal > 0) && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm space-y-1">
              {computed.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("Discount")}
                    {appliedDiscountData?.type === "percentage" &&
                      ` (${(appliedDiscountData.amount * 100).toFixed(2)}%)`}
                  </span>
                  <span className="text-red-500">
                    -{computed.discountAmount.toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}
              {computed.freeDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {i18n.language === "ar" ? "خصم يدوي" : "Manual Discount"}
                  </span>
                  <span className="text-red-500">
                    -{computed.freeDiscountAmount.toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}
              {computed.couponAmount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>
                    {t("Coupon")}
                    {appliedCouponData?.type === "percentage" &&
                      ` (${appliedCouponData.amount}%)`}
                  </span>
                  <span>
                    -{computed.couponAmount.toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}
              {computed.serviceFeesTotal > 0 && (
                <div className="flex justify-between text-indigo-600">
                  <span>{t("ServiceFees") || "Service Fees"}</span>
                  <span>
                    +{computed.serviceFeesTotal.toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl py-4 mb-4 text-center">
            <span className="text-4xl font-bold text-[#8B2635]">
              {requiredTotal.toFixed(2)} {t("EGP")}
            </span>
            {remainingAmount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {t("Remaining")}: {remainingAmount.toFixed(2)} {t("EGP")}
              </p>
            )}
            {changeAmount > 0 && (
              <p className="text-sm text-teal-600 font-semibold mt-1">
                {t("Change")}: {changeAmount.toFixed(2)} {t("EGP")}
              </p>
            )}
          </div>

          <Button
            className="w-full bg-[#8B2635] hover:bg-[#7a2030] text-white text-lg font-bold py-6 rounded-xl transition-all shadow-md"
            disabled={loading || (!isTotalMet && !isDueOrder)}
            onClick={handleSubmitOrder}
          >
            {loading
              ? t("Processing")
              : isDueOrder
                ? selectedCustomer
                  ? t("DueOrderReady")
                  : t("SelectCustomer") || "Select Customer"
                : isInstallmentOrder
                  ? selectedCustomer
                    ? t("installments.checkout.confirm")
                    : t("SelectCustomer") || "Select Customer"
                  : t("PayNow") || "PAY NOW"}
          </Button>
        </div>
      </div>

      <FreeDiscountPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setFreeDiscount("");
          toast.info(t("FreeDiscountCancelled"));
        }}
        onConfirm={(password) => {
          setPendingFreeDiscountPassword(password);
          setPasswordModalOpen(false);

          proceedWithOrderSubmission(
            isDueOrder ? 1 : 0,
            selectedCustomer?._id,
            remainingAmount > 0.01 && isDueModuleAllowed ? remainingAmount : 0,
            password,
          );
        }}
      />
    </div>
  );
};

export default CheckOut;
