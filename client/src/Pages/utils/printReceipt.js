import qz from "qz-tray";
import { toast } from "react-toastify";

// ===================================================================
// 1. HashMap للطابعات
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
// 4. تصميم إيصال الكاشير (مُعدَّل لإضافة الـ Variations)
// ===================================================================

const formatCashierReceipt = (receiptData) => {
  const isArabic = localStorage.getItem("language") === "ar";
  
  // دالة مساعدة لتنسيق وعرض الـ Variations (الحجم واللون)
  const formatVariationsHTML = (variationsArray) => {
    if (!Array.isArray(variationsArray) || variationsArray.length === 0) {
      return "";
    }
    
    // سحب أسماء الخيارات وضمها في سطر واحد
    const variationsText = variationsArray
      .map(v => v.name)
      .filter(Boolean)
      .join(", ");
      
    if (!variationsText) return "";

    return `<div class="addon-row" style="font-weight:normal;"> ${variationsText}</div>`;
  };


const showCustomerInfo = receiptData.customer && 
  (
    (receiptData.customer.name && receiptData.customer.name.trim() !== "" && receiptData.customer.name !== "عميل نقدي") ||
    (receiptData.customer.phone && receiptData.customer.phone.trim() !== "")
  );
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: auto; }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background-color: #fff;
          font-family: 'Tahoma', 'Arial', sans-serif;
          color: #000;
          direction: ${isArabic ? "rtl" : "ltr"};
          font-size: 13px;
        }
        .container {
          width: 100% !important;
          padding: 0 4px;
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
        }
        .item-qty { font-size: 12px; font-weight: bold; text-align: center; white-space: nowrap; color: #000; }
        .item-name { font-size: 12px; font-weight: bold; padding: 0 2px; color: #000; word-break: break-word; }
        .item-price { font-size: 12px; font-weight: bold; text-align: center; white-space: nowrap; color: #000; }
        .item-total { font-size: 12px; font-weight: 900; white-space: nowrap; color: #000; }
        
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
        }
        
        .grand-total {
            border: 2px solid #000;
            padding: 6px 8px;
            margin-top: 6px;
            text-align: center;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
            color: #000;
        }
        .grand-total-label {
            font-size: 16px;
            font-weight: 900;
            color: #000;
        }
        .grand-total-value {
            font-size: 22px;
            font-weight: 900;
            color: #000;
            white-space: nowrap;
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

      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <h1>${receiptData.restaurantName}</h1>
          ${receiptData.restaurantAddress ? `<p>${receiptData.restaurantAddress}</p>` : ""}
          ${receiptData.restaurantPhone ? `<div class="phone">${receiptData.restaurantPhone}</div>` : ""}
          ${receiptData.referenceNumber ? `
            <div class="ref-number">
              ${isArabic ? "الرقم المرجعي (Reference):" : "Reference No:"} ${receiptData.referenceNumber}
            </div>
          ` : ""}
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

${showCustomerInfo ? `
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

    ${receiptData.customer.phone ? `
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
    ` : ""}
  </div>
` : ""}

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 42%; text-align: ${isArabic ? "right" : "left"};">${
isArabic ? "الصنف" : "Item"}</th>
                    <th style="width: 22%; text-align: center;">${isArabic ? "سعر" : "Price"}</th>
                    <th style="width: 12%; text-align: center;">${isArabic ? "ع" : "Qty"}</th>
                    <th style="width: 24%; text-align: ${isArabic ? "left" : "right"};">${
isArabic ? "إجمالي" : "Total"}</th>
                </tr>
            </thead>
            <tbody>
            ${receiptData.items.map((item) => {
                // اسم المنتج باللغة الإنجليزية دائمًا حتى لو واجهة المستخدم باللغة العربية
                const productName = item.name || item.nameAr;
                const unitPrice = (item.total / item.qty).toFixed(2); // سعر القطعة = الإجمالي ÷ الكمية
                
                // تنسيق الـ Variations
                const variationsHTML = formatVariationsHTML(item.variations);

                return `
                  <tr>
                    <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">${
                      productName}
                      ${variationsHTML}
                      ${item.notes ? `<div class="notes-row">(${item.notes})</div>` : ""}
                    </td>
                    <td class="item-price">
                      ${unitPrice}
                    </td>
                    <td class="item-qty">${item.qty}</td>
                    <td class="item-total" style="text-align: ${isArabic ? "left" : "right"};">${
item.total.toFixed(2)}</td>
                  </tr>
                `;
            }).join("")}
            </tbody>
        </table>

        <div class="totals-section">

            <div class="totals-row">
                <span>${isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>${Number(receiptData.subtotal).toFixed(2)}</span>
            </div>

            ${Number(receiptData.discount) > 0 ? `
            <div class="totals-row" style="color: #000;">
                <span>${isArabic ? "الخصم" : "Discount"}</span>
                <span>-${receiptData.discount}</span>
            </div>` : ""}

            ${Number(receiptData.tax) > 0 ? `
            <div class="totals-row">
                <span>${isArabic ? "الضريبة" : "Tax"}</span>
                <span>${receiptData.tax}</span>
            </div>` : ""}

            ${Number(receiptData.deliveryFees) > 0 ? `
            <div class="totals-row">
                <span>${isArabic ? "الشحن" : "Shipping"}</span>
                <span>${receiptData.deliveryFees}</span>
            </div>` : ""}

            <div class="grand-total">
                <span class="grand-total-label">${isArabic ? "الإجمالي الكلي" : "GRAND TOTAL"}</span>
                <span class="grand-total-value">${Number(receiptData.total).toFixed(2)}</span>
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
// 7. اختيار التصميم
// ===================================================================
const getReceiptHTML = (receiptData, printerConfig) => {
  return formatCashierReceipt(receiptData);
};

// ===================================================================
// 8. تهيئة البيانات (مُعدَّلة لسحب الـ Variations)
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
) => {
  // 1. استخراج البيانات من الهيكل
  const rootData = response?.data || response || {};
  const saleData = rootData.sale || {};
  const storeData = rootData.store || {};
  const itemsList = rootData.items || [];
  const customerData = saleData.customer_id || rootData.customer || {};

  // 2. معالجة التواريخ
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

  // 3. تحديد نوع الطلب
  let detectedType = "sale";
  if (Number(saleData.shipping) > 0) {
    detectedType = "delivery";
  }

  // 4. استخراج قيم الضريبة والخصم من الهيكل الجديد
  const taxValue = saleData.order_tax?.amount || saleData.tax_amount || 0;
  const discountValue = saleData.order_discount?.amount || saleData.discount || 0;

  // 5. حساب المجموع الفرعي (Subtotal) يدوياً من المنتجات
  const calculatedSubtotal = itemsList.reduce((acc, item) => {
    return acc + (Number(item.subtotal) || (Number(item.price) * Number(item.quantity)) || 0);
  }, 0);

  // 6. استخراج رقم الفاتورة اليومي بدقة والرقم المرجعي
  const dailyNum = (saleData.daily_order_number !== undefined && saleData.daily_order_number !== null)
    ? saleData.daily_order_number
    : (saleData.dailyOrderNumber !== undefined && saleData.dailyOrderNumber !== null)
      ? saleData.dailyOrderNumber
      : (saleData.daily_count !== undefined && saleData.daily_count !== null)
        ? saleData.daily_count
        : (saleData.reference || saleData._id || "1");

  const refNum = saleData.reference || saleData.reference_number || saleData.referenceNo || "";

  return {
    // البيانات الأساسية (رقم الفاتورة اليومي المتسلسل)
    invoiceNumber: dailyNum,
    referenceNumber: refNum,
    dateFormatted: dateFormatted,
    timeFormatted: timeFormatted,
    orderType: detectedType,

    // بيانات المحل
    restaurantName: storeData.name || "اسم المتجر",
    restaurantAddress: storeData.address || "",
    restaurantPhone: storeData.phone || "",
    receiptFooter: sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم",

    // بيانات العميل
    customer: {
      name: customerData.name || "عميل نقدي",
      phone: customerData.phone_number || "",
      email: customerData.email || ""
    },
    address: saleData.address || null,

    // المنتجات
    items: (itemsList && itemsList.length > 0)
      ? itemsList.map((item, idx) => {
          const matchedOrderItem = orderItems?.find((oi) =>
            (oi.product_price_id && String(oi.product_price_id) === String(item.product_price_id?._id || item.product_price_id)) ||
            (String(oi._id || oi.product_id) === String(item.product_id?._id || item.product_id))
          ) || orderItems?.[idx];

          const varName = matchedOrderItem?.variant_name || (() => {
            if (!item.product_price_id?.code) return "";
            const parts = item.product_price_id.code.split('_');
            return parts.length > 1 ? parts.slice(1).join(' ') : "";
          })();

          return {
            qty: item.quantity,
            name: item.product_id?.name || matchedOrderItem?.name || "منتج غير معروف",
            nameAr: item.product_id?.ar_name || matchedOrderItem?.ar_name || "",
            price: Number(item.price || matchedOrderItem?.price || 0),
            total: Number(item.subtotal || (Number(item.price || matchedOrderItem?.price || 0) * Number(item.quantity || 1))),
            notes: matchedOrderItem?.notes || "",
            addons: [],
            extras: [],
            variations: varName ? [{ name: varName }] : [],
          };
        })
      : (orderItems || []).map((item) => ({
          qty: item.count || item.quantity || 1,
          name: item.name || "منتج",
          nameAr: item.ar_name || "",
          price: Number(item.price || 0),
          total: Number(item.totalPrice || (item.price * (item.count || 1))),
          notes: item.notes || "",
          addons: [],
          extras: [],
          variations: item.variant_name ? [{ name: item.variant_name }] : [],
        })),

    // الحسابات المالية
    subtotal: calculatedSubtotal.toFixed(2),
    discount: Number(discountValue).toFixed(2),
    tax: Number(taxValue).toFixed(2),
    deliveryFees: Number(saleData.shipping || 0).toFixed(2),
    
    // الإجمالي النهائي
    total: Number(saleData.grand_total || saleData.total || 0).toFixed(2),

    // حقول إضافية
    serviceFees: 0,
    table: "N/A",
    preparationNum: null,
  };
};

// ===================================================================
// 9. دالة الطباعة
// ===================================================================
export const printReceiptSilently = async (
  receiptData,
  apiResponse,
  callback
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
        callback();
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${cashierHtml}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      callback();
    };

    // 1. Electron Native Printing
    if (window.electronAPI) {
      try {
        const printers = await window.electronAPI.getPrinters();

        if (!printers || printers.length === 0) {
          // ❌ لا توجد طابعات مسجلة على الجهاز → احفظ PDF
          const result = await window.electronAPI.printHtml(cashierHtml, ""); // بدون printerName → PDF
          if (result?.savedToPdf) {
            toast.success("📄 تم حفظ الرسيت كـ PDF بنجاح");
          } else if (result?.reason === "canceled") {
            toast.info("⚠️ تم إلغاء حفظ الـ PDF");
          }
        } else {
          // ✅ في طابعات → اطبع على الـ default (أو الأولى)
          const defaultPrinter =
            printers.find((p) => p.isDefault)?.name || printers[0]?.name;

          const result = await window.electronAPI.printHtml(cashierHtml, defaultPrinter);
          if (result?.success) {
            toast.success("✅ تم الطباعة");
          } else if (result?.savedToPdf) {
            // الطابعة فشلت → تم الحفظ كـ PDF بدلاً منها
            toast.info("🖨️ الطابعة غير متاحة — تم حفظ الرسيت كـ PDF");
          }
        }
      } catch (err) {
        console.error("Electron print error:", err);
        toast.error("❌ فشل الطباعة عبر النظام");
      }
      callback();
      return;
    }

    // 2. Standard Browser Print (Fallback if not in Electron)
    fallbackToBrowserPrint();

  } catch (err) {
    console.error(err);
    toast.error("❌ فشل الطباعة");
    callback();
  }
};

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