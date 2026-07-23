// src/components/PasswordConfirmModal.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Lock, ShieldCheck } from "lucide-react";

export default function PasswordConfirmModal({ onConfirm, onCancel, loading }) {
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 text-gray-800">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header Decor */}
        <div className="h-2 bg-bg-primary w-full" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-2xl text-bg-primary">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {t("ConfirmShiftClosure")}
                </h3>
                <p className="text-sm text-gray-400 font-medium">
                  {t("ActionRequiresVerification")}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-500 text-sm mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 font-medium italic">
            " {t("EnterPasswordToCloseShift")} "
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-bg-primary transition-colors">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-bg-primary focus:ring-4 focus:ring-purple-100 transition-all text-xl tracking-widest outline-none"
                placeholder="••••••"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-[0.4] py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all uppercase text-xs tracking-widest"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={loading || !password}
                className="flex-1 py-4 bg-bg-primary text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase text-xs tracking-widest disabled:opacity-50 disabled:translate-y-0"
              >
                {loading ? "..." : t("Confirm")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}