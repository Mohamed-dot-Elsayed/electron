import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePost } from "@/Hooks/usePost";
import logo from "@/assets/logo.png";
import { useShift } from "@/context/ShiftContext";

export function CashierButton({ cashierId, cashierName, icon: Icon, isActive, onSelect, loadingPost }) {
  const bgColor = isActive ? "bg-green-600" : "bg-white";
  const textColor = isActive ? "text-white" : "text-gray-700";
  const hoverBg = isActive ? "hover:bg-green-700" : "hover:bg-[#7c5cc4]";
  const iconColor = isActive ? "text-white" : "text-[#910000]";
  const circleColor = isActive ? "bg-white border-white" : "bg-gray-200 border-gray-300";

  return (
    <Button
      onClick={() => onSelect(cashierId)}
      disabled={loadingPost}
      className={`w-full flex items-center justify-between p-4 h-auto rounded-xl shadow-md ${bgColor} ${textColor} ${hoverBg} text-lg font-semibold transition-colors duration-200 ease-in-out`}
    >
      <div className="flex items-center gap-4">
        {Icon && <Icon className={`w-6 h-6 ${iconColor}`} />}
        <span>{cashierName}</span>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 ${circleColor}`}></div>
    </Button>
  );
}

export default function Cashier() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { openShift } = useShift();

  const { data, error, isLoading } = useGet(`api/pos-home/cashiers`);
  const [selectedCashierId, setSelectedCashierId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const { postData, loading: postLoading } = usePost();
  const navigate = useNavigate();

  useEffect(() => {
    // فقط إذا كان هناك كاشير مسجل في Session مسبقاً يتم توجيهه للرئيسية
    const existingCashierId = sessionStorage.getItem("cashier_id");
    if (existingCashierId) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleCashierSelection = async (_id) => {
    setSelectedCashierId(_id);

    try {
      // 1. اختيار وتفعيل الكاشير
      const response = await postData(`api/pos-home/cashiers/select`, { cashier_id: _id });
      const accounts = response?.data?.financialAccounts || [];
      const cashierDoc = response?.data?.cashier;
      const cashierName = cashierDoc?.name || cashierDoc?.ar_name || `POS ${_id}`;

      // 2. بدء الشيفت
      const startRes = await postData(`api/cashier-shift/start`, { cashier_id: _id });
      const shiftData = startRes?.data?.shift;
      const shiftStartTime = shiftData?.start_time || new Date().toISOString();

      // 3. تخزين البيانات
      sessionStorage.setItem("cashier_id", _id);
      sessionStorage.setItem("cashier_name", cashierName);
      sessionStorage.setItem("financial_accounts", JSON.stringify(accounts));
      localStorage.setItem("offline_pos_cashier_id", _id);

      if (shiftData) {
        sessionStorage.setItem("shift_id", shiftData._id);
        sessionStorage.setItem("shift_start_time", shiftStartTime);
        sessionStorage.setItem("shift_data", JSON.stringify(shiftData));
      }

      openShift(shiftStartTime);

      // 4. ✅ التوجيه للرئيسية وإظهار مودال Shift Started
      navigate("/", {
        replace: true,
        state: {
          showShiftStartedModal: true, // إظهار مودال بدء الشيفت
          cashierName,
          shiftStartTime,
        },
      });
    } catch (err) {
      console.error("Error activating cashier/starting shift:", err);
      toast.error(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        t("FailedToStartShift", "Failed to start shift")
      );
      setSelectedCashierId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  if (error) {
    return <div>Error loading cashiers: {error.message || "Unknown error"}</div>;
  }

  const cashiers = data?.data?.cashiers || [];
  const hiddenCashiers = data?.hidden_cashiers || [];
  const activeCashierIdFromApi = data?.active_cashier_id;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 bg-white min-h-screen ${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black">
            {t("SelectionCashier")}
          </h1>

          <div className="space-y-4 grid grid-cols-1 gap-3">
            {cashiers.length > 0 ? (
              cashiers.map((cashier) => (
                <CashierButton
                  key={cashier._id}
                  cashierId={cashier._id}
                  cashierName={cashier.name || `Cashier ${cashier._id}`}
                  icon={User}
                  isActive={cashier._id === activeCashierIdFromApi}
                  onSelect={handleCashierSelection}
                  loadingPost={postLoading && selectedCashierId === cashier._id}
                />
              ))
            ) : (
              <div>{t("Nocashiersavailable")}</div>
            )}

            {hiddenCashiers.length > 0 && !showHidden && (
              <Button
                onClick={() => setShowHidden(true)}
                className="w-full bg-gray-200 text-black hover:bg-gray-300 font-semibold rounded-xl p-4"
              >
                {t("ShowMore")}
              </Button>
            )}

            {showHidden &&
              hiddenCashiers.map((cashier) => (
                <CashierButton
                  key={cashier._id}
                  cashierId={cashier._id}
                  cashierName={cashier.name || `Cashier ${cashier._id}`}
                  icon={User}
                  isActive={cashier._id === activeCashierIdFromApi}
                  onSelect={handleCashierSelection}
                  loadingPost={postLoading && selectedCashierId === cashier._id}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-white">
        <img src={logo} alt="Logo" className="w-full h-auto max-w-[378px] max-h-[311px] object-contain" />
      </div>
    </div>
  );
}