// src/utils/buildProductsWithVariations.ts

import { ProductModel } from "../models/product";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../models/productPrice";
import { VariationModel } from "../models/variation";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { BrandModel } from "../models/brand";
import { TaxesModel } from "../models/taxes";
import { CategoryModel } from "../models/category";
interface BuildProductsOptions {
  filter?: any;
  warehouseId?: string;
}

export async function buildProductsWithVariations(
  options: BuildProductsOptions = {}
) {
  const { filter = {}, warehouseId } = options;

  let productFilter = { ...filter };

  // ✅ لو فيه warehouseId، هات بس المنتجات الموجودة في المخزن
  let warehouseProductsMap: Map<string, number> = new Map();

  if (warehouseId) {
    const warehouseProducts = Product_WarehouseModel.find({
      warehouseId: warehouseId,
    })
      .filter((item) => item.quantity > 0)
      .map(({ productId, quantity }) => ({ productId, quantity }));

    // Map للوصول السريع للكمية
    warehouseProducts.forEach((wp: any) => {
      warehouseProductsMap.set(wp.productId.toString(), wp.quantity ?? 0);
    });

    const productIds = warehouseProducts.map((wp: any) => wp.productId);
    productFilter._id = { $in: productIds };
  }

  // 1️⃣ المنتجات حسب الفلتر
  const products = ProductModel.find()
    .filter((product) => {
      return Object.entries(productFilter).every(
        ([key, value]) => product[key] === value
      );
    })
    .map((product) => {
      const categories = product.categoryId
        .map((catId: string) => {
          const category = CategoryModel.findById(catId);
          return category || null;
        })
        .filter(Boolean);

      const brand = product.brandId
        ? BrandModel.findById(product.brandId)
        : null;
      const taxes = product.taxesId
        ? TaxesModel.findById(product.taxesId)
        : null;

      return {
        ...product,
        categoryId: categories,
        brandId: brand,
        taxesId: taxes,
      };
    });

  // 2️⃣ كل الـ Variations مرة واحدة
  const variations = VariationModel.find();

  // 3️⃣ نحضّر الـ products بالـ prices + options
  const formattedProducts = await Promise.all(
    products.map(async (product: any) => {
      // أسعار المنتج (ProductPrice)
      const prices = ProductPriceModel.find({
        productId: product._id,
      });

      const formattedPrices = await Promise.all(
        prices.map(async (price: any) => {
          // options لكل price
          const options = ProductPriceOptionModel.find({
            product_price_id: price._id,
          })
            .map((po) => {
              const option = VariationModel.findById(po.option_id);
              return option
                ? {
                    _id: option._id,
                    name: option.name,
                    variationId: option.variationId,
                  }
                : null;
            })
            .filter(Boolean);

          // نجمع الـ options حسب الـ variation (Color, Size, ...)
          const groupedOptions: Record<string, any[]> = {};

          for (const po of options) {
            const option = po?._id as any;
            if (!option?._id) continue;

            const variation = variations.find(
              (v: any) => v._id.toString() === option.variationId?.toString()
            );

            if (variation) {
              if (!groupedOptions[variation.name]) {
                groupedOptions[variation.name] = [];
              }
              groupedOptions[variation.name].push(option);
            }
          }

          const variationsArray = Object.keys(groupedOptions).map(
            (varName) => ({
              name: varName,
              options: groupedOptions[varName],
            })
          );

          return {
            ...price,
            variations: variationsArray,
          };
        })
      );

      // ✅ الكمية من المخزن لو موجود warehouseId
      const quantity = warehouseId
        ? warehouseProductsMap.get(product._id.toString()) ?? 0
        : product.quantity;

      return {
        ...product,
        quantity, // ✅ الكمية الصحيحة
        prices: formattedPrices,
      };
    })
  );

  return formattedProducts;
}
