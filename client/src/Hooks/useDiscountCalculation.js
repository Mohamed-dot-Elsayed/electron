import { useMemo } from "react";
import { useGet } from "@/Hooks/useGet";

/**
 * Shared hook for calculating discount amounts.
 * Used by both CheckOut.jsx and OrderSummary.jsx to avoid code duplication.
 *
 * @param {number} amountToPay - Base amount before discount
 * @param {string|null} discountId - Selected discount ID from list
 * @param {number} appliedDiscount - Applied coupon discount percentage
 * @param {string|number} freeDiscount - Free discount value (EGP)
 * @returns {{ listDiscountAmount, freeDiscountValue, totalDiscountDisplay, finalAmountToPay }}
 */
export function useDiscountCalculation(
  amountToPay,
  discountId,
  appliedDiscount,
  freeDiscount
) {
  const { data: discountListData } = useGet("api/discount");

  const listDiscountAmount = useMemo(() => {
    // لو فيه applied discount (coupon/byCompany)
    if (appliedDiscount > 0) {
      return amountToPay * (appliedDiscount / 100);
    }
    // لو فيه discount مختار من الـ select list
    if (discountId) {
      const discountList = discountListData?.data?.discounts || [];
      const selected = discountList.find((d) => d._id === discountId);
      if (!selected) return 0;
      if (selected.type === "percentage") {
        let rate = selected.amount;
        // fix: لو القيمة أقل من 1 → نفترض إنها 0.1 بدل 10%
        if (rate < 1 && rate > 0) rate *= 100;
        return amountToPay * (rate / 100);
      } else {
        return selected.amount;
      }
    }
    return 0;
  }, [discountId, appliedDiscount, discountListData, amountToPay]);

  const freeDiscountValue = parseFloat(freeDiscount) || 0;
  const totalDiscountDisplay = listDiscountAmount + freeDiscountValue;
  const finalAmountToPay = Math.max(0, amountToPay - totalDiscountDisplay);

  return {
    listDiscountAmount,
    freeDiscountValue,
    totalDiscountDisplay,
    finalAmountToPay,
  };
}
