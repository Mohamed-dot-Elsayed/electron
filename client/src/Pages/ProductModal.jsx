{/* ProductModal.jsx - Full Updated Version with different_price + variations + notes + weight + duplicate check */ }

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

// تحويل prices إلى variation وهمية عشان نعرضها بنفس الطريقة
const getPricesAsVariation = (product, t) => {
  if (!product.different_price || !product.prices || product.prices.length === 0) {
    return null;
  }

  return {
    id: "price_variation",
    name: t("ChooseVersion") || "اختر الإصدار",
    type: "single",
    required: true,
    options: product.prices.map((p) => ({
      id: p._id,
      name: p.code || `$${p.price.toFixed(2)}`,
      price: p.price,
      price_after_tax: p.price,
      image: p.gallery?.[0] || product.image,
    })),
  };
};

// حساب السعر الكلي مع دعم different_price
const calculateProductTotalPrice = (
  baseProduct,
  selectedVariation = {},
  selectedExtras = [],
  quantity = 1
) => {
  // حالة different_price: السعر يؤخذ من النسخة المختارة فقط
  if (baseProduct.different_price && selectedVariation.price_variation) {
    const selectedPrice = baseProduct.prices?.find(
      (p) => p._id === selectedVariation.price_variation
    );
    if (selectedPrice) {
      return parseFloat(selectedPrice.price || 0) * quantity;
    }
  }

  // الحالة العادية: سعر المنتج الأساسي + variations + extras
  const startQty = Number(baseProduct.start_quantaty || 0);
  const wholePrice = Number(baseProduct.whole_price || 0);
  // الشرط: إذا كانت الكمية المطلوبة أكبر من أو تساوي بداية الجملة
  const isWholesale = startQty > 0 && quantity >= startQty && wholePrice > 0;

  let totalPrice = isWholesale
    ? wholePrice
    : parseFloat(baseProduct.price_after_discount || baseProduct.price || 0);

  // إضافة أسعار الـ variations العادية
  if (baseProduct.variations && Object.keys(selectedVariation).length > 0) {
    baseProduct.variations.forEach((variation) => {
      const selectedOptions = selectedVariation[variation.id];

      if (selectedOptions !== undefined) {
        if (variation.type === "single") {
          const selectedOption = variation.options?.find(
            (opt) => opt.id === selectedOptions
          );
          if (selectedOption) {
            totalPrice += parseFloat(
              selectedOption.price_after_tax || selectedOption.price || 0
            );
          }
        } else if (variation.type === "multiple") {
          const optionsArray = Array.isArray(selectedOptions)
            ? selectedOptions
            : [selectedOptions];
          optionsArray.forEach((optionId) => {
            const option = variation.options?.find((opt) => opt.id === optionId);
            if (option) {
              totalPrice += parseFloat(
                option.price_after_tax || option.price || 0
              );
            }
          });
        }
      }
    });
  }

  // إضافة الـ extras و addons
  if (selectedExtras && selectedExtras.length > 0) {
    const extraCounts = {};
    selectedExtras.forEach((extraId) => {
      extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
    });

    Object.entries(extraCounts).forEach(([extraId, count]) => {
      let extraItem =
        baseProduct.allExtras?.find((extra) => extra.id === parseInt(extraId)) ||
        baseProduct.addons?.find((addon) => addon.id === parseInt(extraId));

      if (extraItem) {
        const extraPrice = parseFloat(
          extraItem.price_after_discount ||
          extraItem.price_after_tax ||
          extraItem.price ||
          0
        );
        totalPrice += extraPrice * count;
      }
    });
  }

  return totalPrice * quantity;
};

