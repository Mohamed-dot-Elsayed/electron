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
import qz from "qz-tray";
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
import FreeDiscountPasswordModal from "./FreeDiscountPasswordModal";
import { useDiscountCalculation } from "@/Hooks/useDiscountCalculation";

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  order_tax,
  totalDiscount,
  selectedPaymentItemIds = [],
  onClearCart,
  shouldPrintReceipt = true,
  initialFreeDiscount = "",
  initialDiscountId = null,
  initialAppliedDiscount = 0,
  initialDiscountCode = "",
}) => {
  const cashierId = sessionStorage.getItem("cashier_id");
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();

  const lastSelectedGroup = sessionStorage.getItem("last_selected_group");

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

  const { data: taxesData } = useGet("api/taxes");
  const [selectedDiscountId, setSelectedDiscountId] = useState(initialDiscountId);
  const [selectedTaxId, setSelectedTaxId] = useState(null);
  const [freeDiscount, setFreeDiscount] = useState(initialFreeDiscount);
  const [appliedDiscount, setAppliedDiscount] = useState(initialAppliedDiscount);
  const [discountCode, setDiscountCode] = useState(initialDiscountCode);


  // === QZ Tray Connection ===
  useEffect(() => {
    if (!shouldPrintReceipt) {
      // لو مش هنطبع → متعملش اتصال بـ QZ خالص
      return;
    }
    // 1. جلب التوكين (تأكد من اسم المفتاح الصحيح سواء token أو access_token)
    const token = sessionStorage.getItem("token");

    // إعداد الهيدر للإرسال
    const authHeaders = {
      "Authorization": `Bearer ${token}` // إضافة التوكين هنا
    };

    // 2. إعداد الـ Certificate
    qz.security.setCertificatePromise(function (resolve, reject) {
      fetch(`${baseUrl}api/qztray/cert`, {
        method: "GET",
        headers: authHeaders // <--- إرسال التوكين هنا
      })
        .then((response) => {
          if (!response.ok) {
            // إذا كان الخطأ 401، فهذا يعني أن التوكين غير صحيح أو منتهي
            if (response.status === 401) {
              throw new Error("401 Unauthorized: Please check login status.");
            }
            throw new Error(`Certificate Error: ${response.status}`);
          }
          return response.text();
        })
        .then(resolve)
        .catch((err) => {
          console.error("❌ Failed to fetch certificate:", err);
          reject(err);
        });
    });

    qz.security.setSignatureAlgorithm("SHA512");

    // 3. إعداد الـ Signature
    qz.security.setSignaturePromise(function (toSign) {
      return function (resolve, reject) {
        const apiUrl = `${baseUrl}api/qztray/sign?request=${toSign}`;

        fetch(apiUrl, {
          method: "GET",
          headers: authHeaders // <--- إرسال التوكين هنا أيضاً
        })
          .then((response) => {
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error("401 Unauthorized: Signature rejected.");
              }
              throw new Error(`Signature Error: ${response.status}`);
            }
            return response.text();
          })
          .then(resolve)
          .catch((err) => {
            console.error("❌ Failed to sign request:", err);
            reject(err);
          });
      };
    });

    // 4. الاتصال
    if (!qz.websocket.isActive()) {
      qz.websocket
        .connect()
        .then(() => {
          console.log("✅ Connected to QZ Tray");
        })
        .catch((err) => {
          console.error("❌ QZ Tray connection error:", err);
          // تجاهل الخطأ إذا كان بسبب التكرار، لكن اعرضه إذا كان اتصالاً فعلياً
          // toast.error(t("QZTrayNotRunning")); 
        });
    }

    return () => {
      if (qz.websocket.isActive()) {
        qz.websocket.disconnect();
      }
    };
  }, [baseUrl, t, shouldPrintReceipt]); // تمت إزالة token من الاعتماديات لتجنب إعادة الاتصال المتكررة إذا لم يكن ضرورياً

  const { postData, loading } = usePost();

  const [orderNotes, setOrderNotes] = useState("");
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const {
    data: dueUsersData,
    isLoading: customerSearchLoading,
    refetch: refetchDueUsers,
  } = useGet("api/pos-home/due-customers");

  const searchResults = useMemo(() => {
    // استخرج الـ array من الشكل الجديد: { success, data: { message, data: [...] } }
    const customers = dueUsersData?.data?.data || dueUsersData?.data?.dueCustomers || [];
    return customers.filter((c) =>
      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone_number?.includes(customerSearchQuery)
    );
  }, [dueUsersData, customerSearchQuery]);


  // ──── حساب الخصم من الـ shared hook ────
  const {
    totalDiscountDisplay: totalDiscountValue,
    finalAmountToPay: discountedAmount,
  } = useDiscountCalculation(
    amountToPay,
    selectedDiscountId,
    appliedDiscount,
    freeDiscount
  );
  // taxableAmount = discountedAmount (المبلغ بعد كل الخصومات)
  const taxableAmount = discountedAmount;

  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);
  const selectedTaxAmount = useMemo(() => {
    if (!selectedTaxId || !taxesData?.data?.taxes) return 0;

    const selectedTax = taxesData.data.taxes.find(t => t._id === selectedTaxId);
    if (!selectedTax) return 0;

    console.log("Selected Tax raw amount:", selectedTax.amount);
    console.log("Selected Tax type:", selectedTax.type);

    if (selectedTax.type === "percentage") {
      let rate = selectedTax.amount;
      if (rate <= 1) rate *= 100; // fix common admin mistake
      const taxValue = taxableAmount * (rate / 100);
      console.log(`Calculated tax: ${taxValue} (from ${taxableAmount} × ${rate}%)`);
      return taxValue;
    } else {
      return selectedTax.amount;
    }
  }, [selectedTaxId, taxesData, taxableAmount]);

  const requiredTotal = useMemo(() => {
    if (selectedPaymentItemIds.length > 0) {
      const selectedItems = orderItems.filter((item) =>
        selectedPaymentItemIds.includes(item.temp_id)
      );
      return selectedItems.reduce((acc, item) => {
        const quantity = item.count ?? item.quantity ?? 1;
        return acc + item.price * quantity;
      }, 0);
    }

    // المجموع بعد الخصومات + الضريبة اليدوية
    return discountedAmount + selectedTaxAmount;
  }, [orderItems, discountedAmount, selectedPaymentItemIds, selectedTaxAmount]);
  console.log("===== CheckOut component LOADED =====");
  console.log("amountToPay:", amountToPay);
  console.log("discountedAmount:", discountedAmount);
  console.log("taxableAmount:", taxableAmount);
  console.log("selectedTaxAmount:", selectedTaxAmount);
  console.log("requiredTotal:", requiredTotal);
  console.log("Tax id selected:", selectedTaxId);


  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce(
      (acc, split) => acc + (parseFloat(split.amount) || 0),
      0
    );
    const calculatedRemaining = requiredTotal - sum;
    const calculatedChange = sum - requiredTotal;

    return {
      totalScheduled: sum,
      remainingAmount: calculatedRemaining > 0 ? calculatedRemaining : 0,
      changeAmount: calculatedChange > 0 ? calculatedChange : 0,
    };
  }, [paymentSplits, requiredTotal]);

  const calculatedChange = useMemo(() => {
    const paid = parseFloat(customerPaid) || 0;
    return paid > requiredTotal ? paid - requiredTotal : 0;
  }, [customerPaid, requiredTotal]);

  const isTotalMet = totalScheduled >= requiredTotal;

  const financialAccounts = useMemo(() => {
    const item = sessionStorage.getItem("financial_accounts");

    if (!item) {
      console.warn("No financial_accounts in sessionStorage");
      return [];
    }

    try {
      const parsed = JSON.parse(item);

      // الحالة 1: لو array (الطبيعي)
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // الحالة 2: لو object واحد بس (اللي حصل عندك)
      if (parsed && parsed._id && parsed.name) {
        console.log("Single financial account detected, wrapping in array");
        return [parsed]; // نلفه في array عشان الكود يشتغل
      }

      // الحالة 3: لو كان object فيه مفتاح واحد بس (مثل { main: [...] })
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const values = Object.values(parsed);
        const flat = values.flat();
        if (flat.length > 0 && flat[0]._id) {
          return flat;
        }
      }

      return [];
    } catch (e) {
      console.error("Failed to parse financial_accounts:", e);
      return [];
    }
  }, []);

  // Initialize default payment split
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      requiredTotal > 0
    ) {
      const visaAccount = financialAccounts.find((acc) =>
        acc.name?.toLowerCase().includes("visa")
      );

      const defaultAccountId = visaAccount
        ? visaAccount._id
        : financialAccounts[0]._id;

      setPaymentSplits([
        {
          _id: "split-1",
          account_id: defaultAccountId, // ← هنا
          amount: requiredTotal,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  }, [financialAccounts, requiredTotal, paymentSplits.length]);

  // Auto-update single split amount
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0]._id === "split-1") {
      setPaymentSplits((prev) => {
        if (
          prev.length === 1 &&
          prev[0]._id === "split-1" &&
          prev[0].amount !== requiredTotal
        ) {
          return prev.map((split) =>
            split._id === "split-1"
              ? { ...split, amount: requiredTotal || 0 }
              : split
          );
        }
        return prev;
      });
    }
  }, [requiredTotal]);

  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error(t("PleaseEnterDiscountCode"));
      return;
    }

    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      // إرسال الكود والإجمالي للـ API الجديد
      const response = await postData("api/pos/apply-coupon", {
        coupon_code: discountCode,
        grand_total: amountToPay,
      });

      if (response.success) {
        // الوصول للبيانات بناءً على الصورة (response.data.coupon)
        const couponData = response.data?.coupon;

        if (couponData) {
          let discountValue = 0;
          // لو النوع percentage نطبق النسبة، ولو ثابت نطبق القيمة مباشرة
          if (couponData.type === "percentage") {
            discountValue = couponData.amount; // هنا بنخزن النسبة (مثلاً 50)
          } else {
            // لو كان قيمة ثابتة، هنحوله لنسبة عشان الـ UI عندك شغال بالنسبة في الـ appliedDiscount
            // أو تعدلي الحسبة في discountedAmount
            discountValue = (couponData.amount / amountToPay) * 100;
          }

          setAppliedDiscount(discountValue);
          toast.success(t("DiscountAppliedSuccess", { appliedDiscount: couponData.amount }));
        }
      } else {
        // عرض الرسالة من الباك إند في حالة success: false
        const msg = response.error?.message || t("InvalidOrOffDiscountCode");
        setDiscountError(msg);
        toast.error(msg);
      }
    } catch (e) {
      // جلب رسالة الخطأ المخصصة "Coupon not found" من الـ catch
      // الباك إند باعتها في e.response.data.error.message
      const backendError = e.response?.data?.error?.message
        || e.response?.data?.message
        || e.message;

      setAppliedDiscount(0);
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
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (newAmount > maxAllowed) {
        toast.error(t("AmountExceedsLimit", { amount: maxAllowed.toFixed(2) }));
        return prevSplits.map((split) =>
          split._id === _id ? { ...split, amount: maxAllowed } : split
        );
      }

      return prevSplits.map((split) =>
        split._id === _id ? { ...split, amount: newAmount } : split
      );
    });
  };

  const handleAccountChange = (_id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id
          ? {
            ...split,
            account_id: accountId,
            checkout: "",
            transition_id: "",
          }
          : split
      )
    );
  };

  const handleDescriptionChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, checkout: value } : split
      )
    );
  };

  const handleTransitionIdChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, transition_id: value } : split
      )
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
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        checkout: "",
        transition_id: "",
      },
    ]);
  };

  const handleRemoveSplit = (_id) => {
    setPaymentSplits((prev) => prev.filter((s) => s._id !== _id));
  };

  const getAccountNameById = (account_id) => {
    const acc = financialAccounts?.find((a) => a._id == account_id);
    return acc ? acc.name : "Select Account";
  };
  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  const isVisaAccount = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.name?.toLowerCase().includes("visa");
  };

  const proceedWithOrderSubmission = async (
    Due = 0,
    customer_id = undefined,
    dueModuleValue = 0,
    forcedPassword = null
  ) => {
    const freeDiscountValue = parseFloat(freeDiscount) || 0;

    // طلب كلمة سر للخصم المجاني
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
    const financialsPayload = buildFinancialsPayload(paymentSplits, financialAccounts);

    const moduleId = sessionStorage.getItem("module_id");

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(safeOrderItems, financialsPayload);
    } else {
      payload = buildOrderPayload({
        orderItems: safeOrderItems,
        amountToPay: requiredTotal,
        order_tax,
        totalDiscount: appliedDiscount > 0
          ? amountToPay * (appliedDiscount / 100)
          : totalDiscount,
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
        selectedTaxAmount: selectedTaxAmount,
        password: forcedPassword || pendingFreeDiscountPassword || undefined,
        coupon_code: appliedDiscount > 0 ? discountCode : undefined,
      });
    }

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        // نجاح الطلب
        toast.success(Due === 1 ? t("DueOrderCreated") : t("OrderPlaced"));
        setPendingFreeDiscountPassword("");

        // دالة التنظيف والإغلاق (مشتركة)
        const completeOrder = () => {
          onClearCart?.();
          onClose();
        };

        if (Due === 0) {
          // طلب عادي (مش آجل)
          const receiptData = prepareReceiptData(
            safeOrderItems,
            amountToPay,
            order_tax,
            totalDiscount,
            appliedDiscount,
            {},
            null,
            requiredTotal,
            response.success,
            response
          );

          if (shouldPrintReceipt) {
            // مع طباعة
            printReceiptSilently(receiptData, response, () => {
              completeOrder();
              toast.success(t("OrderCompletedSuccessfully"));
            });
          } else {
            // بدون طباعة
            completeOrder();
            toast.success(t("OrderCompletedSuccessfully") + " (" + t("NoPrint") + ")");
          }
        } else {
          // طلب آجل → بدون طباعة عادةً
          completeOrder();
        }
      } else {
        // فشل من الـ API
        toast.error(response?.message || t("FailedToProcessOrder"));
      }
    } catch (e) {
      console.error("Submit error:", e);
      toast.error(e.message || t("SubmissionFailed"));
    }
  };

  const handleSelectCustomer = async (customer) => {
    // عرض تحذير بس مش منع (لو عايزة تسمحي بالدين حتى لو زاد)
    if (customer.amount_Due && requiredTotal > 0) {
      const newTotalDue = customer.amount_Due + requiredTotal;
      toast.info(
        t("CustomerCurrentDue", {
          current: customer.amount_Due.toFixed(2),
          new: newTotalDue.toFixed(2)
        })
      );
    }

    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);

    await proceedWithOrderSubmission(1, customer._id);
  };
  const handleSubmitOrder = async () => {
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(
        t("TotalMustEqual", { amount: requiredTotal.toFixed(2) })
      );
    }

    const validation = validatePaymentSplits(
      paymentSplits,
      getDescriptionStatus
    );
    if (!validation.valid) {
      return toast.error(validation.error);
    }

    if (isDueOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchDueUsers();
        return;
      }
      return;
    }

    await proceedWithOrderSubmission(0);
  };

  // Determine the "active" / selected account method for display card-style
  const selectedAccountId = paymentSplits[0]?.account_id;

  const handleCardSelect = (accountId) => {
    // Special handling for Due
    if (accountId === "due") {
      setIsDueOrder(true);
      return;
    }
    setIsDueOrder(false);
    // For split: add a new split if not already in split mode
    if (accountId === "split") {
      handleAddSplit();
      return;
    }
    // Normal account select
    if (paymentSplits.length === 1) {
      handleAccountChange(paymentSplits[0]._id, accountId);
    } else {
      // reset to single split
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

  // Group accounts: first 3 as main row, rest + Due + Split in second row
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-2xl font-semibold text-gray-800">{t("Checkout") || "Checkout"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg transition-all"
          >
            ✕
          </button>
        </div>

        <div className="px-4 sm:px-6 pb-6 overflow-y-auto flex-1">

          {/* Payment Method Cards - Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            {mainAccounts.map((acc) => (
              <button
                key={acc._id}
                onClick={() => handleCardSelect(String(acc._id))}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                  ${isCardSelected(acc._id)
                    ? "border-[#8B2635] bg-red-50 text-[#8B2635]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <span className="text-2xl">{getAccountIcon(acc.name)}</span>
                <span className="text-xs font-medium text-center leading-tight">{acc.name}</span>
              </button>
            ))}
          </div>

          {/* Payment Method Cards - Row 2: extra accounts + Due + Split */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            {extraAccounts.map((acc) => (
              <button
                key={acc._id}
                onClick={() => handleCardSelect(String(acc._id))}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                  ${isCardSelected(acc._id)
                    ? "border-[#8B2635] bg-red-50 text-[#8B2635]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <span className="text-2xl">{getAccountIcon(acc.name)}</span>
                <span className="text-xs font-medium text-center leading-tight">{acc.name}</span>
              </button>
            ))}

            {/* Due */}
            <button
              onClick={() => handleCardSelect("due")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                ${isDueOrder
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-gray-200 bg-white text-orange-500 hover:border-orange-300 hover:bg-orange-50"
                }`}
            >
              <span className="text-2xl">🕐</span>
              <span className="text-xs font-medium">{t("Due") || "Due"}</span>
            </button>

            {/* Split */}
            <button
              onClick={() => handleCardSelect("split")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all
                ${paymentSplits.length > 1
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 bg-white text-blue-500 hover:border-blue-300 hover:bg-blue-50"
                }`}
            >
              <span className="text-2xl">🔀</span>
              <span className="text-xs font-medium">{t("Split") || "Split"}</span>
            </button>
          </div>

          {/* Split Payment Details */}
          {paymentSplits.length > 1 && (
            <div className="mb-4 space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-600">{t("PaymentDetails") || "Payment Details"}</p>
              {paymentSplits.map((split, idx) => (
                <div key={split._id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <select
                      value={String(split.account_id)}
                      onChange={(e) => handleAccountChange(split._id, e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {financialAccounts.map((acc) => (
                        <option key={acc._id} value={String(acc._id)}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">{t("EGP")}</span>
                    <input
                      type="number"
                      min="0"
                      value={split.amount === 0 ? "" : String(split.amount)}
                      onChange={(e) => handleAmountChange(split._id, e.target.value)}
                      className="w-full pl-10 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  {paymentSplits.length > 1 && (
                    <button
                      onClick={() => handleRemoveSplit(split._id)}
                      className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all"
                    >
                      ✕
                    </button>
                  )}
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

          {/* Visa Transaction ID */}
          {paymentSplits.length === 1 && isVisaAccount(paymentSplits[0]?.account_id) && (
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">{t("TransactionID")}:</label>
              <input
                type="text"
                placeholder={t("EnterTransactionID")}
                value={paymentSplits[0]?.transition_id || ""}
                onChange={(e) => handleTransitionIdChange(paymentSplits[0]._id, e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {/* Description field */}
          {paymentSplits.length === 1 && getDescriptionStatus(paymentSplits[0]?.account_id) && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Last 4 digits"
                value={paymentSplits[0]?.checkout || ""}
                onChange={(e) => handleDescriptionChange(paymentSplits[0]._id, e.target.value)}
                maxLength={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {/* Amount by Customer */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">{t("AmountPaidByCustomer") || "Amount by Customer"}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{t("EGP")}</span>
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

          {/* Due Module Banner */}
          {isDueModuleAllowed && remainingAmount > 0.01 && (
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm font-bold text-purple-600 text-center mb-2">
                Due Module: <strong>{remainingAmount.toFixed(2)} {t("EGP")}</strong>
              </p>
              <Button
                className="w-full text-white bg-purple-600 hover:bg-purple-700"
                disabled={loading}
                onClick={() => proceedWithOrderSubmission(0, undefined, remainingAmount)}
              >
                {t("ConfirmWithDueModule") || `Confirm (${remainingAmount.toFixed(2)} ${t("EGP")})`}
              </Button>
            </div>
          )}

          {/* Summary: discounts + amounts info */}
          {totalDiscountValue > 0 && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm space-y-1">
              {appliedDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("Discount")} ({appliedDiscount}%)</span>
                  <span className="text-red-500">-{(amountToPay * (appliedDiscount / 100)).toFixed(2)} {t("EGP")}</span>
                </div>
              )}
              {appliedDiscount === 0 && totalDiscountValue > (parseFloat(freeDiscount) || 0) && (
                <div className="flex justify-between text-blue-600">
                  <span>{t("ListDiscount")}</span>
                  <span>-{(totalDiscountValue - (parseFloat(freeDiscount) || 0)).toFixed(2)} {t("EGP")}</span>
                </div>
              )}
              {freeDiscount && parseFloat(freeDiscount) > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>{t("FreeDiscount")}</span>
                  <span>-{parseFloat(freeDiscount).toFixed(2)} {t("EGP")}</span>
                </div>
              )}
            </div>
          )}

          {/* Big Total Amount */}
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

          {/* PAY NOW Button */}
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
          toast.success(t("PasswordAccepted"));

          proceedWithOrderSubmission(
            isDueOrder ? 1 : 0,
            selectedCustomer?._id,
            remainingAmount > 0.01 && isDueModuleAllowed ? remainingAmount : 0,
            password
          );
        }}
      />
    </div>
  );
};

export default CheckOut;