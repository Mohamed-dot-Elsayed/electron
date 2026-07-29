import { Request, Response } from "express";
import { BookingModel } from "../models/booking";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { CustomerModel } from "../models/customer";
import { WarehouseModel } from "../models/warehouse";
import { ProductModel } from "../models/product";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../models/productPrice";
import { ProductSalesModel, SaleModel } from "../models/sale";
import { CashierShift } from "../models/cashierShift";

export const getPOSBookings = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // Get bookings
  const bookings = BookingModel.find({
    WarehouseId: warehouseId,
  });

  // Manual populate Customer and Product
  const populatedBookings = bookings.map((booking) => {
    const customer = CustomerModel.findById(booking.CustmerId);

    const product = ProductModel.findById(booking.ProductId);

    return {
      ...booking,

      CustmerId: customer
        ? {
            _id: customer._id,
            name: customer.name,
            phone_number: customer.phone_number,
          }
        : null,

      ProductId: product
        ? {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            image: product.image,
          }
        : null,
    };
  });

  const pendingBookings = populatedBookings.filter(
    (b) => b.status === "pending"
  );

  const failerBookings = populatedBookings.filter((b) => b.status === "failer");

  const payBookings = populatedBookings.filter((b) => b.status === "pay");

  SuccessResponse(res, {
    message: "POS Bookings retrieved successfully",
    pendingBookings,
    failerBookings,
    payBookings,
  });
};

export const createBooking = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const jwtWarehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!jwtWarehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // Check Open Shift
  const openShift = await CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating a booking"
    );
  }

  const {
    number_of_days,
    deposit,
    CustmerId,
    ProductId,
    CategoryId,
    option_id,
  } = req.body;

  // We enforce the warehouse constraint from the jwt user
  const WarehouseId = jwtWarehouseId;

  if (
    !number_of_days ||
    !deposit ||
    !CustmerId ||
    !ProductId ||
    !CategoryId ||
    !option_id
  ) {
    throw new BadRequest("All fields are required");
  }

  const existcustmer = await CustomerModel.findById(CustmerId);
  if (!existcustmer) throw new BadRequest("Customer not found");

  const existwarehouse = await WarehouseModel.findById(WarehouseId);
  if (!existwarehouse) throw new BadRequest("Warehouse not found");

  const existproduct = await ProductModel.findById(ProductId);
  if (!existproduct) throw new BadRequest("Product not found");

  const existQty = existproduct.quantity ?? 0;
  if (existQty < 1) throw new BadRequest("Product out of stock");

  const option = await ProductPriceOptionModel.findById(option_id);
  if (!option) throw new BadRequest("Option not found");

  const productprice = option.product_price_id;
  if (!productprice) throw new BadRequest("Product price not found");

  const existproductprice = await ProductPriceModel.findById(productprice);
  if (!existproductprice) throw new BadRequest("Product price not found");

  if (existproductprice.quantity < 1)
    throw new BadRequest("Product price out of stock");

  const booking = await BookingModel.create({
    number_of_days,
    deposit,
    CustmerId,
    WarehouseId,
    ProductId,
    CategoryId,
    option_id,
    status: "pending",
  });

  existproduct.quantity = existQty - 1;
  await existproduct.save();

  existproductprice.quantity = existproductprice.quantity - 1;
  await existproductprice.save();

  SuccessResponse(res, { message: "Booking created successfully", booking });
};

export const payRemaining = async (req: Request, res: Response) => {
  const { id } = req.params;
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // Check Open Shift
  const openShift = CashierShift.findOne(
    { cashierman_id: cashierId, status: "open" },
    { sort: { start_time: -1 } }
  );

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before paying for a booking"
    );
  }

  const booking = BookingModel.findOne({
    _id: id,
    WarehouseId: warehouseId,
  });

  if (!booking)
    throw new NotFound("Booking not found or not assigned to your warehouse");

  if (booking.status === "pay") {
    throw new BadRequest("Booking is already paid and converted to sale");
  }

  const option = ProductPriceOptionModel.findById(
    (booking as any).option_id
  );
  if (!option) throw new BadRequest("Product option not found");

  const productPrice = ProductPriceModel.findById(option.product_price_id);
  if (!productPrice) throw new BadRequest("Product price not found");

  const quantity = 1;
  const price = productPrice.price;
  const subtotal = price * quantity;

  const saleReference = `SALE-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Convert booking to a completed sale
  const saleData = {
    reference: saleReference,
    customer_id: booking.CustmerId,
    warehouse_id: booking.WarehouseId,
    grand_total: subtotal,
    total: subtotal,
    paid_amount: subtotal,
    remaining_amount: 0,
    sale_status: "completed",
    order_pending: 0,
    Due: 0,
    coupon_code: "",
    applied_coupon: false,
    cashier_id: cashierId,
    shift_id: openShift._id,
    date: new Date(),
  };

  const sale = SaleModel.create(saleData);

  const productSaleData = {
    sale_id: sale._id,
    product_id: booking.ProductId,
    options_id: (booking as any).option_id,
    quantity: quantity,
    price: price,
    subtotal: subtotal,
    isBundle: false,
  };

  ProductSalesModel.create(productSaleData);

  // ✅ replaces booking.status = "pay"; await booking.save();
  BookingModel.updateById(booking._id, { status: "pay" });

  SuccessResponse(res, {
    message:
      "Booking remaining balance paid successfully and converted to sale",
  });
};
