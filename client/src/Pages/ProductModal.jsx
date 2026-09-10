{/* ProductModal.jsx - Full Updated Version with flexible variations + attributes matrix + compact search + prices + notes + weight + duplicate check */}

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, AlertCircle, Search, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// دالة مساعدة ذكية لاستخراج اسم الفاريشن وتفاصيله (مثل المقاس، اللون، أو الاسم العربي/الإنجليزي)
export const extractVariantNameAndDetails = (p, product = null, isArabic = false) => {
  if (!p) return { name: "", options: [], attributes: {} };

  const parts = [];
  const flatOptions = [];
  const attributes = {};

  // 1. فحص p.variations المجمعة من الباك إند (مثل: [{ name: "Size", options: [{ name: "XL", ar_name: "كبير" }] }])
  if (Array.isArray(p.variations) && p.variations.length > 0) {
    p.variations.forEach((v) => {
      const groupName = v.name || v.ar_name || (isArabic ? v.ar_name || v.name : v.name) || "";
      if (Array.isArray(v.options) && v.options.length > 0) {
        v.options.forEach((opt) => {
          const optName =
            typeof opt === "object" && opt !== null
              ? (isArabic ? opt.ar_name || opt.name_ar || opt.name || opt.option_name : opt.name || opt.ar_name || opt.name_ar || opt.option_name)
              : String(opt || "");
          if (optName) {
            parts.push(optName);
            flatOptions.push({
              variation_name: groupName,
              option_name: optName,
              name: optName,
              id: opt?._id || opt?.id || optName,
            });
            if (groupName) attributes[groupName] = optName;
          }
        });
      } else if (v.name) {
        parts.push(v.name);
      }
    });
  }

  // 2. فحص p.options (لو موجودة مباشرة على الفاريشن)
  if (Array.isArray(p.options) && p.options.length > 0) {
    p.options.forEach((opt) => {
      let optName = "";
      let groupName = "";
      let optId = "";

      if (typeof opt === "object" && opt !== null) {
        optId = opt._id || opt.id || opt.option_id;
        groupName = opt.variation_name || opt.group || opt.variation?.name || opt.variation?.ar_name || "";
        optName = isArabic
          ? opt.ar_name || opt.name_ar || opt.name || opt.option_name || opt.value
          : opt.name || opt.ar_name || opt.name_ar || opt.option_name || opt.value;
      } else {
        optId = String(opt);
        // البحث عن الاسم في خيارات المنتج الرئيسي product.variations إن وجدت
        if (product && Array.isArray(product.variations)) {
          for (const vg of product.variations) {
            const foundOpt = vg.options?.find((o) => String(o.id || o._id) === optId);
            if (foundOpt) {
              groupName = vg.name || vg.ar_name || "";
              optName = isArabic ? foundOpt.ar_name || foundOpt.name : foundOpt.name || foundOpt.ar_name;
              break;
            }
          }
        }
        if (!optName) optName = optId;
      }

      if (optName) {
        parts.push(optName);
        flatOptions.push({
          variation_name: groupName,
          option_name: optName,
          name: optName,
          id: optId || optName,
        });
        if (groupName) attributes[groupName] = optName;
      }
    });
  }

  // 3. فحص p.attributes
  if (p.attributes && typeof p.attributes === "object") {
    Object.entries(p.attributes).forEach(([groupName, optVal]) => {
      const valStr = String(optVal);
      if (valStr) {
        parts.push(valStr);
        attributes[groupName] = valStr;
        flatOptions.push({
          variation_name: groupName,
          option_name: valStr,
          name: valStr,
        });
      }
    });
  }

  // 4. فحص الحقول المباشرة للاسم (مثل variation_name, title, size, color)
  if (parts.length === 0) {
    const direct =
      p.variation_name ||
      p.title ||
      p.size ||
      p.color ||
      (isArabic ? p.ar_name || p.name_ar : null) ||
      (p.name && p.name !== p.code ? p.name : "");
    if (direct) {
      parts.push(direct);
    }
  }

  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  const constructedName = uniqueParts.length > 0 ? uniqueParts.join(" - ") : "";

  // نفضل دائماً الاسم المشتق أو name الحقيقي بدلاً من الكود
  const finalName =
    constructedName ||
    (p.name && p.name !== p.code ? p.name : null) ||
    p.name ||
    p.code ||
    "";

  return {
    name: finalName,
    options: flatOptions.length > 0 ? flatOptions : (p.options || []),
    attributes: Object.keys(attributes).length > 0 ? attributes : (p.attributes || null),
  };
};

