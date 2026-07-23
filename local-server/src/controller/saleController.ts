import { SaleModel, ProductSalesModel } from "../models/sale";
import { Request, Response } from "express";
import { WarehouseModel } from "../models/warehouse";
import { NotFound, UnauthorizedError } from "../Errors";
import { CustomerModel } from "../models/customer";
import { SuccessResponse } from "../utils/response";
import { CouponModel } from "../models/coupon";
import { TaxesModel } from "../models/taxes";
import { DiscountModel } from "../models/discount";
import { ProductPriceModel } from "../models/productPrice";
import { PaymentModel } from "../models/payment";
import { BadRequest } from "../Errors/BadRequest";
import { GiftCardModel } from "../models/giftCard";
import { BankAccountModel } from "../models/financialAccount";
import { PandelModel } from "../models/pandel";
import { CashierShift } from "../models/cashierShift";
import { ProductModel } from "../models/product";
import { UserModel } from "../models/user";
import bcrypt from "bcryptjs";
import { Product_WarehouseModel } from "../models/productWarehouse";
import { ServiceFeeModel } from "../models/serviceFee";
import { CashierModel } from "../models/cashier";
import { CategoryModel } from "../models/category";

// ✅ Dynamic store info - بيجيب اسم البراند من السوبر أدمن (صاحب البزنس)
const getStoreInfo = async (userId: string) => {
  // 1. جيب اسم البراند من الـ superadmin (صاحب البزنس)
  const superAdmin = await UserModel.findOne({ role: "superadmin" })

  if (superAdmin?.company_name) {
    return {
      name: superAdmin.company_name,
      phone: superAdmin.phone || "",
      address: superAdmin.address || "",
    };
  }

  // Fallback: لو السوبر أدمن مفيش عنده company_name، جيب من الـ Warehouse بتاعه
  if (superAdmin?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(superAdmin.warehouse_id)
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  // Fallback أخير: لو مفيش superadmin أصلاً، جرب اليوزر الحالي
  const user = await UserModel.findById(userId)

  if (user?.company_name) {
    return {
      name: user.company_name,
      phone: user.phone || "",
      address: user.address || "",
    };
  }

  if (user?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(user.warehouse_id)
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  return { name: "", phone: "", address: "" };
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const createSale = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const openShift = await CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  });

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating a sale"
    );
  }

  const {
    customer_id,
    order_pending = 0,
    gift_card_id,
    service_fee_ids = [],
    order_tax,
    order_discount,
    products,
    bundles,
    shipping = 0,
    tax_rate = 0,
    discount = 0,
    note,
    financials,
    coupon_code,
    applied_coupon,
    Due = 0,
  } = req.body;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) {
    throw new NotFound("Warehouse not found");
  }

  if (
    (!products || products.length === 0) &&
    (!bundles || bundles.length === 0)
  ) {
    throw new BadRequest("At least one product or bundle is required");
  }

  const normalizedOrderPending = Number(order_pending) === 0 ? 0 : 1;
  const isPending = normalizedOrderPending === 1;
  const isDue = Number(Due) === 1;

  // ═══════════════════════════════════════════════════════════
  // ✅ PROCESS PRODUCTS & APPLY WHOLESALE PRICE
  // ═══════════════════════════════════════════════════════════
  const processedProducts: any[] = [];
  let productsTotal = 0;

  if (products && products.length > 0) {
    for (const p of products as any[]) {
      const {
        product_id,
        product_price_id,
        quantity,
        discount = 0,
        discount_type = "fixed",
      } = p;
      let qunt = Number(quantity);
      let finalPrice = 0;
      let originalPrice = 0;
      let isWholesale = false;
      if (product_price_id) {
        const priceDoc = await ProductPriceModel.findById(product_price_id);
        if (!priceDoc) {
          throw new NotFound(`Product price ${product_price_id} not found`);
        }

        originalPrice = priceDoc.price || 0;
        finalPrice = originalPrice;

        if (product_id) {
          const product = await ProductModel.findById(product_id);
          if (product) {
            const minQty = product.start_quantaty || 0;
            const wholesalePrice = product.whole_price;

            if (
              wholesalePrice &&
              wholesalePrice > 0 &&
              minQty > 0 &&
              qunt >= minQty
            ) {
              const discountRatio = wholesalePrice / (product.price || 1);
              finalPrice =
                Math.round(originalPrice * discountRatio * 100) / 100;
              isWholesale = true;
            }
          }
        }
      } else if (product_id) {
        const product = await ProductModel.findById(product_id);
        if (!product) {
          throw new NotFound(`Product ${product_id} not found`);
        }

        originalPrice = product.price || 0;
        finalPrice = originalPrice;

        const minQtyForWholesale = product.start_quantaty || 0;
        const wholesalePrice = product.whole_price;

        if (
          wholesalePrice &&
          wholesalePrice > 0 &&
          minQtyForWholesale > 0 &&
          qunt >= minQtyForWholesale
        ) {
          finalPrice = wholesalePrice;
          isWholesale = true;
        }
      }

      if (finalPrice === 0) {
        finalPrice = Number(p.price) || 0;
        originalPrice = finalPrice;
      }

      // Apply product-specific discount
      let appliedDiscount = 0;
      if (Number(discount) > 0) {
        if (discount_type === "percentage") {
          appliedDiscount = finalPrice * (Number(discount) / 100);
        } else {
          appliedDiscount = Number(discount);
        }
        finalPrice = Math.max(0, finalPrice - appliedDiscount);
      }

      const finalSubtotal = finalPrice * qunt;

      processedProducts.push({
        product_id: p.product_id,
        product_price_id: p.product_price_id,
        quantity: qunt,
        price: finalPrice,
        subtotal: finalSubtotal,
        original_price: originalPrice,
        discount: Number(discount),
        discount_type: discount_type,
        is_wholesale: isWholesale,
        options_id: p.options_id,
        isGift: p.isGift,
      });

      if (!p.isGift) {
        productsTotal += finalSubtotal;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ PROCESS BUNDLES (الجديد)
  // ═══════════════════════════════════════════════════════════
  const processedBundles: any[] = [];
  let bundlesTotal = 0;

  if (bundles && bundles.length > 0) {
    for (const b of bundles as any[]) {
      const {
        bundle_id,
        quantity,
        selected_variations,
        isGift,
        discount = 0,
        discount_type = "fixed",
      } = b;
      let quant = Number(quantity)
      const bundleDoc = await PandelModel.findById(bundle_id);
      if (!bundleDoc) {
        throw new NotFound("Bundle not found");
      }

      const bundleWarehouseIds = Array.isArray((bundleDoc as any).warehouse_ids)
        ? (bundleDoc as any).warehouse_ids.map((id: any) => String(id))
        : [];
      const bundleIsAvailableInWarehouse =
        (bundleDoc as any).all_warehouses !== false ||
        bundleWarehouseIds.includes(String(warehouseId));

      if (!bundleIsAvailableInWarehouse) {
        throw new BadRequest(
          `Bundle "${
            (bundleDoc as any).name
          }" is not assigned to warehouse ${warehouseId}`
        );
      }

      // ✅ معالجة كل منتج في الـ Bundle
      const bundleProductsProcessed: any[] = [];

      for (const bundleProduct of (bundleDoc as any).products || []) {
        const productId = bundleProduct.productId;
        let productPriceId = bundleProduct.productPriceId;
        const productQty = bundleProduct.quantity || 1;

        // ✅ لو الـ Variation مش محدد من الأدمن، شوف لو الكاشير اختار
        if (!productPriceId && selected_variations) {
          const selectedVar = selected_variations.find(
            (sv: any) => sv.productId?.toString() === productId?.toString()
          );
          if (selectedVar?.productPriceId) {
            productPriceId = selectedVar.productPriceId;
          }
        }

        // ✅ تحقق من الـ Stock
        if (productPriceId) {
          // منتج مع Variation - التحقق من المخزن بدل الكمية العامة
          const priceDoc = await ProductPriceModel.findById(productPriceId);
          if (!priceDoc) {
            throw new NotFound(`Product variation ${productPriceId} not found`);
          }

          const variationWarehouseStock = await Product_WarehouseModel.findOne({
            productId: productId,
            productPriceId: productPriceId,
            warehouseId: warehouseId,
          });

          if (!variationWarehouseStock) {
            const product = await ProductModel.findById(productId).select(
              "name"
            );
            throw new BadRequest(
              `Bundle "${bundleDoc.name}" - variation for "${
                (product as any)?.name || productId
              }" is not assigned to this warehouse`
            );
          }

          if ((variationWarehouseStock.quantity ?? 0) < quantity * productQty) {
            const product = await ProductModel.findById(productId).select(
              "name"
            );
            throw new BadRequest(
              `Not enough stock for "${
                (product as any)?.name || "product"
              }" variation in bundle "${bundleDoc.name}". Available: ${
                variationWarehouseStock.quantity
              }, Required: ${quantity * productQty}`
            );
          }
        } else {
          // منتج بدون Variation
          const warehouseStock = await Product_WarehouseModel.findOne({
            productId: productId,
            warehouseId: warehouseId,
          });

          if (!warehouseStock) {
            const product = await ProductModel.findById(productId).select(
              "name"
            );
            throw new BadRequest(
              `Bundle "${
                bundleDoc.name
              }" is not available in this warehouse because product "${
                (product as any)?.name || productId
              }" is not assigned to warehouse stock`
            );
          }

          if ((warehouseStock.quantity ?? 0) < quantity * productQty) {
            const product = await ProductModel.findById(productId).select(
              "name"
            );
            throw new BadRequest(
              `Not enough stock for "${
                (product as any)?.name || "product"
              }" in bundle "${bundleDoc.name}". Available: ${
                warehouseStock.quantity
              }, Required: ${quantity * productQty}`
            );
          }
        }

        bundleProductsProcessed.push({
          productId,
          productPriceId,
          quantity: productQty,
        });
      }

      let finalBundlePrice = bundleDoc.price;
      let appliedDiscount = 0;

      if (Number(discount) > 0) {
        if (discount_type === "percentage") {
          appliedDiscount = finalBundlePrice * (Number(discount) / 100);
        } else {
          appliedDiscount = Number(discount);
        }
        finalBundlePrice = Math.max(0, finalBundlePrice - appliedDiscount);
      }

      const bundleSubtotal = finalBundlePrice * quantity;

      processedBundles.push({
        bundle_id,
        quantity,
        price: finalBundlePrice,
        subtotal: bundleSubtotal,
        original_price: bundleDoc.price,
        discount: Number(discount),
        discount_type: discount_type,
        isGift: !!isGift,
        products: bundleProductsProcessed,
      });

      if (!isGift) {
        bundlesTotal += bundleSubtotal;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ CALCULATE FINAL GRAND TOTAL
  // ═══════════════════════════════════════════════════════════
  const subtotal = productsTotal + bundlesTotal;
  const normalizedServiceFeeIds = Array.isArray(service_fee_ids)
    ? service_fee_ids
        .filter((id: unknown) => !!id)
        .map((id: unknown) => String(id))
    : [];

  const uniqueServiceFeeIds = Array.from(new Set(normalizedServiceFeeIds));

  const serviceFeeDocs = uniqueServiceFeeIds.length
    ? ServiceFeeModel.find({}).filter(
        (fee) =>
          uniqueServiceFeeIds.includes(fee._id) &&
          fee.status === true &&
          fee.module === "pos" &&
          (fee.warehouseId === warehouseId || fee.warehouseId == null)
      )
    : [];

  if (serviceFeeDocs.length !== uniqueServiceFeeIds.length) {
    throw new BadRequest(
      "One or more selected service fees are invalid for this warehouse or module"
    );
  }

  const appliedServiceFees = serviceFeeDocs.map((fee: any) => {
    const calculatedAmount =
      fee.type === "percentage"
        ? roundCurrency((subtotal * Number(fee.amount || 0)) / 100)
        : roundCurrency(Number(fee.amount || 0));

    return {
      service_fee_id: fee._id,
      title: fee.title,
      type: fee.type,
      rate: Number(fee.amount || 0),
      amount: calculatedAmount,
      module: fee.module,
      warehouseId: fee.warehouseId || null,
    };
  });

  const serviceFeeTotal = roundCurrency(
    appliedServiceFees.reduce((sum: any, fee: any) => sum + fee.amount, 0)
  );
  const taxAmountCalc = (subtotal * Number(tax_rate)) / 100;
  const finalGrandTotal =
    subtotal +
    serviceFeeTotal +
    taxAmountCalc +
    Number(shipping) -
    Number(discount);

  if (finalGrandTotal <= 0) {
    throw new BadRequest("Grand total must be greater than 0");
  }

  // ═══════════════════════════════════════════════════════════
  // Customer Validation
  // ═══════════════════════════════════════════════════════════
  let customer: any = null;
  if (customer_id) {
    customer = await CustomerModel.findById(customer_id);
    if (!customer) {
      throw new NotFound("Customer not found");
    }
  }

  if (isDue && !customer) {
    throw new BadRequest("Customer is required for due sales");
  }

  // ═══════════════════════════════════════════════════════════
  // Financials Validation
  // ═══════════════════════════════════════════════════════════
  type FinancialLine = { account_id: string; amount: number };
  let paymentLines: FinancialLine[] = [];
  let totalPaidFromLines = 0;

  if (!isPending && !isDue) {
    const finArr = financials as any[];

    if (!finArr || !Array.isArray(finArr) || finArr.length === 0) {
      throw new BadRequest(
        "Financials are required for completed sale (order_pending = 0)"
      );
    }

    paymentLines = finArr.map((f: any) => {
      const accId = f.account_id || f.id;
      const amt = Number(f.amount);

      if (!accId) {
        throw new BadRequest("Invalid account_id in financials");
      }
      if (!amt || amt <= 0) {
        throw new BadRequest("Each payment line must have amount > 0");
      }

      return { account_id: accId, amount: amt };
    });

    totalPaidFromLines = paymentLines.reduce((sum, p) => sum + p.amount, 0);

    const tolerance = 0.01;
    if (Math.abs(totalPaidFromLines - finalGrandTotal) > tolerance) {
      throw new BadRequest(
        `Sum of payments (${totalPaidFromLines.toFixed(
          2
        )}) must equal grand_total (${finalGrandTotal.toFixed(2)})`
      );
    }

    for (const line of paymentLines) {
      const bankAccount = await BankAccountModel.findOne({
        _id: line.account_id,
        warehouseId: { $contains: warehouseId },
        status: true,
        in_POS: true,
      });
      
      if (!bankAccount) {
        throw new BadRequest(
          "One of the financial accounts is not valid or not allowed in POS"
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Coupon, Tax, Discount, Gift Card Validations
  // ═══════════════════════════════════════════════════════════
  let coupon: any = null;
  if (coupon_code) {
    coupon = await CouponModel.findOne({ coupon_code: coupon_code });
    if (!coupon) throw new NotFound("Coupon not found");
    if (coupon.available <= 0) throw new BadRequest("Coupon is out of stock");
    if (coupon.expired_date && coupon.expired_date < new Date()) {
      throw new BadRequest("Coupon is expired");
    }
  }

  let tax: any = null;
  if (order_tax) {
    tax = await TaxesModel.findById(order_tax);
    if (!tax) throw new NotFound("Tax not found");
    if (!tax.status) throw new BadRequest("Tax is not active");
  }

  let discountDoc: any = null;
  if (order_discount) {
    discountDoc = await DiscountModel.findById(order_discount);
    if (!discountDoc) throw new NotFound("Discount not found");
    if (!discountDoc.status) throw new BadRequest("Discount is not active");
  }

  let giftCard: any = null;
  if (gift_card_id) {
    giftCard = await GiftCardModel.findById(gift_card_id);
    if (!giftCard) throw new NotFound("Gift card not found");
    if (!giftCard.status) throw new BadRequest("Gift card is not active");
    if (giftCard.expired_date && giftCard.expired_date < new Date()) {
      throw new BadRequest("Gift card is expired");
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ STOCK VALIDATION FOR PRODUCTS
  // ═══════════════════════════════════════════════════════════
  for (const p of processedProducts) {
    const { product_price_id, product_id, quantity } = p;

    if (product_price_id) {
      const priceDoc = await ProductPriceModel.findById(product_price_id);
      if (!priceDoc) {
        throw new NotFound("Product price (variation) not found");
      }

      // ✅ التحقق من المخزن (warehouse-specific) بدل الكمية العامة
      const variationWarehouseStock = await Product_WarehouseModel.findOne({
        productId: product_id,
        productPriceId: product_price_id,
        warehouseId: warehouseId,
      });

      if (!variationWarehouseStock) {
        throw new BadRequest(`Product variation is not assigned to warehouse`);
      }

      if ((variationWarehouseStock.quantity ?? 0) < quantity) {
        throw new BadRequest(
          `Not enough stock for variation in warehouse, available: ${
            variationWarehouseStock.quantity ?? 0
          }, required: ${quantity}`
        );
      }
    } else {
      const warehouseStock = await Product_WarehouseModel.findOne({
        productId: product_id,
        warehouseId: warehouseId,
      });

      if (!warehouseStock) {
        throw new BadRequest(
          `Product ${product_id} is not assigned to warehouse ${warehouseId}`
        );
      }

      if ((warehouseStock.quantity ?? 0) < quantity) {
        throw new BadRequest(
          `Not enough stock in warehouse, available: ${
            warehouseStock.quantity ?? 0
          }, required: ${quantity}`
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CREATE SALE
  // ═══════════════════════════════════════════════════════════
  const accountIdsForSale =
    !isPending && !isDue && paymentLines.length > 0
      ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
      : [];

  const paidAmountForDb = !isPending && !isDue ? totalPaidFromLines : 0;
  const remainingAmount = isDue ? finalGrandTotal : 0;

  const sale = await SaleModel.create({
    date: new Date(),
    customer_id: customer ? customer._id : undefined,
    Due_customer_id: isDue && customer ? customer._id : undefined,
    Due: isDue ? 1 : 0,
    warehouse_id: warehouseId,
    account_id: accountIdsForSale,
    order_pending: normalizedOrderPending,
    coupon_code: coupon ? coupon.coupon_code : "",
    applied_coupon: coupon ? true : false,
    gift_card_id: giftCard ? giftCard._id : undefined,
    order_tax: tax ? tax._id : undefined,
    order_discount: discountDoc ? discountDoc._id : undefined,
    service_fees: appliedServiceFees,
    service_fee_total: serviceFeeTotal,
    shipping,
    tax_rate,
    tax_amount: taxAmountCalc,
    discount,
    total: subtotal,
    grand_total: finalGrandTotal,
    paid_amount: paidAmountForDb,
    remaining_amount: remainingAmount,
    note,
    cashier_id: cashierId,
    shift_id: openShift._id,
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE PRODUCT SALES
  // ═══════════════════════════════════════════════════════════
  for (const p of processedProducts) {
    await ProductSalesModel.create({
      sale_id: sale._id,
      product_id: p.product_id,
      bundle_id: undefined,
      product_price_id: p.product_price_id,
      quantity: p.quantity,
      price: p.price,
      subtotal: p.subtotal,
      original_price: p.original_price,
      discount: p.discount,
      discount_type: p.discount_type,
      options_id: p.options_id,
      isGift: !!p.isGift,
      isBundle: false,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ CREATE BUNDLE SALES (الجديد)
  // ═══════════════════════════════════════════════════════════
  for (const b of processedBundles) {
    await ProductSalesModel.create({
      sale_id: sale._id,
      product_id: undefined,
      bundle_id: b.bundle_id,
      product_price_id: undefined,
      quantity: b.quantity,
      price: b.price,
      subtotal: b.subtotal,
      original_price: b.original_price,
      discount: b.discount,
      discount_type: b.discount_type,
      options_id: [],
      isGift: !!b.isGift,
      isBundle: true,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ STOCK DEDUCTION & PAYMENTS
  // ═══════════════════════════════════════════════════════════
  if (!isPending) {
    // Payment Processing
    if (!isDue && paymentLines.length > 0) {
      await PaymentModel.create({
        sale_id: sale._id,
        financials: paymentLines.map((p) => ({
          account_id: p.account_id,
          amount: p.amount,
        })),
      });

      for (const line of paymentLines) {
        const account = BankAccountModel.findById(line.account_id);

        if (!account) {
          throw new NotFound("Bank account not found");
        }

        BankAccountModel.updateById(account._id, {
          balance: account.balance + line.amount,
        });
      }
    }

    // ✅ خصم كميات المنتجات العادية
    for (const p of processedProducts) {
      if (p.product_price_id) {
        // Product warehouse variation quantity
        const productWarehouse = Product_WarehouseModel.findOne({
          productId: p.product_id,
          productPriceId: p.product_price_id,
          warehouseId,
        });

        if (productWarehouse) {
          Product_WarehouseModel.updateById(productWarehouse._id, {
            quantity: productWarehouse.quantity - p.quantity,
          });
        }

        // Product price quantity
        const productPrice = ProductPriceModel.findById(p.product_price_id);

        if (productPrice) {
          ProductPriceModel.updateById(productPrice._id, {
            quantity: productPrice.quantity - p.quantity,
          });
        }

        // Warehouse stock quantity
        const warehouse = WarehouseModel.findById(warehouseId);

        if (warehouse) {
          WarehouseModel.updateById(warehouse._id, {
            stock_Quantity: warehouse.stock_Quantity - p.quantity,
          });
        }
      } else if (p.product_id) {
        // Product warehouse quantity
        const productWarehouse = Product_WarehouseModel.findOne({
          productId: p.product_id,
          warehouseId,
        });

        if (productWarehouse) {
          Product_WarehouseModel.updateById(productWarehouse._id, {
            quantity: productWarehouse.quantity - p.quantity,
          });
        }

        // Warehouse stock quantity
        const warehouse = WarehouseModel.findById(warehouseId);

        if (warehouse) {
          WarehouseModel.updateById(warehouse._id, {
            stock_Quantity: warehouse.stock_Quantity - p.quantity,
          });
        }

        // Product quantity
        const product = ProductModel.findById(p.product_id);

        if (product) {
          ProductModel.updateById(product._id, {
            quantity: product.quantity - p.quantity,
          });
        }
      }
    }

    // ✅ خصم كميات الـ Bundles (الجديد)
    for (const b of processedBundles) {
      for (const bp of b.products) {
        const deductQty = b.quantity * bp.quantity;

        if (bp.productPriceId) {
          // Product warehouse variation quantity
          const productWarehouse = Product_WarehouseModel.findOne({
            productId: bp.productId,
            productPriceId: bp.productPriceId,
            warehouseId,
          });

          if (productWarehouse) {
            Product_WarehouseModel.updateById(productWarehouse._id, {
              quantity: productWarehouse.quantity - deductQty,
            });
          }

          // Variation quantity
          const productPrice = ProductPriceModel.findById(bp.productPriceId);

          if (productPrice) {
            ProductPriceModel.updateById(productPrice._id, {
              quantity: productPrice.quantity - deductQty,
            });
          }

          // Warehouse stock
          const warehouse = WarehouseModel.findById(warehouseId);

          if (warehouse) {
            WarehouseModel.updateById(warehouse._id, {
              stock_Quantity: warehouse.stock_Quantity - deductQty,
            });
          }
        } else {
          // Product warehouse quantity
          const productWarehouse = Product_WarehouseModel.findOne({
            productId: bp.productId,
            warehouseId,
          });

          if (productWarehouse) {
            Product_WarehouseModel.updateById(productWarehouse._id, {
              quantity: productWarehouse.quantity - deductQty,
            });
          }

          // Warehouse stock
          const warehouse = WarehouseModel.findById(warehouseId);

          if (warehouse) {
            WarehouseModel.updateById(warehouse._id, {
              stock_Quantity: warehouse.stock_Quantity - deductQty,
            });
          }

          // Product quantity
          const product = ProductModel.findById(bp.productId);

          if (product) {
            ProductModel.updateById(product._id, {
              quantity: product.quantity - deductQty,
            });
          }
        }
      }
    }

    // Coupon Update
    if (!isDue && coupon) {
      const couponDoc = CouponModel.findById(coupon._id);

      if (couponDoc) {
        CouponModel.updateById(couponDoc._id, {
          available: couponDoc.available - 1,
        });
      }
    }

    // Gift Card Update
    if (!isDue && giftCard && totalPaidFromLines > 0) {
      const giftCardDoc = GiftCardModel.findById(giftCard._id);

      if (giftCardDoc) {
        GiftCardModel.updateById(giftCardDoc._id, {
          amount: giftCardDoc.amount - totalPaidFromLines,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FETCH FULL SALE DATA
  // ═══════════════════════════════════════════════════════════
  // ✅ manual populate
  const saleRaw = SaleModel.findById(sale._id);
  if (!saleRaw) {
    throw new NotFound("Sale not found after creation");
  }

  const customerPop = saleRaw.customer_id
    ? CustomerModel.findById(saleRaw.customer_id)
    : null;

  const dueCustomerPop = saleRaw.Due_customer_id
    ? CustomerModel.findById(saleRaw.Due_customer_id)
    : null;

  const warehousePop = saleRaw.warehouse_id
    ? WarehouseModel.findById(saleRaw.warehouse_id)
    : null;

  const taxPop = saleRaw.order_tax
    ? TaxesModel.findById(saleRaw.order_tax)
    : null;

  const discountPop = saleRaw.order_discount
    ? DiscountModel.findById(saleRaw.order_discount)
    : null;

  const giftCardPop = saleRaw.gift_card_id
    ? GiftCardModel.findById(saleRaw.gift_card_id)
    : null;

  // ⚠️ swap in whatever model actually represents "cashier_id" users (Cashierman? User?)
  const cashierPop = saleRaw.cashier_id
    ? UserModel.findById(saleRaw.cashier_id)
    : null;

  const shiftPop = saleRaw.shift_id
    ? CashierShift.findById(saleRaw.shift_id)
    : null;

  // account_id is an array of ids on this model
  const accountsPop = Array.isArray(saleRaw.account_id)
    ? saleRaw.account_id
        .map((id: string) => BankAccountModel.findById(id))
        .filter(Boolean)
    : [];

  const fullSale = {
    ...saleRaw,
    customer_id: customerPop
      ? {
          _id: customerPop._id,
          name: customerPop.name,
          email: customerPop.email,
          phone_number: customerPop.phone_number,
        }
      : null,
    Due_customer_id: dueCustomerPop
      ? {
          _id: dueCustomerPop._id,
          name: dueCustomerPop.name,
          email: dueCustomerPop.email,
          phone_number: dueCustomerPop.phone_number,
        }
      : null,
    warehouse_id: warehousePop
      ? {
          _id: warehousePop._id,
          name: warehousePop.name,
          location: warehousePop.location,
        }
      : null,
    order_tax: taxPop
      ? {
          _id: taxPop._id,
          name: taxPop.name,
          amount: taxPop.amount,
          type: taxPop.type,
        }
      : null,
    order_discount: discountPop
      ? {
          _id: discountPop._id,
          name: discountPop.name,
          amount: discountPop.amount,
          type: discountPop.type,
        }
      : null,
    gift_card_id: giftCardPop
      ? {
          _id: giftCardPop._id,
          code: giftCardPop.code,
          amount: giftCardPop.amount,
        }
      : null,
    cashier_id: cashierPop
      ? { _id: cashierPop._id, name: cashierPop.name, email: cashierPop.email }
      : null,
    shift_id: shiftPop
      ? {
          _id: shiftPop._id,
          start_time: shiftPop.start_time,
          status: shiftPop.status,
        }
      : null,
    account_id: accountsPop.map((a: any) => ({
      _id: a._id,
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
  };

  const items = ProductSalesModel.find({
    sale_id: sale._id,
  });

  const fullItems = items.map((item) => {
    const product = ProductModel.findById(item.product_id);

    const productPrice = ProductPriceModel.findById(item.product_price_id);

    const bundle = PandelModel.findById(item.bundle_id);

    return {
      ...item,

      product_id: product
        ? {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            image: product.image,
            price: product.price,
            whole_price: product.whole_price,
            start_quantaty: product.start_quantaty,
          }
        : null,

      product_price_id: productPrice
        ? {
            _id: productPrice._id,
            price: productPrice.price,
            code: productPrice.code,
            quantity: productPrice.quantity,
          }
        : null,

      bundle_id: bundle
        ? {
            _id: bundle._id,
            name: bundle.name,
            price: bundle.price,
          }
        : null,
    };
  });

  const formattedItems = fullItems.map((item: any) => {
    if (item.isGift) {
      const { price, subtotal, ...rest } = item;
      return rest;
    }
    return item;
  });

  // ═══════════════════════════════════════════════════════════
  // ✅ الجديد: جلب بيانات الكاشير (إعدادات الطابعة) بناءً على الماكينة المرتبطة بالشيفت
  // ═══════════════════════════════════════════════════════════
  const currentMachineId = openShift.cashier_id;
  const cashierMachine = await CashierModel.findById(currentMachineId);

  let printerSettings = null;
  if (cashierMachine) {
    printerSettings = {
      printer_type: cashierMachine.printer_type || "USB",
      printer_IP: cashierMachine.printer_IP || null,
      printer_port: cashierMachine.printer_port || null,
      Printer_name: cashierMachine.Printer_name || null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // إرجاع الاستجابة النهائية
  // ═══════════════════════════════════════════════════════════
  // ✅ جيب بيانات المحل بشكل ديناميكي من اليوزر اللي عامل login
  const storeInfo = await getStoreInfo(cashierId);

  return SuccessResponse(res, {
    message: isDue
      ? `Due sale created. Amount owed: ${remainingAmount}`
      : "Sale created successfully",

    // ✅ بيانات المحل ديناميكية حسب اليوزر اللي عامل login
    store: storeInfo,

    // ✅ الجديد: إعدادات الطابعة
    printer_settings: printerSettings,

    // الباقي زي ما هو بالظبط
    sale: fullSale,
    items: formattedItems,
    service_fees: appliedServiceFees,
    wholesale_applied: processedProducts.some((p) => p.is_wholesale),
    pricing_details: {
      products_total: productsTotal,
      bundles_total: bundlesTotal,
      subtotal: subtotal,
      service_fee_total: serviceFeeTotal,
      tax_amount: taxAmountCalc,
      shipping: Number(shipping),
      discount: Number(discount),
      grand_total: finalGrandTotal,
    },
  });
};

export const getAllSales = async (req: Request, res: Response) => {
  const sales = SaleModel.find({
    order_pending: 0,
  })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((sale) => {
      const customer = CustomerModel.findById(sale.customer_id);

      const dueCustomer = CustomerModel.findById(sale.Due_customer_id);

      const warehouse = WarehouseModel.findById(sale.warehouse_id);

      const cashier = UserModel.findById(sale.cashier_id);

      return {
        reference: sale.reference,

        grand_total: sale.grand_total,

        service_fee_total: sale.service_fee_total,

        paid_amount: sale.paid_amount,

        remaining_amount: sale.remaining_amount,

        Due: sale.Due,

        order_pending: sale.order_pending,

        date: sale.date,

        createdAt: sale.createdAt,

        customer_id: customer
          ? {
              _id: customer._id,
              name: customer.name,
            }
          : null,

        Due_customer_id: dueCustomer
          ? {
              _id: dueCustomer._id,
              name: dueCustomer.name,
            }
          : null,

        warehouse_id: warehouse
          ? {
              _id: warehouse._id,
              name: warehouse.name,
            }
          : null,

        cashier_id: cashier
          ? {
              _id: cashier._id,
              name: cashier.name,
            }
          : null,
      };
    });

  SuccessResponse(res, {
    sales,
  });
};

export const getSales = async (req: Request, res: Response) => {
  const { id } = req.params;

  const sale = await SaleModel.findById(id)
    .populate("customer_id", "name email phone_number")
    .populate("Due_customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name amount type")
    .populate("order_discount", "name amount type")
    .populate("gift_card_id", "code amount")
    .populate("cashier_id", "name email")
    .populate("shift_id", "start_time status")
    .populate("account_id", "name type balance")
    .lean();

  if (!sale) {
    throw new NotFound("Sale not found");
  }

  const prods = ProductSalesModel.find({
    sale_id: sale._id,
  });

  const items = prods.map((item) => {
    const product = ProductModel.findById(item.product_id);

    const productPrice = ProductPriceModel.findById(item.product_price_id);

    const bundle = PandelModel.findById(item.bundle_id);

    return {
      ...item,

      product_id: product
        ? {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            image: product.image,
            price: product.price,
          }
        : null,

      product_price_id: productPrice
        ? {
            _id: productPrice._id,
            price: productPrice.price,
            code: productPrice.code,
            quantity: productPrice.quantity,
          }
        : null,

      bundle_id: bundle
        ? {
            _id: bundle._id,
            name: bundle.name,
            price: bundle.price,
          }
        : null,
    };
  });

  // ✅ إخفاء السعر للهدايا فقط
  const processedItems = items.map((item: any) => {
    if (item.isGift) {
      if (item.product_id && !item.isBundle) {
        return {
          ...item,
          price: null,
          subtotal: null,
          discount: null,
          original_price: null,
          product_id: { ...item.product_id, price: null },
          product_price_id: item.product_price_id
            ? { ...item.product_price_id, price: null }
            : null,
          options_id:
            item.options_id?.map((opt: any) => ({ ...opt, price: null })) || [],
        };
      }

      if (item.bundle_id && item.isBundle) {
        return {
          ...item,
          price: null,
          subtotal: null,
          discount: null,
          original_price: null,
          bundle_id: { ...item.bundle_id, price: null },
        };
      }
    }
    return item;
  });

  SuccessResponse(res, { sale, items: processedItems });
};

export const getsalePending = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // ✅ هات الشيفت المفتوح الحالي (findOne is sync in this ORM, no await needed)
  const openShift = CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  });

  if (!openShift) {
    return SuccessResponse(res, { sales: [] });
  }

  const rawSales = SaleModel.find({
    order_pending: 1,
    shift_id: openShift._id,
    cashier_id: cashierId,
    warehouse_id: warehouseId,
  });

  if (!rawSales.length) {
    return SuccessResponse(res, { sales: [] });
  }

  // Array.prototype.sort works fine since find() returns a real array
  rawSales.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sales = rawSales.map((sale: any) => {
    const customer = CustomerModel.findById(sale.customer_id);
    const warehouse = WarehouseModel.findById(sale.warehouse_id);
    const tax = TaxesModel.findById(sale.order_tax);
    const discount = DiscountModel.findById(sale.order_discount);
    const giftCard = GiftCardModel.findById(sale.gift_card_id);

    return {
      ...sale,

      customer_id: customer
        ? {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone_number: customer.phone_number,
          }
        : null,

      warehouse_id: warehouse
        ? {
            _id: warehouse._id,
            name: warehouse.name,
            location: warehouse.location,
          }
        : null,

      order_tax: tax
        ? {
            _id: tax._id,
            name: tax.name,
            rate: tax.rate,
          }
        : null,

      order_discount: discount
        ? {
            _id: discount._id,
            name: discount.name,
            rate: discount.rate,
          }
        : null,

      gift_card_id: giftCard
        ? {
            _id: giftCard._id,
            code: giftCard.code,
            amount: giftCard.amount,
          }
        : null,
    };
  });

  const saleIds = sales.map((s: any) => s._id);

  // ✅ push the filter into SQL instead of find({}) + JS filter
  const items = ProductSalesModel.find({
    sale_id: { $in: saleIds },
  }).map((item: any) => {
    const product = ProductModel.findById(item.product_id);
    const productPrice = ProductPriceModel.findById(item.product_price_id);
    const bundle = PandelModel.findById(item.bundle_id);

    return {
      ...item,

      product_id: product
        ? {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            image: product.image,
            price: product.price,
          }
        : null,

      product_price_id: productPrice
        ? {
            _id: productPrice._id,
            price: productPrice.price,
            code: productPrice.code,
          }
        : null,

      bundle_id: bundle
        ? {
            _id: bundle._id,
            name: bundle.name,
            price: bundle.price,
          }
        : null,
    };
  });

  const itemsBySaleId: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.sale_id;
    if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
    itemsBySaleId[key].push(item);
  }

  const salesWithItems = sales.map((s: any) => ({
    ...s,
    items: itemsBySaleId[s._id] || [],
  }));

  return SuccessResponse(res, { sales: salesWithItems });
};

export const getShiftCompletedSales = async (req: Request, res: Response) => {
  const { password } = req.body;
  const jwtUser = req.user as any;

  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const userId = jwtUser.id;

  // 1) هات اليوزر (مع الباسورد عشان نقدر نشيك الحقيقي)
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFound("User not found");

  const fakePassword = process.env.SHIFT_REPORT_PASSWORD;

  let mode: "real" | "fake" | null = null;

  // 👇 الأول: جرّب الباسورد الحقيقي
  if (password && (await bcrypt.compare(password, user.password_hash))) {
    mode = "real";
  } else if (fakePassword && password === fakePassword) {
    // تاني: جرّب الباسورد الفيك من الـ env
    mode = "fake";
  }

  if (!mode) {
    throw new BadRequest("Wrong password");
  }

  // 2) آخر شيفت مفتوح لليوزر ده
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  })

  if (!shift) throw new NotFound("No open cashier shift found");

  // 3) كل المبيعات الـ completed في الشيفت ده
  const sales = SaleModel.find({
    order_pending: 0,
    shift_id: shift._id,
    cashier_id: user._id,
  }).map((sale) => {
    const customer = CustomerModel.findById(sale.customer_id);

    const warehouse = WarehouseModel.findById(sale.warehouse_id);

    const tax = TaxesModel.findById(sale.order_tax);

    const discount = DiscountModel.findById(sale.order_discount);

    const giftCard = GiftCardModel.findById(sale.gift_card_id);

    return {
      ...sale,

      customer_id: customer
        ? {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone_number: customer.phone_number,
          }
        : null,

      warehouse_id: warehouse
        ? {
            _id: warehouse._id,
            name: warehouse.name,
            location: warehouse.location,
          }
        : null,

      order_tax: tax
        ? {
            _id: tax._id,
            name: tax.name,
            rate: tax.rate,
          }
        : null,

      order_discount: discount
        ? {
            _id: discount._id,
            name: discount.name,
            rate: discount.rate,
          }
        : null,

      gift_card_id: giftCard
        ? {
            _id: giftCard._id,
            code: giftCard.code,
            amount: giftCard.amount,
          }
        : null,
    };
  });

  if (!sales.length) {
    return SuccessResponse(res, {
      message: "No completed sales in this shift",
      mode,
      shift,
      sales: [],
    });
  }

  const saleIds = sales.map((s: any) => s._id);

  const items = ProductSalesModel.find({})
    .filter((item) => saleIds.includes(item.sale_id))
    .map((item) => {
      const product = ProductModel.findById(item.product_id);

      const productPrice = ProductPriceModel.findById(item.product_price_id);

      const bundle = PandelModel.findById(item.bundle_id);

      return {
        ...item,

        product_id: product
          ? {
              _id: product._id,
              name: product.name,
              ar_name: product.ar_name,
              image: product.image,
              price: product.price,
            }
          : null,

        product_price_id: productPrice
          ? {
              _id: productPrice._id,
              price: productPrice.price,
              code: productPrice.code,
            }
          : null,

        bundle_id: bundle
          ? {
              _id: bundle._id,
              name: bundle.name,
              price: bundle.price,
            }
          : null,
      };
    });

  const itemsBySaleId: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.sale_id.toString();
    if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
    itemsBySaleId[key].push(item);
  }

  const salesWithItems = sales.map((s: any) => ({
    ...s,
    items: itemsBySaleId[s._id.toString()] || [],
  }));

  // 4) لو mode = fake → رجّع 20% بس من الأوردرات
  if (mode === "fake") {
    const percentage = 0.2;
    const totalCount = salesWithItems.length;
    const sampleCount = Math.max(1, Math.floor(totalCount * percentage));

    const shuffled = [...salesWithItems].sort(() => 0.5 - Math.random());
    const sampledSales = shuffled.slice(0, sampleCount);

    return SuccessResponse(res, {
      message: "Completed sales sample for current shift",
      shift,
      total_sales_in_shift: totalCount,
      sampled_percentage: 20,
      sales: sampledSales,
    });
  }

  // 5) لو mode = real → رجّع كل الأوردرات
  return SuccessResponse(res, {
    message: "Completed sales for current shift",
    shift,
    sales: salesWithItems,
  });
};

export const getSalePendingById = async (req: Request, res: Response) => {
  const { sale_id } = req.params;

  const sale = await SaleModel.findOne({
    _id: sale_id,
    order_pending: { $in: [1, "1", true] },
  })
    .populate("customer_id", "name email phone_number address")
    .populate("warehouse_id", "name ar_name")
    .populate("cashier_id", "name email")
    .populate("gift_card_id", "code balance")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name discount_type discount_value")
    .lean();

  if (!sale) {
    throw new NotFound("Pending sale not found");
  }

  const items = ProductSalesModel.find({
    sale_id: sale._id,
  }).map((item) => {
    // Product
    const product = ProductModel.findById(item.product_id);

    let fullProduct = null;

    if (product) {
      const category = CategoryModel.findById(product.categoryId);

      const brand = PandelModel.findById(product.brandId);

      fullProduct = {
        _id: product._id,
        name: product.name,
        ar_name: product.ar_name,
        image: product.image,
        price: product.price,
        code: product.code,
        quantity: product.quantity,

        categoryId: category
          ? {
              _id: category._id,
              name: category.name,
              ar_name: category.ar_name,
            }
          : null,

        brandId: brand
          ? {
              _id: brand._id,
              name: brand.name,
              ar_name: brand.ar_name,
            }
          : null,
      };
    }

    // Product Price
    const productPrice = ProductPriceModel.findById(item.product_price_id);

    let fullProductPrice = null;

    if (productPrice) {
      const priceProduct = ProductModel.findById(productPrice.productId);

      fullProductPrice = {
        _id: productPrice._id,
        price: productPrice.price,
        code: productPrice.code,
        quantity: productPrice.quantity,
        options: productPrice.options,

        productId: priceProduct
          ? {
              _id: priceProduct._id,
              name: priceProduct.name,
              ar_name: priceProduct.ar_name,
              image: priceProduct.image,
            }
          : null,
      };
    }

    // Bundle
    const bundle = PandelModel.findById(item.bundle_id);

    let fullBundle = null;

    if (bundle) {
      const products = (bundle.productsId || []).map((productId: string) => {
        const product = ProductModel.findById(productId);

        return product
          ? {
              _id: product._id,
              name: product.name,
              ar_name: product.ar_name,
              price: product.price,
            }
          : null;
      });

      fullBundle = {
        _id: bundle._id,
        name: bundle.name,
        ar_name: bundle.ar_name,
        price: bundle.price,
        productsId: products,
      };
    }

    return {
      ...item,

      product_id: fullProduct,

      product_price_id: fullProductPrice,

      bundle_id: fullBundle,
    };
  });

  const products: any[] = [];
  const bundles: any[] = [];

  for (const item of items) {
    if (item.isBundle) {
      bundles.push({
        _id: item._id,
        bundle: item.bundle_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
      });
    } else {
      products.push({
        _id: item._id,
        product: item.product_id,
        product_price: item.product_price_id,
        options: item.options_id || [],
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
      });
    }
  }

  const payloadForCreateSale = {
    customer_id: (sale.customer_id as any)?._id || null,
    order_pending: 0,
    coupon_code: sale.coupon_code || "",
    applied_coupon: sale.applied_coupon || false,
    gift_card_id: (sale.gift_card_id as any)?._id || null,
    tax_id: (sale.order_tax as any)?._id || null,
    discount_id: (sale.order_discount as any)?._id || null,
    shipping: sale.shipping || 0,
    tax_rate: sale.tax_rate || 0,
    tax_amount: sale.tax_amount || 0,
    service_fee_total: sale.service_fee_total || 0,
    service_fees: sale.service_fees || [],
    discount: sale.discount || 0,
    total: sale.total || sale.grand_total,
    grand_total: sale.grand_total,
    note: sale.note || "",
    products: products.map((p) => ({
      product_id: p.product?._id,
      product_price_id: p.product_price?._id,
      quantity: p.quantity,
      price: p.price,
      subtotal: p.subtotal,
      isGift: p.isGift,
      options_id: p.options?.map((opt: any) => opt._id) || [],
    })),
    bundles: bundles.map((b) => ({
      bundle_id: b.bundle?._id,
      quantity: b.quantity,
      price: b.price,
      subtotal: b.subtotal,
      isGift: b.isGift,
    })),
  };

  return SuccessResponse(res, {
    sale: {
      _id: sale._id,
      reference: sale.reference,
      date: sale.date,
      subtotal: sale.total,
      tax_amount: sale.tax_amount,
      tax_rate: sale.tax_rate,
      discount: sale.discount,
      shipping: sale.shipping,
      grand_total: sale.grand_total,
      note: sale.note,
      order_pending: sale.order_pending,
      customer: sale.customer_id || null,
      warehouse: sale.warehouse_id || null,
      cashier: sale.cashier_id || null,
      coupon_code: sale.coupon_code || "",
      applied_coupon: sale.applied_coupon || false,
      gift_card: sale.gift_card_id || null,
      tax: sale.order_tax || null,
      discount_info: sale.order_discount || null,
      service_fees: sale.service_fees || [],
      service_fee_total: sale.service_fee_total || 0,
      created_at: sale.createdAt,
    },
    products,
    bundles,
    summary: {
      total_products: products.length,
      total_bundles: bundles.length,
      total_items: products.length + bundles.length,
      total_quantity: [...products, ...bundles].reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    },
    payloadForCreateSale,
  });
};

export const getDueSales = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  const dueSales = SaleModel.find({
    Due: 1,
    warehouse_id: warehouseId,
  })
    .filter((sale) => sale.remaining_amount > 0)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((sale) => {
      const dueCustomer = CustomerModel.findById(sale.Due_customer_id);

      const customer = CustomerModel.findById(sale.customer_id);

      return {
        ...sale,

        Due_customer_id: dueCustomer
          ? {
              _id: dueCustomer._id,
              name: dueCustomer.name,
              email: dueCustomer.email,
              phone_number: dueCustomer.phone_number,
            }
          : null,

        customer_id: customer
          ? {
              _id: customer._id,
              name: customer.name,
              email: customer.email,
              phone_number: customer.phone_number,
            }
          : null,
      };
    });

  const totalDue = dueSales.reduce(
    (sum: any, sale: any) => sum + (sale.remaining_amount || 0),
    0
  );

  return SuccessResponse(res, {
    message: "Due sales fetched successfully",
    count: dueSales.length,
    total_due: totalDue,
    sales: dueSales,
  });
};
// ═══════════════════════════════════════════════════════════
// PAY DUE
// ═══════════════════════════════════════════════════════════
export const payDue = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const { customer_id, amount, financials } = req.body;

  if (!customer_id) {
    throw new BadRequest("Valid customer_id is required");
  }

  if (!amount || Number(amount) <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }

  const paymentAmount = Number(amount);

  const customer = await CustomerModel.findById(customer_id);
  if (!customer) {
    throw new NotFound("Customer not found");
  }

  const dueSales = SaleModel.find({
    Due_customer_id: customer_id,
    Due: 1,
    warehouse_id: warehouseId,
  })
    .filter((sale) => sale.remaining_amount > 0)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  if (dueSales.length === 0) {
    throw new BadRequest("This customer has no pending dues");
  }

  const totalDue = dueSales.reduce(
    (sum: any, sale: any) => sum + (sale.remaining_amount || 0),
    0
  );

  if (paymentAmount > totalDue) {
    throw new BadRequest(
      `Payment amount (${paymentAmount}) exceeds total due (${totalDue})`
    );
  }

  if (!financials || !Array.isArray(financials) || financials.length === 0) {
    throw new BadRequest("Financials are required");
  }

  type FinancialLine = { account_id: string; amount: number };
  const paymentLines: FinancialLine[] = financials.map((f: any) => {
    const accId = f.account_id || f.id;
    const amt = Number(f.amount);

    if (!accId) {
      throw new BadRequest("Invalid account_id in financials");
    }
    if (!amt || amt <= 0) {
      throw new BadRequest("Each payment line must have amount > 0");
    }

    return { account_id: accId, amount: amt };
  });

  const totalFinancials = paymentLines.reduce((sum, p) => sum + p.amount, 0);

  if (Number(totalFinancials.toFixed(2)) !== Number(paymentAmount.toFixed(2))) {
    throw new BadRequest(
      `Sum of financials (${totalFinancials}) must equal amount (${paymentAmount})`
    );
  }

  for (const line of paymentLines) {
    const bankAccount = await BankAccountModel.findOne({
      _id: line.account_id,
      warehouseId: { $contains: warehouseId },
      status: true,
      in_POS: true,
    });

    if (!bankAccount) {
      throw new BadRequest(`Account ${line.account_id} is not valid for POS`);
    }
  }

  let remainingPayment = paymentAmount;
  const paidSales: Array<{
    sale_id: string;
    reference: string;
    paid_amount: number;
    was_remaining: number;
    now_remaining: number;
    is_fully_paid: boolean;
  }> = [];

  for (const sale of dueSales) {
    if (remainingPayment <= 0) break;

    const saleRemaining = sale.remaining_amount || 0;
    const payForThisSale = Math.min(remainingPayment, saleRemaining);

    const newPaidAmount = (sale.paid_amount || 0) + payForThisSale;
    const newRemainingAmount = saleRemaining - payForThisSale;
    const isFullyPaid = newRemainingAmount <= 0;

    const newAccountIds = [
      ...new Set([
        ...(sale.account_id || []).map(String),
        ...paymentLines.map((p) => p.account_id),
      ]),
    ];

    SaleModel.updateById(sale._id, {
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, newRemainingAmount),
      Due: isFullyPaid ? 0 : 1,
      Due_customer_id: isFullyPaid ? null : sale.Due_customer_id,
      account_id: newAccountIds,
    });

    await PaymentModel.create({
      sale_id: sale._id,
      financials: paymentLines.map((p) => ({
        account_id: p.account_id,
        amount: (p.amount / paymentAmount) * payForThisSale,
      })),
    });

    paidSales.push({
      sale_id: sale._id.toString(),
      reference: sale.reference || "",
      paid_amount: payForThisSale,
      was_remaining: saleRemaining,
      now_remaining: Math.max(0, newRemainingAmount),
      is_fully_paid: isFullyPaid,
    });

    remainingPayment -= payForThisSale;
  }

  for (const line of paymentLines) {
    const account = BankAccountModel.findById(line.account_id);

    if (!account) continue;

    BankAccountModel.updateById(line.account_id, {
      balance: (account.balance || 0) + line.amount,
    });
  }

  const remainingDues = await SaleModel.find({
    Due_customer_id: customer_id,
    Due: 1,
    remaining_amount: { $gt: 0 },
  });

  const newTotalDue = remainingDues.reduce(
    (sum: any, sale: any) => sum + (sale.remaining_amount || 0),
    0
  );

  return SuccessResponse(res, {
    message:
      newTotalDue === 0
        ? "All dues fully paid!"
        : `Payment successful. Remaining: ${newTotalDue}`,
    customer: {
      id: customer._id,
      name: customer.name,
    },
    payment_summary: {
      amount_paid: paymentAmount,
      previous_total_due: totalDue,
      current_total_due: newTotalDue,
      sales_affected: paidSales.length,
    },
    paid_sales: paidSales,
  });
};

export const applyCoupon = async (req: Request, res: Response) => {
  const { coupon_code, grand_total } = req.body;
  if (!coupon_code) throw new BadRequest("Please provide all required fields");
  const coupon = await CouponModel.findOne({ coupon_code });
  if (!coupon) throw new NotFound("Coupon not found");
  if (coupon.available <= 0) throw new BadRequest("Coupon is not available");
  if (coupon.expired_date < new Date())
    throw new BadRequest("Coupon is expired");
  if (
    coupon.minimum_amount_for_use > 0 &&
    coupon.minimum_amount_for_use > grand_total
  )
    throw new BadRequest("Coupon is not applicable for this sale");
  return SuccessResponse(res, {
    message: "Coupon applied successfully",
    coupon,
  });
};
