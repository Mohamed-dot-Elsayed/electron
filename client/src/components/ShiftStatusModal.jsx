import React from "react";
import {
  CheckCircle2,
  Sparkles,
  Clock,
  Monitor,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ShiftStatusModal({
  isOpen,
  mode = "started", // "started" | "welcome_back"
  cashierName = "",
  startTime = null,
  onConfirm,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n?.language === "ar";

  if (!isOpen) return null;

  const formattedTime = startTime
    ? new Date(startTime).toLocaleTimeString(isArabic ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  const isWelcomeBack = mode === "welcome_back";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all scale-100">
        {/* Header gradient banner */}
        <div className="h-28 flex items-center justify-center relative bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700">
          {/* Subtle background circles */}
          <div className="absolute top-2 left-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-1 right-6 w-16 h-16 bg-white/15 rounded-full blur-lg pointer-events-none" />

          {/* Floating Icon Badge */}
          <div className="absolute -bottom-8 bg-white p-2 rounded-2xl shadow-lg border-2 border-white">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white bg-indigo-600 shadow-indigo-200 shadow-md">
              {isWelcomeBack ? (
                <Sparkles className="w-8 h-8 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-12 px-6 pb-6 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-800">
              {isWelcomeBack
                ? t(
                    "WelcomeBackShift",
                    isArabic ? "مرحباً بعودتك!" : "Welcome Back!"
                  )
                : t(
                    "ShiftStartedTitle",
                    isArabic ? "تم بدء الوردية بنجاح" : "The shift has started"
                  )}
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              {isWelcomeBack
                ? t(
                    "WelcomeBackShiftDesc",
                    isArabic
                      ? "تم استعادة ورديتك النشطة بنجاح، يمكنك متابعة العمل كالمعتاد."
                      : "Your active shift has been restored. You can continue working normally."
                  )
                : t(
                    "ShiftStartedDesc",
                    isArabic
                      ? "تم فتح الوردية بنجاح، يمكنك الآن البدء في تسجيل الطلبات."
                      : "Your shift is now open. You can start creating orders."
                  )}
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2 text-sm text-gray-600">
            {cashierName && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <Monitor className="w-4 h-4 text-purple-500" />
                  <span>
                    {t("PointOfSale", isArabic ? "نقطة البيع" : "POS Terminal")}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-xs">
                  {cashierName}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>
                  {isWelcomeBack
                    ? t("ActiveSince", isArabic ? "نشط منذ" : "Active Since")
                    : t("StartedAt", isArabic ? "وقت البدء" : "Start Time")}
                </span>
              </div>
              <span className="font-semibold text-gray-900 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-xs">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 space-y-3">
            <button
              onClick={onConfirm}
              className="w-full py-3.5 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer bg-purple-600 hover:bg-purple-700"
            >
              <span>
                {isWelcomeBack
                  ? t(
                      "ContinueShift",
                      isArabic ? "متابعة الوردية" : "Continue Shift"
                    )
                  : t("StartSelling", isArabic ? "بدء البيع" : "Start Selling")}
              </span>
              {isArabic ? (
                <ArrowLeft className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
