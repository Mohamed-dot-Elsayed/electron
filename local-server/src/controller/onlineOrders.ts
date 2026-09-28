import { Request, Response } from "express";
import { OrderModel } from "../models/order";
import { BadRequest, NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { ProductModel } from "../models/product";
import { UserModel } from "../models/user";
import { PaymentMethodModel } from "../models/paymentMethod";
import { WarehouseModel } from "../models/warehouse";
import { Product_WarehouseModel } from "../models/productWarehouse";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../models/productPrice";
import { OptionModel, VariationModel } from "../models/variation";

/**
 * Helper: بيجيب تفاصيل الـ variant (ProductPrice + options بتاعتها)
 *
 * بيرجّع:
 * {
 *   _id,
 *   price,
 *   code,
 *   quantity,
 *   gallery,
 *   options: [{ variationName, ar_variationName, optionName, optionId }]
 * }
 */
function getVariantDetails(variantId: string) {
  if (!variantId) return null;

  const productPrice = ProductPriceModel.findById(variantId);
  if (!productPrice) return null;

  // ── Options related to this variant ──
  const priceOptions = ProductPriceOptionModel.find({
    product_price_id: variantId,
  });

  const optionIds = priceOptions.map((po: any) => String(po.option_id));
  const options = optionIds.length
    ? OptionModel.find({ _id: { $in: optionIds } })
    : [];

  const optionMap = new Map(options.map((o: any) => [String(o._id), o]));

  // ── Variations (Color, Size, ...) ──
  const variationIds = [
    ...new Set(
      options
        .filter((o: any) => o.variationId)
        .map((o: any) => String(o.variationId)),
    ),
  ];

  const variationDocs = variationIds.length
    ? VariationModel.find({ _id: { $in: variationIds } })
    : [];

  const variationMap = new Map(
    variationDocs.map((v: any) => [String(v._id), v]),
  );

  // ── Build options labels ──
  const optionLabels = priceOptions
    .map((po: any) => {
      const option = optionMap.get(String(po.option_id));
      if (!option) return null;

      const variation = option.variationId
        ? variationMap.get(String(option.variationId))
        : null;

      return {
        optionId: option._id,
        optionName: option.name,
        variationId: variation?._id ?? null,
        variationName: variation?.name ?? null,
        ar_variationName: variation?.ar_name ?? null,
      };
    })
    .filter(Boolean);

  return {
    _id: productPrice._id,
    productId: productPrice.productId,
    price: productPrice.price ?? null,
    code: productPrice.code ?? null,
    quantity: productPrice.quantity ?? 0,
    gallery: productPrice.gallery ?? [],
    cost: productPrice.cost ?? 0,
    options: optionLabels,
  };
}

/**
 * Helper: بيعمل populate للـ cartItems
 * (بيضيف product + variant بتفاصيله الكاملة)
 */
function populateCartItems(cartItems: any[]) {
  return (cartItems || []).map((item: any) => {
    const product = ProductModel.findById(item.product);
    const variant = item.variant ? getVariantDetails(item.variant) : null;

    return {
      ...item,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            image: product.image,
            price: product.price,
          }
        : null,
      variant,
    };
  });
}

/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع
 */
export const getAllOnlineOrders = async (req: Request, res: Response) => {
  const { status } = req.query;

  // بنستبعد pending و rejected بس
  // processing بتظهر عشان الـ admin يأكدها
  const filter: any = {
    status: { $nin: ["pending", "rejected"] },
  };

  const allowedStatuses = [
    "processing",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
  ];

  if (status && allowedStatuses.includes(status as string)) {
    filter.status = status;
  }

  const orders = OrderModel.find(filter, { sort: { createdAt: -1 } }).map(
    (order) => {
      const user = UserModel.findById(order.user);

      const paymentMethod = PaymentMethodModel.findById(order.paymentMethod);

      const warehouse = WarehouseModel.findById(order.warehouse);

      const cartItems = populateCartItems(order.cartItems || []);

      return {
        ...order,

        user: user
          ? {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
            }
          : null,

        paymentMethod: paymentMethod
          ? {
              _id: paymentMethod._id,
              name: paymentMethod.name,
              ar_name: paymentMethod.ar_name,
              type: paymentMethod.type,
            }
          : null,

        warehouse: warehouse
          ? {
              _id: warehouse._id,
              name: warehouse.name,
            }
          : null,

        cartItems,
      };
    },
  );

  SuccessResponse(res, {
    message: "Online orders retrieved successfully",
    count: orders.length,
    orders,
  });
};

/**
 * GET /admin/online-orders/:id
 * جلب تفاصيل أوردر أونلاين معين
 */
export const getOnlineOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const orderRaw = OrderModel.findById(id);
  if (!orderRaw) throw new NotFound("Order not found");

  const userPop = orderRaw.user ? UserModel.findById(orderRaw.user) : null;

  const paymentMethodPop = orderRaw.paymentMethod
    ? PaymentMethodModel.findById(orderRaw.paymentMethod)
    : null;

  const populatedCartItems = populateCartItems(orderRaw.cartItems || []);

  const order = {
    ...orderRaw,
    user: userPop
      ? {
          _id: userPop._id,
          name: userPop.name,
          email: userPop.email,
          phone: userPop.phone,
        }
      : null,
    paymentMethod: paymentMethodPop
      ? {
          _id: paymentMethodPop._id,
          name: paymentMethodPop.name,
          ar_name: paymentMethodPop.ar_name,
          type: paymentMethodPop.type,
        }
      : null,
    cartItems: populatedCartItems,
  };

  SuccessResponse(res, {
    message: "Order retrieved successfully",
    order,
  });
};

