// utils/processProductItem.js

/**
 * معالجة عنصر واحد من السلة وتحويله للشكل اللي الـ Backend بيفهمه
 *
 * ⚠️ مهم: بنبعت السعر الخام (item.price) من غير أي خصم مطبّق.
 *    الباك هو اللي بيحسب الـ wholesale والـ line discount.
 */
export const processProductItem = (item) => {
  // ─── استخراج الـ ID بأولويات منطقية ───
  let rawId =
    item.product_id ||
    (item.product && (item.product._id || item.product.id)) ||
    item._id ||
    item.id ||
    item.productId ||
    (item.product && typeof item.product === "string" && item.product);

  if (!rawId) {
    console.error("⚠️ لم يتم العثور على product ID في العنصر التالي:", item);
    return null;
  }

  const productId = String(rawId);

  // ─── الكمية ───
  const quantityNum = Number(item.count ?? item.quantity ?? 1);
  const quantity = String(quantityNum);

  // ─── السعر الخام (من غير أي خصم مطبّق) ───
  //    ملاحظة: مش بنستخدم price_after_discount عشان الباك يحسب الخصم بنفسه
  const rawPrice = item.price ?? (item.product && item.product.price) ?? 0;

  const price = Number(rawPrice) || 0;
  const subtotal = (price * quantityNum).toFixed(2);

  const note = (item.notes || item.note || "").trim() || "No notes";

  // ─── الـ payload الأساسي ───
  const payload = {
    product_id: productId,
    quantity,
    price: price.toFixed(2),
    subtotal,
    note,
  };

  // ─── Variation ID ───
  const rawPriceId =
    item.product_price_id ||
    item.selectedVariation?.price_variation ||
    item.selectedVariant?._id;

  if (rawPriceId) {
    payload.product_price_id = String(rawPriceId);
  }

  // ─── line discount (لو موجود) ───
  //    الباك بياخد discount كـ fixed أو percentage على السطر
  if (Number(item.discount) > 0) {
    payload.discount = Number(item.discount);
    payload.discount_type = item.discount_type || "fixed";
  }

  // ─── isGift ───
  if (item.isGift) {
    payload.isGift = true;
  }

  // ─── options_id (variations/options) ───
  if (item.options_id) {
    payload.options_id = item.options_id;
  }

  return payload;
};

/**
 * معالجة الباقات (Bundles)
 */
export const processBundleItem = (bundle) => {
  const quantityNum = Number(bundle.count ?? bundle.quantity ?? 1);
  const price = Number(bundle.price) || 0;

  const payload = {
    bundle_id: String(bundle._id || bundle.id || bundle.bundle_id),
    quantity: String(quantityNum),
    price: price.toFixed(2),
    subtotal: (price * quantityNum).toFixed(2),
    note: (bundle.notes || bundle.note || "").trim() || "No notes",
  };

  if (bundle.selected_variations) {
    payload.selected_variations = bundle.selected_variations;
  }

  if (bundle.isGift) {
    payload.isGift = true;
  }

  if (Number(bundle.discount) > 0) {
    payload.discount = Number(bundle.discount);
    payload.discount_type = bundle.discount_type || "fixed";
  }

  return payload;
};

/**
 * بناء الـ financials payload
 *
 * ⚠️ الباك بيتوقع amount كـ number مش string
 *    (بيعمل Number(f.amount) بس الأفضل نبعته number أصلاً)
 */
export const buildFinancialsPayload = (
  paymentSplits,
  financialAccounts = [],
) => {
  return paymentSplits
    .filter((split) => Number(split.amount) > 0)
    .map((split) => {
      const payload = {
        account_id: String(split.account_id || split.accountId),
        amount: Math.round(Number(split.amount) * 100) / 100, // number مش string
      };

      if (split.checkout?.trim()) {
        payload.description = split.checkout.trim();
      }

      if (split.transition_id?.trim()) {
        payload.transition_id = split.transition_id.trim();
      }

      return payload;
    });
};

/**
 * تحديد الـ Endpoint الصحيح
 *
 * ⚠️ الباك بيقرا hasDealItems من أول arg
 */
export const getOrderEndpoint = (_arg, _orderItems, hasDealItems) => {
  // دعم الاتنين: (hasDealItems) أو (_, _, hasDealItems)
  const isDeal =
    typeof hasDealItems === "boolean"
      ? hasDealItems
      : typeof _arg === "boolean"
        ? _arg
        : false;

  return isDeal ? "cashier/deal/add" : "api/admin/pos/sales";
};

