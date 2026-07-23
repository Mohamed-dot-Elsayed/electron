//page for handling order submission to the backend (with type = 'dine_in')

// page for handling order submission to the backend (with type = 'dine_in')
import { toast } from "react-toastify";
import { buildProductPayload } from "./productProcessor";
export const submitItemToBackend = async (postData, product, quantity = 1, orderType) => {
  if (orderType !== "dine_in") return;

  const cashierId = sessionStorage.getItem("cashier_id");
  const tableId = sessionStorage.getItem("table_id");

  if (!cashierId || !tableId) {
    toast.error("Missing cashier or table information");
    return;
  }

  try {
    const calculatedAmount = product.price * quantity;
    const productPayload = buildProductPayload({ ...product, count: quantity });

    const payload = {
      amount: calculatedAmount.toFixed(2),
      total_tax: "10",
      total_discount: "10",
      notes: "note",
      products: [productPayload],
      source: "web",
      financials: [{ id: "1", amount: calculatedAmount.toFixed(2) }],
      cashier_id: cashierId,
      table_id: tableId,
    };

    const response = await postData("cashier/dine_in_order", payload, {
      headers: { "Content-Type": "application/json" },
    });

    toast.success(`${product.name} added to order successfully!`);
    return response;
  } catch (err) {
    toast.error(`Failed to add "${product.name}" to order.`);
    throw err;
  }
};

// Additional helper function to validate product data before submission
export const validateProductForSubmission = (product) => {
  const errors = [];
  
  if (!product.id) {
    errors.push("Product ID is missing");
  }
  
  // Check if variation is properly structured when present
  if (product.selectedVariation && (!product.variation || !product.variation.variation_id || !product.variation.option_id)) {
    errors.push("Variation data is incomplete");
  }
  
  // Check if addons are properly structured when present
  if (product.selectedExtras && product.selectedExtras.length > 0) {
    if (!product.selectedAddons || product.selectedAddons.length === 0) {
      errors.push("Addon data is missing despite selected extras");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to format product for display
export const formatProductDisplay = (product) => {
  let display = product.name || "Unknown Product";
  
  if (product.variation && product.variation.option_name) {
    display += ` (${product.variation.option_name})`;
  }
  
  if (product.selectedAddons && product.selectedAddons.length > 0) {
    const addonNames = product.selectedAddons.map(addon => addon.name).join(", ");
    display += ` + ${addonNames}`;
  }
  
  return display;
};