/**
 * Helper: بيلاقي stock row في Product_Warehouse
 *
 * ✅ نفس منطق الـ POS (createSale):
 * 1. لو المنتج ليه variant → productPriceId = variantId
 * 2. لو ملهوش variant → productPriceId = null / مش موجود
 * 3. Fallback: لو مش لاقي في المخزن ده، يدور في أي مخزن
 */
function findStockRow(item: any, warehouseId: string) {
  const variantId = item.variant || null;

  // بنجيب كل الـ rows للمنتج
  const allRows = Product_WarehouseModel.find({
    productId: item.product,
  });

  // بنفلتر حسب الـ variant
  let filtered: any[];
  if (variantId) {
    filtered = allRows.filter((r: any) => r.productPriceId === variantId);
  } else {
    filtered = allRows.filter(
      (r: any) =>
        r.productPriceId === null ||
        r.productPriceId === undefined ||
        r.productPriceId === "",
    );
  }

  if (!filtered.length) return null;

  // نفضّل الـ row بتاعة المخزن ده
  const inThisWarehouse = filtered.find(
    (r: any) => String(r.warehouseId) === String(warehouseId),
  );

  // fallback: زي POS
  return inThisWarehouse || filtered[0];
}

/**
 * PATCH /admin/online-orders/:id/status
 *
 * الحالات المسموحة للـ admin فقط:
 * confirmed, out_for_delivery, delivered, returned,
 * failed_to_deliver, canceled, scheduled
 *
 * الفلو:
 * - confirmed: تخصم من Product_Warehouse (لو quantityDeducted = false)
 * - out_for_delivery / delivered: مفيش تغيير في الكمية
 * - failed_to_deliver / returned: ترجع لـ Product_Warehouse (لو quantityDeducted = true)
 * - canceled / scheduled: مفيش تغيير
 */
export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, statusDescription } = req.body;

  // 1. التحقق من صحة الحالة
  const allowedStatuses = [
    "confirmed",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
  ];

  if (!status || !allowedStatuses.includes(status)) {
    throw new BadRequest("Invalid status.");
  }

  // 2. جلب الأوردر
  const order = OrderModel.findById(id);
  if (!order) {
    throw new NotFound("Order not found");
  }

  const oldStatus = order.status;
  const newStatus = status;

  // 3. منع نفس الحالة
  if (oldStatus === newStatus) {
    throw new BadRequest(`Order is already in "${newStatus}" status.`);
  }

  // 4. نتتبع الكمية بحقل quantityDeducted بدل الحالة
  const wasQuantityDeducted = order.quantityDeducted === true;
  let newQuantityDeducted = wasQuantityDeducted;

  // 5. التعامل مع الكميات
  if (newStatus === "confirmed") {
    if (!wasQuantityDeducted) {
      // التحقق من توفر الكمية في Product_Warehouse
      for (const item of order.cartItems || []) {
        const stock = findStockRow(item, order.warehouse);

        if (!stock) {
          throw new NotFound(
            `Stock record not found for product "${item.product}" in this warehouse.`,
          );
        }

        if (stock.quantity < item.quantity) {
          throw new BadRequest(
            `Insufficient quantity for product "${item.product}". Available: ${stock.quantity}, Requested: ${item.quantity}`,
          );
        }
      }

      // خصم الكمية من Product_Warehouse
      for (const item of order.cartItems || []) {
        const stock = findStockRow(item, order.warehouse);

        if (stock) {
          Product_WarehouseModel.updateById(stock._id, {
            quantity: stock.quantity - item.quantity,
          });
        }
      }

      newQuantityDeducted = true;
    }
  } else if (newStatus === "returned" || newStatus === "failed_to_deliver") {
    if (wasQuantityDeducted) {
      // إرجاع الكمية لـ Product_Warehouse
      for (const item of order.cartItems || []) {
        const stock = findStockRow(item, order.warehouse);

        if (stock) {
          Product_WarehouseModel.updateById(stock._id, {
            quantity: stock.quantity + item.quantity,
          });
        }
      }

      newQuantityDeducted = false;
    }
  }
  // باقي الحالات: مفيش تغيير في الكمية

  // 6. تحديث الأوردر
  const updatedOrder = OrderModel.updateById(id, {
    status: newStatus,
    previousStatus: oldStatus,
    quantityDeducted: newQuantityDeducted,
    statusDescription: statusDescription ?? null,
  });

  if (!updatedOrder) {
    throw new NotFound("Order not found");
  }

  // 7. populate للرد
  const user = UserModel.findById(updatedOrder.user);
  const paymentMethod = PaymentMethodModel.findById(updatedOrder.paymentMethod);

  const populatedOrder = {
    ...updatedOrder,
    user: user
      ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      : null,
    paymentMethod: paymentMethod
      ? {
          _id: paymentMethod._id,
          name: paymentMethod.name,
          ar_name: paymentMethod.ar_name,
          type: paymentMethod.type,
        }
      : null,
    cartItems: populateCartItems(updatedOrder.cartItems || []),
  };

  SuccessResponse(res, {
    message: `Order status updated from "${oldStatus}" to "${newStatus}"`,
    order: populatedOrder,
  });
};