// 1. الدالة المرنة لاستخراج قائمة الفاريشن من أي شكل بيانات يرجع من الباك إند
export const getProductVariantsList = (product, isArabic = false) => {
  if (!product) return [];

  // أ. إذا كانت في product.prices
  if (Array.isArray(product.prices) && product.prices.length > 0) {
    return product.prices.map((p, idx) => {
      const details = extractVariantNameAndDetails(p, product, isArabic);
      return {
        _id: p._id || p.id || `var-${idx}`,
        name: details.name || `Variation #${idx + 1}`,
        code: p.code || "",
        price: parseFloat(p.price || 0),
        quantity: p.quantity !== undefined && p.quantity !== null ? Number(p.quantity) : null,
        gallery: p.gallery || [],
        image: p.image || p.gallery?.[0] || product.image,
        cost: p.cost || 0,
        options: details.options,
        attributes: details.attributes,
        raw: p,
      };
    });
  }

  // ب. إذا كانت في product.variations ككائنات فاريشن (ProductPriceModel)
  if (Array.isArray(product.variations) && product.variations.length > 0) {
    const isPriceVariants = product.variations.every(
      (v) => v && (v.price !== undefined || v.code !== undefined || v._id) && !v.type
    );

    if (isPriceVariants) {
      return product.variations.map((v, idx) => {
        const details = extractVariantNameAndDetails(v, product, isArabic);
        return {
          _id: v._id || v.id || `var-${idx}`,
          name: details.name || `Variation #${idx + 1}`,
          code: v.code || "",
          price: parseFloat(v.price || 0),
          quantity: v.quantity !== undefined && v.quantity !== null ? Number(v.quantity) : null,
          gallery: v.gallery || [],
          image: v.image || v.gallery?.[0] || product.image,
          cost: v.cost || 0,
          options: details.options,
          attributes: details.attributes,
          raw: v,
        };
      });
    }
  }

  // ج. إذا كانت في product.variants
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.map((v, idx) => {
      const details = extractVariantNameAndDetails(v, product, isArabic);
      return {
        _id: v._id || v.id || `var-${idx}`,
        name: details.name || `Variation #${idx + 1}`,
        code: v.code || "",
        price: parseFloat(v.price || 0),
        quantity: v.quantity !== undefined && v.quantity !== null ? Number(v.quantity) : null,
        gallery: v.gallery || [],
        image: v.image || v.gallery?.[0] || product.image,
        cost: v.cost || 0,
        options: details.options,
        attributes: details.attributes,
        raw: v,
      };
    });
  }

  return [];
};

// 2. استخراج خصائص الفاريشن المجمعة (مثل: المقاس، اللون) في حال أرسلها الباك إند
export const getProductVariationAttributes = (product, variants = []) => {
  if (!product) return [];

  if (Array.isArray(product.variation_attributes) && product.variation_attributes.length > 0) {
    return product.variation_attributes.map((attr) => ({
      id: attr.id || attr._id || attr.name,
      name: attr.name || attr.ar_name || attr.title,
      options: Array.isArray(attr.options)
        ? attr.options.map((o) => (typeof o === "object" ? (o.name || o.ar_name || o.value || o.id) : o))
        : [],
    }));
  }

  if (Array.isArray(product.attributes) && product.attributes.length > 0) {
    return product.attributes.map((attr) => ({
      id: attr.id || attr._id || attr.name,
      name: attr.name || attr.ar_name || attr.title,
      options: Array.isArray(attr.options)
        ? attr.options.map((o) => (typeof o === "object" ? (o.name || o.ar_name || o.value || o.id) : o))
        : [],
    }));
  }

  const attrMap = {};
  variants.forEach((v) => {
    if (Array.isArray(v.options) && v.options.length > 0) {
      v.options.forEach((opt) => {
        const groupName =
          opt.variation_name ||
          opt.group ||
          opt.variation?.name ||
          opt.variation?.ar_name ||
          (typeof opt === "object" ? opt.type : null);
        const optVal =
          typeof opt === "object"
            ? (opt.option_name || opt.name || opt.value || opt.ar_name)
            : opt;
        if (groupName && optVal) {
          if (!attrMap[groupName]) attrMap[groupName] = new Set();
          attrMap[groupName].add(String(optVal));
        }
      });
    } else if (v.attributes && typeof v.attributes === "object") {
      Object.entries(v.attributes).forEach(([groupName, optVal]) => {
        if (!attrMap[groupName]) attrMap[groupName] = new Set();
        attrMap[groupName].add(String(optVal));
      });
    }
  });

  const keys = Object.keys(attrMap);
  if (keys.length > 0) {
    return keys.map((key) => ({
      id: key,
      name: key,
      options: Array.from(attrMap[key]),
    }));
  }

  return [];
};

// 3. مطابقة الفاريشن بناءً على الخصائص المختارة
export const findVariantByAttributes = (variants, selectedAttrs) => {
  if (!variants || variants.length === 0 || !selectedAttrs) return null;

  return variants.find((v) => {
    if (v.attributes && typeof v.attributes === "object") {
      return Object.entries(selectedAttrs).every(
        ([attrName, optVal]) => String(v.attributes[attrName]) === String(optVal)
      );
    }

    if (Array.isArray(v.options) && v.options.length > 0) {
      return Object.entries(selectedAttrs).every(([attrName, optVal]) => {
        return v.options.some((opt) => {
          const group =
            opt.variation_name ||
            opt.group ||
            opt.variation?.name ||
            opt.variation?.ar_name;
          const val =
            typeof opt === "object"
              ? (opt.option_name || opt.name || opt.value || opt.ar_name)
              : opt;
          return String(group) === String(attrName) && String(val) === String(optVal);
        });
      });
    }

    return false;
  });
};

// 4. استخراج مجموعات الفاريشن العادية (type: single/multiple مع options) إن وجدت
export const getProductVariationGroups = (product) => {
  if (!product || !Array.isArray(product.variations)) return [];
  return product.variations.filter(
    (v) => v && v.type && Array.isArray(v.options)
  );
};

