import { Request, Response } from "express";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { BadRequest } from "../Errors/BadRequest";
import { SaleModel, ProductSalesModel } from "../models/sale";
import { ProductPriceModel } from "../models/productPrice";
import { ReturnModel } from "../models/returnSale";
import { CashierShift } from "../models/cashierShift";
import { ProductModel } from "../models/product";
import { PandelModel } from "../models/pandel";
import { saveBase64Image } from "../utils/handleImages";
import { CategoryModel } from "../models/category";
import { BankAccountModel } from "../models/financialAccount";
import { BrandModel } from "../models/brand";
import { UserModel } from "../models/user";
import { CustomerModel } from "../models/customer";
// ═══════════════════════════════════════════════════════════
// GET SALE FOR RETURN
// ═══════════════════════════════════════════════════════════
export const getSaleForReturn = async (req: Request, res: Response) => {
  const { reference } = req.body;

  if (!reference) {
    throw new BadRequest("Sale reference is required");
  }

  let sale;

  if (!sale) {
    sale = await SaleModel.findOne({ reference: reference });
  }

  if (!sale) {
    throw new NotFound("Sale not found");
  }

  if (sale.order_pending === 1) {
    throw new BadRequest("Cannot return items from a pending sale");
  }

  const fullSale = await SaleModel.findById(sale._id)
    .populate("customer_id", "name email phone_number address")
    .populate("warehouse_id", "name ar_name")
    .populate("cashier_id", "name ar_name email") // ✅ الـ User اللي عمل البيع
    .populate({
      // ✅ الشيفت مع بيانات الكاشير والكاشير مان
      path: "shift_id",
      select: " cashierman_id cashier_id",
      populate: [
        {
          path: "cashierman_id",
          select: "username ",
          model: "User",
        },
        {
          path: "cashier_id",
          select: "name ar_name code location",
          model: "Cashier",
        },
      ],
    })
    .populate("gift_card_id", "code balance")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name discount_type discount_value")
    .lean();

  const saleItems = ProductSalesModel.find({
    sale_id: sale._id,
  }).map((item) => {
    // Product
    const product = ProductModel.findById(item.product_id);

    let productData = null;

    if (product) {
      const category = CategoryModel.findById(product.categoryId);

      const brand = BrandModel.findById(product.brandId);

      productData = {
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

    let productPriceData = null;

    if (productPrice) {
      const priceProduct = ProductModel.findById(productPrice.productId);

      productPriceData = {
        _id: productPrice._id,
        price: productPrice.price,
        code: productPrice.code,
        quantity: productPrice.quantity,

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

    const bundleData = bundle
      ? {
          _id: bundle._id,
          name: bundle.name,
          ar_name: bundle.ar_name,
          price: bundle.price,
        }
      : null;

    return {
      ...item,

      product_id: productData,

      product_price_id: productPriceData,

      bundle_id: bundleData,
    };
  });

  const previousReturns = ReturnModel.find({
    sale_id: sale._id,
  }).map((item) => {
    const account = BankAccountModel.findById(item.financial_account_id);

    return {
      ...item,

      financial_account_id: account
        ? {
            _id: account._id,
            name: account.name,
            ar_name: account.ar_name,
          }
        : null,
    };
  });

  const returnedQuantities: { [key: string]: number } = {};

  for (const ret of previousReturns) {
    for (const item of ret.items) {
      const key = item.product_price_id
        ? item.product_price_id.toString()
        : item.product_id
        ? item.product_id.toString()
        : item.bundle_id?.toString() || "";

      returnedQuantities[key] =
        (returnedQuantities[key] || 0) + item.returned_quantity;
    }
  }

  const itemsWithAvailable = saleItems.map((item: any) => {
    const key = item.product_price_id?._id
      ? item.product_price_id._id.toString()
      : item.product_id?._id
      ? item.product_id._id.toString()
      : item.bundle_id?._id?.toString() || "";

    const alreadyReturned = returnedQuantities[key] || 0;
    const availableToReturn = item.quantity - alreadyReturned;

    let productInfo = item.product_id || null;
    if (!productInfo && item.product_price_id?.productId) {
      productInfo = item.product_price_id.productId;
    }

    return {
      _id: item._id,
      sale_id: item.sale_id,
      product: productInfo,
      product_price: item.product_price_id || null,
      bundle: item.bundle_id || null,
      options: item.options_id || [],
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      isGift: item.isGift || false,
      isBundle: item.isBundle || false,
      already_returned: alreadyReturned,
      available_to_return: Math.max(0, availableToReturn),
    };
  });

  const totalReturnedAmount = previousReturns.reduce(
    (sum, ret: any) => sum + (ret.refund_amount || 0),
    0
  );

  const totalReturnedItems = previousReturns.reduce((sum, ret: any) => {
    return (
      sum +
      ret.items.reduce(
        (itemSum: number, item: any) => itemSum + item.returned_quantity,
        0
      )
    );
  }, 0);

  const saleData = fullSale as any;

  return SuccessResponse(res, {
    message: "Sale fetched successfully",
    sale: {
      _id: saleData?._id,
      reference: saleData?.reference,
      date: saleData?.date,
      total: saleData?.total,
      tax_amount: saleData?.tax_amount,
      tax_rate: saleData?.tax_rate,
      discount: saleData?.discount,
      shipping: saleData?.shipping,
      grand_total: saleData?.grand_total,
      paid_amount: saleData?.paid_amount,
      remaining_amount: saleData?.remaining_amount,
      note: saleData?.note,
      customer: saleData?.customer_id || null,
      warehouse: saleData?.warehouse_id || null,

      // ✅ الـ User اللي عمل البيع (من Sale مباشرة)
      created_by: saleData?.cashier_id || null,

      // ✅ بيانات الشيفت كاملة
      shift: saleData?.shift_id
        ? {
            _id: saleData.shift_id._id,
            start_time: saleData.shift_id.start_time,
            end_time: saleData.shift_id.end_time,
            status: saleData.shift_id.status,
            total_sale_amount: saleData.shift_id.total_sale_amount,
            // ✅ الـ User اللي شغال على الشيفت
            cashierman: saleData.shift_id.cashierman_id || null,
            // ✅ الكاشير (الجهاز/نقطة البيع)
            cashier: saleData.shift_id.cashier_id || null,
          }
        : null,

      coupon: saleData?.coupon_id || null,
      gift_card: saleData?.gift_card_id || null,
      tax: saleData?.order_tax || null,
      discount_info: saleData?.order_discount || null,
      created_at: saleData?.createdAt,
    },
    items: itemsWithAvailable,
    summary: {
      total_items: saleItems.length,
      total_quantity: saleItems.reduce(
        (sum, item: any) => sum + item.quantity,
        0
      ),
      total_available_to_return: itemsWithAvailable.reduce(
        (sum, item) => sum + item.available_to_return,
        0
      ),
      total_already_returned: totalReturnedItems,
    },
    previous_returns: previousReturns,
    previous_returns_count: previousReturns.length,
    total_returned_amount: totalReturnedAmount,
  });
};

// ═══════════════════════════════════════════════════════════
// CREATE RETURN
// ═══════════════════════════════════════════════════════════
export const createReturn = async (req: Request, res: Response) => {
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
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating a return"
    );
  }

  const {
    sale_id,
    items,
    reason, // 👈 reason للـ Return ككل
    note,
    // refund_account_id,
    image,
  } = req.body;

  if (!sale_id) {
    throw new BadRequest("sale_id is required");
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new BadRequest("At least one item is required for return");
  }

  const sale = await SaleModel.findById(sale_id);
  if (!sale) {
    throw new NotFound("Sale not found");
  }

  if (sale.order_pending === 1) {
    throw new BadRequest("Cannot return items from a pending sale");
  }

  if (sale.warehouse_id.toString() !== warehouseId) {
    throw new BadRequest("This sale belongs to a different warehouse");
  }

  const saleItems = ProductSalesModel.find({
    sale_id: sale._id,
  });

  const previousReturns = ReturnModel.find({
    sale_id: sale._id,
  });

  const returnedQuantities: { [key: string]: number } = {};
  for (const ret of previousReturns) {
    for (const item of ret.items) {
      const key = item.product_price_id
        ? item.product_price_id.toString()
        : item.product_id
        ? item.product_id.toString()
        : item.bundle_id?.toString() || "";

      returnedQuantities[key] =
        (returnedQuantities[key] || 0) + item.returned_quantity;
    }
  }

  const returnItems: Array<{
    product_id?: string;
    product_price_id?: string;
    bundle_id?: string;
    original_quantity: number;
    returned_quantity: number;
    price: number;
    subtotal: number;
  }> = [];

  let totalReturnAmount = 0;

  for (const item of items) {
    const {
      product_sale_id,
      product_id,
      product_price_id,
      bundle_id,
      quantity,
    } = item;

    if (!quantity || Number(quantity) <= 0) {
      throw new BadRequest("Return quantity must be greater than 0");
    }

    const returnQuantity = Number(quantity);

    let saleItem: any = null;

    if (product_sale_id) {
      saleItem = saleItems.find(
        (si: any) => si._id.toString() === product_sale_id
      );
    } else if (product_price_id) {
      saleItem = saleItems.find(
        (si: any) => si.product_price_id?.toString() === product_price_id
      );
    } else if (product_id) {
      saleItem = saleItems.find(
        (si: any) =>
          si.product_id?.toString() === product_id && !si.product_price_id
      );
    } else if (bundle_id) {
      saleItem = saleItems.find(
        (si: any) => si.bundle_id?.toString() === bundle_id
      );
    }

    if (!saleItem) {
      throw new BadRequest("One or more items not found in this sale");
    }

    const key = saleItem.product_price_id
      ? saleItem.product_price_id.toString()
      : saleItem.product_id
      ? saleItem.product_id.toString()
      : saleItem.bundle_id?.toString() || "";

    const alreadyReturned = returnedQuantities[key] || 0;
    const availableToReturn = saleItem.quantity - alreadyReturned;

    if (returnQuantity > availableToReturn) {
      throw new BadRequest(
        `Cannot return ${returnQuantity} items. Only ${availableToReturn} available for return.`
      );
    }

    const itemSubtotal = returnQuantity * saleItem.price;
    totalReturnAmount += itemSubtotal;

    returnItems.push({
      product_id: saleItem.product_id,
      product_price_id: saleItem.product_price_id,
      bundle_id: saleItem.bundle_id,
      original_quantity: saleItem.quantity,
      returned_quantity: returnQuantity,
      price: saleItem.price,
      subtotal: itemSubtotal,
    });
  }

  // if (refund_account_id) {
  //   if (!mongoose.Types.ObjectId.isValid(refund_account_id)) {
  //     throw new BadRequest("Invalid refund_account_id");
  //   }

  //   const bankAccount = await BankAccountModel.findOne({
  //     _id: refund_account_id,
  //     warehouseId: warehouseId,
  //     status: true,
  //   });

  //   if (!bankAccount) {
  //     throw new BadRequest("Refund account is not valid");
  //   }

  //   if (bankAccount.balance < totalReturnAmount) {
  //     throw new BadRequest(
  //       `Insufficient balance in refund account. Available: ${bankAccount.balance}, Required: ${totalReturnAmount}`
  //     );
  //   }
  // }

  let image_url = "";
  if (image) {
    image_url = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "return"
    );
  }

  const returnDoc = await ReturnModel.create({
    sale_id: sale._id,
    sale_reference: sale.reference,
    customer_id: sale.customer_id,
    warehouse_id: warehouseId,
    cashier_id: cashierId,
    shift_id: openShift._id,
    items: returnItems,
    total_amount: totalReturnAmount,
    // refund_account_id: refund_account_id,
    reason: reason || "", // 👈 reason للـ Return ككل
    note: note || "",
    image: image_url,
  });

  for (const item of returnItems) {
    if (item.product_price_id) {
      const productPrice = ProductPriceModel.findById(item.product_price_id);

      if (productPrice) {
        ProductPriceModel.updateById(item.product_price_id, {
          quantity: (productPrice.quantity || 0) + item.returned_quantity,
        });
      }
    } else if (item.product_id) {
      const product = ProductModel.findById(item.product_id);

      if (product) {
        ProductModel.updateById(item.product_id, {
          quantity: (product.quantity || 0) + item.returned_quantity,
        });
      }
    } else if (item.bundle_id) {
      const bundle = PandelModel.findById(item.bundle_id);

      if (bundle) {
        for (const productId of bundle.productsId || []) {
          const productPrice = ProductPriceModel.findById(productId);

          if (productPrice) {
            ProductPriceModel.updateById(productId, {
              quantity: (productPrice.quantity || 0) + item.returned_quantity,
            });
          }
        }
      }
    }
  }

  // if (refund_account_id) {
  //   await BankAccountModel.findByIdAndUpdate(refund_account_id, {
  //     $inc: { balance: -totalReturnAmount },
  //   });
  // }

  const fullReturn = await ReturnModel.findById(returnDoc._id)
    .populate("sale_id", "reference grand_total date")
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name")
    .populate("cashier_id", "name email")
    .populate("shift_id", "start_time status")
    .populate("refund_account_id", "name type balance")
    .populate({
      path: "items.product_id",
      select: "name ar_name image",
    })
    .populate({
      path: "items.product_price_id",
      select: "price code",
    })
    .populate({
      path: "items.bundle_id",
      select: "name price",
    })
    .lean();

  return SuccessResponse(res, {
    message: "Return created successfully",
    return: fullReturn,
  });
};

// ═══════════════════════════════════════════════════════════
// GET ALL RETURNS
// ═══════════════════════════════════════════════════════════
export const getAllReturns = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  const { page = 1, limit = 20, customer_id, from_date, to_date } = req.query;

  const query: any = { warehouse_id: warehouseId };

  if (customer_id) {
    query.customer_id = customer_id;
  }

  if (from_date || to_date) {
    query.date = {};
    if (from_date) {
      query.date.$gte = new Date(from_date as string);
    }
    if (to_date) {
      query.date.$lte = new Date(to_date as string);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  let returns = ReturnModel.find(query).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const start = skip;
  const end = skip + Number(limit);

  returns = returns.slice(start, end).map((item) => {
    const sale = SaleModel.findById(item.sale_id);

    const customer = CustomerModel.findById(item.customer_id);

    const cashier = UserModel.findById(item.cashier_id);

    return {
      ...item,

      sale_id: sale
        ? {
            _id: sale._id,
            reference: sale.reference,
            grand_total: sale.grand_total,
          }
        : null,

      customer_id: customer
        ? {
            _id: customer._id,
            name: customer.name,
            phone_number: customer.phone_number,
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

  const total = ReturnModel.count(query);

  const returnsTot = ReturnModel.find(query);

  const totalAmount = returnsTot.reduce(
    (sum, item) => sum + (item.total_amount || 0),
    0
  );

  return SuccessResponse(res, {
    message: "Returns fetched successfully",
    returns: returns,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: total,
      pages: Math.ceil(total / Number(limit)),
    },
    summary: {
      total_returns: total,
      total_amount: totalAmount[0]?.total || 0,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// GET RETURN BY ID
// ═══════════════════════════════════════════════════════════
export const getReturnById = async (req: Request, res: Response) => {
  const { return_id } = req.query;

  if (!return_id) {
    throw new BadRequest("return_id is required");
  }

  // Handle case where return_id might be an array (e.g., ?return_id=a&return_id=b)
  const returnIdStr = (
    Array.isArray(return_id) ? return_id[0] : return_id
  ) as string;

  let returnDoc;

  if (!returnDoc) {
    returnDoc = await ReturnModel.findOne({ reference: returnIdStr });
  }

  if (!returnDoc) {
    throw new NotFound("Return not found");
  }

  const fullReturn = await ReturnModel.findById(returnDoc._id)
    .populate("sale_id", "reference grand_total date paid_amount")
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("cashier_id", "name email")
    .populate("shift_id", "start_time status")
    .populate("refund_account_id", "name type")
    .populate({
      path: "items.product_id",
      select: "name ar_name image price",
    })
    .populate({
      path: "items.product_price_id",
      select: "price code",
    })
    .populate({
      path: "items.bundle_id",
      select: "name price",
    })
    .lean();

  return SuccessResponse(res, {
    message: "Return fetched successfully",
    return: fullReturn,
  });
};

// ═══════════════════════════════════════════════════════════
// GET SALE RETURNS
// ═══════════════════════════════════════════════════════════
export const getSaleReturns = async (req: Request, res: Response) => {
  const { sale_id } = req.query;

  if (!sale_id) {
    throw new BadRequest("sale_id is required");
  }

  // Handle case where sale_id might be an array (e.g., ?sale_id=a&sale_id=b)
  const saleIdStr = (Array.isArray(sale_id) ? sale_id[0] : sale_id) as string;

  let saleObjectId;

  const sale = SaleModel.findOne({ reference: saleIdStr });
  if (!sale) {
    throw new NotFound("Sale not found");
  }
  saleObjectId = sale._id;

  const returns = ReturnModel.find({
    sale_id: saleObjectId,
  })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((returnDoc) => {
      const cashier = UserModel.findById(returnDoc.cashier_id);

      const items = (returnDoc.items || []).map((item: any) => {
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

      return {
        ...returnDoc,

        cashier_id: cashier
          ? {
              _id: cashier._id,
              name: cashier.name,
            }
          : null,

        items,
      };
    });

  const totalReturned = returns.reduce(
    (sum: any, ret: any) => sum + ret.total_amount,
    0
  );

  return SuccessResponse(res, {
    message: "Sale returns fetched successfully",
    sale_id: saleObjectId,
    returns_count: returns.length,
    total_returned: totalReturned,
    returns: returns,
  });
};
