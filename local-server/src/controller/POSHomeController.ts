import { ProductModel } from "../models/product";
import { CategoryModel } from "../models/category";
import { BrandModel } from "../models/brand";
import { CouponModel } from "../models/coupon";
import { TaxesModel } from "../models/taxes";
import { DiscountModel } from "../models/discount";
import { WarehouseModel } from "../models/warehouse";
import { GiftCardModel } from "../models/giftCard";
import { PaymentMethodModel } from "../models/paymentMethod";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../models/productPrice";
import { CityModel } from "../models/city";
import { CustomerModel, CustomerGroupModel } from "../models/customer";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import { BankAccountModel } from "../models/financialAccount";
import { CurrencyModel } from "../models/currency";
import { PandelModel } from "../models/pandel";
import { CountryModel } from "../models/country";
import { CashierModel } from "../models/cashier";
import { BadRequest } from "../Errors/BadRequest";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { ServiceFeeModel } from "../models/serviceFee";
import { CashierShift } from "../models/cashierShift";
// get all category
export const getAllCategorys = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const warehouseProducts = Product_WarehouseModel.find({
  warehouseId: warehouseId,
})
  .filter(item => item.quantity > 0)
  .map(({ productId }) => ({ productId }));

  const productIds = warehouseProducts.map((wp: any) => wp.productId);

  // هات المنتجات مع categoryId
  const products = ProductModel.find()
    .filter((product) => productIds.includes(product._id))
    .map(({ categoryId }) => ({ categoryId }));

  // ✅ categoryId هو Array of ObjectIds
  const categoryIds: string[] = [];

  products.forEach((p: any) => {
    if (p.categoryId && p.categoryId.length > 0) {
      p.categoryId.forEach((catId: any) => {
        if (catId) {
          categoryIds.push(catId.toString());
        }
      });
    }
  });

  const uniqueCategoryIds = [...new Set(categoryIds)];

  const category = CategoryModel.find({
    _id: { $in: uniqueCategoryIds },
  });

  SuccessResponse(res, { message: "Category list", category });
};

// ═══════════════════════════════════════════════════════════
// Get All Brands (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getAllBrands = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const warehouseProducts = Product_WarehouseModel.find({
    warehouseId: warehouseId,
  })
    .filter((item) => item.quantity > 0)
    .map(({ productId }) => ({ productId }));

  const productIds = warehouseProducts.map((wp: any) => wp.productId);

  const products = ProductModel.find()
    .filter((product) => productIds.includes(product._id))
    .map(({ brandId }) => ({ brandId }));

  const brandIds: string[] = [];
  products.forEach((p: any) => {
    if (p.brandId) {
      const id = (p.brandId as any)?._id?.toString() || p.brandId?.toString();
      if (id) brandIds.push(id);
    }
  });

  const uniqueBrandIds = [...new Set(brandIds)];

  const brand = await BrandModel.find({
    _id: { $in: uniqueBrandIds },
  });

  SuccessResponse(res, { message: "Brand list", brand });
};

// ═══════════════════════════════════════════════════════════
// Get Products By Category (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getProductsByCategory = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { categoryId } = req.params;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const category = await CategoryModel.findById(categoryId);
  if (!category) throw new NotFound("Category not found");

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = Product_WarehouseModel.find({
    warehouseId: warehouseId,
  })
    .filter((item) => item.quantity > 0)
    .map(({ productId, quantity }) => ({ productId, quantity }));

  const productIds = warehouseProducts.map((wp) => wp.productId);

  // ✅ categoryId هو Array عشان كده نستخدم $in
  const products = ProductModel.find()
    .filter(
      (product) =>
        productIds.includes(product._id) &&
        product.categoryId.includes(categoryId)
    )
    .map((product) => {
      const categories = product.categoryId
        .map((catId: string) => {
          const category = CategoryModel.findById(catId);
          return category
            ? {
                _id: category._id,
                name: category.name,
                ar_name: category.ar_name,
              }
            : null;
        })
        .filter(Boolean);

      const brand = product.brandId
        ? BrandModel.findById(product.brandId)
        : null;
      const brandData = brand
        ? { _id: brand._id, name: brand.name, ar_name: brand.ar_name }
        : null;

      return {
        ...product,
        categoryId: categories,
        brandId: brandData,
      };
    });

  // إضافة الكمية من المخزن والـ Variations
  const result = await Promise.all(
    products.map(async (product: any) => {
      const warehouseStock = warehouseProducts.find(
        (wp: any) => wp.productId.toString() === product._id.toString()
      );

      const variations = ProductPriceModel.find({
        productId: product._id,
      });

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Products list by category",
    products: result,
  });
};

