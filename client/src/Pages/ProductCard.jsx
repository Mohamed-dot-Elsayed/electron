//page for product card component that displays product details and allows adding to order (products div)
import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { resolveImageUrl } from "./utils/imageUrl";
import { getProductVariantsList } from "./ProductModal";

const ProductCard = ({ product, onAddToOrder, onOpenModal }) => {
  const [isCurrentItemLoading, setIsCurrentItemLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const variants = getProductVariantsList(product);
  const hasVariants = variants.length > 0;
  const hasExtras =
    (product.allExtras && product.allExtras.length > 0) ||
    (product.addons && product.addons.length > 0);

  const isSimpleOutOfStock =
    !hasVariants &&
    product.quantity !== null &&
    product.quantity !== undefined &&
    product.quantity <= 0;

  const allVariantsOutOfStock =
    hasVariants &&
    variants.length > 0 &&
    variants.every(
      (v) => v.quantity !== null && v.quantity !== undefined && v.quantity <= 0
    );

  const isOutOfStock = isSimpleOutOfStock || allVariantsOutOfStock;

  const handleAddToOrder = async (product) => {
    if (isOutOfStock) {
      toast.error(t("ProductOutOfStock") || "Product is out of stock");
      return;
    }

    if (hasVariants || hasExtras) {
      onOpenModal(product);
      return;
    }

    setIsCurrentItemLoading(true);
    try {
      console.log("ProductCard -> handleAddToOrder called", product.id);
      await onAddToOrder(product);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsCurrentItemLoading(false);
    }
  };

  const src = resolveImageUrl(product.image);

  const displayPrice = hasVariants
    ? variants[0].price
    : product.price_after_discount !== null &&
      product.price_after_discount !== undefined &&
      product.price_after_discount < product.price
    ? product.price_after_discount
    : product.price;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 relative pb-16">
      <div onClick={() => onOpenModal(product)} className="cursor-pointer">
        <div className="relative">
          <img
            src={src}
            alt={product.name}
            className="w-full h-32 object-cover"
          />
          {hasVariants && (
            <span className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {variants.length} {t("Variations") || "Variations"}
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                {t("OutOfStock") || "Out of Stock"}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-base font-semibold text-gray-800 truncate">
            {product.name}
            <p className="text-sm text-gray-500 font-medium">{t("code")}:{product.product_code || product.code} </p>
          </h3>
        </div>
      </div>

      {product.description && product.description !== "null" && (
        <div className="px-3 -mt-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-xs text-bg-primary underline mt-1 cursor-pointer">
                {t("Description")}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("Description")}</DialogTitle>
                <DialogDescription>{product.description}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="px-3">
        <div className="mt-1 text-sm font-bold text-bg-primary flex items-center gap-1.5 flex-wrap">
          {hasVariants ? (
            <span>
              {displayPrice} {t("EGP")}
            </span>
          ) : product.price_after_discount !== null &&
            product.price_after_discount !== undefined &&
            product.price_after_discount < product.price ? (
            <>
              <span className="text-purple-600 line-through mr-1">
                {product.price} {t("EGP")}
              </span>
              <span>{product.price_after_discount} {t("EGP")}</span>
            </>
          ) : (
            <span>{product.price} {t("EGP")}</span>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white">
        <button
          onClick={() => handleAddToOrder(product)}
          disabled={isCurrentItemLoading || isOutOfStock}
          className={`w-full py-1 px-2 text-sm rounded transition-colors font-medium cursor-pointer ${
            isOutOfStock
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isCurrentItemLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : hasVariants
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-bg-primary text-white hover:bg-purple-700"
          }`}
        >
          {isOutOfStock
            ? (t("OutOfStock") || "Out of Stock")
            : isCurrentItemLoading
            ? t("Adding")
            : hasVariants
            ? (t("ChooseVariation") || "Choose Variation")
            : t("AddToOrder")}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;