// 5. حساب السعر الكلي مع دعم الفاريشن، المجموعات، والإضافات
export const calculateProductTotalPrice = (
  baseProduct,
  selectedVariation = {},
  selectedExtras = [],
  quantity = 1
) => {
  if (!baseProduct) return 0;

  const variants = getProductVariantsList(baseProduct);
  let basePrice = 0;

  if (variants.length > 0) {
    const selectedId = selectedVariation?.price_variation;
    const selectedVariant = variants.find((v) => String(v._id) === String(selectedId));
    if (selectedVariant) {
      basePrice = selectedVariant.price;
    } else {
      basePrice = variants[0].price;
    }
  } else {
    const startQty = Number(baseProduct.start_quantaty || 0);
    const wholePrice = Number(baseProduct.whole_price || 0);
    const isWholesale = startQty > 0 && quantity >= startQty && wholePrice > 0;

    basePrice = isWholesale
      ? wholePrice
      : parseFloat(baseProduct.price_after_discount || baseProduct.price || 0);
  }

  // حساب أسعار مجموعات الفاريشن العادية (إن وجدت)
  const groups = getProductVariationGroups(baseProduct);
  let groupsTotal = 0;
  if (groups.length > 0) {
    groups.forEach((group) => {
      const selected = selectedVariation[group.id];
      if (selected !== undefined) {
        if (group.type === "single") {
          const opt = group.options?.find((o) => o.id === selected);
          if (opt) {
            groupsTotal += parseFloat(opt.price_after_tax || opt.price || 0);
          }
        } else if (group.type === "multiple") {
          const optsArray = Array.isArray(selected) ? selected : [selected];
          optsArray.forEach((optId) => {
            const opt = group.options?.find((o) => o.id === optId);
            if (opt) {
              groupsTotal += parseFloat(opt.price_after_tax || opt.price || 0);
            }
          });
        }
      }
    });
  }

  // حساب الإضافات (Extras و Addons)
  let addonsTotal = 0;
  if (selectedExtras && selectedExtras.length > 0) {
    const extraCounts = {};
    selectedExtras.forEach((extraId) => {
      extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
    });

    Object.entries(extraCounts).forEach(([extraId, count]) => {
      const extraItem =
        baseProduct.allExtras?.find((extra) => extra.id === parseInt(extraId)) ||
        baseProduct.addons?.find((addon) => addon.id === parseInt(extraId));

      if (extraItem) {
        const extraPrice = parseFloat(
          extraItem.price_after_discount ||
          extraItem.price_after_tax ||
          extraItem.price ||
          0
        );
        addonsTotal += extraPrice * count;
      }
    });
  }

  return (basePrice + groupsTotal + addonsTotal) * quantity;
};

