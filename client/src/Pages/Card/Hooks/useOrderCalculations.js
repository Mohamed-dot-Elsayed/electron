import { useMemo } from "react";
import { statusOrder } from "../constants";

export function useOrderCalculations(
  orderItems,
  selectedPaymentItems,
  orderType,
  serviceFeeData // ممكن يكون undefined أو { type: "precentage" | "fixed", amount: number }
) {
  return useMemo(() => {
    // دالة مساعدة لحساب سعر الوحدة مع الجملة والإضافات
    const getFinalUnitPrice = (item) => {
      const orderedQty = item.weight_status === 1
        ? Number(item.quantity || item.count || 1)
        : Number(item.count || 1);

      const startQty = Number(item.start_quantaty || 0);
      const wholePrice = Number(item.whole_price || 0);

      let basePrice = (startQty > 0 && orderedQty >= startQty && wholePrice > 0)
        ? wholePrice
        : Number(item.price_after_discount || item.originalPrice || item.price || 0);

      let addonsTotal = 0;
      if (item.addons && Array.isArray(item.addons)) {
        item.addons.forEach((addonGroup) => {
          if (addonGroup.options && Array.isArray(addonGroup.options)) {
            addonGroup.options.forEach((option) => {
              if (option.selected || option.quantity > 0) {
                const qty = option.quantity || 1;
                addonsTotal += Number(option.price || 0) * qty;
              }
            });
          }
        });
      }
      if (item.extras && Array.isArray(item.extras)) {
        item.extras.forEach((extra) => {
          addonsTotal += Number(extra.price || 0) * (extra.quantity || 1);
        });
      }
      return basePrice + addonsTotal;
    };

    // 1. حساب SubTotal
    const subTotal = Array.isArray(orderItems)
      ? orderItems.reduce((acc, item) => {
        const price = getFinalUnitPrice(item);
        const qty = item.weight_status === 1
          ? Number(item.quantity || item.count || 1)
          : Number(item.count || 1);
        return acc + price * qty;
      }, 0)
      : 0;

    // 2. حساب الضرائب + تجميع تفاصيلها
    let order_tax = 0;
    const taxInfo = {};

    orderItems?.forEach((item) => {
      const taxPerUnit = Number(item.tax_val ?? 0);
      const qty = item.weight_status === 1
        ? Number(item.quantity || item.count || 1)
        : Number(item.count || 1);

      if (taxPerUnit > 0) {
        order_tax += taxPerUnit * qty;

        if (item.tax_obj) {
          const taxId = item.tax_obj.id;
          if (!taxInfo[taxId]) {
            taxInfo[taxId] = {
              name: item.tax_obj.name,
              amount: item.tax_obj.amount,
              type: item.tax_obj.type,
              total: 0,
            };
          }
          taxInfo[taxId].total += taxPerUnit * qty;
        }
      }
    });

    const taxDetails = Object.values(taxInfo);

    // 3. Service Fee (dine_in و take_away فقط)
    const serviceFeeAmount = serviceFeeData?.amount ?? 0;
    const serviceFeeType = serviceFeeData?.type ?? "precentage";
    // يقبل كلا الشكلين: "precentage" (خطأ إملائي قديم) و "percentage" (الصحيح)
    const isPercentage = serviceFeeType !== "fixed";
    const applyServiceFee =
      ["dine_in", "take_away"].includes(orderType) && serviceFeeAmount > 0;

    let serviceChargeFull = 0;
    if (applyServiceFee) {
      if (isPercentage) {
        serviceChargeFull = (subTotal + order_tax) * (serviceFeeAmount / 100);
      } else {
        serviceChargeFull = serviceFeeAmount; // مبلغ ثابت
      }
    }

    // المجموع الكلي للطلب (للعرض)
    const totalAmountDisplay = subTotal + order_tax + serviceChargeFull;

    // 4. حساب amountToPay (المبلغ المطلوب دفعه حاليًا)
    let amountToPay = totalAmountDisplay;

    if (orderType === "dine_in" && selectedPaymentItems.length > 0) {
      const selectedItems = orderItems.filter(
        (item) =>
          selectedPaymentItems.includes(item.temp_id) &&
          item.preparation_status === "done"
      );

      const selectedSubTotal = selectedItems.reduce((acc, item) => {
        const price = getFinalUnitPrice(item);
        const qty = item.weight_status === 1
          ? Number(item.quantity || item.count || 1)
          : Number(item.count || 1);
        return acc + price * qty;
      }, 0);

      const selectedTax = selectedItems.reduce((acc, item) => {
        const taxPerUnit = Number(item.tax_val ?? 0);
        const qty = item.weight_status === 1
          ? Number(item.quantity || item.count || 1)
          : Number(item.count || 1);
        return acc + taxPerUnit * qty;
      }, 0);

      let selectedServiceCharge = 0;
      if (applyServiceFee) {
        if (isPercentage) {
          selectedServiceCharge =
            (selectedSubTotal + selectedTax) * (serviceFeeAmount / 100);
        } else {
          // للمبلغ الثابت: نقسمه بنسبة المبلغ المختار (أكثر عدلاً)
          const ratio = subTotal > 0 ? selectedSubTotal / subTotal : 0;
          selectedServiceCharge = serviceChargeFull * ratio;
        }
      }

      amountToPay = selectedSubTotal + selectedTax + selectedServiceCharge;
    }

    // 5. العناصر الجاهزة
    const doneItems = Array.isArray(orderItems)
      ? orderItems.filter((item) => item.preparation_status === "done")
      : [];

    // 6. العناصر اللي هتدخل الـ checkout
    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems.length > 0
        ? orderItems.filter(
          (item) =>
            selectedPaymentItems.includes(item.temp_id) &&
            item.preparation_status === "done"
        )
        : orderItems;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      order_tax: Number(order_tax.toFixed(2)),
      totalOtherCharge: Number(serviceChargeFull.toFixed(2)), // Service Fee
      totalAmountDisplay: Number(totalAmountDisplay.toFixed(2)),
      amountToPay: Number(amountToPay.toFixed(2)),
      taxDetails,
      doneItems,
      checkoutItems,
      currentLowestSelectedStatus: statusOrder[0],
    };
  }, [
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData?.amount,
    serviceFeeData?.type,
  ]);
}