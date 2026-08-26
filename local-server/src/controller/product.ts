import { Request, Response } from "express";
import { ProductModel } from "../models/product";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { WarehouseModel } from "../models/warehouse";
import { BadRequest } from "../Errors/BadRequest";
import { SuccessResponse } from "../utils/response";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/productPrice";
import { OptionModel, VariationModel } from "../models/variation";

// Get product info + quantity per warehouse, broken down per variation
export const getProductWarehouseStock = async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    throw new BadRequest("productId is required");
  }

  const product = ProductModel.findById(productId);
  if (!product) {
    throw new BadRequest("Product not found");
  }

  const stockRows = Product_WarehouseModel.find({ productId });

  // ── Warehouses ──────────────────────────────────────────────
  const warehouseIds = [
    ...new Set(stockRows.map((row: any) => String(row.warehouseId))),
  ];

  const warehouses = warehouseIds.length
    ? await WarehouseModel.find({ _id: { $in: warehouseIds } })
    : [];

  const warehouseMap = new Map(
    warehouses.map((w: any) => [String(w._id), w]),
  );

  // ── ProductPrice (variant) details ─────────────────────────
  const productPriceIds = [
    ...new Set(
      stockRows
        .filter((row: any) => row.productPriceId)
        .map((row: any) => String(row.productPriceId)),
    ),
  ];

  const productPrices = productPriceIds.length
    ? await ProductPriceModel.find({ _id: { $in: productPriceIds } })
    : [];

  const productPriceMap = new Map(
    productPrices.map((pp: any) => [String(pp._id), pp]),
  );

  // ── Options for those variants (manual join, no populate) ──
  // Step 1: get the raw option mapping rows for these variants.
  const priceOptions = productPriceIds.length
    ? await ProductPriceOptionModel.find({
        product_price_id: { $in: productPriceIds },
      })
    : [];

  // Step 2: fetch the actual Option docs referenced by those mappings.
  const optionIds = [
    ...new Set(priceOptions.map((po: any) => String(po.option_id))),
  ];

  const options = optionIds.length
    ? await OptionModel.find({ _id: { $in: optionIds } })
    : [];

  const optionMap = new Map(options.map((o: any) => [String(o._id), o]));

  // Step 3: fetch the Variation docs (Color, Size, etc.) referenced by
  // those Options.
  const variationIds = [
    ...new Set(
      options
        .filter((o: any) => o.variationId)
        .map((o: any) => String(o.variationId)),
    ),
  ];

  const variationDocs = variationIds.length
    ? await VariationModel.find({ _id: { $in: variationIds } })
    : [];

  const variationMap = new Map(
    variationDocs.map((v: any) => [String(v._id), v]),
  );

  // Step 4: stitch it all together — group option labels by productPriceId.
  const variantLabelsMap = new Map<
    string,
    { variationName: string; optionName: string }[]
  >();

  for (const po of priceOptions as any[]) {
    const ppKey = String(po.product_price_id);
    const option = optionMap.get(String(po.option_id));
    if (!option) continue;

    const variation = option.variationId
      ? variationMap.get(String(option.variationId))
      : null;

    const entry = {
      variationName: variation?.name ?? null,
      optionName: option.name,
    };

    if (!variantLabelsMap.has(ppKey)) variantLabelsMap.set(ppKey, []);
    variantLabelsMap.get(ppKey)!.push(entry);
  }

  // ── Group stock rows by warehouse, splitting base product vs. variants ──
  const byWarehouse = new Map<string, any>();

  for (const row of stockRows as any[]) {
    const whKey = String(row.warehouseId);
    const wh = warehouseMap.get(whKey);

    if (!byWarehouse.has(whKey)) {
      byWarehouse.set(whKey, {
        warehouseId: row.warehouseId,
        warehouseName: wh?.name ?? null,
        warehouseAddress: wh?.address ?? null,
        totalQuantity: 0,
        base: null,
        variations: [] as any[],
      });
    }

    const entry = byWarehouse.get(whKey);
    entry.totalQuantity += row.quantity ?? 0;

    if (!row.productPriceId) {
      entry.base = {
        quantity: row.quantity ?? 0,
        low_stock: row.low_stock ?? null,
      };
    } else {
      const ppKey = String(row.productPriceId);
      const priceDoc = productPriceMap.get(ppKey);

      entry.variations.push({
        productPriceId: row.productPriceId,
        code: priceDoc?.code ?? null,
        price: priceDoc?.price ?? null,
        quantity: row.quantity ?? 0,
        low_stock: row.low_stock ?? null,
        options: variantLabelsMap.get(ppKey) ?? [],
      });
    }
  }

  const warehouseStock = Array.from(byWarehouse.values());

  SuccessResponse(res, {
    message: "Product warehouse stock fetched successfully",
    product,
    warehouseStock,
  });
};