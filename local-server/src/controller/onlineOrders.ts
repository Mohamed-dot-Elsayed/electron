import { Request, Response } from "express";
import { OrderModel } from "../models/order";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { ProductModel } from "../models/product";
import { UserModel } from "../models/user";
import { PaymentMethodModel } from "../models/paymentMethod";

/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع
 */
export const getAllOnlineOrders = async (req: Request, res: Response) => {
  const { status } = req.query;

  const filter: any = {};

  if (
    status &&
    ["pending", "approved", "rejected"].includes(status as string)
  ) {
    filter.status = status;
  }

  const orders = OrderModel.find(filter)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((order) => {
      const user = UserModel.findById(order.user);

      const paymentMethod = PaymentMethodModel.findById(order.paymentMethod);

      const cartItems =
        order.cartItems?.map((item: any) => {
          const product = ProductModel.findById(item.product);

          return {
            ...item,
            product: product
              ? {
                  _id: product._id,
                  name: product.name,
                  image: product.image,
                  price: product.price,
                }
              : null,
          };
        }) || [];

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

        cartItems,
      };
    });

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

  const order = await OrderModel.findById(id)
    .populate("user", "name email phone")
    .populate("paymentMethod", "name ar_name type")
    .populate("cartItems.product", "name image price");

  if (!order) throw new NotFound("Order not found");

  SuccessResponse(res, {
    message: "Order retrieved successfully",
    order,
  });
};

/**
 * PATCH /admin/online-orders/:id/status
 * تغيير حالة الأوردر (approved / rejected)
 */
export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    throw new NotFound(
      "Invalid status. Must be: pending, approved, or rejected"
    );
  }

  const order = OrderModel.updateById(id, {
    status,
  });

  if (!order) {
    throw new NotFound("Order not found");
  }

  const user = UserModel.findById(order.user);

  const paymentMethod = PaymentMethodModel.findById(order.paymentMethod);

  const populatedOrder = {
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
  };

  SuccessResponse(res, {
    message: `Order status updated to ${status}`,
    order: populatedOrder,
  });
};
