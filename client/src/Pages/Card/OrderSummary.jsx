import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SummaryRow from "./SummaryRow";
import Loading from "@/components/Loading";
import { Phone, CreditCard, PrinterIcon, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useDiscountCalculation } from "@/Hooks/useDiscountCalculation";

// مكون الطباعة بنفس ديزاين الكاشير ريسيبت
const PrintableOrder = React.forwardRef(({ orderItems, calculations, orderType, tableId, t, restaurantInfo }, ref) => {
  const isArabic = localStorage.getItem('language') === 'ar';

  const calculatePriceWithAddons = (item) => {
    let basePrice = Number(item.originalPrice || item.price || 0);
    let addonsTotal = 0;

    if (item.addons && Array.isArray(item.addons)) {
      item.addons.forEach((addonGroup) => {
        if (addonGroup.options && Array.isArray(addonGroup.options)) {
          addonGroup.options.forEach((option) => {
            if (option.selected || option.quantity > 0) {
              const qty = option.quantity || 1;
              addonsTotal += Number(option.price || 0) * qty;
            }
          });
        }
      });
    }

    if (item.extras && Array.isArray(item.extras)) {
      item.extras.forEach((extra) => {
        addonsTotal += Number(extra.price || 0) * (extra.quantity || 1);
      });
    }

    return basePrice + addonsTotal;
  };

  // تحديد نصوص Order Type
  let orderTypeLabel = isArabic ? 'تيك أواي' : 'Takeaway';
  if (orderType === 'dine_in') {
    orderTypeLabel = isArabic ? 'صالة' : 'Dine In';
  } else if (orderType === 'delivery') {
    orderTypeLabel = isArabic ? 'توصيل' : 'Delivery';
  }

  const currentDate = new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
  const currentTime = new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} style={{
      width: '100%',
      maxWidth: '76mm',
      margin: '0 auto',
      padding: '2px',
      fontFamily: "'Arial', 'Tahoma', sans-serif",
      fontSize: '13px',
      direction: isArabic ? 'rtl' : 'ltr',
      color: '#000',
      lineHeight: '1.4'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '3px' }}>
          {restaurantInfo?.name || (isArabic ? 'اسم المطعم' : 'Restaurant Name')}
        </h1>
        <p style={{ fontSize: '11px', margin: '2px 0' }}>
          {restaurantInfo?.address || (isArabic ? 'عنوان المطعم' : 'Restaurant Address')}
        </p>

      </div>

      {/* Order Info Grid */}
      <div style={{ marginBottom: '8px', paddingBottom: '5px', borderBottom: '1px solid #000' }}>
        {/* Table Number for Dine In */}
        {orderType === 'dine_in' && tableId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {isArabic ? 'الطاولة' : 'Table'}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {tableId}
            </span>
          </div>
        )}
        {orderType === 'dine_in' && tableId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {isArabic ? 'رقم التحضير' : 'preparation No.'}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {restaurantInfo?.prep}
            </span>
          </div>
        )}

        {/* Order Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {isArabic ? 'نوع الطلب' : 'Order Type'}
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {orderTypeLabel}
          </span>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {isArabic ? 'التاريخ' : 'Date'}
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '12px', direction: 'ltr' }}>
            {currentDate} - {currentTime}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '15%', fontWeight: 'bold' }}>
              {isArabic ? 'الكمية' : 'Qty'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: isArabic ? 'right' : 'left', width: '45%', fontWeight: 'bold' }}>
              {isArabic ? 'الوجبة' : 'Item'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
              {isArabic ? 'سعر' : 'Price'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
              {isArabic ? 'الإجمالي' : 'Total'}
            </th>
          </tr>
        </thead>
        <tbody>
          {orderItems.map((item, index) => {
            const finalUnitPrice = orderType === "dine_in"
              ? calculatePriceWithAddons(item)
              : Number(item.price) || 0;

            const quantityForCalc = item.weight_status === 1
              ? Number(item.quantity || item.count || 1)
              : Number(item.count || 1);

            const totalPrice = (finalUnitPrice * quantityForCalc).toFixed(2);
            const productName = isArabic
              ? (item.name_ar || item.nameAr || item.name)
              : (item.name_en || item.nameEn || item.name);

            const displayQty = item.weight_status === 1
              ? `${item.quantity} kg`
              : item.count;

            return (
              <React.Fragment key={item.temp_id || index}>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <strong>{displayQty}</strong>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: isArabic ? 'right' : 'left', verticalAlign: 'middle' }}>
                    <div>
                      <strong>{productName}</strong>

                      {/* Variations */}
                      {item.variations?.map((group, i) => {
                        const selected = Array.isArray(group.selected_option_id)
                          ? group.options?.find(opt => group.selected_option_id.includes(opt.id))
                          : group.options?.find(opt => opt.id === group.selected_option_id);
                        return selected ? (
                          <div key={i} style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                            • {group.name}: {selected.name}
                          </div>
                        ) : null;
                      })}

                      {/* Addons */}
                      {item.addons && Array.isArray(item.addons) && item.addons.map((addonGroup, i) => (
                        addonGroup.options?.filter(opt => opt.selected || opt.quantity > 0).map((option, j) => (
                          <div key={`${i}-${j}`} style={{ fontSize: '9px', color: '#0066cc', marginTop: '2px' }}>
                            • {option.name} (+{option.price.toFixed(2)})
                          </div>
                        ))
                      ))}

                      {/* Notes */}
                      {item.notes && (
                        <div style={{ fontSize: '9px', color: '#d97706', marginTop: '3px', fontStyle: 'italic' }}>
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {finalUnitPrice.toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {totalPrice}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ marginTop: '8px', paddingTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
          <span>{isArabic ? 'المبلغ قبل الضريبة' : 'Subtotal'}</span>
          <span style={{ fontWeight: 'bold' }}>{calculations.subTotal.toFixed(2)}</span>
        </div>

        {calculations.taxDetails && calculations.taxDetails.length > 0 ? (
          calculations.taxDetails.map((tax, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
              <span>
                {tax.name} ({tax.amount}{tax.type === "precentage" ? "%" : " EGP"})
              </span>
              <span style={{ fontWeight: 'bold' }}>{tax.total.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
            <span>{isArabic ? 'الضريبة (15%)' : 'VAT (15%)'}</span>
            <span style={{ fontWeight: 'bold' }}>{calculations.order_tax.toFixed(2)}</span>
          </div>
        )}

        {calculations.totalOtherCharge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
            <span>{isArabic ? 'رسوم الخدمة' : 'Service Fee'}</span>
            <span style={{ fontWeight: 'bold' }}>{calculations.totalOtherCharge.toFixed(2)}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '8px',
          borderTop: '1px dashed #000',
          paddingTop: '5px'
        }}>
          <span>{isArabic ? 'الإجمالي الكلي' : 'Grand Total'}</span>
          <span>{calculations.amountToPay.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
        <p style={{ fontWeight: 'bold' }}>
          {isArabic ? 'شكراً لزيارتكم' : 'Thank You For Your Visit'}

        </p>
        {restaurantInfo?.Phone && (
          <p style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Phone size={12} />
            {restaurantInfo.Phone}
          </p>
        )}
      </div>
    </div>
  );
});

// ===== Checkout + Discount Panel Component =====
function CheckoutDiscountPanel({
  isLoading,
  orderItemsLength,
  orderType,
  selectedPaymentCount,
  onCheckout,
  amountToPay,
  onSetFreeDiscount,
  onSetDiscountId,
  onSetAppliedDiscount,
  onSetDiscountCode,
  t,
}) {
  const [showCheckoutDropdown, setShowCheckoutDropdown] = useState(false);
  const [showDiscountOptions, setShowDiscountOptions] = useState(false);
  const [activeDiscountTab, setActiveDiscountTab] = useState(null); // null | 'select' | 'free' | 'byCompany'

  // Local states for each discount type
  const [freeDiscountInput, setFreeDiscountInput] = useState("");
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [selectedDiscountLocal, setSelectedDiscountLocal] = useState("0");

  // Fetch discount list for Select tab
  const { data: discountListData } = useGet("api/discount");
  const discountList = discountListData?.data?.discounts || [];

  // Coupon API for By Company
  const { postData: validateCoupon, loading: couponLoading } = usePost();

  const isDisabled =
    isLoading ||
    orderItemsLength === 0 ||
    (orderType === "dine_in" && selectedPaymentCount === 0);

  const handleCheckoutMain = () => {
    onCheckout(false);
    setShowCheckoutDropdown(false);
  };

  const handleCheckoutWithPrint = () => {
    onCheckout(true);
    setShowCheckoutDropdown(false);
  };

  const handleCheckoutWithoutPrint = () => {
    onCheckout(false);
    setShowCheckoutDropdown(false);
  };

  const handleTabClick = (tab) => {
    setActiveDiscountTab((prev) => (prev === tab ? null : tab));
  };

  const handleFreeDiscountSend = () => {
    const val = parseFloat(freeDiscountInput) || 0;
    onSetFreeDiscount?.(val > 0 ? freeDiscountInput : "");
    if (val > 0) toast.success(`Free discount: ${val} EGP applied`);
    else toast.info("Free discount cleared");
  };

  const handleByCompanyApply = async () => {
    if (!discountCodeInput.trim()) return toast.error(t("PleaseEnterDiscountCode"));
    try {
      const response = await validateCoupon("api/pos/apply-coupon", {
        coupon_code: discountCodeInput.trim(),
        grand_total: amountToPay,
      });
      if (response?.success) {
        const couponData = response.data?.coupon;
        if (couponData) {
          let discountPercentage = 0;
          if (couponData.type === "percentage") {
            discountPercentage = couponData.amount;
          } else {
            discountPercentage = (couponData.amount / amountToPay) * 100;
          }
          onSetAppliedDiscount?.(discountPercentage);
          onSetDiscountCode?.(discountCodeInput.trim());
          toast.success(t("DiscountAppliedSuccess", { appliedDiscount: couponData.amount }));
        }
      } else {
        const msg = response?.error?.message || t("InvalidOrOffDiscountCode");
        toast.error(msg);
      }
    } catch (e) {
      const backendError = e.response?.data?.error?.message || e.response?.data?.message || e.message;
      toast.error(backendError);
    }
  };

  const handleSelectChange = (val) => {
    setSelectedDiscountLocal(val);
    onSetDiscountId?.(val === "0" ? null : val);
  };

  return (
    <div className="space-y-2">
      {/* Row: CHECKOUT + DISCOUNT */}
      <div className="flex gap-2">
        {/* CHECKOUT Button with dropdown */}
        <div className="relative flex-1">
          <div className={`flex rounded-xl overflow-hidden shadow-sm ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <button
              onClick={handleCheckoutMain}
              disabled={isDisabled || isLoading}
              className="flex-1 bg-red-700 hover:bg-red-700/80 text-white font-bold text-sm uppercase tracking-wider py-3 px-4 transition-all"
            >
              {isLoading ? <Loading /> : t("Checkout") || "CHECKOUT"}
            </button>
            <button
              onClick={() => {
                setShowCheckoutDropdown((v) => !v);
                setShowDiscountOptions(false);
              }}
              disabled={isDisabled}
              className="bg-red-700 hover:bg-red-700/80 text-white px-3 border-l border-red-700 transition-all"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {showCheckoutDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={handleCheckoutWithPrint}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all border-b border-gray-100"
              >
                <PrinterIcon size={15} className="text-gray-500" />
                <span>{t("Checkout&Print") || "Checkout & Print"}</span>
              </button>
              <button
                onClick={handleCheckoutWithoutPrint}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all"
              >
                <CreditCard size={15} className="text-gray-500" />
                <span>{t("CheckoutOnly") || "Checkout Only"}</span>
              </button>
            </div>
          )}
        </div>

        {/* DISCOUNT Button */}
        <button
          onClick={() => {
            setShowDiscountOptions((v) => !v);
            setShowCheckoutDropdown(false);
          }}
          className="bg-gray-700 hover:bg-gray-700/80  text-white font-bold text-sm uppercase tracking-wider py-3 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1"
        >
          <Tag size={15} />
          <span>{t("Discount") || "DISCOUNT"}</span>
          <ChevronRight
            size={14}
            className={`transition-transform ${showDiscountOptions ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {/* Discount Options Panel */}
      {showDiscountOptions && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 text-center border-b border-gray-200">
            {t("DiscountOptions") || "Discount Options"}
          </p>

          {/* Tabs Row */}
          <div className="grid grid-cols-3">
            {/* Select Tab */}
            <button
              onClick={() => handleTabClick("select")}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs font-medium border-r border-gray-200 transition-all
                ${activeDiscountTab === "select" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              <Tag size={13} />
              <span>{t("Select") || "Select"}</span>
            </button>

            {/* Free Tab */}
            <button
              onClick={() => handleTabClick("free")}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs font-medium border-r border-gray-200 transition-all
                ${activeDiscountTab === "free" ? "bg-green-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              <span className="font-bold text-base leading-none">%</span>
              <span>{t("Free") || "Free"}</span>
            </button>

            {/* By Company Tab */}
            <button
              onClick={() => handleTabClick("byCompany")}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs font-medium transition-all
                ${activeDiscountTab === "byCompany" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              <CreditCard size={13} />
              <span className="text-center leading-tight">{t("ByCompany") || "By Company"}</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeDiscountTab === "select" && (
            <div className="p-3 border-t border-gray-200">
              <select
                value={selectedDiscountLocal}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="0">{t("NoDiscount") || "No Discount"}</option>
                {discountList.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.type === "percentage" ? (d.amount * 100) : d.amount}{d.type === "percentage" ? "%" : " EGP"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeDiscountTab === "free" && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("EnterFreeDiscount") || "Enter free discount"}
                  value={freeDiscountInput}
                  onChange={(e) => setFreeDiscountInput(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <button
                  onClick={handleFreeDiscountSend}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  {t("Send") || "Send"}
                </button>
              </div>
            </div>
          )}

          {activeDiscountTab === "byCompany" && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("EnterDiscountCode") || "Enter discount code"}
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  onClick={handleByCompanyApply}
                  disabled={couponLoading}
                  className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  {couponLoading ? "..." : (t("Apply") || "Apply")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// المكون الرئيسي
export default function OrderSummary({
  orderType,
  subTotal,
  order_tax,
  totalOtherCharge,
  serviceFeeData,
  taxDetails,
  totalAmountDisplay,
  amountToPay,
  selectedPaymentCount,
  onCheckout,
  onSaveAsPending,
  offerManagement,
  isLoading,
  orderItemsLength,
  allItemsDone,
  orderItems,
  tableId,
  t,
  onPrint: externalOnPrint,
  onSetFreeDiscount,
  onSetDiscountId,
  onSetAppliedDiscount,
  onSetDiscountCode,
  // discount preview props
  presetDiscountId,
  presetAppliedDiscount,
  presetFreeDiscount,
}) {
  const printRef = useRef();

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    const printContents = printRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Receipt</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { 
                margin: 5mm;
                size: 100% auto;
              }
            }
            * { box-sizing: border-box; }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const calculations = {
    subTotal,
    order_tax,
    totalOtherCharge,
    taxDetails,
    amountToPay,
  };

  // ──── حساب الخصم باستخدام الـ shared hook (نفس منطق CheckOut) ────
  const { totalDiscountDisplay, finalAmountToPay } = useDiscountCalculation(
    amountToPay,
    presetDiscountId,
    presetAppliedDiscount,
    presetFreeDiscount
  );

  const restaurantInfo = {
    name: sessionStorage.getItem('resturant_name') || 'Restaurant Name',
    address: sessionStorage.getItem('restaurant_address') || 'Restaurant Address',
    prep: sessionStorage.getItem("preparation_number"),
    Phone: sessionStorage.getItem('restaurant_phone') || '',
  };

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-100 pt-3 mt-2">
      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <PrintableOrder
          ref={printRef}
          orderItems={orderItems}
          calculations={calculations}
          orderType={orderType}
          tableId={tableId}
          t={t}
          restaurantInfo={restaurantInfo}
        />
      </div>

      {/* ===== Summary Card ===== */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 mb-3 space-y-1.5">
        <SummaryRow label={t("SubTotal")} value={subTotal} />

        {taxDetails && taxDetails.length > 0 ? (
          taxDetails.map((tax, index) => (
            <SummaryRow
              key={index}
              label={`${tax.name} (${tax.amount}${tax.type === "precentage" ? "%" : " EGP"})`}
              value={tax.total}
            />
          ))
        ) : (
          <SummaryRow label={t("Tax")} value={order_tax} />
        )}

        {["dine_in", "take_away"].includes(orderType) && totalOtherCharge > 0 && (
          <SummaryRow
            label={`${t("Service Fee")} (${serviceFeeData?.amount || 0}${serviceFeeData?.type === "fixed" ? " EGP" : "%"
              })`}
            value={totalOtherCharge}
          />
        )}

        {/* ── Discount List Row ── */}
        {totalDiscountDisplay > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-600 font-medium">{t("ListDiscount") || "ListDiscount"}</span>
            <span className="text-blue-600 font-semibold">-{totalDiscountDisplay.toFixed(2)} {t("EGP")}</span>
          </div>
        )}

        {/* Dine-in Selection Info */}
        {orderType === "dine_in" && (
          <>
            <div className="border-t border-gray-200 pt-1.5 mt-1.5">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{t("TotalOrderAmount")}:</span>
                <span className="font-semibold text-gray-700">{totalAmountDisplay.toFixed(2)} {t("EGP")}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-500">{t("SelectedItems", { count: selectedPaymentCount })}:</span>
                <span className="font-semibold text-teal-600">{amountToPay.toFixed(2)} {t("EGP")}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== Total Amount ===== */}
      <div className="text-black rounded-xl px-4 py-3 mb-3 flex justify-between items-center shadow-sm">
        <span className="text-black/80 text-sm font-medium">{t("AmountToPay")}</span>
        <span className="text-black text-xl font-bold tracking-tight">
          {finalAmountToPay.toFixed(2)} <span className="text-sm font-normal opacity-80">{t("EGP")}</span>
        </span>
      </div>

      {/* ===== Action Buttons ===== */}
      {offerManagement.approvedOfferData ? (
        <div className="space-y-2">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
            <p className="font-semibold text-teal-800 text-sm">
              🎁 {t("RewardItem")}: {offerManagement.approvedOfferData.product}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                const success = await offerManagement.applyApprovedOffer();
                if (success && onCheckout) onCheckout();
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold h-11 rounded-xl flex-1 transition-all"
              disabled={isLoading}
            >
              {isLoading ? <Loading /> : <><CreditCard size={15} className="mr-1.5" />Apply Offer & Checkout</>}
            </Button>
            <Button
              onClick={offerManagement.cancelApprovedOffer}
              variant="outline"
              className="border-red-300 text-red-500 hover:bg-red-50 h-11 rounded-xl px-4 text-sm"
              disabled={isLoading}
            >
              {t("Cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <CheckoutDiscountPanel
          isLoading={isLoading}
          orderItemsLength={orderItemsLength}
          orderType={orderType}
          selectedPaymentCount={selectedPaymentCount}
          onCheckout={onCheckout}
          amountToPay={amountToPay}
          onSetFreeDiscount={onSetFreeDiscount}
          onSetDiscountId={onSetDiscountId}
          onSetAppliedDiscount={onSetAppliedDiscount}
          onSetDiscountCode={onSetDiscountCode}
          t={t}
        />
      )}
    </div>
  );
}