// ═══════════════════════════════════════════════════════════
// Get Products By Brand (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getProductsByBrand = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { brandId } = req.params;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const brand = await BrandModel.findById(brandId);
  if (!brand) throw new NotFound("Brand not found");

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = Product_WarehouseModel.find({
    warehouseId: warehouseId,
  })
    .filter((item) => item.quantity > 0)
    .map(({ productId, quantity }) => ({ productId, quantity }));

  const productIds = warehouseProducts.map((wp) => wp.productId);

  const products = ProductModel.find({ brandId: brandId })
    .filter((product) => productIds.includes(product._id))
    .map((product) => {
      const categories = product.categoryId
        .map((catId: string) => {
          const category = CategoryModel.findById(catId);
          return category
            ? {
                _id: category._id,
                name: category.name,
                ar_name: category.ar_name,
              }
            : null;
        })
        .filter(Boolean);

      const brand = BrandModel.findById(product.brandId);
      const brandData = brand
        ? { _id: brand._id, name: brand.name, ar_name: brand.ar_name }
        : null;

      return {
        ...product,
        categoryId: categories,
        brandId: brandData,
      };
    });

  const result = await Promise.all(
    products.map(async (product: any) => {
      const warehouseStock = warehouseProducts.find(
        (wp: any) => wp.productId.toString() === product._id.toString()
      );

      const variations = ProductPriceModel.find({
        productId: product._id,
      });

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Products list by brand",
    products: result,
  });
};

// ═══════════════════════════════════════════════════════════
// Get Featured Products (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getFeaturedProducts = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = Product_WarehouseModel.find({
    warehouseId: warehouseId,
  })
    .filter((item) => item.quantity > 0)
    .map(({ productId, quantity }) => ({ productId, quantity }));

  const productIds = warehouseProducts.map((wp) => wp.productId);

  const products = ProductModel.find({ is_featured: true })
    .filter((product) => productIds.includes(product._id))
    .map((product) => {
      const categories = product.categoryId
        .map((catId: string) => {
          const category = CategoryModel.findById(catId);
          return category
            ? {
                _id: category._id,
                name: category.name,
                ar_name: category.ar_name,
              }
            : null;
        })
        .filter(Boolean);

      const brand = product.brandId
        ? BrandModel.findById(product.brandId)
        : null;
      const brandData = brand
        ? { _id: brand._id, name: brand.name, ar_name: brand.ar_name }
        : null;

      return {
        ...product,
        categoryId: categories,
        brandId: brandData,
      };
    });

  const result = await Promise.all(
    products.map(async (product: any) => {
      const warehouseStock = warehouseProducts.find(
        (wp: any) => wp.productId.toString() === product._id.toString()
      );

      const variations = ProductPriceModel.find({
        productId: product._id,
      });

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Featured products",
    products: result,
  });
};