/**
 * بناء الـ Payload الأساسي للطلب
 *
 * ⚠️ قواعد مهمة:
 *  - مفيش grand_total (الباك مش بيقراه)
 *  - مفيش discount (الباك بياخده من order_discount doc أو fallback)
 *  - order_tax / order_discount = IDs بس
 *  - coupon_code = الكود بس
 *  - financials = المبلغ النهائي اللي الباك هيحسبه
 *  - products[].price = السعر الخام (من غير أي خصم مطبّق)
 */
// utils/processProductItem.js

export const buildOrderPayload = ({
  orderItems,
  amountToPay,
  order_tax,
  totalDiscount = 0,
  notes,
  financialsPayload,
  cashierId,
  Due = 0,
  user_id,
  customer_id,
  discount_id,
  module_id,
  free_discount,
  due_module,
  selectedTaxAmount = 0,
  selectedTaxId,
  password,
  coupon_code,
  service_fee_ids = [], // ✅ جديد
}) => {
  // ─── المنتجات ───
  const products = orderItems
    .filter((item) => !item.isBundle && !item.is_deal)
    .map(processProductItem)
    .filter((p) => p !== null);

  // ─── الباقات ───
  const bundles = orderItems
    .filter((item) => item.isBundle)
    .map(processBundleItem);

  // ─── customer id ───
  let customerId =
    customer_id?.toString() ||
    user_id?.toString() ||
    sessionStorage.getItem("selected_customer_id")?.toString();

  if (!customerId) customerId = undefined;

  // ─── الـ payload ───
  const basePayload = {
    customer_id: customerId,
    Due: Number(Due) === 1 ? 1 : 0,
    products,
    bundles,
    financials: financialsPayload,
    notes: (notes || "").trim() || "No notes",
    cashier_id: String(cashierId),
  };

  // ─── order_tax: نبعت ID بس ───
  const finalTaxId = selectedTaxId || order_tax;
  if (finalTaxId) {
    basePayload.order_tax = String(finalTaxId);
  }

  // ─── order_discount: نبعت ID بس ───
  if (discount_id) {
    basePayload.order_discount = String(discount_id);
  }

  // ─── coupon_code: الكود بس ───
  if (coupon_code) {
    basePayload.coupon_code = String(coupon_code);
  }

  // ─── service_fee_ids ✅ جديد ───
  if (Array.isArray(service_fee_ids) && service_fee_ids.length > 0) {
    basePayload.service_fee_ids = service_fee_ids.map((id) => String(id));
  }

  // ─── due_module ───
  if (Number(due_module) > 0) {
    basePayload.due_module = Number(due_module).toFixed(2);
  }

  // ─── module_id ───
  if (module_id && module_id !== "all") {
    basePayload.module_id = String(module_id);
  }

  // ─── free_discount + password ───
  if (Number(free_discount) > 0) {
    basePayload.free_discount = Number(free_discount).toFixed(2);
    if (password?.trim()) {
      basePayload.password = password.trim();
    }
  }

  // ─── تنظيف ───
  Object.keys(basePayload).forEach((key) => {
    if (basePayload[key] === undefined || basePayload[key] === null) {
      delete basePayload[key];
    }
  });

  return basePayload;
};

/**
 * Deal Payload
 */
export const buildDealPayload = (orderItems, financialsPayload) => {
  const deal = orderItems.find((i) => i.is_deal);
  if (!deal) return null;

  return {
    deal_id: String(deal.deal_id),
    user_id: deal.deal_user_id ? String(deal.deal_user_id) : "",
    financials: financialsPayload,
  };
};

/**
 * التحقق من صحة تقسيم الدفع
 */
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  let total = 0;

  for (const split of paymentSplits) {
    const amount = Number(split.amount) || 0;
    if (amount <= 0) {
      return { valid: false, error: "الرجاء إدخال مبلغ صحيح" };
    }
    total += amount;

    if (getDescriptionStatus && getDescriptionStatus(split.account_id)) {
      if (!split.checkout || !/^\d{4}$/.test(split.checkout)) {
        return {
          valid: false,
          error: "الرجاء إدخال آخر 4 أرقام بشكل صحيح",
        };
      }
    }
  }

  return { valid: true, totalPaid: total };
};
