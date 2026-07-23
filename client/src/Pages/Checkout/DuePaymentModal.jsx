import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";

const DuePaymentModal = ({
  isOpen,
  onClose,
  customer,
  requiredTotal,
  onConfirm,
  refetch,
}) => {
  // جلب الحسابات من sessionStorage
  const financialAccounts = JSON.parse(sessionStorage.getItem("financial_accounts") || "[]");

  const [splits, setSplits] = useState([]);

  // حساب المبلغ المدفوع الآن
  const paidNow = useMemo(() => {
    return splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  }, [splits]);

  // المتبقي آجل
  const dueAmount = requiredTotal - paidNow;

  // إضافة طريقة دفع افتراضية عند فتح المودال
  useEffect(() => {
    if (financialAccounts.length > 0 && splits.length === 0) {
      const defaultAcc = financialAccounts[0];
      setSplits([
        {
          splitId: "due-split-1",        // غيرنا id إلى splitId عشان ما يتلخبطش مع _id بتاع الحساب
          accountId: defaultAcc._id,     // هنا _id مش id
          amount: 0,
          description: "",
        },
      ]);
    }
  }, [financialAccounts]);

  const handleAmountChange = (splitId, value) => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast.error("Amount cannot be negative.");
      return;
    }

    const totalOthers = splits.reduce(
      (sum, s) => (s.splitId === splitId ? sum : sum + (parseFloat(s.amount) || 0)),
      0
    );
    const maxAllowed = requiredTotal - totalOthers;

    if (num > maxAllowed) {
      toast.error(`Max allowed: ${maxAllowed.toFixed(2)} EGP`);
      return;
    }

    setSplits((prev) =>
      prev.map((s) => (s.splitId === splitId ? { ...s, amount: num } : s))
    );
  };

  const handleAccountChange = (splitId, accId) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.splitId === splitId
          ? { ...s, accountId: accId, description: "" }  // هنا accId جاي string من Select، هنحوله لاحقًا لو لازم
          : s
      )
    );
  };

  const handleDescriptionChange = (splitId, value) => {
    setSplits((prev) =>
      prev.map((s) => (s.splitId === splitId ? { ...s, description: value } : s))
    );
  };

  const handleAddSplit = () => {
    if (financialAccounts.length === 0) {
      return toast.error("No financial accounts available.");
    }
    const defaultAcc = financialAccounts[0];
    setSplits((prev) => [
      ...prev,
      {
        splitId: `due-split-${Date.now()}`,
        accountId: defaultAcc._id,
        amount: 0,
        description: "",
      },
    ]);
  };

  const handleRemoveSplit = (splitId) => {
    setSplits((prev) => prev.filter((s) => s.splitId !== splitId));
  };

  // جلب اسم الحساب من _id
  const getAccountNameById = (accountId) => {
    const acc = financialAccounts.find((a) => a._id === accountId);
    return acc ? acc.name : "Select Account";
  };

  // تحديد إذا كان الحساب يحتاج آخر 4 أرقام (فيزا مثلاً)
  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts.find((a) => a._id === accountId);
    return acc?.description_status === 1 || acc?.description_status === true;
  };

  const validateSplits = () => {
    for (const split of splits) {
      if (
        getDescriptionStatus(split.accountId) &&
        (!split.description || !/^\d{4}$/.test(split.description))
      ) {
        toast.error("Please enter exactly 4 digits for the Visa card.");
        return false;
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateSplits()) return;

    const totalPaidNow = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const remainingDue = requiredTotal - totalPaidNow;

    if (totalPaidNow <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }

    // نرجع splits مع accountId كـ string (زي ما الـ backend بيحبه عادة)
    const formattedSplits = splits.map((s) => ({
      accountId: s.accountId,
      amount: s.amount,
      description: s.description || "",
    }));

    onConfirm(formattedSplits, totalPaidNow, remainingDue);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-2xl bg-white p-6 rounded-xl shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-xl">
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4 text-purple-600 text-center">
          Partial Payment & Due
        </h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">
            Customer: <strong>{customer?.name}</strong> ({customer?.phone_number || customer?.phone || "N/A"})
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Due:</span>
              <span className="font-bold">{requiredTotal.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Now:</span>
              <span>{paidNow.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-purple-600 font-bold">
              <span>Remaining Due:</span>
              <span>{dueAmount.toFixed(2)} EGP</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {splits.map((split) => (
            <div key={split.splitId} className="flex items-center space-x-3">
              <div className="w-40">
                <Select
                  value={split.accountId}
                  onValueChange={(val) => handleAccountChange(split.splitId, val)}
                >
                  <SelectTrigger>
                    <SelectValue>{getAccountNameById(split.accountId)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {financialAccounts.map((acc) => (
                      <SelectItem key={acc._id} value={acc._id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-grow">
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={split.amount === 0 ? "" : split.amount}
                  onChange={(e) => handleAmountChange(split.splitId, e.target.value)}
                  className="pl-14"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  EGP
                </span>
              </div>

              {getDescriptionStatus(split.accountId) && (
                <Input
                  type="text"
                  placeholder="Last 4"
                  value={split.description}
                  onChange={(e) => handleDescriptionChange(split.splitId, e.target.value)}
                  maxLength={4}
                  className="w-24"
                />
              )}

              {splits.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSplit(split.splitId)}
                >
                  ×
                </Button>
              )}
            </div>
          ))}

          {paidNow < requiredTotal && financialAccounts.length > 0 && (
            <Button
              variant="link"
              onClick={handleAddSplit}
              className="text-sm text-blue-600"
            >
              + Add Payment Method
            </Button>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={dueAmount < 0 || paidNow <= 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            Confirm Due Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuePaymentModal;