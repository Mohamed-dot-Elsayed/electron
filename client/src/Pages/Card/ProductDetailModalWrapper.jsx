// src/components/ProductDetailModalWrapper.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { areProductsEqual, getProductVariantsList } from "../ProductModal";
import ProductModal from "../ProductModal";

export default function ProductDetailModalWrapper({ children, product, updateOrderItems, orderItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);

  const handleOpen = () => {
    if (product) {
      setQuantity(product.quantity || product.count || 1);
      setSelectedExtras(product.selectedExtras || []);
      setSelectedExcludes(product.selectedExcludes || []);

      const initialVars = { ...(product.selectedVariation || {}) };
      if (!initialVars.price_variation) {
        if (product.product_price_id) {
          initialVars.price_variation = product.product_price_id;
        } else {
          const variants = getProductVariantsList(product);
          if (variants.length > 0) {
            initialVars.price_variation = variants[0]._id;
          }
        }
      }
      setSelectedVariation(initialVars);
    }
    setIsOpen(true);
  };

  const handleAddToCart = (enhancedProductOrProducts, options = {}) => {
    setOrderLoading(true);
    const currentCart = [...(orderItems || [])];

    // في حالة إضافة مجموعة فاريشن دفعة واحدة
    if (Array.isArray(enhancedProductOrProducts)) {
      let updatedItems = [...currentCart];

      for (const item of enhancedProductOrProducts) {
        if (
          item.selectedVariant &&
          item.selectedVariant.quantity !== null &&
          item.selectedVariant.quantity !== undefined &&
          item.selectedVariant.quantity <= 0
        ) {
          toast.error(`الفاريشن ${item.variant_name} غير متوفر بالمخزن`);
          continue;
        }

        if (options.checkDuplicate) {
          const existingIdx = updatedItems.findIndex((ci) => areProductsEqual(ci, item));
          if (existingIdx !== -1) {
            const existing = updatedItems[existingIdx];
            const newCount = Number(existing.count || 1) + Number(item.count || 1);
            updatedItems[existingIdx] = {
              ...existing,
              count: newCount,
              quantity: newCount,
              totalPrice: existing.price * newCount,
            };
            continue;
          }
        }
        updatedItems.push(item);
      }

      updateOrderItems(updatedItems);
      sessionStorage.setItem("cart", JSON.stringify(updatedItems));
      toast.success("تم تحديث السلة بنجاح!");
      setIsOpen(false);
      setOrderLoading(false);
      return;
    }

    const enhancedProduct = enhancedProductOrProducts;

    // فحص نفاذ الكمية
    if (
      enhancedProduct.selectedVariant &&
      enhancedProduct.selectedVariant.quantity !== null &&
      enhancedProduct.selectedVariant.quantity !== undefined &&
      enhancedProduct.selectedVariant.quantity <= 0
    ) {
      toast.error("هذا الفاريشن غير متوفر بالمخزن حالياً");
      setOrderLoading(false);
      return;
    }

    if (
      !enhancedProduct.selectedVariant &&
      enhancedProduct.quantity !== null &&
      enhancedProduct.quantity !== undefined &&
      enhancedProduct.quantity <= 0
    ) {
      toast.error("هذا المنتج غير متوفر بالمخزن حالياً");
      setOrderLoading(false);
      return;
    }

    // إذا كان التعديل على عنصر موجود بالـ temp_id، نقوم بتحديثه في مكانه
    const existingIndex = currentCart.findIndex((item) => item.temp_id === product?.temp_id);
    let updatedItems;

    if (existingIndex !== -1) {
      updatedItems = [...currentCart];
      updatedItems[existingIndex] = {
        ...enhancedProduct,
        temp_id: product.temp_id,
      };
    } else {
      // فحص التكرار عند الإضافة كعنصر جديد
      if (options.checkDuplicate) {
        const exists = currentCart.some((item) => areProductsEqual(item, enhancedProduct));
        if (exists) {
          toast.warning("هذا المنتج بنفس الإضافات موجود بالفعل في السلة!");
          setOrderLoading(false);
          return;
        }
      }
      updatedItems = [...currentCart, enhancedProduct];
    }

    updateOrderItems(updatedItems);
    sessionStorage.setItem("cart", JSON.stringify(updatedItems));

    toast.success("تم تحديث السلة بنجاح!");
    setIsOpen(false);
    setOrderLoading(false);

    setQuantity(1);
    setSelectedVariation({});
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setValidationErrors({});
  };

  const handleVariationChange = (variationId, optionId, action = "set") => {
    setSelectedVariation((prev) => {
      if (variationId === "price_variation") {
        return { ...prev, price_variation: optionId };
      }
      if (action === "add") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: [...current, optionId] };
      }
      if (action === "remove") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [variationId]: optionId };
    });
  };

  const handleExtraChange = (extraId) => {
    setSelectedExtras((prev) => [...prev, extraId]);
  };

  const handleExtraDecrement = (extraId) => {
    setSelectedExtras((prev) => {
      const index = prev.indexOf(extraId);
      if (index !== -1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  };

  const handleExclusionChange = (excludeId) => {
    setSelectedExcludes((prev) =>
      prev.includes(excludeId)
        ? prev.filter((id) => id !== excludeId)
        : [...prev, excludeId]
    );
  };

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {children}
      </div>

      <ProductModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setQuantity(1);
          setSelectedVariation({});
          setSelectedExtras([]);
          setSelectedExcludes([]);
        }}
        selectedProduct={product}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        validationErrors={validationErrors}
        hasErrors={Object.keys(validationErrors).length > 0}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExtraDecrement={handleExtraDecrement}
        onExclusionChange={handleExclusionChange}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddToCart}
        orderLoading={orderLoading}
        productType={product?.weight_status === 1 ? "weight" : "piece"}
      />
    </>
  );
}