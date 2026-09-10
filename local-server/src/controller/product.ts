import { Request, Response } from "express";
import { ProductModel } from "../models/product";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { WarehouseModel } from "../models/warehouse";
import { BadRequest } from "../Errors/BadRequest";
import { SuccessResponse } from "../utils/response";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/productPrice";
import { OptionModel, VariationModel } from "../models/variation";

// Get product info + quantity per warehouse, broken down per variation (including out of stock)
export const getProductWarehouseStock = async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    throw new BadRequest("productId is required");
  }

  const product = ProductModel.findById(productId);
  if (!product) {
    throw new BadRequest("Product not found");
  }

  // ── All Warehouses ──────────────────────────────────────────
  const warehouses = await WarehouseModel.find();

  // ── All ProductPrice (variant) details for this product ──────
  const allProductPrices = await ProductPriceModel.find({ productId });
  const hasVariants = allProductPrices.length > 0;
  const productPriceIds = allProductPrices.map((pp: any) => String(pp._id));

  // ── Options for all variants (manual join, no populate) ────
  const priceOptions = productPriceIds.length
    ? await ProductPriceOptionModel.find({
        product_price_id: { $in: productPriceIds },
      })
    : [];

  const optionIds = [
    ...new Set(priceOptions.map((po: any) => String(po.option_id))),
  ];

  const options = optionIds.length
    ? await OptionModel.find({ _id: { $in: optionIds } })
    : [];

  const optionMap = new Map(options.map((o: any) => [String(o._id), o]));

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

  // ── Existing stock rows in Product_Warehouse ─────────────────
  const stockRows = Product_WarehouseModel.find({ productId });
  const stockMap = new Map<string, any>();
  for (const row of stockRows as any[]) {
    const key = row.productPriceId
      ? `${String(row.warehouseId)}:${String(row.productPriceId)}`
      : String(row.warehouseId);
    stockMap.set(key, row);
  }

  // ── Build complete warehouseStock list (including out-of-stock) ─
  const warehouseStock = warehouses.map((wh: any) => {
    const whId = String(wh._id);
    let totalQuantity = 0;

    if (!hasVariants) {
      const row = stockMap.get(whId);
      const qty = Number(row?.quantity ?? 0);
      totalQuantity = qty;

      return {
        warehouseId: wh._id,
        warehouseName: wh.name ?? "Warehouse",
        warehouseAddress: wh.address ?? "",
        totalQuantity,
        base: {
          quantity: qty,
          low_stock: row?.low_stock ?? product.low_stock ?? null,
        },
        variations: [],
      };
    } else {
      const variations = allProductPrices.map((pp: any) => {
        const ppKey = String(pp._id);
        const row = stockMap.get(`${whId}:${ppKey}`);
        const qty = Number(row?.quantity ?? 0);
        totalQuantity += qty;

        return {
          productPriceId: pp._id,
          code: pp.code ?? null,
          price: pp.price ?? null,
          quantity: qty,
          low_stock: row?.low_stock ?? product.low_stock ?? null,
          options: variantLabelsMap.get(ppKey) ?? [],
        };
      });

      return {
        warehouseId: wh._id,
        warehouseName: wh.name ?? "Warehouse",
        warehouseAddress: wh.address ?? "",
        totalQuantity,
        base: null,
        variations,
      };
    }
  });

  const totalQtyAcrossWh = warehouseStock.reduce(
    (sum: number, w: any) => sum + (w.totalQuantity || 0),
    0
  );

  const enrichedProduct = {
    ...product,
    quantity: hasVariants ? totalQtyAcrossWh : (product.quantity ?? totalQtyAcrossWh),
  };

  SuccessResponse(res, {
    message: "Product warehouse stock fetched successfully",
    product: enrichedProduct,
    warehouseStock,
  });
};