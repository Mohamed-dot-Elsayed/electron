import { useMemo } from "react";
import { useGet } from "@/Hooks/useGet";

/**
 * Shared hook for calculating discount amounts.
 * Used by both CheckOut.jsx and OrderSummary.jsx to avoid code duplication.
 *
 * ⚠️ IMPORTANT: the discount is calculated on the PRODUCTS subtotal only
 * (before tax and service fees) — this matches the backend `createSale`
 * (`discountAmount = subtotal * amount`). Never calculate it on the total
 * that includes tax/fees, otherwise the POS and the backend disagree and the
 * order is rejected with "Sum of payments must equal grand_total".
 *
 * @param {number} amountToPay - Final amount to pay (products + tax + fees)
 * @param {string|null} discountId - Selected discount ID from list
 * @param {number} appliedDiscount - Applied coupon discount percentage
 * @param {string|number} freeDiscount - Free discount value (EGP)
 * @param {number} discountBase - Products subtotal used as the discount base
 * @returns {{ listDiscountAmount, freeDiscountValue, totalDiscountDisplay, finalAmountToPay }}
 */
export function useDiscountCalculation(
  amountToPay,
  discountId,
  appliedDiscount,
  freeDiscount,
  discountBase
) {
  const { data: discountListData } = useGet("api/admin/discount");

  // الخصم بيتحسب على سعر المنتجات فقط (زي الباك إند)
  const base =
    Number(discountBase) >= 0 ? Number(discountBase) || 0 : Number(amountToPay) || 0;

  const listDiscountAmount = useMemo(() => {
    // لو فيه applied discount (coupon/byCompany)
    if (appliedDiscount > 0) {
      return base * (appliedDiscount / 100);
    }
    // لو فيه discount مختار من الـ select list
    if (discountId) {
      const discountList = discountListData?.data?.discounts || [];
      const selected = discountList.find((d) => d._id === discountId);
      if (!selected) return 0;
      if (selected.type === "percentage") {
        let rate = Number(selected.amount) || 0;
        // fix: لو القيمة أقل من 1 → نفترض إنها 0.1 بدل 10%
        if (rate < 1 && rate > 0) rate *= 100;
        return base * (rate / 100);
      } else {
        return Number(selected.amount) || 0;
      }
    }
    return 0;
  }, [discountId, appliedDiscount, discountListData, base]);

  const freeDiscountValue = Math.max(0, parseFloat(freeDiscount) || 0);
  const totalDiscountDisplay = listDiscountAmount + freeDiscountValue;
  const finalAmountToPay = Math.max(0, amountToPay - totalDiscountDisplay);

  return {
    listDiscountAmount,
    freeDiscountValue,
    totalDiscountDisplay,
    finalAmountToPay,
  };
}
