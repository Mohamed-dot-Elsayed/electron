import React, { useState, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { usePut } from "@/Hooks/usePut";

export default function ExpensesModal({ onClose, expense = null, refetchParent }) {
  const { t } = useTranslation();

  const isEditMode = !!expense;

  // 🔥 Base selection data (categories + accounts)
  const { data: selectionData, loading: selectionLoading } = useGet(
    "api/expense/selection"
  );

  // 🔥 Load the specific expense in edit mode
  const {
    data: editData,
    loading: editLoading,
  } = useGet(isEditMode ? `api/expense/${expense._id}` : null);

  const { postData } = usePost();
  const { putData } = usePut();

  const [expense_name, setExpenseName] = useState("");
  const [Category_id, setCategoryId] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [financial_accountId, setFinancialAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // -----------------------------
  // Load EDIT DATA from API
  // -----------------------------
  useEffect(() => {
    if (isEditMode && editData?.data?.expense) {
      const e = editData.data?.expense;

      setExpenseName(e.name || "");

      // تأكد من تعيين ID الفئة، وقم بتحويله إلى String
      setCategoryId(e.Category_id?._id ? String(e.Category_id._id) : "");

      setAmount(e.amount || "");
      setNote(e.note || "");

      // تأكد من تعيين ID الحساب، وقم بتحويله إلى String
      setFinancialAccountId(e.financial_accountId?._id ? String(e.financial_accountId._id) : "");
    }
  }, [isEditMode, editData, selectionData]); // ✅ أضف selectionData هنا

  // -----------------------------
  // SUBMIT
  // -----------------------------
  const handleSubmit = async () => {
    if (!expense_name || !Category_id || !amount || !financial_accountId) {
      toast.error(t("Pleasefillrequiredfields"));
      return;
    }

    // 1. ابدأ التحميل ومنع الزرار
    setIsSubmitting(true);

    const body = {
      name: expense_name,
      Category_id,
      amount,
      financial_accountId,
      note,
    };

    try {
      if (isEditMode) {
        await putData(`api/expense/${expense._id}`, body);
        toast.success(t("ExpenseUpdated"));
        refetchParent?.();
      } else {
        await postData("api/expense", body);
        toast.success(t("ExpenseAdded"));
        refetchParent?.(); // أضيفي الريكول هنا أيضاً إذا كنتِ تحتاجي تحديث القائمة بعد الإضافة
      }
      onClose();
    } catch (err) {
      const message = err?.response?.data?.errors || err?.message || "Failed to save expense";
      toast.error(message);
    } finally {
      // 2. فك الحظر عن الزرار سواء نجح أو فشل الطلب
      setIsSubmitting(false);
    }
  };

  if (selectionLoading || editLoading) return null;

  const categories = selectionData?.data?.categories || [];
  const accounts = selectionData?.data?.accounts || [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl p-3 w-[95%] max-w-md shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">
            {isEditMode ? t("EditExpense") : t("AddExpense")}
          </h2>
          <button onClick={onClose} className="text-lg font-bold">X</button>
        </div>

        {/* Expense Name */}
        <label className="block font-semibold mb-1">{t("Expense")}</label>
        <input
          type="text"
          value={expense_name}
          onChange={(e) => setExpenseName(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />

        {/* Category */}
        <label className="block font-semibold mb-1">{t("Category")}</label>
        <select
          value={Category_id}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        >
          <option value="">{t("SelectCategory")}</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Amount */}
        <label className="block font-semibold mb-1">{t("Amount")}</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />

        {/* Note */}
        <label className="block font-semibold mb-1">{t("Note")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />

        {/* Financial Account */}
        <label className="block font-semibold mb-1">{t("FinancialAccount")}</label>
        <select
          value={financial_accountId}
          onChange={(e) => setFinancialAccountId(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        >
          <option value="">{t("SelectAccount")}</option>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting} // تعطيل الزرار هنا
          className={`w-full py-3 text-white rounded mt-2 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-bg-primary"
            }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              {/* اختياري: يمكنك وضع Spinner صغير هنا */}
              {t("Loading...")}
            </span>
          ) : (
            isEditMode ? t("Update") : t("Add")
          )}
        </button>
      </div>
    </div>
  );
}
