import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

// ==================== Customer Group Schema ====================
const CustomerGroupSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
};

export const CustomerGroupModel = createModel("customer_groups", CustomerGroupSchema, {
  timestamps: true,
});

// ==================== Customer Schema ====================
const CustomerSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
  },
  email: {
    type: "string",
    unique: true,
    // Note: sparse, trim, lowercase not supported - handle in application logic
  },
  phone_number: {
    type: "string",
    required: true,
    unique: true,
    // Note: trim, minlength, maxlength not supported - handle in application logic
  },
  address: {
    type: "string",
  },
  country: {
    type: "string", // UUID reference to Country
    ref: "Country",
  },
  city: {
    type: "string", // UUID reference to City
    ref: "City",
  },
  customer_group_id: {
    type: "string", // UUID reference to CustomerGroup
    ref: "CustomerGroup",
  },
  total_points_earned: {
    type: "number",
    default: 0,
    // Note: min not supported - validate in application logic
  },
  is_Due: {
    type: "boolean",
    default: false,
  },
  amount_Due: {
    type: "number",
    default: 0,
  },
  password: {
    type: "string",
    // Note: minlength not supported - validate in application logic
  },
  is_profile_complete: {
    type: "boolean",
    default: false,
  },
  otp_code: {
    type: "string",
    default: null,
  },
  otp_expires_at: {
    type: "date",
    default: null,
  },
  imagePath: {
    type: "string",
    default: null,
  },
  wishlist: {
    type: "array",
    items: {
      type: "string", // Array of Product UUIDs
      ref: "Product",
    },
    default: [],
  },
  addresses: {
    type: "array",
    items: {
      type: "string", // Array of Address UUIDs
      ref: "Address",
    },
    default: [],
  },
};

export const CustomerModel = createModel("Customer", CustomerSchema, {
  timestamps: true,
});