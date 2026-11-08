import { Request, Response } from "express";
import { TransferModel } from "../models/transfer";
import { WarehouseModel } from "../models/warehouse";
import { ProductModel } from "../models/product";
import { ProductPriceModel } from "../models/productPrice";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";

const extractId = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val._id) return String(val._id);
  return String(val);
};

export const createTransfer = async (req: Request, res: Response) => {
  const { fromWarehouseId, toWarehouseId, products, reason } = req.body;

  if (!fromWarehouseId || !toWarehouseId) throw new BadRequest("Both warehouses are required");
  if (fromWarehouseId === toWarehouseId) throw new BadRequest("Source and destination warehouse must be different");
  if (!Array.isArray(products) || products.length === 0) throw new BadRequest("At least one product is required");

  const fromWarehouse = WarehouseModel.findById(fromWarehouseId);
  const toWarehouse = WarehouseModel.findById(toWarehouseId);
  if (!fromWarehouse || !toWarehouse) throw new NotFound("One or both warehouses not found");

  const normalizedProducts = products.map((item: any) => {
    const productId = extractId(item.productId);
    const productPriceId = extractId(item.productPriceId);
    if (!productId) throw new BadRequest("Product ID is required for each item");
    return { productId, productPriceId, quantity: Number(item.quantity) };
  });

  for (const item of normalizedProducts) {
    const { productId, productPriceId, quantity } = item;
    if (!quantity || quantity <= 0) throw new BadRequest("Each product must have a positive quantity");
    const product = ProductModel.findById(productId);
    if (!product) throw new NotFound(`Product ${productId} not found`);
    if (productPriceId) {
      const pp = ProductPriceModel.findById(productPriceId);
      if (!pp) throw new NotFound(`Product variation ${productPriceId} not found`);
    }
    const existing = Product_WarehouseModel.findOne({ productId, productPriceId: productPriceId || null, warehouseId: fromWarehouseId });
    const available = existing?.quantity ?? 0;
    if (available < quantity) {
      throw new BadRequest(`Insufficient quantity for product ${productId} in source warehouse. Available: ${available}, Requested: ${quantity}`);
    }
  }

  const isSuperAdmin = (req.user as any)?.role === "superadmin";
  const transfer = TransferModel.create({
    fromWarehouseId,
    toWarehouseId,
    products: normalizedProducts,
    reason: reason || "",
    status: isSuperAdmin ? "received" : "pending",
    reference: "",
    date: new Date().toISOString(),
  });

  if (isSuperAdmin) {
    // move stock
    for (const item of normalizedProducts) {
      const { productId, productPriceId, quantity } = item;
      const src = Product_WarehouseModel.findOne({ productId, productPriceId: productPriceId || null, warehouseId: fromWarehouseId });
      if (src) {
        Product_WarehouseModel.updateById(src._id, { quantity: src.quantity - quantity });
      }
      const dst = Product_WarehouseModel.findOne({ productId, productPriceId: productPriceId || null, warehouseId: toWarehouseId });
      if (dst) {
        Product_WarehouseModel.updateById(dst._id, { quantity: dst.quantity + quantity });
      } else {
        Product_WarehouseModel.create({ productId, productPriceId: productPriceId || null, warehouseId: toWarehouseId, quantity });
      }
    }
    TransferModel.updateById(transfer._id, { approved_products: normalizedProducts });
  }

  SuccessResponse(res, {
    message: isSuperAdmin ? "Transfer created and received successfully" : "Transfer created successfully",
    transfer,
  });
};

export const getalltransfers = async (req: Request, res: Response) => {
  const transfers = TransferModel.find().sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  SuccessResponse(res, { message: "Transfers retrieved successfully", transfers });
};

export const getTransferById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = TransferModel.findById(id);
  if (!transfer) throw new NotFound("Transfer not found");
  SuccessResponse(res, { message: "Transfer retrieved successfully", transfer });
};

export const updateTransferStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approvedProducts, rejectedProducts } = req.body;
  const transfer = TransferModel.findById(id);
  if (!transfer) throw new NotFound("Transfer not found");

  if (status === "received") {
    const productsToMove = approvedProducts || transfer.products;
    for (const item of productsToMove) {
      const productId = extractId(item.productId);
      const productPriceId = extractId(item.productPriceId);
      const quantity = Number(item.quantity);
      const src = Product_WarehouseModel.findOne({ productId, productPriceId: productPriceId || null, warehouseId: transfer.fromWarehouseId });
      if (src) Product_WarehouseModel.updateById(src._id, { quantity: src.quantity - quantity });
      const dst = Product_WarehouseModel.findOne({ productId, productPriceId: productPriceId || null, warehouseId: transfer.toWarehouseId });
      if (dst) Product_WarehouseModel.updateById(dst._id, { quantity: dst.quantity + quantity });
      else Product_WarehouseModel.create({ productId, productPriceId: productPriceId || null, warehouseId: transfer.toWarehouseId, quantity });
    }
    TransferModel.updateById(id, { status: "received", approved_products: productsToMove });
  } else if (status === "rejected") {
    TransferModel.updateById(id, { status: "rejected", rejected_products: rejectedProducts || [] });
  } else {
    TransferModel.updateById(id, { status });
  }

  const updated = TransferModel.findById(id);
  SuccessResponse(res, { message: "Transfer status updated", transfer: updated });
};

export const gettransferin = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const transfers = TransferModel.find({ toWarehouseId: warehouseId });
  SuccessResponse(res, { message: "Incoming transfers", transfers });
};

export const gettransferout = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const transfers = TransferModel.find({ fromWarehouseId: warehouseId });
  SuccessResponse(res, { message: "Outgoing transfers", transfers });
};