// src/Hooks/useOpenShift.js
import axios from "axios";
import { useCallback, useState } from "react";
import { useShift } from "@/context/ShiftContext";

/**
 * Same logic as handleOpenShift in Shift.jsx, extracted so it can be
 * called from anywhere (Shift.jsx, Home.jsx, ...) without duplicating
 * the request + context-sync code.
 */
export function useOpenShift() {
  const [loading, setLoading] = useState(false);
  const { openShift } = useShift();

  const openShiftRequest = useCallback(async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}api/cashier-shift/start`;
    const cashierId = sessionStorage.getItem("cashier_id");
    const token = sessionStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const payload = {};
    if (cashierId) payload.cashier_id = cashierId;

    setLoading(true);
    try {
      const res = await axios.post(endpoint, payload, { headers });
      const shiftData = res?.data?.data;
      const serverStartTime = shiftData?.shift?.start_time;
      const serverCashierId = shiftData?.cashier?._id;

      // ✅ خزّن cashier_id الحقيقي القادم من السيرفر في sessionStorage
      // عشان يفضل متاح لقفل الشيفت لاحقًا، حتى لو المستخدم جاي مباشرة
      // من صفحة اللوجين من غير ما يعدي على صفحة اختيار الكاشير
      if (serverCashierId) {
        sessionStorage.setItem("cashier_id", serverCashierId);
      }

      openShift(serverStartTime); // sync ShiftContext with the REAL start time
      return { success: true, data: shiftData };
    } catch (err) {
      return {
        success: false,
        message: err?.response?.data?.message || "FailedToOpenShift",
      };
    } finally {
      setLoading(false);
    }
  }, [openShift]);

  return { openShiftRequest, loading };
}