// get all selections
export const getAllSelections = async (req: Request, res: Response) => {
  const warehouseId = req.user?.warehouse_id;
  const warehouses = (
    warehouseId
      ? WarehouseModel.find({ _id: warehouseId })
      : WarehouseModel.find()
  ).map(({ name }) => ({ name }));

  const accounts = BankAccountModel.find({ in_POS: true, status: true })
    .filter((account) =>
      warehouseId ? account.warehouseId.includes(warehouseId) : true
    )
    .map(({ name, balance, warehouseId }) => ({ name, balance, warehouseId }));

  const taxes = TaxesModel.find().map(({ name, status, amount, type }) => ({
    name,
    status,
    amount,
    type,
  }));

  const discounts = DiscountModel.find().map(
    ({ name, status, amount, type }) => ({ name, status, amount, type })
  );

  const coupons = CouponModel.find().map(
    ({
      coupon_code,
      amount,
      type,
      minimum_amount_for_use,
      quantity,
      available,
      expired_date,
    }) => ({
      coupon_code,
      amount,
      type,
      minimum_amount: minimum_amount_for_use,
      quantity,
      available,
      expired_date,
    })
  );
  const giftCards = GiftCardModel.find().map(({ code, amount }) => ({
    code,
    amount,
  }));

  const paymentMethods = PaymentMethodModel.find({ isActive: true }).map(
    ({ name }) => ({ name })
  );

  const customers = CustomerModel.find().map(
    ({ name, phone_number, email, address }) => ({
      name,
      phone_number,
      email,
      address,
    })
  );

  const customerGroups = CustomerGroupModel.find().map(({ name }) => ({
    name,
  }));

  const dueCustomers = CustomerModel.find({ is_Due: true }).map(
    ({ name, phone_number, email, address, amount_Due }) => ({
      name,
      phone_number,
      email,
      address,
      amount_Due,
    })
  );
  const currency = CurrencyModel.find({ isdefault: true }).map(
    ({ name, ar_name, amount }) => ({ name, ar_name, amount })
  );

  const countries = CountryModel.find().map(({ name, ar_name, _id }) => {
    const cities = CityModel.find({ country: _id }).map(
      ({ name, ar_name, shipingCost }) => ({ name, ar_name, shipingCost })
    );

    return { name, ar_name, cities };
  });

  const sevicefees = ServiceFeeModel.find({
    status: true,
    module: "pos",
  })
    .filter((fee) => {
      if (warehouseId) {
        return fee.warehouseId === warehouseId || fee.warehouseId === null;
      }
      return fee.warehouseId === null;
    })
    .map(({ title, amount, type, module, warehouseId }) => ({
      title,
      amount,
      type,
      module,
      warehouseId,
    }));

  SuccessResponse(res, {
    message: "Selections list",
    dueCustomers,
    countries,
    warehouses,
    sevicefees,
    currency,
    accounts,
    taxes,
    discounts,
    coupons,
    giftCards,
    paymentMethods,
    customers,
    customerGroups,
  });
};

export const getActiveBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }
  const bundles = PandelModel.find({ status: true }).filter((bundle) => {
    // Check date validity
    const isActive =
      new Date(bundle.startdate) <= currentDate &&
      new Date(bundle.enddate) >= currentDate;

    // Check warehouse access
    const isAccessible =
      bundle.all_warehouses === true ||
      bundle.warehouse_ids.includes(String(warehouseId));

    return isActive && isAccessible;
  });

  const bundlesWithDetails = await Promise.all(
    bundles.map(async (bundle: any) => {
      let originalPrice = 0;

      const productsDetails = await Promise.all(
        (bundle.products || []).map(async (p: any) => {
          // جلب المنتج
          const product = await ProductModel.findById(p.productId)
            .select("name ar_name image price")
            .lean();

          if (!product) return null;

          // جلب كل الـ Variations للمنتج ده
          const allVariations = ProductPriceModel.find({
            productId: p.productId,
          }).map(({ price, code, quantity, cost }) => ({
            price,
            code,
            quantity,
            cost,
          }));

          // جلب الـ Options لكل Variation
          const variationsWithOptions = allVariations.map((v: any) => {
            const options = ProductPriceOptionModel.find({
              product_price_id: v._id,
            });

            const populatedOptions = options
              .map((o: any) => {
                const option = ProductModel.findById(o.option_id);
                return option
                  ? {
                      _id: option._id,
                      name: option.name,
                      ar_name: option.ar_name,
                    }
                  : null;
              })
              .filter(Boolean);

            return {
              _id: v._id,
              price: v.price,
              code: v.code,
              quantity: v.quantity,
              options: populatedOptions,
            };
          });

          const hasVariations = variationsWithOptions.length > 0;
          const isVariationFixed = !!p.productPriceId;

          let selectedVariation = null;
          let productPrice = product.price || 0;

          // لو الـ Variation محدد من الأدمن
          if (isVariationFixed && p.productPriceId) {
            const fixedVariation = variationsWithOptions.find(
              (v: any) => v._id.toString() === p.productPriceId.toString()
            );
            if (fixedVariation) {
              selectedVariation = fixedVariation;
              productPrice = fixedVariation.price || product.price || 0;
            }
          }

          // حساب السعر الأصلي
          originalPrice += productPrice * (p.quantity || 1);

          return {
            productId: p.productId,
            product: product,
            quantity: p.quantity || 1,

            // معلومات الـ Variations
            hasVariations: hasVariations,
            isVariationFixed: isVariationFixed,
            requiresSelection: hasVariations && !isVariationFixed,

            // لو محدد من الأدمن
            selectedVariation: selectedVariation,
            productPriceId: p.productPriceId || null,

            // لو مفتوح للكاشير
            availableVariations: !isVariationFixed ? variationsWithOptions : [],
          };
        })
      );

      const validProducts = productsDetails.filter((p) => p !== null);

      const savings = originalPrice - bundle.price;
      const savingsPercentage =
        originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

      // هل الـ Bundle يحتاج اختيار من الكاشير؟
      const requiresVariationSelection = validProducts.some(
        (p: any) => p?.requiresSelection
      );

      return {
        _id: bundle._id,
        name: bundle.name,
        images: bundle.images,
        price: bundle.price,
        originalPrice: originalPrice,
        savings: savings > 0 ? savings : 0,
        savingsPercentage: savingsPercentage > 0 ? savingsPercentage : 0,
        startdate: bundle.startdate,
        enddate: bundle.enddate,

        // ✅ الجديد
        requiresVariationSelection: requiresVariationSelection,
        products: validProducts,
      };
    })
  );

  return SuccessResponse(res, {
    message: "Active bundles",
    count: bundlesWithDetails.length,
    bundles: bundlesWithDetails,
  });
};