// فحص التكرار (مع دعم different_price)
export const areProductsEqual = (product1, product2) => {
  if (product1._id !== product2._id) return false;

  const vars1 = product1.selectedVariation || {};
  const vars2 = product2.selectedVariation || {};

  // مقارنة price_variation أولاً
  if (vars1.price_variation !== vars2.price_variation) return false;

  const varKeys1 = Object.keys(vars1).filter(k => k !== "price_variation").sort();
  const varKeys2 = Object.keys(vars2).filter(k => k !== "price_variation").sort();

  if (JSON.stringify(varKeys1) !== JSON.stringify(varKeys2)) return false;

  for (let key of varKeys1) {
    const val1 = Array.isArray(vars1[key]) ? [...vars1[key]].sort() : vars1[key];
    const val2 = Array.isArray(vars2[key]) ? [...vars2[key]].sort() : vars2[key];
    if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
  }

  const extras1 = [...(product1.selectedExtras || [])].sort();
  const extras2 = [...(product2.selectedExtras || [])].sort();
  if (JSON.stringify(extras1) !== JSON.stringify(extras2)) return false;

  const excludes1 = [...(product1.selectedExcludes || [])].sort();
  const excludes2 = [...(product2.selectedExcludes || [])].sort();
  if (JSON.stringify(excludes1) !== JSON.stringify(excludes2)) return false;

  const notes1 = (product1.notes || "").trim();
  const notes2 = (product2.notes || "").trim();
  if (notes1 !== notes2) return false;

  return true;
};

