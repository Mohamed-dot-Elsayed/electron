import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const createTempId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const renderItemVariations = (item) => {
  const variations = [];

  if (item.selectedVariations && item.selectedVariations.length > 0) {
    item.selectedVariations.forEach((variation) => {
      variations.push(
        `${variation.name}: ${
          variation.selected_options?.map((opt) => opt.name).join(", ") ||
          "Selected"
        }`
      );
    });
  }

  // if (item.selectedExtras && item.selectedExtras.length > 0) {
  //   const extrasText = item.selectedExtras
  //     .map((extra) => extra.name)
  //     .join(", ");
  //   variations.push(`Extras: ${extrasText}`);
  // }

  // if (item.selectedExcludes && item.selectedExcludes.length > 0) {
  //   const excludesText = item.selectedExcludes
  //     .map((exclude) => exclude.name)
  //     .join(", ");
  //   variations.push(`Exclude: ${excludesText}`);
  // }

  return variations;
};