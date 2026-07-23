// utils/processProductItem.js

/**
 * معالجة عنصر واحد من السلة وتحويله للشكل اللي الـ Backend بيفهمه
 */
export const processProductItem = (item) => {
  // استخراج الـ ID بأولويات منطقية وشاملة
  let rawId =
    item.product_id ||
    (item.product && (item.product._id || item.product.id)) ||
    item._id ||
    item.id ||
    item.productId ||
    (item.product && typeof item.product === 'string' && item.product);

  // لو مفيش ID → نطبع تحذير ونرجع null (مش هنسمح بإرسال عنصر بدون ID)
  if (!rawId) {
    console.error("⚠️  لم يتم العثور على product ID في العنصر التالي:", item);
    // يمكنك هنا إضافة toast إذا أردتِ عرض رسالة للمستخدم
    // toast.error("خطأ: منتج بدون معرف (ID)");
    return null;
  }

  const productId = String(rawId);

  // الكمية
  const quantity = String(item.count || item.quantity || 1);

  // السعر: نأخذ الأولوية لـ item.price ثم item.product.price
  const rawPrice =
    item.price ||
    (item.product && (item.product.price_after_discount || item.product.price)) ||
    0;

  const price = parseFloat(rawPrice) || 0;
  const subtotal = (price * parseFloat(quantity)).toFixed(2);

  const note = (item.notes || item.note || "").trim() || "No notes";

  // بناء الـ payload الأساسي
  const payload = {
    product_id: productId,
    quantity,
    price: price.toFixed(2),
    subtotal,
    note,
  };

  // معالجة الـ Variations (إن وجدت)
  if (item.different_price && item.selectedVariation?.price_variation) {
    payload.product_price_id = String(item.selectedVariation.price_variation);
  }

  // معالجة الـ Addons / Options
  if (item.addons && Array.isArray(item.addons)) {
    const addons = item.addons
      .map((addon) => {
        const addonId =
          addon.addon_id ||
          (addon.product && (addon.product._id || addon.product.id)) ||
          addon._id ||
          addon.id;

        const count = parseInt(addon.quantity || addon.count || 0);

        if (addonId && count > 0) {
          return {
            addon_id: String(addonId),
            count: String(count),
            price: parseFloat(addon.price || 0).toFixed(2),
          };
        }
        return null;
      })
      .filter(Boolean);

    if (addons.length > 0) {
      payload.addons = addons;
    }
  }

  return payload;
};

/**
 * معالجة الباقات (Bundles)
 */
export const processBundleItem = (bundle) => {
  return {
    bundle_id: String(bundle._id || bundle.id || bundle.bundle_id),
    quantity: String(bundle.count || bundle.quantity || 1),
    price: parseFloat(bundle.price || 0).toFixed(2),
    subtotal: (
      parseFloat(bundle.price || 0) * parseFloat(bundle.count || bundle.quantity || 1)
    ).toFixed(2),
    note: (bundle.notes || bundle.note || "").trim() || "No notes",
  };
};

/**
 * بناء الـ financials payload
 */
export const buildFinancialsPayload = (paymentSplits, financialAccounts = []) => {
  return paymentSplits.map((split) => {
    const account = financialAccounts.find((a) => a._id === split.account_id);

    const payload = {
      account_id: String(split.account_id),
      amount: parseFloat(split.amount || 0).toFixed(2),
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
 */
export const getOrderEndpoint = (hasDealItems) => {
  return hasDealItems ? "cashier/deal/add" : "api/pos/sales";
};

/**
 * بناء الـ Payload الأساسي للطلب
 */
export const buildOrderPayload = ({
  orderItems,
  amountToPay,
  order_tax,
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
}) => {
  // معالجة المنتجات + تصفية أي null
  const products = orderItems
    .filter((item) => !item.isBundle)
    .map(processProductItem)
    .filter((p) => p !== null); // مهم: إزالة أي عنصر فشل في المعالجة

  const bundles = orderItems
    .filter((item) => item.isBundle)
    .map(processBundleItem);

  let customerId =
    customer_id?.toString() ||
    user_id?.toString() ||
    sessionStorage.getItem("selected_customer_id")?.toString();

  if (!customerId) customerId = undefined;

  const basePayload = {
    customer_id: customerId,
    Due,
    grand_total: parseFloat(amountToPay || 0).toFixed(2),
    products,
    bundles,
    financials: financialsPayload,
    order_tax: selectedTaxId ? String(selectedTaxId) : undefined,
    order_discount: discount_id ? String(discount_id) : undefined,
    coupon_code: coupon_code ? String(coupon_code) : undefined,
    notes: (notes || "").trim() || "No notes",
    cashier_id: String(cashierId),
  };

  if (due_module > 0) {
    basePayload.due_module = parseFloat(due_module).toFixed(2);
  }

  if (module_id && module_id !== "all") {
    basePayload.module_id = String(module_id);
  }

  if (free_discount && free_discount > 0) {
    basePayload.free_discount = parseFloat(free_discount).toFixed(2);
    if (password?.trim()) {
      basePayload.password = password.trim();
    }
  }

  // تنظيف الحقول الفارغة / undefined
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
    const amount = parseFloat(split.amount || 0);
    if (amount <= 0) {
      return { valid: false, error: "الرجاء إدخال مبلغ صحيح" };
    }
    total += amount;

    if (getDescriptionStatus(split.account_id)) {
      if (!split.checkout || !/^\d{4}$/.test(split.checkout)) {
        return { valid: false, error: "الرجاء إدخال آخر 4 أرقام بشكل صحيح" };
      }
    }
  }

  return { valid: true, totalPaid: total };
};