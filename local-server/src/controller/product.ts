import { Request, Response } from "express";
import { ProductModel } from "../models/product";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { WarehouseModel } from "../models/warehouse";
import { BadRequest } from "../Errors/BadRequest";
import { SuccessResponse } from "../utils/response";

// Get product info + quantity per warehouse
export const getProductWarehouseStock = async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    throw new BadRequest("productId is required");
  }

  const product = ProductModel.findOne({_id:productId});
  
  if (!product) {
    throw new BadRequest("Product not found");
  }

  // all stock rows for this product (base product + variants, across warehouses)
  const stockRows = Product_WarehouseModel.find({ productId });

  // pull warehouse info in one shot instead of N queries
  const warehouseIds = [...new Set(stockRows.map((row: any) => row.warehouseId))];

  const warehouses = warehouseIds.length
    ? await WarehouseModel.find({ _id: { $in: warehouseIds } })
    : [];

  const warehouseMap = new Map(warehouses.map((w: any) => [w._id, w]));

  const warehouseStock = stockRows.map((row: any) => ({
    warehouseId: row.warehouseId,
    warehouseName: warehouseMap.get(row.warehouseId)?.name ?? null,
    warehouseAddress: warehouseMap.get(row.warehouseId)?.address ?? null,
    productPriceId: row.productPriceId, // null = base product, otherwise variant
    quantity: row.quantity,
    low_stock: row.low_stock,
  }));

  SuccessResponse(res, {
    message: "Product warehouse stock fetched successfully",
    product,
    warehouseStock,
  });
};