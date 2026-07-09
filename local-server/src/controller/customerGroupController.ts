import { Request, Response } from "express";
import { CustomerGroupModel, CustomerModel } from "../models/customer";
import { BadRequest } from "../Errors/BadRequest";
import { SuccessResponse } from "../utils/response";
// Create Customer Group
export const createCustomerGroup = async (req: Request, res: Response) => {
  const { name, status = true } = req.body;

  // Validate required fields
  if (!name) {
    throw new BadRequest("Group name is required");
  }

  // Check if group name already exists
  const existingGroup = CustomerGroupModel.findOne({
    name,
  });

  if (existingGroup) {
    throw new BadRequest("Customer group with this name already exists");
  }

  // Create new customer group
  const savedGroup = CustomerGroupModel.create({
    name,
    status,
  });

  SuccessResponse(res, {
    message: "Customer group created successfully",

    customerGroup: savedGroup,
  });
};

export const createCustomer = async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone_number,
    address,
    country,
    city,
    customer_group_id,
  } = req.body;

  if (!name || !phone_number) {
    throw new BadRequest("Name and phone number are required");
  }

  const existingCustomer = await CustomerModel.findOne({ phone_number });
  if (existingCustomer) {
    throw new BadRequest("Customer with this phone number already exists");
  }

  const customer = await CustomerModel.create({
    name,
    email,
    phone_number,
    address,
    country,
    city,
    customer_group_id,
  });
  SuccessResponse(res, {
    message: "Customer created successfully",
    customer,
  });
};

export const getCustomers = async (req: Request, res: Response) => {
  const customers = await CustomerModel.find();
  SuccessResponse(res, {
    message: "Customers fetched successfully",
    customers,
  });
};

export const getallgroups = async (req: Request, res: Response) => {
  const groups = await CustomerGroupModel.find();
  SuccessResponse(res, {
    message: "Customer groups fetched successfully",
    groups,
  });
};
