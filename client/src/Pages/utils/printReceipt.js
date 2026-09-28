import { toast } from "react-toastify";

// ===================================================================
// 0. أداة اختبار عرض الطباعة (مسطرة قياس)
// ===================================================================
const generateRulerHTML = (widthPx) => {
  const marks = [];
  const step = 50;
  for (let px = 0; px <= (widthPx || 576); px += step) {
    marks.push(`
      <div style="position:absolute; left:${px}px; top:0; width:1px; height:14px; background:#000;"></div>
      <div style="position:absolute; left:${px}px; top:16px; font-size:8px; transform:translateX(-50%); font-family:Tahoma,Arial,sans-serif;">${px}</div>
    `);
  }

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        html, body { width: 100%; margin: 0; padding: 0; }
        body { font-family: Tahoma, Arial, sans-serif; }
        .configured {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .ruler {
          position: relative;
          width: 100%;
          height: 28px;
          border-bottom: 2px solid #000;
          margin-bottom: 8px;
        }
        .box-100 {
          width: 100%;
          border: 1px dashed #000;
          padding: 4px;
          font-size: 11px;
          text-align: center;
          margin-bottom: 6px;
        }
        .box-100 b { font-size: 13px; }
        .edge-test {
          width: 100%;
          font-size: 11px;
          font-weight: bold;
          text-align: right;
          border: 1px dashed #000;
          padding: 4px;
          margin-bottom: 6px;
        }
      </style>
    </head>
    <body>
      <div class="configured">RECEIPT_IMAGE_WIDTH_PX = ${widthPx ?? "غير معروف"} px</div>
      <div class="ruler">${marks.join("")}</div>
      <div class="box-100">
        <b>100% WIDTH BOX</b><br/>
        لو أي جزء من الإطار ده اتقطع فعليًا في الورق، يبقى الطابعة
        نفسها مش بتدعم ${widthPx ?? "؟"} نقطة في السطر — جرب رقم أصغر
        (زي 512) بمتغير RECEIPT_WIDTH_PX
      </div>
      <div class="edge-test">آخر حرف هنا لازم يبان كامل ← END</div>
    </body>
  </html>
  `;
};

export const printTestRuler = async () => {
  try {
    let widthPx = 576;
    if (window.electronAPI?.getReceiptImageWidthPx) {
      widthPx = await window.electronAPI.getReceiptImageWidthPx();
    }

    const rulerHtml = generateRulerHTML(widthPx);

    if (window.electronAPI) {
      const printers = await window.electronAPI.getPrinters();

      if (!printers || printers.length === 0) {
        const result = await window.electronAPI.printReceiptImage(
          rulerHtml,
          "",
        );
        if (result?.savedToPdf) {
          toast.info("📄 مفيش طابعة متسجلة — اتحفظت مسطرة الاختبار كـ PDF");
        } else {
          toast.error(`❌ ${result?.error || "فشل الحفظ"}`);
        }
        return;
      }

      const defaultPrinter =
        printers.find((p) => p.isDefault)?.name || printers[0]?.name;

      const result = await window.electronAPI.printReceiptImage(
        rulerHtml,
        defaultPrinter,
      );

      if (result?.success && !result?.savedToPdf) {
        toast.success("✅ اتطبعت مسطرة الاختبار");
      } else if (result?.savedToPdf) {
        toast.info(
          `🖨️ الطباعة فشلت${result?.escposError ? ` (${result.escposError})` : ""} — اتحفظت مسطرة الاختبار كـ PDF`,
        );
      } else if (result?.reason === "canceled") {
        toast.info("⚠️ تم الإلغاء");
      } else {
        toast.error(`❌ فشلت طباعة مسطرة الاختبار: ${result?.error || "?"}`);
      }
    } else {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        toast.error("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة");
        return;
      }
      printWindow.document.write(rulerHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  } catch (err) {
    console.error("Test ruler print failed:", err);
    toast.error("❌ فشل طباعة مسطرة الاختبار");
  }
};

// ===================================================================
// 1. إعدادات الطابعات
// ===================================================================
const PRINTER_CONFIG = {
  cashier: {
    printerName: "XP-80C",
    type: "cashier",
    printAll: true,
    categories: [],
    design: "full",
  },
};

// ===================================================================
// 2. تصغير الخط تلقائيًا للأرقام الكبيرة
// ===================================================================
const scaledFontSizePx = (
  value,
  baseSizePx,
  { maxChars = 8, minSizePx } = {},
) => {
  const text = String(value ?? "");
  const digitsLength = text.replace(/[^0-9]/g, "").length;
  if (digitsLength <= maxChars) return baseSizePx;

  const floor = minSizePx ?? Math.round(baseSizePx * 0.55);
  const extra = digitsLength - maxChars;
  const shrunk = baseSizePx - extra * 1.3;
  return Math.max(Math.round(shrunk), floor);
};

// ===================================================================
// 3. تصميم إيصال الكاشير
// ===================================================================
const formatCashierReceipt = (receiptData) => {
  const isArabic = localStorage.getItem("language") === "ar";

  const formatVariationsHTML = (variationsArray) => {
    if (!Array.isArray(variationsArray) || variationsArray.length === 0) {
      return "";
    }
    const variationsText = variationsArray
      .map((v) => v.name)
      .filter(Boolean)
      .join(", ");
    if (!variationsText) return "";
    return `<div class="addon-row" style="font-weight:normal;">${variationsText}</div>`;
  };

  const showCustomerInfo =
    receiptData.customer &&
    ((receiptData.customer.name &&
      receiptData.customer.name.trim() !== "" &&
      receiptData.customer.name !== "عميل نقدي") ||
      (receiptData.customer.phone && receiptData.customer.phone.trim() !== ""));

  const grandTotalText = Number(receiptData.total || 0).toFixed(2);
  const grandTotalDigits = grandTotalText.replace(/[^0-9]/g, "").length;
  const grandTotalStacked = grandTotalDigits > 7;
  const grandTotalFontSize = grandTotalStacked
    ? scaledFontSizePx(grandTotalText, 24, { maxChars: 9, minSizePx: 16 })
    : scaledFontSizePx(grandTotalText, 22, { maxChars: 7, minSizePx: 15 });

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: 80mm auto; }
        * { box-sizing: border-box; }
        html { width: 100%; margin: 0; padding: 0; }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background-color: #fff;
          font-family: 'Tahoma', 'Arial', sans-serif;
          color: #000;
          direction: ${isArabic ? "rtl" : "ltr"};
          font-size: 13px;
        }
        .container {
          width: 100% !important;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 6px; }
        .header h1 {
            font-size: 22px;
            font-weight: 900;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #000;
        }
        .header p { margin: 2px 0; font-size: 12px; color: #000; font-weight: bold; line-height: 1.3; }
        .header .phone { font-weight: 900; font-size: 13px; margin-top: 2px; color: #000; direction: ltr; }
        .header .ref-number { font-weight: 900; font-size: 12px; margin-top: 3px; color: #000; letter-spacing: 0.5px; }

        .order-badge {
            border: 2px solid #000;
            color: #000;
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            padding: 4px;
            margin: 4px 0;
            border-radius: 4px;
        }
        .table-info { text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #000; }

        .meta-grid {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            margin: 6px 0;
            padding: 4px 0;
        }
        .meta-grid td { vertical-align: middle; }
        .meta-label { font-size: 10px; font-weight: bold; color: #000; }
        .meta-value { font-size: 18px; font-weight: 900; color: #000; }
        .meta-date { font-size: 11px; font-weight: bold; color: #000; line-height: 1.2; }

        .section-header {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            color: #000;
            text-align: center;
            font-weight: 900;
            font-size: 11px;
            padding: 2px 0;
            margin-top: 6px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .items-table th {
            font-size: 11px;
            font-weight: 900;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
            color: #000;
        }
        .items-table td {
            padding: 4px 1px;
            border-bottom: 1px dashed #999;
            vertical-align: top;
            overflow-wrap: break-word;
        }
        .item-qty { font-size: 12px; font-weight: bold; text-align: center; color: #000; }
        .item-name { font-size: 12px; font-weight: bold; padding: 0 2px; color: #000; word-break: break-word; }
        .item-price { font-weight: bold; text-align: center; color: #000; overflow-wrap: anywhere; }
        .item-total { font-weight: 900; color: #000; overflow-wrap: anywhere; }

        .addon-row { font-size: 10px; color: #000; margin-top: 2px; font-weight: normal; }
        .notes-row { font-size: 10px; font-style: italic; color: #000; }

        .totals-section { width: 100%; margin-top: 6px; border-top: 2px solid #000; padding-top: 6px; }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 13px;
            font-weight: bold;
            width: 100%;
            color: #000;
            gap: 6px;
        }
        .totals-row span:last-child { overflow-wrap: anywhere; text-align: ${isArabic ? "left" : "right"}; direction: ltr; unicode-bidi: embed; }

        .grand-total {
            border: 2px solid #000;
            padding: 6px 8px;
            margin-top: 6px;
            text-align: center;
            display: flex;
            flex-direction: ${grandTotalStacked ? "column" : "row"};
            justify-content: ${grandTotalStacked ? "flex-start" : "space-between"};
            align-items: ${grandTotalStacked ? "stretch" : "center"};
            width: 100%;
            box-sizing: border-box;
            color: #000;
            gap: ${grandTotalStacked ? "2px" : "6px"};
        }
        .grand-total-label {
            font-size: ${grandTotalStacked ? "12px" : "16px"};
            font-weight: 900;
            color: #000;
            flex-shrink: 0;
            text-align: ${grandTotalStacked ? "center" : isArabic ? "right" : "left"};
        }
        .grand-total-value {
            font-weight: 900;
            color: #000;
            white-space: nowrap;
            text-align: ${grandTotalStacked ? "center" : isArabic ? "left" : "right"};
            direction: ltr;
            unicode-bidi: embed;
        }

        .cust-info {
          font-size: 11px;
          font-weight: 500;
          line-height: 1.5;
          padding: 6px 8px;
          margin-bottom: 6px;
        }

        .cust-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }

        .cust-row:not(:last-child) {
          margin-bottom: 2px;
        }

        .cust-label {
          opacity: 0.7;
          white-space: nowrap;
        }

        .cust-value {
          font-weight: 600;
        }

        .cust-value.phone {
          text-align: ${isArabic ? "right" : "left"};
        }

        @media print {
          @page { margin: 0; size: 80mm auto; }
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .container {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">

        <div class="header">
          <h1>${receiptData.restaurantName}</h1>
          ${receiptData.restaurantAddress ? `<p>${receiptData.restaurantAddress}</p>` : ""}
          ${receiptData.restaurantPhone ? `<div class="phone">${receiptData.restaurantPhone}</div>` : ""}
          ${
            receiptData.referenceNumber
              ? `
            <div class="ref-number">
              ${isArabic ? "الرقم المرجعي (Reference):" : "Reference No:"} ${receiptData.referenceNumber}
            </div>
          `
              : ""
          }
        </div>

        <table class="meta-grid">
            <tr>
                <td style="width: 50%; border-${isArabic ? "left" : "right"}: 1px dashed #000; padding: 4px 2px;">
                    <div class="meta-label">${isArabic ? "رقم الفاتورة" : "INVOICE NO"}</div>
                    <div class="meta-value">#${receiptData.invoiceNumber}</div>
                </td>
                <td style="width: 50%; padding: 4px 2px; text-align: ${isArabic ? "left" : "right"};">
                    <div class="meta-label">${isArabic ? "التاريخ / الوقت" : "DATE / TIME"}</div>
                    <div class="meta-date">${receiptData.dateFormatted}</div>
                    <div class="meta-date">${receiptData.timeFormatted}</div>
                </td>
            </tr>
        </table>

        ${
          showCustomerInfo
            ? `
          <div class="section-header">
            ${isArabic ? "بيانات العميل" : "CUSTOMER INFO"}
          </div>

          <div class="cust-info">
            <div class="cust-row">
              <span class="cust-label">
                ${isArabic ? "الاسم:" : "Name:"}
              </span>
              <span class="cust-value">
                ${receiptData.customer.name}
              </span>
            </div>

            ${
              receiptData.customer.phone
                ? `
              <div class="cust-row">
                <span class="cust-label">
                  ${isArabic ? "الهاتف:" : "Phone:"}
                </span>
                <span
                  class="cust-value phone"
                  style="direction:ltr;"
                >
                  ${receiptData.customer.phone}
                </span>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40%; text-align: ${isArabic ? "right" : "left"};">${isArabic ? "الصنف" : "Item"}</th>
                    <th style="width: 22%; text-align: center;">${isArabic ? "سعر" : "Price"}</th>
                    <th style="width: 10%; text-align: center;">${isArabic ? "ع" : "Qty"}</th>
                    <th style="width: 28%; text-align: ${isArabic ? "left" : "right"};">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
            </thead>
            <tbody>
            ${receiptData.items
              .map((item) => {
                const productName = item.name || item.nameAr || "منتج";
                const qty = Number(item.qty || 1);
                const itemTotal = Number(item.total || 0);
                const unitPrice = (
                  qty > 0 ? itemTotal / qty : Number(item.price || 0)
                ).toFixed(2);
                const variationsHTML = formatVariationsHTML(item.variations);

                const priceFontSize = scaledFontSizePx(unitPrice, 12, {
                  maxChars: 6,
                  minSizePx: 8,
                });
                const totalFontSize = scaledFontSizePx(
                  itemTotal.toFixed(2),
                  12,
                  {
                    maxChars: 6,
                    minSizePx: 8,
                  },
                );

                return `
                  <tr>
                    <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
                      ${productName}
                      ${variationsHTML}${item.notes ? `<div class="notes-row">(${item.notes})</div>` : ""}
                    </td>
                    <td class="item-price" style="font-size:${priceFontSize}px; direction: ltr;">
                      ${unitPrice}
                    </td>
                    <td class="item-qty">${qty}</td>
                    <td class="item-total" style="text-align: ${isArabic ? "left" : "right"}; font-size:${totalFontSize}px; direction: ltr;">
                      ${itemTotal.toFixed(2)}
                    </td>
                  </tr>
                `;
              })
              .join("")}
            </tbody>
        </table>

        <div class="totals-section">

            <div class="totals-row">
                <span>${isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>${Number(receiptData.subtotal || 0).toFixed(2)}</span>
            </div>

            <div class="totals-row" style="color: #000;">
                <span>${isArabic ? "الخصم" : "Discount"}</span>
                <span>${Number(receiptData.discount || 0) > 0 ? "-" : ""}${Number(receiptData.discount || 0).toFixed(2)}</span>
            </div>

            <div class="totals-row">
                <span>${isArabic ? "الضريبة" : "Tax"}</span>
                <span>${Number(receiptData.tax || 0).toFixed(2)}</span>
            </div>

            <div class="totals-row">
                <span>${isArabic ? "رسوم الخدمة" : "Service Fees"}</span>
                <span>${Number(receiptData.serviceFees || 0).toFixed(2)}</span>
            </div>

            <div class="grand-total">
                <span class="grand-total-label">${isArabic ? "الإجمالي الكلي" : "GRAND TOTAL"}</span>
                <span class="grand-total-value" style="font-size:${grandTotalFontSize}px;">${grandTotalText}</span>
            </div>

        </div>

        <div class="receipt-footer" style="text-align: center; margin-top: 14px; padding-bottom: 25px; color: #000;">
          <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; color: #000;">
            *** ${isArabic ? "شكرًا لزيارتكم" : "Thank you for your visit"} ***
          </p>

          <p style="margin-top: 5px; font-size: 11px; font-weight: bold; color: #000;">
            ${isArabic ? "بدعم من" : "Powered by"} <strong>Systego POS</strong>
          </p>

          <p style="margin-top: 3px; font-size: 12px; font-weight: 900; color: #000; letter-spacing: 0.5px;">
            www.systego.net
          </p>
        </div>

      </div>
    </body>
  </html>
  `;
};

// ===================================================================
// 4. اختيار التصميم
// ===================================================================
const getReceiptHTML = (receiptData, printerConfig) => {
  return formatCashierReceipt(receiptData);
};

// ===================================================================
// 5. تهيئة البيانات (prepareReceiptData)
// ===================================================================
export const prepareReceiptData = (
  orderItems,
  amountToPay,
  order_tax,
  totalDiscount,
  appliedDiscount,
  discountData,
  orderType,
  requiredTotal,
  responseSuccess,
  response,
  frontendTaxAmount = 0,
  serviceFeesFromAPI = 0,
) => {
  const rawResponse = response || {};
  const rootData = rawResponse?.data || rawResponse;
  const saleData = rootData.sale || rawResponse.sale || {};
  const storeData = rootData.store || rawResponse.store || {};
  const itemsList = rootData.items || rawResponse.items || [];
  const pricingDetails =
    rootData.pricing_details || rawResponse.pricing_details || {};
  const customerData =
    saleData.customer_id || rootData.customer || rawResponse.customer || {};

  const dateObj = saleData.date ? new Date(saleData.date) : new Date();
  const dateFormatted = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeFormatted = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  let detectedType = orderType || "sale";
  if (Number(saleData.shipping) > 0) {
    detectedType = "delivery";
  }

  // =========================================================
  // ✅ استخراج القيم المالية
  // =========================================================
  // ✅ discount: من pricing_details.discount_amount أو sale.discount
  const discountValue = Number(
    pricingDetails.discount_amount || saleData.discount || 0,
  );

  // ✅ tax: من API أولاً، بعدين من frontend
  const taxValue = Number(
    pricingDetails.tax_amount || saleData.tax_amount || frontendTaxAmount || 0,
  );

  // ✅ service fees: من API أولاً، بعدين من service fees API
  const serviceFeesValue = Number(
    pricingDetails.service_fee_total ||
      saleData.service_fee_total ||
      serviceFeesFromAPI ||
      0,
  );

  const formattedItems =
    itemsList && itemsList.length > 0
      ? itemsList.map((item, idx) => {
          const matchedOrderItem =
            orderItems?.find(
              (oi) =>
                oi.product_price_id &&
                String(oi.product_price_id) ===
                  String(item.product_price_id?._id || item.product_price_id),
            ) || orderItems?.[idx];

          const varNameFromCode = (() => {
            if (!item.product_price_id?.code) return "";
            const parts = item.product_price_id.code.split("_");
            return parts.length > 1 ? parts.slice(1).join(" ") : "";
          })();
          const varName =
            varNameFromCode || matchedOrderItem?.variant_name || "";

          const qty = Number(item.quantity || 1);
          const price = Number(item.price || matchedOrderItem?.price || 0);
          const total = Number(item.subtotal || price * qty);

          return {
            qty: qty,
            name:
              item.product_id?.name ||
              matchedOrderItem?.name ||
              "منتج غير معروف",
            nameAr: item.product_id?.ar_name || matchedOrderItem?.ar_name || "",
            price: price,
            total: total,
            notes: item.notes || matchedOrderItem?.notes || "",
            addons: [],
            extras: [],
            variations: varName ? [{ name: varName }] : [],
          };
        })
      : (orderItems || []).map((item) => {
          const qty = Number(item.count || item.quantity || 1);
          const price = Number(item.price || 0);
          const total = Number(item.totalPrice || price * qty);

          return {
            qty: qty,
            name: item.name || "منتج",
            nameAr: item.ar_name || "",
            price: price,
            total: total,
            notes: item.notes || "",
            addons: [],
            extras: [],
            variations: item.variant_name ? [{ name: item.variant_name }] : [],
          };
        });

  const calculatedSubtotal = formattedItems.reduce(
    (acc, item) => acc + Number(item.total || 0),
    0,
  );

  const dailyNum =
    saleData.daily_order_number ??
    saleData.dailyOrderNumber ??
    saleData.daily_count ??
    rawResponse.nextInvoiceNumber ??
    rootData.nextInvoiceNumber ??
    saleData._id ??
    "1";

  const refNum =
    saleData.reference ||
    saleData.reference_number ||
    saleData.referenceNo ||
    "";

  return {
    invoiceNumber: dailyNum,
    referenceNumber: refNum,
    dateFormatted: dateFormatted,
    timeFormatted: timeFormatted,
    orderType: detectedType,

    restaurantName: storeData.name || "اسم المتجر",
    restaurantAddress: storeData.address || "",
    restaurantPhone: storeData.phone || "",
    receiptFooter: sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم",

    customer: {
      name: customerData.name || "عميل نقدي",
      phone: customerData.phone_number || customerData.phone || "",
      email: customerData.email || "",
    },
    address: saleData.address || null,

    items: formattedItems,

    // ✅ القيم المالية
    subtotal: calculatedSubtotal.toFixed(2),
    discount: discountValue.toFixed(2),
    tax: taxValue.toFixed(2),
    serviceFees: serviceFeesValue.toFixed(2),

    total: Number(
      pricingDetails.grand_total ||
        saleData.grand_total ||
        saleData.total ||
        requiredTotal ||
        amountToPay ||
        0,
    ).toFixed(2),

    table: "N/A",
    preparationNum: null,
  };
};

// ===================================================================
// 6. دالة الطباعة (printReceiptSilently)
// ===================================================================
export const printReceiptSilently = async (
  receiptData,
  apiResponse,
  callback,
) => {
  try {
    const cashierHtml = getReceiptHTML(receiptData, {
      design: "full",
      type: "cashier",
    });

    const fallbackToBrowserPrint = () => {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        toast.error("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة");
        callback?.();
        return;
      }
      printWindow.document.write(cashierHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      callback?.();
    };

    if (window.electronAPI) {
      try {
        const printers = await window.electronAPI.getPrinters();

        if (!printers || printers.length === 0) {
          const result = await window.electronAPI.printReceiptImage(
            cashierHtml,
            "",
          );
          if (result?.savedToPdf) {
            toast.success("📄 تم حفظ الرسيت كـ PDF بنجاح");
          } else if (result?.reason === "canceled") {
            toast.info("⚠️ تم إلغاء حفظ الـ PDF");
          } else {
            toast.error(`❌ ${result?.error || "فشل الحفظ"}`);
          }
        } else {
          const defaultPrinter =
            printers.find((p) => p.isDefault)?.name || printers[0]?.name;

          const result = await window.electronAPI.printReceiptImage(
            cashierHtml,
            defaultPrinter,
          );

          if (result?.success && !result?.savedToPdf) {
            toast.success("✅ تم الطباعة");
          } else if (result?.savedToPdf) {
            toast.info(
              `🖨️ الطابعة غير متاحة${result?.escposError ? ` (${result.escposError})` : ""} — تم حفظ الرسيت كـ PDF`,
            );
          } else if (result?.reason === "canceled") {
            toast.info("⚠️ تم إلغاء الطباعة");
          } else {
            toast.error(`❌ فشل الطباعة: ${result?.error || "?"}`);
          }
        }
      } catch (err) {
        console.error("Electron print error:", err);
        toast.error("❌ فشل الطباعة عبر النظام");
      }
      callback?.();
      return;
    }

    fallbackToBrowserPrint();
  } catch (err) {
    console.error(err);
    toast.error("❌ فشل الطباعة");
    callback?.();
  }
};

// ===================================================================
// 7. دوال إعدادات الطابعة
// ===================================================================
export const addPrinterConfig = (key, config) => {
  PRINTER_CONFIG[key] = config;
};

export const getActivePrinters = () => {
  return Object.keys(PRINTER_CONFIG);
};

export const updatePrinterConfig = (key, updates) => {
  if (PRINTER_CONFIG[key])
    PRINTER_CONFIG[key] = { ...PRINTER_CONFIG[key], ...updates };
};
