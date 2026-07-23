// src/services/productProcessor.js
export const buildProductPayload = (item) => {
  const quantity = parseInt(item.count || item.quantity || 1);
  const price = parseFloat(item.price || item.finalPrice || item.total || 0);
  const subtotal = (price * quantity).toFixed(2);

  // 1. Different Price → product_price_id
  let product_price_id = null;
  if (item.different_price && item.selectedVariation?.price_variation) {
    product_price_id = item.selectedVariation.price_variation.toString();
  }

  // 2. Variations → لسه الباك إند بياخد variation كـ array من objects
  //    (في processProductItem مش بنبعت variation خالص دلوقتي، بس لو الباك إند لسه بيطلبها هنسيبها)
  const groupedVariations =
    item.allSelectedVariations?.reduce((acc, variation) => {
      const existing = acc.find((v) => v.variation_id === variation.variation_id);
      if (existing) {
        existing.option_id = Array.isArray(existing.option_id)
          ? [...existing.option_id, variation.option_id.toString()]
          : [existing.option_id.toString(), variation.option_id.toString()];
      } else {
        acc.push({
          variation_id: variation.variation_id.toString(),
          option_id: [variation.option_id.toString()],
        });
      }
      return acc;
    }, []) || [];

  // 3. Addons (مع السعر)
  const addons = [];
  const processedAddonIds = new Set(); // عشان نتجنب التكرار

  // من selectedExtras (اللي ممكن يكون فيها addons مخلوطة)
  if (item.selectedExtras?.length > 0) {
    item.selectedExtras.forEach((id) => {
      const addon = item.addons?.find((a) => a.id === id);
      if (addon) {
        if (processedAddonIds.has(id)) return;
        processedAddonIds.add(id);

        addons.push({
          addon_id: id.toString(),
          count: "1",
          price: parseFloat(addon.price || 0).toFixed(2),
        });
      }
    });
  }

  // من selectedAddons (لو موجودة منفصلة)
  if (item.selectedAddons?.length > 0) {
    item.selectedAddons.forEach((addonData) => {
      const addonId = addonData.addon_id.toString();
      const existing = addons.find((a) => a.addon_id === addonId);

      const countToAdd = parseInt(addonData.count || 1);
      const price = parseFloat(addonData.price || 0).toFixed(2);

      if (existing) {
        existing.count = (parseInt(existing.count) + countToAdd).toString();
      } else {
        addons.push({
          addon_id: addonId,
          count: countToAdd.toString(),
          price,
        });
      }
    });
  }

  // 4. Real Extras (اللي فعلاً extras مش addons)
  const extra_id = (item.selectedExtras || [])
    .map((id) => id.toString())
    .filter((id) =>
      item.allExtras?.some((extra) => extra.id.toString() === id)
    );

  // 5. Excludes
  const exclude_id = (item.selectedExcludes || [])
    .map((id) => id.toString())
    .filter(Boolean);

  // 6. Note
  const note = (item.notes || "").trim() || "No special instructions";

  // 7. البناء النهائي
  const payload = {
    product_id: item._id.toString(),
    quantity: quantity.toString(),
    price: price.toFixed(2),
    subtotal,
    note,
  };

  // إضافات اختيارية
  if (product_price_id) payload.product_price_id = product_price_id;
  if (groupedVariations.length > 0) payload.variation = groupedVariations;
  if (addons.length > 0) payload.addons = addons;
  if (extra_id.length > 0) payload.extra_id = extra_id;
  if (exclude_id.length > 0) payload.exclude_id = exclude_id;

  return payload;
};