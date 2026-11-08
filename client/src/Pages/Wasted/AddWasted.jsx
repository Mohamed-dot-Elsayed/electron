import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Search, PackageX, Package, X, Layers, AlertTriangle, FileText } from "lucide-react";

// دالة مساعدة لاستخراج اسم وتفاصيل الـ Variant (المقاس، اللون، إلخ)
function getVariantLabel(priceObj, isArabic = false) {
  if (!priceObj) return "";
  const parts = [];

  // 1. من variations array: [{ name: "Size", options: [{ name: "SM", ar_name: "صغير" }] }]
  if (Array.isArray(priceObj.variations) && priceObj.variations.length > 0) {
    priceObj.variations.forEach((v) => {
      if (Array.isArray(v.options) && v.options.length > 0) {
        const optNames = v.options
          .map((opt) => {
            if (typeof opt === "object" && opt !== null) {
              return isArabic ? opt.ar_name || opt.name : opt.name || opt.ar_name;
            }
            return String(opt || "");
          })
          .filter(Boolean);
        if (optNames.length > 0) {
          parts.push(optNames.join(", "));
        }
      } else if (v.name) {
        parts.push(v.name);
      }
    });
  }

  // 2. من options array: [{ name: "SM", ar_name: "صغير" }]
  if (parts.length === 0 && Array.isArray(priceObj.options) && priceObj.options.length > 0) {
    const optNames = priceObj.options
      .map((opt) => {
        if (typeof opt === "object" && opt !== null) {
          return isArabic ? opt.ar_name || opt.name : opt.name || opt.ar_name;
        }
        return String(opt || "");
      })
      .filter(Boolean);
    if (optNames.length > 0) {
      parts.push(...optNames);
    }
  }

  // 3. من الحقول المباشرة
  if (parts.length === 0) {
    const direct =
      priceObj.variation_name ||
      priceObj.title ||
      priceObj.size ||
      priceObj.color ||
      (priceObj.name && priceObj.name !== priceObj.code ? priceObj.name : "");
    if (direct) {
      parts.push(direct);
    }
  }

  const unique = Array.from(new Set(parts.filter(Boolean)));
  if (unique.length > 0) {
    return unique.join(" - ");
  }

  return priceObj.code || "Variant";
}

// قراءة المستودع المخزن للمستخدم الحالي
function getStoredWarehouseId() {
  try {
    const raw = sessionStorage.getItem("warehouseId");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object" && parsed._id) return String(parsed._id);
    }
    const userRaw = sessionStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.warehouse_id?._id) return String(user.warehouse_id._id);
      if (typeof user?.warehouse_id === "string") return user.warehouse_id;
    }
  } catch (e) {
    // ignore
  }
  return "";
}

