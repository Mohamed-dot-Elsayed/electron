import { Request, Response } from "express";
import { WarehouseModel } from "../models/warehouse";
import { ProductModel } from "../models/product";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/productPrice";
import { OptionModel, VariationModel } from "../models/variation";
import { CategoryModel } from "../models/category";
import { BrandModel } from "../models/brand";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";

const getScopedWarehouseId = (
  req: Request,
  allowQuery = false,
  paramWarehouseId?: string,
): string => {
  const user = req.user as any;
  const assignedWarehouseId = user?.warehouse_id;

  if (user?.role === "superadmin") {
    if (!allowQuery) {
      if (!assignedWarehouseId) {
        throw new BadRequest("Warehouse is not assigned to this user");
      }
      return String(assignedWarehouseId);
    }

    const requested =
      paramWarehouseId ||
      (req.query?.warehouseId as string) ||
      (req.query?.warehouse_id as string) ||
      assignedWarehouseId;

    if (!requested) {
      throw new BadRequest("warehouseId is required");
    }
    return String(requested);
  }

  if (!assignedWarehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const requested =
    (paramWarehouseId as string) ||
    (req.query?.warehouseId as string) ||
    (req.query?.warehouse_id as string);

  if (requested && String(requested) !== String(assignedWarehouseId)) {
    throw new BadRequest("You are not allowed to access another warehouse");
  }

  return String(assignedWarehouseId);
};

export const buildWarehouseProducts = async (warehouseId: string) => {
  const warehouse = WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const stocks = Product_WarehouseModel.find({ warehouseId });

  const products = await Promise.all(
    (stocks as any[]).map(async (stock: any) => {
      const product = ProductModel.findById(stock.productId);
      if (!product) return null;

      const category = product.categoryId
        ? CategoryModel.findById(product.categoryId)
        : null;
      const brand = product.brandId ? BrandModel.findById(product.brandId) : null;

      let variationOptions: any[] = [];
      if (stock.productPriceId) {
        const priceOptions = ProductPriceOptionModel.find({
          product_price_id: stock.productPriceId,
        });
        variationOptions = (priceOptions as any[])
          .map((po: any) => {
            if (!po.option_id) return null;
            const option = OptionModel.findById(po.option_id);
            if (!option) return null;
            const variation = option.variationId
              ? VariationModel.findById(option.variationId)
              : null;
            return {
              ...option,
              variationId: variation
                ? { _id: variation._id, name: variation.name, ar_name: variation.ar_name }
                : option.variationId,
            };
          })
          .filter((o) => o !== null);
      }

      const prices = ProductPriceModel.find({ productId: product._id });
      const pricesWithOptions = await Promise.all(
        (prices as any[]).map(async (price: any) => {
          const priceOptions = ProductPriceOptionModel.find({
            product_price_id: price._id,
          });
          const optionsWithDetails = (priceOptions as any[])
            .map((po: any) => {
              if (!po.option_id) return null;
              const option = OptionModel.findById(po.option_id);
              if (!option) return null;
              const variation = option.variationId
                ? VariationModel.findById(option.variationId)
                : null;
              return {
                ...option,
                variationId: variation
                  ? { _id: variation._id, name: variation.name, ar_name: variation.ar_name }
                  : option.variationId,
              };
            })
            .filter((o) => o !== null);

          return {
            ...price,
            options: optionsWithDetails,
          };
        })
      );

      return {
        ...product,
        categoryId: category
          ? { _id: category._id, name: category.name, ar_name: category.ar_name }
          : product.categoryId,
        brandId: brand
          ? { _id: brand._id, name: brand.name, ar_name: brand.ar_name }
          : product.brandId,
        quantity: stock.quantity,
        stock_quantity: stock.quantity,
        low_stock: stock.low_stock,
        stockId: stock._id,
        productPriceId: stock.productPriceId,
        variationOptions,
        prices: pricesWithOptions,
      };
    })
  );

  const validProducts = products.filter((p) => p !== null);

  return {
    warehouse,
    products: validProducts,
    totalProducts: validProducts.length,
  };
};

export const getPOSWarehouseProducts = async (req: Request, res: Response) => {
  const warehouseId = getScopedWarehouseId(
    req,
    true,
    req.params?.warehouseId ? String(req.params.warehouseId) : undefined,
  );
  const data = await buildWarehouseProducts(warehouseId);

  const summary = (data.products as any[]).reduce(
    (acc: any, product: any) => {
      const quantity = Number(product.stock_quantity ?? product.quantity ?? 0);
      const unitPrice = Number(
        product.productPriceId?.price ?? product.price ?? 0,
      );
      acc.totalQuantity += quantity;
      acc.totalAmount += unitPrice * quantity;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0 },
  );

  SuccessResponse(res, {
    ...data,
    summary,
  });
};

export const getPOSWarehouseDestinations = async (req: Request, res: Response) => {
  const user = req.user as any;
  const assignedWarehouseId = user?.warehouse_id
    ? String(user.warehouse_id)
    : null;

  const warehouses = WarehouseModel.find({ enabled: { $ne: false } })
    .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

  const filtered = assignedWarehouseId && user?.role !== "superadmin"
    ? warehouses.filter((w: any) => String(w._id) !== assignedWarehouseId)
    : warehouses;

  const mapped = filtered.map((w: any) => ({
    _id: w._id,
    name: w.name,
    ar_name: w.ar_name,
    phone: w.phone,
    stock_Quantity: w.stock_Quantity,
    Is_Online: w.Is_Online,
  }));

  SuccessResponse(res, {
    message: "Destination warehouses list",
    warehouses: mapped,
  });
};