// فحص التكرار (مع دعم الفاريشن المختار)
export const areProductsEqual = (product1, product2) => {
  if (product1._id !== product2._id) return false;

  const vars1 = product1.selectedVariation || {};
  const vars2 = product2.selectedVariation || {};

  const pvid1 = product1.product_price_id || vars1.price_variation || null;
  const pvid2 = product2.product_price_id || vars2.price_variation || null;
  if (String(pvid1) !== String(pvid2)) return false;

  const varKeys1 = Object.keys(vars1).filter((k) => k !== "price_variation").sort();
  const varKeys2 = Object.keys(vars2).filter((k) => k !== "price_variation").sort();

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
  const [variantSearch, setVariantSearch] = useState("");
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [selectedVariantsMap, setSelectedVariantsMap] = useState({}); // { [variantId]: quantity }
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  // استخراج الفاريشن ومجموعات الخيارات بمرونة
  const variants = getProductVariantsList(selectedProduct, isArabic);
  const variationGroups = getProductVariationGroups(selectedProduct);
  const variationAttributes = getProductVariationAttributes(selectedProduct, variants);

  const hasVariants = variants.length > 0;
  const hasAttributes = variationAttributes.length > 0;
  const hasVariationGroups = variationGroups.length > 0;
  const hasAddons = Boolean(selectedProduct?.addons && selectedProduct.addons.length > 0);
  const hasExtras = Boolean(selectedProduct?.allExtras && selectedProduct.allExtras.length > 0);
  const hasExcludes = Boolean(selectedProduct?.excludes && selectedProduct.excludes.length > 0);

  // تحديد الفاريشن المختار حالياً (أول فاريشن مختار كمرجع أولي)
  const selectedVariantId =
    selectedVariation?.price_variation ||
    Object.keys(selectedVariantsMap).find((id) => (selectedVariantsMap[id] || 0) > 0) ||
    variants[0]?._id;

  const selectedVariant = hasVariants
    ? variants.find((v) => String(v._id) === String(selectedVariantId)) || variants[0]
    : null;

  // 1. مزامنة selectedAttrs عند تغيير الفاريشن المختار
  useEffect(() => {
    if (selectedVariant && hasAttributes) {
      const initialAttrs = {};
      variationAttributes.forEach((attr) => {
        let val = null;
        if (selectedVariant.attributes && selectedVariant.attributes[attr.name]) {
          val = String(selectedVariant.attributes[attr.name]);
        } else if (Array.isArray(selectedVariant.options)) {
          const opt = selectedVariant.options.find((o) => {
            const g = o.variation_name || o.group || o.variation?.name || o.variation?.ar_name;
            return String(g) === String(attr.name);
          });
          if (opt) val = String(opt.option_name || opt.name || opt.value || opt);
        }
        if (val) initialAttrs[attr.name] = val;
        else if (attr.options?.length > 0) initialAttrs[attr.name] = String(attr.options[0]);
      });
      setSelectedAttrs(initialAttrs);
    }
  }, [selectedProduct?._id, selectedVariant?._id, hasAttributes]);

  // 2. مزامنة الفاريشن المختارة الافتراضية عند فتح المودال أو تغيير المنتج
  useEffect(() => {
    if (selectedProduct && variants.length > 0) {
      const passedVariantId = selectedVariation?.price_variation;
      const initialVariant = passedVariantId
        ? variants.find((v) => String(v._id) === String(passedVariantId))
        : (variants.find((v) => v.quantity === null || v.quantity === undefined || v.quantity > 0) || variants[0]);

      if (initialVariant) {
        const isOutOfStock =
          initialVariant.quantity !== null &&
          initialVariant.quantity !== undefined &&
          initialVariant.quantity <= 0;

        if (!isOutOfStock) {
          setSelectedVariantsMap({ [initialVariant._id]: Math.max(1, quantity || 1) });
        } else {
          setSelectedVariantsMap({});
        }
      } else {
        setSelectedVariantsMap({});
      }
    } else {
      setSelectedVariantsMap({});
    }
  }, [selectedProduct?._id, isOpen]);

  if (!selectedProduct) return null;

  const isWeightProduct = productType === "weight" || selectedProduct.weight_status === 1;

  // دوال التعامل مع اختيار وتعديل كميات الفاريشن المتعددة
  const getVariantCount = (variantId) => {
    return selectedVariantsMap[variantId] || 0;
  };

  const handleVariantIncrement = (variant) => {
    if (variant.quantity !== null && variant.quantity !== undefined && variant.quantity <= 0) {
      toast.error(t("VariationOutOfStock") || "هذا الفاريشن غير متاح حالياً بالمخزن");
      return;
    }
    const current = selectedVariantsMap[variant._id] || 0;
    if (variant.quantity !== null && variant.quantity !== undefined && current >= variant.quantity) {
      toast.warning(t("MaxStockReached") || "تم الوصول للحد الأقصى للكمية المتاحة في المخزن");
      return;
    }
    setSelectedVariantsMap((prev) => ({
      ...prev,
      [variant._id]: current + 1,
    }));
    if (onVariationChange) {
      onVariationChange("price_variation", variant._id);
    }
  };

  const handleVariantDecrement = (variant) => {
    const current = selectedVariantsMap[variant._id] || 0;
    if (current <= 1) {
      setSelectedVariantsMap((prev) => {
        const next = { ...prev };
        delete next[variant._id];
        return next;
      });
    } else {
      setSelectedVariantsMap((prev) => ({
        ...prev,
        [variant._id]: current - 1,
      }));
    }
  };

  const handleVariantToggle = (variant) => {
    if (variant.quantity !== null && variant.quantity !== undefined && variant.quantity <= 0) {
      toast.error(t("VariationOutOfStock") || "هذا الفاريشن غير متاح حالياً بالمخزن");
      return;
    }
    const current = selectedVariantsMap[variant._id] || 0;
    if (current > 0) {
      setSelectedVariantsMap((prev) => {
        const next = { ...prev };
        delete next[variant._id];
        return next;
      });
    } else {
      setSelectedVariantsMap((prev) => ({
        ...prev,
        [variant._id]: 1,
      }));
      if (onVariationChange) {
        onVariationChange("price_variation", variant._id);
      }
    }
  };

  // عناصر الفاريشن المختارة حالياً (الكمية > 0)
  const selectedVariantEntries = hasVariants
    ? Object.entries(selectedVariantsMap).filter(([_, q]) => q > 0)
    : [];

  const totalSelectedVariantsCount = selectedVariantEntries.reduce((sum, [_, q]) => sum + q, 0);

  // التحقق من نفاذ الكمية
  const isProductOutOfStock = Boolean(
    !hasVariants &&
    selectedProduct.quantity !== null &&
    selectedProduct.quantity !== undefined &&
    selectedProduct.quantity <= 0
  );

  const isOutOfStock = hasVariants
    ? totalSelectedVariantsCount === 0 ||
      variants.every((v) => v.quantity !== null && v.quantity <= 0)
    : isProductOutOfStock;

  // حساب السعر الإجمالي
  let totalPrice = 0;
  if (hasVariants) {
    if (totalSelectedVariantsCount > 0) {
      totalPrice = selectedVariantEntries.reduce((sum, [varId, q]) => {
        const v = variants.find((item) => String(item._id) === String(varId));
        if (!v) return sum;
        const unitP = calculateProductTotalPrice(
          selectedProduct,
          { ...selectedVariation, price_variation: varId },
          selectedExtras,
          1
        );
        return sum + unitP * q;
      }, 0);
    } else {
      totalPrice = 0;
    }
  } else {
    totalPrice = calculateProductTotalPrice(
      selectedProduct,
      selectedVariation,
      selectedExtras,
      quantity
    );
  }

  // صورة النسخة المختارة (لو موجودة) أو صورة المنتج الأساسي
  const displayedImage = selectedVariant?.image || selectedProduct.image;

  // تصفية الفاريشن بالبحث الفوري
  const filteredVariants = variants.filter((v) => {
    if (!variantSearch.trim()) return true;
    const query = variantSearch.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(query)) ||
      (v.code && v.code.toLowerCase().includes(query))
    );
  });

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
        setVariantSearch("");
        onClose();
      }}
    >
      <DialogContent className="w-[95%] sm:max-w-[540px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          {/* صورة المنتج أو الفاريشن */}
          <div className="relative">
            <img
              src={displayedImage}
              alt={selectedProduct.name}
              className="w-full h-52 object-cover rounded-t-2xl"
            />
            <button
              onClick={() => {
                setNotes("");
                setVariantSearch("");
                onClose();
              }}
              className="absolute top-4 right-4 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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

          <div className="p-5 flex-1">
            {/* عنوان المنتج وسعره */}
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-gray-900 leading-snug">
                    {selectedProduct.name}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/product-details/${selectedProduct._id || selectedProduct.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer shadow-xs"
                    title={isArabic ? "معلومات عامة" : "General Info"}
                  >
                    <Info size={13} />
                    <span>{isArabic ? "معلومات عامة" : "General Info"}</span>
                  </button>
                </div>

                {hasVariants && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {totalSelectedVariantsCount > 1 ? (
                      <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {totalSelectedVariantsCount} {t("ItemsSelected") || "قطع مختارة"}
                      </span>
                    ) : selectedVariant ? (
                      <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {selectedVariant.name}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                {(() => {
                  if (hasVariants) {
                    return (
                      <span className="text-xl font-bold text-purple-600">
                        {totalPrice.toFixed(2)} {t("EGP")}
                      </span>
                    );
                  }

                  const startQty = Number(selectedProduct.start_quantaty || 0);
                  const wholePrice = Number(selectedProduct.whole_price || 0);
                  const isWholesale = startQty > 0 && quantity >= startQty && wholePrice > 0;

                  if (isWholesale) {
                    const originalTotal =
                      parseFloat(selectedProduct.price_after_discount || selectedProduct.price || 0) * quantity;
                    return (
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-400 line-through">
                          {originalTotal.toFixed(2)} {t("EGP")}
                        </span>
                        <span className="text-xl font-bold text-purple-600">
                          {totalPrice.toFixed(2)} {t("EGP")}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <span className="text-xl font-bold text-purple-600">
                      {totalPrice.toFixed(2)} {t("EGP")}
                    </span>
                  );
                })()}
              </div>
            </div>

            <DialogDescription className="text-gray-500 text-sm mb-4">
              {selectedProduct.description && selectedProduct.description !== "null"
                ? selectedProduct.description
                : t("Nodescriptionavailable")}
            </DialogDescription>

            {/* 🌟 1. قسم الفاريشن والأسعار - Variations & Prices Section */}
            {hasVariants && (
              <div className="mb-5 bg-gradient-to-br from-purple-50/60 to-gray-50 p-3.5 rounded-2xl border border-purple-100/80 shadow-xs">
                {/* أ. حالة وجود خصائص مفصلة (Attribute Matrix) مثل المقاس واللون */}
                {hasAttributes ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span>{t("ChooseVariation") || "اختر المواصفات"}</span>
                        <span className="text-red-500 text-xs font-bold">*</span>
                      </h4>
                      {totalSelectedVariantsCount > 0 && (
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {totalSelectedVariantsCount} {t("ItemsSelected") || "مختار"}
                        </span>
                      )}
                    </div>

                    {variationAttributes.map((attr) => (
                      <div key={attr.name} className="space-y-1.5">
                        <div className="text-xs font-bold text-gray-700">{attr.name}:</div>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((optVal) => {
                            const isSelected = String(selectedAttrs[attr.name]) === String(optVal);
                            const candidateAttrs = { ...selectedAttrs, [attr.name]: optVal };
                            const candidateVariant = findVariantByAttributes(variants, candidateAttrs);
                            const isOptOutOfStock =
                              candidateVariant &&
                              candidateVariant.quantity !== null &&
                              candidateVariant.quantity <= 0;

                            return (
                              <button
                                key={optVal}
                                type="button"
                                onClick={() => {
                                  const nextAttrs = { ...selectedAttrs, [attr.name]: optVal };
                                  setSelectedAttrs(nextAttrs);
                                  const matched = findVariantByAttributes(variants, nextAttrs);
                                  if (matched && onVariationChange) {
                                    onVariationChange("price_variation", matched._id);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? isOptOutOfStock
                                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                                      : "bg-purple-600 text-white border-purple-600 shadow-xs"
                                    : isOptOutOfStock
                                    ? "bg-red-50/40 text-red-600 border-red-200 hover:border-red-300"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                                }`}
                              >
                                <span>{optVal}</span>
                                {isOptOutOfStock && (
                                  <span className="ml-1 rtl:mr-1 text-[10px] opacity-90">({t("OutOfStock") || "نفذ"})</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* الفاريشن المطابق للمواصفات المختارة حالياً مع أزرار التحكم بالكمية */}
                    {(() => {
                      const matched = findVariantByAttributes(variants, selectedAttrs);
                      if (!matched) return null;
                      const matchedQty = getVariantCount(matched._id);
                      const isMatchedZeroStock =
                        matched.quantity !== null &&
                        matched.quantity !== undefined &&
                        matched.quantity <= 0;

                      return (
                        <div className="mt-3 p-3 bg-white rounded-xl border-2 border-purple-200 shadow-xs flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {matched.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-black text-purple-700">
                                {matched.price.toFixed(2)} {t("EGP")}
                              </span>
                              {matched.quantity !== null && matched.quantity !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    matched.quantity > 0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {matched.quantity > 0
                                    ? `${t("AvailableStock") || "متاح"}: ${matched.quantity}`
                                    : t("OutOfStock") || "غير متوفر"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {isMatchedZeroStock ? (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                {t("OutOfStock") || "غير متوفر"}
                              </span>
                            ) : matchedQty > 0 ? (
                              <div className="flex items-center gap-1.5 bg-purple-50 p-1 rounded-lg border border-purple-200">
                                <button
                                  type="button"
                                  onClick={() => handleVariantDecrement(matched)}
                                  className="w-6 h-6 rounded-md bg-white hover:bg-gray-100 flex items-center justify-center text-purple-700 shadow-xs cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-xs font-black text-purple-900 w-6 text-center">
                                  {matchedQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleVariantIncrement(matched)}
                                  className="w-6 h-6 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white shadow-xs cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleVariantIncrement(matched)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3 rounded-lg shadow-xs cursor-pointer font-bold"
                              >
                                <Plus size={13} className="mr-1 rtl:ml-1" />
                                {t("AddVariation") || "إضافة"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* قائمة الفاريشن المختارة من الماتريكس */}
                    {selectedVariantEntries.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-purple-100">
                        <div className="text-xs font-bold text-gray-700 mb-2">
                          {t("SelectedVariations") || "الفاريشن المختارة"}:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedVariantEntries.map(([vId, vQty]) => {
                            const vObj = variants.find((v) => String(v._id) === String(vId));
                            if (!vObj) return null;
                            return (
                              <div
                                key={vId}
                                className="flex items-center gap-2 bg-purple-100/70 border border-purple-200 px-2.5 py-1 rounded-lg text-xs"
                              >
                                <span className="font-bold text-purple-900">{vObj.name}</span>
                                <span className="bg-purple-600 text-white font-black text-[11px] px-1.5 py-0.2 rounded-md">
                                  x{vQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleVariantToggle(vObj)}
                                  className="text-gray-400 hover:text-red-600 font-bold ml-1 rtl:mr-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ب. حالة القائمة المباشرة للفاريشن (مع دعم البحث الفوري واختيار عناصر متعددة) */
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span>{t("ChooseVariation") || "اختر الفاريشن / المقاس"}</span>
                        <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {variants.length} {t("Variations") || "خيارات"}
                        </span>
                        <span className="text-red-500 text-xs font-bold">*</span>
                      </h4>
                      {totalSelectedVariantsCount > 0 && (
                        <span className="text-xs font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          {totalSelectedVariantsCount} {t("ItemsSelected") || "مختار"}
                        </span>
                      )}
                    </div>

                    {/* خانة بحث فوري إذا كان عدد الفاريشن أكثر من 4 */}
                    {variants.length > 4 && (
                      <div className="relative mb-3">
                        <Search
                          size={14}
                          className={`absolute top-1/2 -translate-y-1/2 ${
                            isArabic ? "right-3" : "left-3"
                          } text-gray-400`}
                        />
                        <input
                          type="text"
                          placeholder={t("SearchVariations") || "بحث في الفاريشن أو الكود..."}
                          value={variantSearch}
                          onChange={(e) => setVariantSearch(e.target.value)}
                          className={`w-full py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400 ${
                            isArabic ? "pr-8 pl-3" : "pl-8 pr-3"
                          }`}
                        />
                      </div>
                    )}

                    <div
                      className={`${
                        variants.length > 4
                          ? "max-h-60 overflow-y-auto space-y-2 pr-1"
                          : "grid grid-cols-2 gap-2.5"
                      }`}
                    >
                      {filteredVariants.map((variant) => {
                        const currentQty = getVariantCount(variant._id);
                        const isSelected = currentQty > 0;
                        const isZeroStock =
                          variant.quantity !== null &&
                          variant.quantity !== undefined &&
                          variant.quantity <= 0;

                        if (variants.length > 4) {
                          // عرض سطر مضغوط وأنيق للأعداد الكبيرة مع تحكم فردي بالكمية
                          return (
                            <div
                              key={variant._id}
                              onClick={() => {
                                if (!isZeroStock && !isSelected) {
                                  handleVariantIncrement(variant);
                                }
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 text-start transition-all ${
                                isZeroStock
                                  ? "bg-red-50/20 border-red-200 opacity-70 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-purple-50/60 border-purple-600 shadow-xs ring-1 ring-purple-400 cursor-default"
                                  : "bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50/60 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isZeroStock) handleVariantToggle(variant);
                                  }}
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold border transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-purple-600 border-purple-600 text-white"
                                      : "border-gray-300 bg-white hover:border-purple-400"
                                  }`}
                                >
                                  {isSelected && "✓"}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-gray-900 truncate block">
                                    {variant.name}
                                  </span>
                                  {variant.code && variant.code !== variant.name && (
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {variant.code}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                {variant.quantity !== null && variant.quantity !== undefined && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      variant.quantity > 0
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {variant.quantity > 0
                                      ? `${t("AvailableStock") || "متاح"}: ${variant.quantity}`
                                      : t("OutOfStock") || "غير متوفر"}
                                  </span>
                                )}
                                <span className="text-xs font-black text-purple-700">
                                  {variant.price.toFixed(2)} {t("EGP")}
                                </span>

                                {/* Stepper or Add button */}
                                {isZeroStock ? (
                                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                    {t("OutOfStock") || "نفذ"}
                                  </span>
                                ) : isSelected ? (
                                  <div
                                    className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-purple-200 shadow-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleVariantDecrement(variant)}
                                      className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-purple-700 font-bold transition-colors cursor-pointer"
                                    >
                                      <Minus size={11} />
                                    </button>
                                    <span className="text-xs font-black text-purple-900 min-w-[16px] text-center">
                                      {currentQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleVariantIncrement(variant)}
                                      className="w-5 h-5 rounded bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white font-bold transition-colors cursor-pointer"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVariantIncrement(variant);
                                    }}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    + {t("AddVariation") || "إضافة"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // عرض الكروت الأصلية للأعداد الصغيرة (<= 4) مع تحكم فردي بالكمية
                        return (
                          <div
                            key={variant._id}
                            onClick={() => {
                              if (!isZeroStock && !isSelected) {
                                handleVariantIncrement(variant);
                              }
                            }}
                            className={`relative flex flex-col p-3 rounded-xl border-2 text-start transition-all ${
                              isZeroStock
                                ? "bg-red-50/25 border-red-200 opacity-70 cursor-not-allowed"
                                : isSelected
                                ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-400/40 cursor-default"
                                : "bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50/80 cursor-pointer"
                            }`}
                          >
                            {isSelected && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVariantToggle(variant);
                                }}
                                className={`absolute top-2 ${
                                  isArabic ? "left-2" : "right-2"
                                } w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs cursor-pointer`}
                              >
                                ✓
                              </div>
                            )}

                            <div className="flex items-start gap-2 mb-2">
                              {variant.image && (
                                <img
                                  src={variant.image}
                                  alt={variant.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-gray-900 truncate">
                                  {variant.name}
                                </div>
                                {variant.code && variant.code !== variant.name && (
                                  <div className="text-[10px] text-gray-500 font-mono truncate mt-0.5">
                                    {t("code")}: {variant.code}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-sm font-black text-purple-700">
                                {variant.price.toFixed(2)} {t("EGP")}
                              </span>
                              {variant.quantity !== null && variant.quantity !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    variant.quantity > 0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {variant.quantity > 0
                                    ? `${t("AvailableStock") || "متاح"}: ${variant.quantity}`
                                    : t("OutOfStock") || "غير متوفر"}
                                </span>
                              )}
                            </div>

                            {/* Stepper or Add button at bottom of card */}
                            <div className="mt-2.5 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                              {isZeroStock ? (
                                <div className="text-center text-xs font-bold text-red-600 bg-red-50 py-1 rounded-lg">
                                  {t("OutOfStock") || "غير متوفر بالمخزن"}
                                </div>
                              ) : isSelected ? (
                                <div className="flex items-center justify-between bg-purple-50 p-1 rounded-lg border border-purple-200">
                                  <button
                                    type="button"
                                    onClick={() => handleVariantDecrement(variant)}
                                    className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 flex items-center justify-center text-purple-700 font-bold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="text-sm font-black text-purple-900 text-center">
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleVariantIncrement(variant)}
                                    className="w-7 h-7 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white font-bold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleVariantIncrement(variant)}
                                  className="w-full py-1.5 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors cursor-pointer"
                                >
                                  + {t("AddVariation") || "إضافة"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* تنبيه واضح في حالة نفاذ كمية جميع الفاريشن أو المنتج */}
            {isOutOfStock && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                <span>
                  {hasVariants
                    ? (t("VariationOutOfStockAlert") || "هذا الفاريشن غير متوفر حالياً بالمخزن (الكمية 0) ولا يمكن إضافته للطلب.")
                    : (t("ProductOutOfStockAlert") || "هذا المنتج غير متوفر حالياً بالمخزن (الكمية 0) ولا يمكن إضافته للطلب.")}
                </span>
              </div>
            )}

            {/* 🌟 2. مجموعات الخيارات العادية (إن وجدت مثل الحجم، الإضافات) */}
            {hasVariationGroups && (
              <div className="mb-4">
                {variationGroups.map((group) => (
                  <div key={group.id} className="mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {group.name}
                      {group.required && <span className="text-purple-500 ml-1">*</span>}
                    </h4>

                    {validationErrors[group.id] && (
                      <p className="text-purple-500 text-xs mb-2">
                        {validationErrors[group.id]}
                      </p>
                    )}

                    {/* Single Select */}
                    {group.type === "single" && group.options && (
                      <div className="flex flex-wrap gap-2.5">
                        {group.options.map((option) => {
                          const isSelected = selectedVariation[group.id] === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => onVariationChange(group.id, option.id)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                                isSelected
                                  ? "bg-purple-50 border-purple-600 text-purple-700 shadow-xs"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
                              }`}
                            >
                              <span>{option.name}</span>
                              {parseFloat(option.price_after_tax || option.price || 0) > 0 && (
                                <span className="text-xs text-purple-600 font-bold">
                                  +{(option.price_after_tax || option.price)} {t("EGP")}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Multiple Select */}
                    {group.type === "multiple" && group.options && (
                      <div className="flex flex-wrap gap-2.5">
                        {group.options.map((option) => {
                          const isSelected = (selectedVariation[group.id] || []).includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => onVariationChange(group.id, option.id, "toggle")}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                                isSelected
                                  ? "bg-purple-50 border-purple-600 text-purple-700 shadow-xs"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
                              }`}
                            >
                              <span>{option.name}</span>
                              {parseFloat(option.price_after_tax || option.price || 0) > 0 && (
                                <span className="text-xs text-purple-600 font-bold">
                                  +{(option.price_after_tax || option.price)} {t("EGP")}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Addons */}
            {hasAddons && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t("AddonsOptional")}
                </h4>
                <div className="space-y-2">
                  {selectedProduct.addons.map((addon) => {
                    const count = getExtraCount(addon.id);
                    const isSelected = count > 0;
                    return (
                      <div
                        key={addon.id}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "bg-purple-50/50 border-purple-500 shadow-xs"
                            : "bg-white border-gray-200 hover:border-purple-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                for (let i = 0; i < count; i++) {
                                  handleExtraDecrement(addon.id);
                                }
                              } else {
                                handleExtraIncrement(addon.id);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {addon.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-purple-600">
                            +{(addon.price_after_discount || addon.price_after_tax || addon.price || 0)} {t("EGP")}
                          </span>

                          {isSelected && (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-purple-200">
                              <button
                                type="button"
                                onClick={() => handleExtraDecrement(addon.id)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-purple-700 w-4 text-center">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleExtraIncrement(addon.id)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extras */}
            {hasExtras && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t("ExtrasOptional")}
                </h4>
                <div className="space-y-2">
                  {selectedProduct.allExtras.map((extra) => {
                    const count = getExtraCount(extra.id);
                    const isSelected = count > 0;
                    return (
                      <div
                        key={extra.id}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "bg-purple-50/50 border-purple-500 shadow-xs"
                            : "bg-white border-gray-200 hover:border-purple-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                for (let i = 0; i < count; i++) {
                                  handleExtraDecrement(extra.id);
                                }
                              } else {
                                handleExtraIncrement(extra.id);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {extra.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-purple-600">
                            +{(extra.price_after_discount || extra.price_after_tax || extra.price || 0)} {t("EGP")}
                          </span>

                          {isSelected && (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-purple-200">
                              <button
                                type="button"
                                onClick={() => handleExtraDecrement(extra.id)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-purple-700 w-4 text-center">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleExtraIncrement(extra.id)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}
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
                      type="button"
                      onClick={() => onExclusionChange(item.id)}
                      className={`px-3.5 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedExcludes.includes(item.id)
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
                className="w-full min-h-[80px] resize-none rounded-xl"
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">
                {notes.length}/200 {t("characters")}
              </p>
            </div>
          </div>

          {/* Footer - Total + Quantity + Add Button */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/80 rounded-b-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {t("Total")}{" "}
                  <span className="text-purple-600 font-black">
                    {totalPrice.toFixed(2)} {t("EGP")}
                  </span>
                </div>
                {hasVariants && totalSelectedVariantsCount > 0 && (
                  <div className="text-xs font-semibold text-purple-700 mt-0.5">
                    {totalSelectedVariantsCount} {t("ItemsSelected") || "قطع مختارة"}
                  </div>
                )}
              </div>

              {isWeightProduct ? (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <label className="text-sm font-medium text-gray-700">
                    {t("Weight")} (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity || ""}
                    onChange={handleWeightChange}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
              ) : !hasVariants ? (
                /* في حالة المنتج البسيط بدون فاريشن: التحكم بالكمية العامة */
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <button
                    type="button"
                    className="bg-gray-200 text-purple-600 p-1.5 rounded-full hover:bg-gray-300 transition-colors cursor-pointer"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-bold w-10 text-center">{quantity}</span>
                  <button
                    type="button"
                    className="bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition-colors cursor-pointer"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              onClick={() => {
                if (hasVariants) {
                  if (totalSelectedVariantsCount === 0) {
                    toast.warning(
                      t("PleaseSelectAtLeastOneVariation") || "يرجى اختيار فاريشن واحد على الأقل"
                    );
                    return;
                  }

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

                  const productsToAdd = selectedVariantEntries.map(([varId, varQty]) => {
                    const variant = variants.find((v) => String(v._id) === String(varId));
                    const effectiveVarState = { ...selectedVariation, price_variation: varId };
                    const unitPrice = calculateProductTotalPrice(
                      selectedProduct,
                      effectiveVarState,
                      selectedExtras,
                      1
                    );

                    return {
                      ...selectedProduct,
                      temp_id: `item-${Date.now()}-${varId}-${Math.random().toString(36).substr(2, 6)}`,
                      product_price_id: String(varId),
                      different_price: true,
                      selectedVariant: variant || null,
                      variant_name: variant ? (variant.name || variant.code) : "",
                      variant_code: variant ? variant.code : "",
                      variant_price: variant ? variant.price : unitPrice,
                      selectedVariation: effectiveVarState,
                      selectedExtras: filteredExtras,
                      selectedExcludes,
                      quantity: varQty,
                      count: varQty,
                      notes: notes.trim(),
                      price: unitPrice,
                      originalPrice: variant ? variant.price : selectedProduct.price,
                      totalPrice: unitPrice * varQty,
                      addons: addonsForBackend,
                      allExtras: selectedProduct.allExtras,
                      addons_list: selectedProduct.addons,
                      variations: (variationGroups || []).map((group) => ({
                        ...group,
                        selected_option_id: Array.isArray(selectedVariation[group.id])
                          ? selectedVariation[group.id]
                          : selectedVariation[group.id] || null,
                      })),
                    };
                  });

                  onAddFromModal(productsToAdd, { checkDuplicate: true });
                  setNotes("");
                  setVariantSearch("");
                  onClose();
                  return;
                }

                // للمنتج البسيط (بدون فاريشن)
                if (isProductOutOfStock) {
                  toast.error(t("ProductOutOfStock") || "هذا المنتج غير متاح حالياً بالمخزن");
                  return;
                }

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
                  product_price_id: null,
                  different_price: false,
                  selectedVariant: null,
                  variant_name: "",
                  variant_code: "",
                  variant_price: totalUnitPrice,
                  selectedVariation,
                  selectedExtras: filteredExtras,
                  selectedExcludes,
                  quantity,
                  count: quantity,
                  notes: notes.trim(),
                  price: totalUnitPrice,
                  originalPrice: selectedProduct.price,
                  totalPrice: totalUnitPrice * quantity,
                  addons: addonsForBackend,
                  allExtras: selectedProduct.allExtras,
                  addons_list: selectedProduct.addons,
                  variations: (variationGroups || []).map((group) => ({
                    ...group,
                    selected_option_id: Array.isArray(selectedVariation[group.id])
                      ? selectedVariation[group.id]
                      : selectedVariation[group.id] || null,
                  })),
                };

                onAddFromModal(enhancedProduct, { checkDuplicate: true });
                setNotes("");
                setVariantSearch("");
                onClose();
              }}
              disabled={
                orderLoading ||
                hasErrors ||
                (hasVariants ? totalSelectedVariantsCount === 0 : isProductOutOfStock) ||
                (isWeightProduct && (!quantity || quantity <= 0))
              }
              className={`w-full py-6 text-lg font-bold rounded-xl shadow-lg transition-all ${
                (hasVariants ? totalSelectedVariantsCount === 0 : isProductOutOfStock)
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed shadow-none"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200 cursor-pointer"
              }`}
            >
              {orderLoading
                ? t("Adding")
                : hasVariants
                ? totalSelectedVariantsCount > 0
                  ? `${t("AddtoCart")} (${totalSelectedVariantsCount})`
                  : (t("PleaseSelectAtLeastOneVariation") || "اختر الفاريشن")
                : isProductOutOfStock
                ? (t("OutOfStock") || "غير متوفر بالمخزن")
                : t("AddtoCart")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;