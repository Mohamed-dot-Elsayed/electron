import React from "react";
import {
  Lock,
  Sparkles,
  Store,
  CheckCircle2,
  PhoneCall,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PosUpgradeRequiredModal({
  isOpen,
  onClose,
  packageInfo,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n?.language === "ar";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all scale-100">
        {/* Close 'X' button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Gradient Banner */}
        <div className="h-32 flex items-center justify-center relative bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700">
          {/* Ambient blur lights */}
          <div className="absolute top-2 left-6 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-1 right-8 w-20 h-20 bg-white/15 rounded-full blur-lg pointer-events-none" />

          {/* Floating Icon Badge */}
          <div className="absolute -bottom-8 bg-white p-2.5 rounded-2xl shadow-xl border-2 border-white">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-200 shadow-md">
              <Store className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -end-1 bg-rose-600 text-white p-1 rounded-full shadow border-2 border-white">
              <Lock className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-12 px-6 pb-6 text-center space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
            <span>
              {isArabic ? "خاصية غير مفعّلة" : "Feature Not Included"}
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isArabic ? "ترقية الباقة مطلوبة" : "Subscription Upgrade Required"}
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
              {isArabic
                ? "عذراً، نظام نقاط البيع (POS) والكاشير غير مشمول في باقة اشتراكك الحالية. يرجى التواصل مع فريق الدعم الفني لترقية باقتك وتفعيل نقاط البيع."
                : "Point of Sale (POS) access is not included in your current subscription plan. Please contact customer support to upgrade your plan."}
            </p>
          </div>

          {/* Current Package Info Card */}
          {packageInfo?.name && (
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                {isArabic ? "باقتك الحالية:" : "Your Current Plan:"}
              </span>
              <span className="font-black text-purple-800 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs">
                {packageInfo.name}
              </span>
            </div>
          )}

          {/* Contact Support Box */}
          <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-center gap-2.5 text-xs font-bold text-purple-900 shadow-xs">
            <PhoneCall className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              {isArabic
                ? "يرجى التواصل مع فريق الدعم الفني لترقية باقتك وتفعيل النظام"
                : "Please contact customer support to upgrade your plan and activate POS"}
            </span>
          </div>

          {/* Feature highlights */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-start space-y-2 text-xs font-semibold text-slate-700">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {isArabic ? "ميزات ستحصل عليها عند الترقية:" : "Features included with POS:"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{isArabic ? "إدارة الورديات والكاشير" : "Cashier & Shifts"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{isArabic ? "طباعة الفواتير والإيصالات" : "Receipts & Invoicing"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{isArabic ? "طلبات الصالة والدليفري" : "Dine-in & Delivery"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{isArabic ? "مزامنة المخازن والحسابات" : "Live Inventory Sync"}</span>
              </div>
            </div>
          </div>

          {/* Close Button Only */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center"
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