export const getCashiers = async (req: Request, res: Response) => {
  const warehouseId = req.user?.warehouse_id;

  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  const cashiers = CashierModel.find({
    warehouse_id: warehouseId,
    status: true,
    cashier_active: false, // ✅ المتاحين فقط
  }).map(({ _id, name, ar_name, cashier_active }) => ({
    _id,
    name,
    ar_name,
    cashier_active,
  }));

  SuccessResponse(res, {
    cashiers,
  });
};

export const selectCashier = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;

  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  const { cashier_id } = req.body;
  if (!cashier_id) {
    throw new BadRequest("Cashier ID is required");
  }

  // ✅ check من الـ shift (source of truth)
  const busyShift = CashierShift.findOne({
    cashier_id,
    status: "open",
  });

  if (busyShift) {
    throw new BadRequest("Cashier already in use");
  }

  const cashier = CashierModel.findOne({
    _id: cashier_id,
    warehouse_id: warehouseId,
    status: true,
  });

  if (!cashier) {
    throw new NotFound("Cashier not found");
  }

  // Select specific fields from cashier
  const cashierData = {
    _id: cashier._id,
    name: cashier.name,
    ar_name: cashier.ar_name,
    cashier_active: cashier.cashier_active,
  };

  // Get financial accounts (filter by warehouseId array membership)
  const financialAccounts = BankAccountModel.find({
    status: true,
    in_POS: true,
  })
    .filter((account) => account.warehouseId.includes(warehouseId))
    .map(({ _id, name, image, balance }) => ({
      _id,
      name,
      image,
      balance,
    }));

  return SuccessResponse(res, {
    message: "Cashier selected successfully",
    cashier: cashierData,
    financialAccounts,
  });
};

// 1. Warehouses
export const getWarehouses = async (req: Request, res: Response) => {
  const warehouseId = req.user?.warehouse_id;

  const warehouses = (
    warehouseId
      ? WarehouseModel.find({ _id: warehouseId })
      : WarehouseModel.find()
  ).map(({ name }) => ({ name }));

  SuccessResponse(res, { message: "Warehouses list", data: warehouses });
};

// 2. Bank Accounts
export const getAccounts = async (req: Request, res: Response) => {
  const warehouseId = req.user?.warehouse_id;

  const allAccounts = BankAccountModel.find({
    in_POS: true,
    status: true,
  });

  // Filter by warehouseId if provided (since warehouseId is an array)
  const filteredAccounts = warehouseId
    ? allAccounts.filter((account) => account.warehouseId.includes(warehouseId))
    : allAccounts;

  const accounts = filteredAccounts.map(({ name, balance, warehouseId }) => ({
    name,
    balance,
    warehouseId,
  }));

  SuccessResponse(res, { message: "Accounts list", data: accounts });
};

