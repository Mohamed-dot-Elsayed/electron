import React, { useEffect } from "react";
import OrderPage from "./OrderPage";

export default function TakeAway({ orderType, pendingOrderData }) {
  // Set order type in sessionStorage for consistency
  useEffect(() => {
    sessionStorage.setItem("order_type", "take_away");
  }, []);

  return (
    <OrderPage
      propOrderType={orderType || "take_away"}
    // OrderPage reads pendingOrder from location.state, so prop might not be strictly needed 
    // if we are navigating with state, but adding it here if OrderPage is updated to use it.
    />
  );
}