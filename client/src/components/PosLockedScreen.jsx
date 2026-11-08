import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Sparkles,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Store,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useTenantInfo } from "@/context/TenantContext";

export default function PosLockedScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { packageInfo, refresh, loading } = useTenantInfo();
  const [refreshing, setRefreshing] = useState(false);

  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refresh();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("shiftStatus");
    localStorage.removeItem("shiftStartTime");
    navigate("/login", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-xl p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-purple-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Large Card Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200/80 dark:border-slate-800 p-7 sm:p-10 md:p-12 overflow-hidden text-center my-auto transition-all animate-in fade-in zoom-in-95 duration-300">
        {/* Subtle top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700" />

        {/* Icon & Lock Badge */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200/80 dark:border-purple-700/50 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Store className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-rose-600 text-white p-2 rounded-2xl shadow-md border-2 border-white dark:border-slate-900">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Plan & Feature Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            {isRTL ? "خاصية غير مشمولة بالباقة" : "Feature Not Included In Plan"}
          </span>
          {packageInfo?.name && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {isRTL ? `باقتك: ${packageInfo.name}` : `Current: ${packageInfo.name}`}
            </span>
          )}
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
          {isRTL
            ? "نظام نقاط البيع (POS) يتطلب ترقية الباقة"
            : "Point of Sale (POS) Requires Plan Upgrade"}
        </h2>

        {/* Subtitle / Description */}
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-5">
          {isRTL
            ? "عذراً، نظام نقاط البيع والكاشير وإدارة المبيعات السريعة غير مفعّل في باقة اشتراكك الحالية. يرجى التواصل مع فريق الدعم الفني لتفعيل الخدمة."
            : "Sorry, the Point of Sale system is not included in your current subscription plan. Please contact customer support to activate the service."}
        </p>

        {/* Support Callout Banner */}
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-3.5 max-w-md mx-auto mb-6 flex items-center justify-center gap-2.5 text-xs font-bold text-purple-900 dark:text-purple-200">
          <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span>
            {isRTL
              ? "يرجى التواصل مع فريق الدعم الفني لتفعيل النظام"
              : "Please contact customer support to activate POS"}
          </span>
        </div>

        {/* Included POS features highlight */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 mb-8 text-start">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3">
            {isRTL ? "ميزات ستحصل عليها عند تفعيل النظام:" : "Features unlocked with POS:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{isRTL ? "إدارة الكاشير والورديات بالكامل" : "Full cashier & shift management"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{isRTL ? "طباعة الإيصالات والفواتير الضريبية" : "Instant receipts & thermal printing"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{isRTL ? "طلبات الصالة، الدليفري والتيك أواي" : "Dine-in, takeaway & delivery orders"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{isRTL ? "مزامنة لحظية مع المخزن والحسابات" : "Real-time inventory sync"}</span>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Refresh / Check Again */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{isRTL ? "إعادة فحص الاشتراك" : "Recheck Subscription"}</span>
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all font-bold text-sm cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