// 3. Taxes
export const getTaxes = async (req: Request, res: Response) => {
  const taxes = TaxesModel.find().map(({ name, status, amount, type }) => ({
    name,
    status,
    amount,
    type,
  }));

  SuccessResponse(res, { message: "Taxes list", data: taxes });
};

// 4. Discounts
export const getDiscounts = async (req: Request, res: Response) => {
  const discounts = DiscountModel.find().map(
    ({ name, status, amount, type }) => ({ name, status, amount, type })
  );

  SuccessResponse(res, { message: "Discounts list", data: discounts });
};

// 5. Coupons
export const getCoupons = async (req: Request, res: Response) => {
  const coupons = CouponModel.find().map(
    ({
      coupon_code,
      amount,
      type,
      minimum_amount_for_use,
      quantity,
      available,
      expired_date,
    }) => ({
      coupon_code,
      amount,
      type,
      minimum_amount: minimum_amount_for_use,
      quantity,
      available,
      expired_date,
    })
  );

  SuccessResponse(res, { message: "Coupons list", data: coupons });
};

// 6. Gift Cards
export const getGiftCards = async (req: Request, res: Response) => {
  const giftCards = GiftCardModel.find().map(({ code, amount }) => ({
    code,
    amount,
  }));

  SuccessResponse(res, { message: "Gift Cards list", data: giftCards });
};

// 7. Payment Methods
export const getPaymentMethods = async (req: Request, res: Response) => {
  const paymentMethods = PaymentMethodModel.find({ isActive: true }).map(
    ({ name }) => ({ name })
  );

  SuccessResponse(res, {
    message: "Payment Methods list",
    data: paymentMethods,
  });
};

// 8. Customers
export const getCustomers = async (req: Request, res: Response) => {
  const customers = CustomerModel.find().map(
    ({ name, phone_number, email, address }) => ({
      name,
      phone_number,
      email,
      address,
    })
  );

  SuccessResponse(res, { message: "Customers list", data: customers });
};

// 9. Customer Groups
// Get Customer Groups - cleaner version
export const getCustomerGroups = async (req: Request, res: Response) => {
  const customerGroups = CustomerGroupModel.find({ status: true });

  SuccessResponse(res, {
    message: "Customer Groups list",
    data: customerGroups.map(({ name }) => ({ name })),
  });
};

// Get Due Customers - cleaner version
export const getDueCustomers = async (req: Request, res: Response) => {
  const dueCustomers = CustomerModel.find({ is_Due: true });

  SuccessResponse(res, {
    message: "Due Customers list",
    data: dueCustomers.map(
      ({ name, phone_number, email, address, amount_Due }) => ({
        name,
        phone_number,
        email,
        address,
        amount_Due,
      })
    ),
  });
};

// Get Currency - cleaner version
export const getCurrency = async (req: Request, res: Response) => {
  const currencies = CurrencyModel.find({ isdefault: true });

  SuccessResponse(res, {
    message: "Currency list",
    data: currencies.map(({ name, ar_name, amount }) => ({
      name,
      ar_name,
      amount,
    })),
  });
};

// 12. Countries and Cities
export const getCountries = async (req: Request, res: Response) => {
  const countries = CountryModel.find({}).map((country) => {
    const cities = CityModel.find({
      country_id: country._id,
    }).map((city) => ({
      _id: city._id,
      name: city.name,
      ar_name: city.ar_name,
      shipingCost: city.shipingCost,
    }));

    return {
      _id: country._id,
      name: country.name,
      ar_name: country.ar_name,
      cities,
    };
  });

  SuccessResponse(res, {
    message: "Countries list",
    data: countries,
  });
};

// 13. Service Fees
export const getServiceFees = async (req: Request, res: Response) => {
  const warehouseId = req.user?.warehouse_id;
  let serviceFees = ServiceFeeModel.find({
    status: true,
    module: "pos",
  })
    .filter((fee) => {
      if (warehouseId) {
        return fee.warehouseId === warehouseId || fee.warehouseId == null;
      }

      return fee.warehouseId == null;
    })
    .map((fee) => ({
      _id: fee._id,
      title: fee.title,
      amount: fee.amount,
      type: fee.type,
      module: fee.module,
      warehouseId: fee.warehouseId,
    }));
  SuccessResponse(res, { message: "Service fees list", data: serviceFees });
};
