// src/components/FreeDiscountPasswordModal.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const FreeDiscountPasswordModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim()) {
      return alert(t("PleaseEnterPassword"));
    }
    setLoading(true);
    // هنا هتأكدي من الباسوورد مع الباك إند (اختياري)
    // لو عايزة تتحققي منه قبل ما تكملي
    onConfirm(password);
    setLoading(false);
    setPassword("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-center mb-6 text-purple-600">
          {t("FreeDiscountAuthorization")}
        </h3>
        <p className="text-center text-gray-600 mb-6">
          {t("EnterPasswordToApplyFreeDiscount")}
        </p>
        <Input
          type="password"
          placeholder={t("Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 text-lg"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {t("Cancel")}
          </Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleSubmit}
            disabled={loading || !password}
          >
            {loading ? t("Verifying") : t("Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FreeDiscountPasswordModal;