// src/components/ProductDetailModalWrapper.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { areProductsEqual } from "../ProductModal"; // نفس الفانكشن اللي عندك
import ProductModal from "../ProductModal";

export default function ProductDetailModalWrapper({ children, product, updateOrderItems, orderItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);

  const handleAddToCart = (enhancedProduct, options = {}) => {
    setOrderLoading(true);

    // جلب السلة الحالية
    const currentCart = [...orderItems];

    // فحص التكرار
    if (options.checkDuplicate) {
      const exists = currentCart.some(item => areProductsEqual(item, enhancedProduct));
      if (exists) {
        toast.warning("هذا المنتج بنفس الإضافات موجود بالفعل في السلة!");
        setOrderLoading(false);
        return;
      }
    }

    // إضافة المنتج
    const updatedItems = [...currentCart, enhancedProduct];
    updateOrderItems(updatedItems);

    // حفظ في sessionStorage
    sessionStorage.setItem("cart", JSON.stringify(updatedItems));

    toast.success("تم إضافة المنتج للسلة بنجاح!");
    setIsOpen(false);
    setOrderLoading(false);

    // إعادة تهيئة الحالة
    setQuantity(1);
    setSelectedVariation({});
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setValidationErrors({});
  };

  const handleVariationChange = (variationId, optionId, action = "set") => {
    setSelectedVariation(prev => {
      if (action === "add") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: [...current, optionId] };
      }
      if (action === "remove") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: current.filter(id => id !== optionId) };
      }
      return { ...prev, [variationId]: optionId };
    });
  };

  const handleExtraChange = (extraId) => {
    setSelectedExtras(prev => [...prev, extraId]);
  };

  const handleExtraDecrement = (extraId) => {
    setSelectedExtras(prev => {
      const index = prev.indexOf(extraId);
      if (index !== -1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  };

  const handleExclusionChange = (excludeId) => {
    setSelectedExcludes(prev =>
      prev.includes(excludeId)
        ? prev.filter(id => id !== excludeId)
        : [...prev, excludeId]
    );
  };

  return (
    <>
      {/* اللي جواه هو اللي هتضغطي عليه (اسم المنتج، الصورة، الكارت كله...) */}
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {children}
      </div>

      {/* الـ Modal نفسه */}
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