import { useState, useEffect } from "react";
import {
  getProductVariantsList,
  getProductVariationGroups,
  calculateProductTotalPrice,
} from "../Pages/ProductModal";

export const useProductModal = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]); // Now supports multiple instances
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  const openProductModal = (product) => {
    console.log("Opening product modal:", product);
    setSelectedProduct(product);
    const initialSelectedVariations = {};

    // 1. فحص وجود فاريشن بالأسعار وتحديد أول فاريشن متوفر افتراضياً
    const variants = getProductVariantsList(product);
    if (variants.length > 0) {
      const firstInStock =
        variants.find((v) => v.quantity === null || v.quantity === undefined || v.quantity > 0) ||
        variants[0];
      initialSelectedVariations.price_variation = firstInStock._id;
    }

    // 2. فحص مجموعات الفاريشن العادية (مثل الحجم، الإضافات)
    const variationGroups = getProductVariationGroups(product);
    if (variationGroups.length > 0) {
      variationGroups.forEach((variation) => {
        if (variation.type === "single" && variation.options?.length > 0) {
          initialSelectedVariations[variation.id] = variation.options[0].id;
        } else if (variation.type === "multiple") {
          const minRequired = variation.min || 0;
          const selectedOptions = [];
          if (minRequired > 0 && variation.options?.length >= minRequired) {
            for (let i = 0; i < minRequired && i < variation.options.length; i++) {
              selectedOptions.push(variation.options[i].id);
            }
          }
          initialSelectedVariations[variation.id] = selectedOptions;
        }
      });
    }

    setSelectedVariation(initialSelectedVariations);
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setQuantity(1);
    setValidationErrors({});
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    setSelectedVariation({});
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setQuantity(1);
    setTotalPrice(0);
    setValidationErrors({});
  };

  const groupExtrasForBackend = (selectedExtras) => {
    if (!selectedExtras || selectedExtras.length === 0) {
      return [];
    }

    // Count occurrences of each extra/addon ID
    const extraCounts = {};
    selectedExtras.forEach((extraId) => {
      const id = extraId.toString(); // Ensure string format
      extraCounts[id] = (extraCounts[id] || 0) + 1;
    });

    // Transform to the desired format
    return Object.keys(extraCounts).map((addonId) => ({
      addon_id: addonId,
      count: extraCounts[addonId].toString(), // Convert to string if backend expects string
    }));
  };

  const handleVariationChange = (variationId, optionId, action = "toggle") => {
    setSelectedVariation((prev) => {
      // إذا كان تغيير الفاريشن السعري الرئيسي
      if (variationId === "price_variation") {
        return { ...prev, price_variation: optionId };
      }

      // إذا كان من مجموعات الخيارات العادية
      const allGroups = getProductVariationGroups(selectedProduct);
      const variation = allGroups.find((v) => v.id === variationId);

      if (!variation) return { ...prev, [variationId]: optionId };

      if (variation.type === "single") {
        return { ...prev, [variationId]: optionId };
      } else if (variation.type === "multiple") {
        const currentOptions = Array.isArray(prev[variationId]) ? prev[variationId] : [];
        let newOptions = [...currentOptions];

        if (action === "add") {
          const maxAllowed = variation.max || Infinity;
          if (newOptions.length < maxAllowed) {
            newOptions.push(optionId);
          }
        } else if (action === "remove") {
          const minRequired = variation.min || 0;
          if (newOptions.length > minRequired) {
            newOptions = newOptions.filter((id) => id !== optionId);
          }
        } else {
          // toggle
          if (newOptions.includes(optionId)) {
            const minRequired = variation.min || 0;
            if (newOptions.length > minRequired) {
              newOptions = newOptions.filter((id) => id !== optionId);
            }
          } else {
            const maxAllowed = variation.max || Infinity;
            if (newOptions.length < maxAllowed) {
              newOptions.push(optionId);
            }
          }
        }

        return { ...prev, [variationId]: newOptions };
      }

      return prev;
    });
  };
  const getGroupedExtras = () => {
    return groupExtrasForBackend(selectedExtras);
  };

  // Updated to support multiple instances of the same extra/addon
  const handleExtraChange = (extraId) => {
    console.log("handleExtraChange called with:", extraId);
    console.log("Current selectedExtras:", selectedExtras);

    setSelectedExtras((prev) => {
      // Always add (for increment), removal is handled by decrement function
      const newExtras = [...prev, extraId];
      console.log("New selectedExtras:", newExtras);
      return newExtras;
    });
  };

  // New function to handle decrementing extras
  const handleExtraDecrement = (extraId) => {
    console.log("handleExtraDecrement called with:", extraId);

    setSelectedExtras((prev) => {
      const index = prev.indexOf(extraId);
      if (index > -1) {
        const newExtras = [...prev];
        newExtras.splice(index, 1);
        console.log("Decremented selectedExtras:", newExtras);
        return newExtras;
      }
      return prev;
    });
  };

  const handleExclusionChange = (excludeId) => {
    setSelectedExcludes((prev) => {
      return prev.includes(excludeId)
        ? prev.filter((id) => id !== excludeId)
        : [...prev, excludeId];
    });
  };

  useEffect(() => {
    if (!selectedProduct) {
      setTotalPrice(0);
      setValidationErrors({});
      return;
    }

    const calculatedTotalPrice = calculateProductTotalPrice(
      selectedProduct,
      selectedVariation,
      selectedExtras,
      quantity
    );

    const newErrors = {};
    const variationGroups = getProductVariationGroups(selectedProduct);
    if (variationGroups.length > 0) {
      variationGroups.forEach((variation) => {
        const selectedOptions = selectedVariation[variation.id] || [];

        // Validation for required variations
        if (
          variation.required &&
          (!selectedOptions || (Array.isArray(selectedOptions) && selectedOptions.length === 0))
        ) {
          newErrors[variation.id] = `Please select an option for ${variation.name}.`;
        }

        // Validation for multiple type variations
        if (variation.type === "multiple") {
          const minRequired = variation.min || 0;
          const maxAllowed = variation.max;

          if (minRequired > 0 && selectedOptions.length < minRequired) {
            newErrors[variation.id] = `Please select at least ${minRequired} options for ${variation.name}.`;
          }
          if (maxAllowed && selectedOptions.length > maxAllowed) {
            newErrors[variation.id] = `You can select a maximum of ${maxAllowed} options for ${variation.name}.`;
          }
        }
      });
    }

    setTotalPrice(calculatedTotalPrice);
    setValidationErrors(newErrors);
  }, [
    quantity,
    selectedExtras,
    selectedExcludes,
    selectedProduct,
    selectedVariation,
  ]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  return {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    validationErrors,
    hasErrors,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExtraDecrement, // New function for decrementing
    handleExclusionChange,
    setQuantity,
    getGroupedExtras,
  };
};