export default function AddWasted({ onClose, refetchParent }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { postData } = usePost();

  // 1. جلب المستودعات في الخلفية لربط الـ warehouseId تلقائياً
  const { data: warehousesRes } = useGet("api/admin/pos-home/warehouses");

  // 2. جلب المنتجات
  const { data: productsRes, loading: productsLoading } = useGet("api/admin/product");

  // استخراج قائمة المستودعات
  const warehouses = useMemo(() => {
    if (!warehousesRes) return [];
    if (Array.isArray(warehousesRes)) return warehousesRes;
    if (Array.isArray(warehousesRes?.data?.data)) return warehousesRes.data.data;
    if (Array.isArray(warehousesRes?.data?.warehouses)) return warehousesRes.data.warehouses;
    if (Array.isArray(warehousesRes?.warehouses)) return warehousesRes.warehouses;
    if (Array.isArray(warehousesRes?.data)) return warehousesRes.data;
    return [];
  }, [warehousesRes]);

  // استخراج قائمة المنتجات
  const allProducts = useMemo(() => {
    if (!productsRes) return [];
    if (Array.isArray(productsRes)) return productsRes;
    if (Array.isArray(productsRes?.data?.products)) return productsRes.data.products;
    if (Array.isArray(productsRes?.products)) return productsRes.products;
    if (Array.isArray(productsRes?.data?.data)) return productsRes.data.data;
    if (Array.isArray(productsRes?.data)) return productsRes.data;
    return [];
  }, [productsRes]);

  // حالات النموذج
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productPriceId, setProductPriceId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("damaged");
  const [note, setNote] = useState("");

  // حالات السيرش والقائمة التفاعلية للمنتج
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // ضبط المستودع الافتراضي تلقائياً من الجلسة في الخلفية
  useEffect(() => {
    const storedWhId = getStoredWarehouseId();
    if (storedWhId) {
      setWarehouseId(storedWhId);
    } else if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(String(warehouses[0]._id));
    }
  }, [warehouses]);

  // منع الـ scroll لصفحة الخلفية أثناء فتح المودال
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // فلترة المنتجات بحسب نص البحث
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts.slice(0, 40);
    const term = productSearch.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const arName = (p.ar_name || "").toLowerCase();
        const code = (p.code || "").toLowerCase();
        return name.includes(term) || arName.includes(term) || code.includes(term);
      })
      .slice(0, 50);
  }, [allProducts, productSearch]);

  // المنتج المختار حالياً
  const selectedProduct = useMemo(() => {
    if (!productId) return null;
    return allProducts.find((p) => String(p._id) === String(productId));
  }, [allProducts, productId]);

  // التشكيلات والخيارات للمنتج المختار (Variants)
  const variants = useMemo(() => {
    if (!selectedProduct?.prices || selectedProduct.prices.length === 0) {
      return [];
    }
    return selectedProduct.prices.map((p) => ({
      _id: p._id,
      name: getVariantLabel(p, isArabic),
      code: p.code,
      price: p.price,
      quantity: p.quantity,
    }));
  }, [selectedProduct, isArabic]);

  // حساب أقصى رصيد متاح للهالك
  const maxAvailableStock = useMemo(() => {
    if (!selectedProduct) return null;
    if (productPriceId) {
      const selectedVariant = variants.find(
        (v) => String(v._id) === String(productPriceId)
      );
      if (
        selectedVariant &&
        selectedVariant.quantity !== undefined &&
        selectedVariant.quantity !== null
      ) {
        return selectedVariant.quantity;
      }
    }
    return selectedProduct.availableStock ?? selectedProduct.quantity ?? null;
  }, [selectedProduct, productPriceId, variants]);

  // اختيار منتج من القائمة التفاعلية
  const handleSelectProduct = (p) => {
    setProductId(p._id);
    setProductPriceId("");
    setQuantity("");
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  // إلغاء تحديد المنتج للبحث عن منتج آخر
  const handleClearProduct = () => {
    setProductId("");
    setProductPriceId("");
    setQuantity("");
    setProductSearch("");
    setIsDropdownOpen(true);
  };

  // إرسال البيانات للباك إند
  const handleSubmit = async () => {
    const finalWarehouseId =
      warehouseId ||
      getStoredWarehouseId() ||
      (warehouses.length > 0 ? String(warehouses[0]._id) : "");

    if (!finalWarehouseId) {
      toast.error(t("PleaseSelectWarehouse"));
      return;
    }
    if (!productId) {
      toast.error(t("PleaseSelectProduct"));
      return;
    }
    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      toast.error(t("QuantityMustBeGreaterThanZero"));
      return;
    }
    if (!reason) {
      toast.error(t("PleaseSelectReason"));
      return;
    }

    setIsSubmitting(true);

    const body = {
      productId,
      productPriceId: productPriceId || null,
      warehouseId: finalWarehouseId,
      quantity: numQty,
      reason,
      note: note.trim() || undefined,
    };

    try {
      try {
        await postData("api/admin/pos-wasted", body);
      } catch (posErr) {
        await postData("api/admin/wasted", body);
      }
      toast.success(t("WastedAdded"));
      refetchParent?.();
      onClose();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.response?.data?.faield ||
        err?.message ||
        t("FailedToAddWasted");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl p-4 w-[95%] max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
              <PackageX className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t("AddWasted")}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
          >
            ✕
          </button>
        </div>

        {/* ===================== حقل اختيار المنتج التفاعلي ===================== */}
        <div className="mb-3">
          <label className="block font-semibold text-xs text-gray-600 mb-1.5">
            {t("Product")} <span className="text-red-500">*</span>
          </label>

          {/* في حالة تم اختيار منتج: بطاقة المنتج الأنيقة مع زر التغيير */}
          {selectedProduct ? (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-purple-600 shrink-0 shadow-xs">
                  <Package size={20} />
                </div>
                <div className="truncate">
                  <p className="font-bold text-sm text-gray-900 truncate">
                    {isArabic
                      ? selectedProduct.ar_name || selectedProduct.name
                      : selectedProduct.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {selectedProduct.code && (
                      <span className="font-mono text-[10px] text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        {selectedProduct.code}
                      </span>
                    )}
                    {selectedProduct.quantity !== undefined && (
                      <span className="text-emerald-700 font-bold text-[11px]">
                        {t("AvailableStock")}: {selectedProduct.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearProduct}
                className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100/50 border border-purple-200 rounded-lg shadow-2xs transition-colors shrink-0"
              >
                {isArabic ? "تغيير" : "Change"}
              </button>
            </div>
          ) : (
            /* في حالة لم يتم اختيار منتج: حقل بحث ذكي مع قائمة اقتراحات فورية */
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
                    isArabic ? "right-3" : "left-3"
                  }`}
                />
                <input
                  type="text"
                  placeholder={
                    isArabic
                      ? "ابحث باسم المنتج أو الكود/الباركود..."
                      : "Search by product name or code..."
                  }
                  value={productSearch}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all ${
                    isArabic ? "pr-9 pl-9" : "pl-9 pr-9"
                  }`}
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch("");
                      setIsDropdownOpen(true);
                    }}
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 ${
                      isArabic ? "left-2.5" : "right-2.5"
                    }`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* القائمة المنسدلة لنتائج البحث */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {productsLoading ? (
                    <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>{t("Loading...")}</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      {isArabic ? "لا توجد منتجات مطابقة للبحث" : "No matching products found"}
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const name = isArabic ? p.ar_name || p.name : p.name;
                      const subName = isArabic ? p.name : p.ar_name;
                      const stock = p.availableStock ?? p.quantity ?? 0;
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-2.5 hover:bg-purple-50/70 cursor-pointer transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="truncate">
                            <p className="font-bold text-xs text-gray-800 truncate">{name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.code && (
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1 py-0.2 rounded">
                                  {p.code}
                                </span>
                              )}
                              {subName && subName !== name && (
                                <span className="text-[10px] text-gray-400 truncate">
                                  {subName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {t("AvailableStock")}: {stock}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===================== اختيار التشكيلة/المقاس (إذا وجدت) ===================== */}
        {selectedProduct && variants.length > 0 && (
          <div className="mb-3">
            <label className="block font-semibold text-xs text-gray-600 mb-1.5 flex items-center gap-1">
              <Layers size={13} className="text-purple-600" />
              {t("Variation")}
            </label>
            <select
              value={productPriceId}
              onChange={(e) => setProductPriceId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            >
              <option value="">
                {t("BaseProduct")} ({t("Optional")})
              </option>
              {variants.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name} {v.price !== undefined ? `(${v.price} EGP)` : ""}{" "}
                  {v.quantity !== undefined && v.quantity !== null
                    ? `[${t("AvailableStock")}: ${v.quantity}]`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ===================== الكمية ===================== */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-semibold text-xs text-gray-600">
              {t("Quantity")} <span className="text-red-500">*</span>
            </label>
            {maxAvailableStock !== null && (
              <span className="text-[11px] text-gray-500">
                {t("AvailableStock")}:{" "}
                <span className="font-bold text-red-600">{maxAvailableStock}</span>
              </span>
            )}
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={t("Quantity")}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* ===================== سبب الهالك ===================== */}
        <div className="mb-3">
          <label className="block font-semibold text-xs text-gray-600 mb-1.5 flex items-center gap-1">
            <AlertTriangle size={13} className="text-amber-500" />
            {t("Reason")} <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            <option value="damaged">{t("damaged")}</option>
            <option value="expired">{t("expired")}</option>
            <option value="theft">{t("theft")}</option>
            <option value="lost">{t("lost")}</option>
            <option value="stocktake_not_found">{t("stocktake_not_found")}</option>
            <option value="other">{t("other")}</option>
          </select>
        </div>

        {/* ===================== الملاحظات ===================== */}
        <div className="mb-4">
          <label className="block font-semibold text-xs text-gray-600 mb-1.5 flex items-center gap-1">
            <FileText size={13} className="text-gray-400" />
            {t("Note")} ({t("Optional")})
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Note")}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
        </div>

        {/* ===================== زر الحفظ ===================== */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || productsLoading}
          className={`w-full py-3 text-white font-bold rounded-xl text-sm transition-all shadow-md ${
            isSubmitting || productsLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-bg-primary hover:opacity-90 active:scale-[0.99]"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              {t("Loading...")}
            </span>
          ) : (
            t("Add")
          )}
        </button>
      </div>
    </div>
  );
}
