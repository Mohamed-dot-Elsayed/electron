/**
 * usePosSelections
 * ----------------
 * كل resource بيتجيب من الـ endpoint الخاص بيه.
 *
 * Shape returned:
 * {
 *   customers, customerGroups, countries, warehouses,
 *   accounts, taxes, discounts, coupons,
 *   paymentMethods, isLoading
 * }
 *
 * ملاحظة:
 *  - dueCustomers → بيتجيب من "api/admin/pos/sales/dues" مباشرة
 *  - currency     → لسه مفيش endpoint منفصل ليه
 *  - giftCards    → لسه مفيش endpoint منفصل ليه
 */
import { useGet } from "./useGet";
import { useMemo } from "react";

export function usePosSelections() {
  const { data: customersData,      isLoading: l1 } = useGet("api/admin/pos-home/customers");
  const { data: customerGroupsData, isLoading: l2 } = useGet("api/admin/pos-home/customer-groups");
  const { data: countriesData,      isLoading: l3 } = useGet("api/admin/pos-home/countries");
  const { data: warehousesData,     isLoading: l4 } = useGet("api/admin/pos-home/warehouses");
  const { data: accountsData,       isLoading: l5 } = useGet("api/admin/pos-home/accounts");
  const { data: taxesData,          isLoading: l6 } = useGet("api/admin/pos-home/taxes");
  const { data: discountsData,      isLoading: l7 } = useGet("api/admin/pos-home/discounts");
  const { data: couponsData,        isLoading: l8 } = useGet("api/admin/pos-home/coupons");
  const { data: paymentMethodsData, isLoading: l9 } = useGet("api/admin/pos-home/payment-methods");

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;

  /**
   * extract() — تستخرج الـ array من أي شكل رسبونس:
   *   1. { success, data: { message, data: [...] } }   ← الشكل الجديد المنفصل
   *   2. { data: [...] }
   *   3. [...]                                          ← مباشرة array
   */
  const extract = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data?.data)) return d.data.data;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  const selections = useMemo(() => ({
    customers:      extract(customersData),
    customerGroups: extract(customerGroupsData),
    countries:      extract(countriesData),
    warehouses:     extract(warehousesData),
    accounts:       extract(accountsData),
    taxes:          extract(taxesData),
    discounts:      extract(discountsData),
    coupons:        extract(couponsData),
    paymentMethods: extract(paymentMethodsData),
    // dueCustomers: استخدم useGet("api/admin/pos/sales/dues") مباشرة
    // currency:     لسه مش موجود endpoint منفصل
    isLoading,
  }), [
    customersData, customerGroupsData, countriesData, warehousesData,
    accountsData, taxesData, discountsData, couponsData,
    paymentMethodsData, isLoading,
  ]);

  return selections;
}
