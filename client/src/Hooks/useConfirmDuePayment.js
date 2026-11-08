// src/hooks/useConfirmDuePayment.js
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";

export const useConfirmDuePayment = ({
  onClearCart,
  onClose,
  setDueSplits,
  setDueAmount,
  refetch,
}) => {
  const { postData } = usePost();

  const handleConfirmDuePayment = async (splits, paidNow, selectedCustomer, remainingDue) => {
    // التأكد من وجود العميل
    if (!selectedCustomer || !selectedCustomer._id) {
      toast.error("Customer information is missing.");
      return;
    }

    // البيانات اللي هنبعتها كـ JSON
    const payload = {
      customer_id: selectedCustomer._id,
      amount: paidNow, // المبلغ اللي اتدفع دلوقتي
      financials: splits.map((split) => ({
        account_id: split.accountId,        // string _id من Mongo
        amount: split.amount,
        description: split.description || "",
      })),
    };

    try {
      // نبعت كـ JSON عادي (مش FormData)
      await postData("api/admin/pos/sales/pay-due", payload);

      toast.success("Payment successful. Remaining: " + remainingDue.toFixed(2) + " EGP");

      // refetch عشان يختفي العميل من القايمة لو خلص الدين
      if (typeof refetch === "function") {
        refetch();
      }

      // إعادة تعيين الحالة
      setDueSplits([]);
      setDueAmount(0);

      onClearCart?.();
      onClose();

    } catch (e) {
      console.error("Due payment error:", e);
      toast.error(e?.message || "Failed to process payment.");
    }
  };

  return { handleConfirmDuePayment };
};