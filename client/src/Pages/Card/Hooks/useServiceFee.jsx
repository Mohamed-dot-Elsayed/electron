// hooks/useServiceFee.js
import { useGet } from "@/Hooks/useGet";
import { useMemo } from "react";

export const useServiceFee = () => {
  const { data, isLoading, error, refetch } = useGet("api/admin/pos-home/service-fees");

  // Response shape: { success, data: { message, data: [ ...fees ] } }
  const serviceFeeData = useMemo(() => {
    const feesArray = data?.data?.data;
    if (!Array.isArray(feesArray) || feesArray.length === 0) return null;
    // استخدم أول fee نشطة أو أول عنصر في القائمة
    const activeFee = feesArray.find((f) => f.status === 1 || f.status === "active") ?? feesArray[0];
    return activeFee ?? null;
  }, [data]);

  return { data: serviceFeeData, isLoading, error, refetch };
};