const ProductModal = ({
  isOpen,
  onClose,
  selectedProduct,
  selectedVariation = {},
  selectedExtras = [],
  selectedExcludes = [],
  quantity,
  validationErrors = {},
  hasErrors = false,
  onVariationChange,
  onExtraChange,
  onExtraDecrement,
  onExclusionChange,
  onQuantityChange,
  onAddFromModal,
  orderLoading,
  productType = "piece",
}) => {
  const [notes, setNotes] = useState("");
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  if (!selectedProduct) return null;

  const isWeightProduct = productType === "weight" || selectedProduct.weight_status === 1;

  // دعم different_price كـ variation
  const priceVariation = selectedProduct.different_price
    ? getPricesAsVariation(selectedProduct, t)
    : null;

  const effectiveVariations = priceVariation
    ? [priceVariation, ...(selectedProduct.variations || [])]
    : selectedProduct.variations || [];

  const hasVariations = effectiveVariations.length > 0;
  const hasAddons = selectedProduct.addons && selectedProduct.addons.length > 0;
  const hasExtras = selectedProduct.allExtras && selectedProduct.allExtras.length > 0;
  const hasExcludes = selectedProduct.excludes && selectedProduct.excludes.length > 0;

  const totalPrice = calculateProductTotalPrice(
    selectedProduct,
    selectedVariation,
    selectedExtras,
    quantity
  );

  // صورة النسخة المختارة (لو موجودة)
  const selectedPriceImage =
    selectedVariation.price_variation &&
    selectedProduct.prices?.find((p) => p._id === selectedVariation.price_variation)
      ?.gallery?.[0];

  const displayedImage = selectedPriceImage || selectedProduct.image;

  const getExtraCount = (extraId) => {
    return selectedExtras.filter((id) => id === extraId).length;
  };

  const handleExtraIncrement = (extraId) => {
    onExtraChange(extraId);
  };

  const handleExtraDecrement = (extraId) => {
    if (onExtraDecrement && getExtraCount(extraId) > 0) {
      onExtraDecrement(extraId);
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        onQuantityChange(numValue);
      } else if (value === "") {
        onQuantityChange(0);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        setNotes("");
        onClose();
      }}
    >
      <DialogContent className="w-[95%] sm:max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          <div className="relative">
            <img
              src={displayedImage}
              alt={selectedProduct.name}
              className="w-full h-48 object-cover rounded-t-2xl"
            />
            <button
              onClick={() => {
                setNotes("");
                onClose();
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-4 flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-800">
                  {selectedProduct.name}
                </DialogTitle>
                {selectedVariation.price_variation && (
                  <p className="text-sm text-gray-600 mt-1">
                    {
                      selectedProduct.prices?.find(
                        (p) => p._id === selectedVariation.price_variation
                      )?.code
                    }
                  </p>
                )}
              </div>
              <div className="text-right">
                {(() => {
                  const startQty = Number(selectedProduct.start_quantaty || 0);
                  const wholePrice = Number(selectedProduct.whole_price || 0);
                  // هنا نستخدم quantity (الكمية المختارة في المودال) بدلاً من الكمية في الداتا
                  const isWholesale = startQty > 0 && quantity >= startQty && wholePrice > 0;

                  if (isWholesale && !selectedProduct.different_price) {
                    const originalTotal = (parseFloat(selectedProduct.price_after_discount || selectedProduct.price || 0)) * quantity;
                    return (
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-500 line-through">
                          {(originalTotal).toFixed(2)} {t("EGP")}
                        </span>
                        <span className="text-xl font-semibold text-purple-600">
                          {totalPrice.toFixed(2)} {t("EGP")}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <span className="text-xl font-semibold text-purple-600">
                      {totalPrice.toFixed(2)} {t("EGP")}
                    </span>
                  );
                })()}
              </div>
            </div>

            <DialogDescription className="text-gray-500 text-sm mb-4">
              {selectedProduct.description &&
                selectedProduct.description !== "null"
                ? selectedProduct.description
                : t("Nodescriptionavailable")}
            </DialogDescription>

            {/* Variations Section - يشمل different_price */}
            {hasVariations && (
              <div className="mb-4">
                {effectiveVariations.map((variation) => (
                  <div key={variation.id} className="mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {variation.name}
                      {variation.required && (
                        <span className="text-purple-500 ml-1">*</span>
                      )}
                    </h4>

                    {validationErrors[variation.id] && (
                      <p className="text-purple-500 text-xs mb-2">
                        {validationErrors[variation.id]}
                      </p>
                    )}

                    {/* Single Select (للـ different_price وللـ variations العادية) */}
                    {variation.type === "single" && variation.options && (
                      <div className="flex flex-wrap gap-3">
                        {variation.options.map((option) => {
                          const isSelected =
                            selectedVariation[variation.id] === option.id;

                          return (
                            <button
                              key={option.id}
                              onClick={() =>
                                onVariationChange(variation.id, option.id)
                              }
                              className={`relative overflow-hidden rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
                                : "bg-white text-gray-700 border-gray-300 hover:border-purple-400"
                                }`}
                            >
                              {option.image && variation.id === "price_variation" && (
                                <img
                                  src={option.image}
                                  alt={option.name}
                                  className="w-12 h-12 object-cover rounded-lg mb-2 mx-auto"
                                />
                              )}
                              <div className="text-center">
                                <div className="capitalize">{option.name}</div>
                                {parseFloat(option.price || 0) > 0 && (
                                  <div className="text-xs mt-1 opacity-90">
                                    {option.price.toFixed(2)} {t("EGP")}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Multiple Select (للـ variations العادية فقط) */}
                    {variation.type === "multiple" && variation.options && (
                      // نفس الكود القديم للـ multiple
                      <div className="space-y-3">
                        {variation.options.map((option) => {
                          const selectedOptions = selectedVariation[variation.id] || [];
                          const optionCount = selectedOptions.filter(id => id === option.id).length;
                          const totalSelected = selectedOptions.length;

                          const canDecrease = totalSelected > (variation.min || 0);
                          const canIncrease = !variation.max || totalSelected < variation.max;

                          return (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {option.name}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {parseFloat(option.price_after_tax || option.price || 0) === 0
                                    ? "Free"
                                    : `+${(option.price_after_tax || option.price).toFixed(2)} EGP`}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  className="bg-gray-200 text-purple-600 p-1 rounded-full hover:bg-gray-300 disabled:opacity-50"
                                  onClick={() => onVariationChange(variation.id, option.id, "remove")}
                                  disabled={optionCount === 0 || !canDecrease}
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="text-sm font-semibold w-8 text-center">{optionCount}</span>
                                <button
                                  className="bg-purple-600 text-white p-1 rounded-full hover:bg-purple-700 disabled:opacity-50"
                                  onClick={() => onVariationChange(variation.id, option.id, "add")}
                                  disabled={!canIncrease}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* باقي الأقسام (Extras, Addons, Excludes, Notes) بدون أي تغيير */}
            {/* ... نفس الكود اللي عندك من غير ما أحذفه ... */}

            {/* Extras */}
            {hasExtras && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t("ExtrasOptional")}
                </h4>
                <div className="space-y-3">
                  {selectedProduct.allExtras.map((extra) => {
                    const count = getExtraCount(extra.id);
                    return (
                      <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{extra.name}</span>
                          <div className="text-xs text-gray-500">
                            {extra.price > 0
                              ? `+${(extra.price_after_discount || extra.price || 0).toFixed(2)} ${t("EGP")}`
                              : t("Free")}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="bg-gray-200 text-purple-600 p-1 rounded-full hover:bg-gray-300 disabled:opacity-50"
                            onClick={() => handleExtraDecrement(extra.id)}
                            disabled={count === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">{count}</span>
                          <button
                            className="bg-purple-600 text-white p-1 rounded-full hover:bg-purple-700"
                            onClick={() => handleExtraIncrement(extra.id)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons */}
            {hasAddons && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t("AddonsOptional")}
                </h4>
                <div className="space-y-3">
                  {selectedProduct.addons.map((addon) => {
                    const count = getExtraCount(addon.id);
                    return (
                      <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{addon.name}</span>
                          <div className="text-xs text-gray-500">
                            +{(addon.price_after_discount || addon.price || 0).toFixed(2)} {t("EGP")}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="bg-gray-200 text-purple-600 p-1 rounded-full hover:bg-gray-300 disabled:opacity-50"
                            onClick={() => handleExtraDecrement(addon.id)}
                            disabled={count === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">{count}</span>
                          <button
                            className="bg-purple-600 text-white p-1 rounded-full hover:bg-purple-700"
                            onClick={() => handleExtraIncrement(addon.id)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Excludes */}
            {hasExcludes && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t("ExcludeOptional")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.excludes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onExclusionChange(item.id)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedExcludes.includes(item.id)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:border-purple-400"
                        }`}
                    >
                      <span className="line-through capitalize">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t("SpecialInstructionsOptional")}
              </h4>
              <Textarea
                placeholder={t("AddSpecialInstructions")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/200 {t("characters")}
              </p>
            </div>
          </div>

          {/* Footer - Total + Quantity + Add Button */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">
                {t("Total")}{" "}
                <span className="text-purple-600">
                  {totalPrice.toFixed(2)} {t("EGP")}
                </span>
              </div>

              {isWeightProduct ? (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t("Weight")} (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity || ""}
                    onChange={handleWeightChange}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    className="bg-gray-200 text-purple-600 p-1 rounded-full hover:bg-gray-300"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-semibold w-12 text-center">{quantity}</span>
                  <button
                    className="bg-purple-600 text-white p-1 rounded-full hover:bg-purple-700"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                const totalUnitPrice = calculateProductTotalPrice(
                  selectedProduct,
                  selectedVariation,
                  selectedExtras,
                  1
                );

                const filteredExtras = selectedExtras.filter((id) =>
                  (selectedProduct.allExtras || []).some((e) => e.id === id)
                );

                const filteredAddons = selectedExtras.filter((id) =>
                  (selectedProduct.addons || []).some((a) => a.id === id)
                );

                const addonsForBackend = filteredAddons.map((addonId) => {
                  const src = (selectedProduct.addons || []).find((a) => a.id === addonId);
                  return {
                    addon_id: addonId,
                    quantity: 1,
                    price: src
                      ? parseFloat(
                        src.price_after_discount ||
                        src.price_after_tax ||
                        src.price ||
                        0
                      )
                      : 0,
                  };
                });

                const enhancedProduct = {
                  ...selectedProduct,
                  temp_id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  selectedVariation,
                  selectedExtras: filteredExtras,
                  selectedExcludes,
                  quantity,
                  notes: notes.trim(),
                  price: totalUnitPrice,
                  originalPrice: selectedProduct.price,
                  totalPrice: totalUnitPrice * quantity,
                  addons: addonsForBackend,
                  allExtras: selectedProduct.allExtras,
                  addons_list: selectedProduct.addons,
                  variations: (selectedProduct.variations || []).map((group) => ({
                    ...group,
                    selected_option_id: Array.isArray(selectedVariation[group.id])
                      ? selectedVariation[group.id]
                      : selectedVariation[group.id] || null,
                  })),
                };

                onAddFromModal(enhancedProduct, { checkDuplicate: true });
                setNotes("");
                onClose();
              }}
              disabled={
                orderLoading ||
                hasErrors ||
                (isWeightProduct && (!quantity || quantity <= 0)) ||
                (priceVariation && !selectedVariation.price_variation)
              }
              className="w-full py-6 text-lg"
            >
              {orderLoading ? t("Adding") : t("AddtoCart")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;