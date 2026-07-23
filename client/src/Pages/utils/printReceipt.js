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
        /* نفس التنسيقات القديمة بالضبط لعدم تغيير الشكل */
        @page { margin: 0; size: auto; }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background-color: #fff;
          font-family: 'Tahoma', 'Arial', sans-serif;
          color: #000;
          direction: ${isArabic ? "rtl" : "ltr"};
          font-size: 12px;
        }
        .container {
          width: 100% !important;
          padding: 5px 2px;
          margin: 0;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { 
            font-size: 24px; 
            font-weight: 900; 
            margin: 0; 
            text-transform: uppercase; 
            letter-spacing: 1px;
        }
        .header p { margin: 2px 0; font-size: 12px; color: #333; }
        .header .phone { font-weight: bold; font-size: 13px; margin-top: 2px;}

        .order-badge {
            border: 2px solid #000;
            color: black;
            text-align: center;
            font-size: 18px;
            font-weight: 900;
            padding: 5px;
            margin: 5px 0;
            border-radius: 4px;
        }
        .table-info { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px; }

        .meta-grid { 
            width: 100%; 

            margin-bottom: 8px;
            padding: 5px 0;
        }
        .meta-grid td { vertical-align: middle; }
        .meta-label { font-size: 10px; color: #555; }
        .meta-value { font-size: 14px; font-weight: 900; }

        .section-header {
            background-color: #eee;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            color: #000;
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            padding: 3px 0;
            margin-top: 8px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { 
            text-align: center; 
            font-size: 11px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 4px;
        }
        .items-table td { 
            padding: 6px 0; 
            border-bottom: 1px dashed #ccc;
            vertical-align: top;
        }
        .item-qty { font-size: 13px; font-weight: bold; text-align: center; }
        .item-name { font-size: 13px; font-weight: bold; padding: 0 5px; }
        .item-total { font-size: 13px; font-weight: bold; text-align: center; }
        
        .addon-row { font-size: 11px; color: #444; margin-top: 2px; font-weight: normal; }
        .notes-row { font-size: 11px; font-style: italic; color: #555; }

        .totals-section { width: 100%; margin-top: 10px; }
        .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; font-weight: bold;}
        
        .grand-total {
            border: 2px solid #000;
            padding: 8px;
            margin-top: 8px;
            text-align: center;
            font-size: 22px;
            font-weight: 900;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
          <p>${receiptData.restaurantAddress}</p>
          <div class="phone">${receiptData.restaurantPhone}</div>
        </div>

        
        <table class="meta-grid">
            <tr>
                <td width="50%" style="border-${isArabic ? "left" : "right"}: 1px dotted #000; padding: 0 5px;">
                    <div class="meta-label">${isArabic ? "رقم الفاتورة" : "INVOICE NO"}</div>
                    <div class="meta-value" style="font-size: 18px;">#${receiptData.invoiceNumber}</div>
                </td>
                <td width="50%" style="padding: 0 5px; text-align: ${isArabic ? "left" : "right"};">
                    <div class="meta-label">${isArabic ? "التاريخ / الوقت" : "DATE / TIME"}</div>
                    <div style="font-weight: bold; font-size: 11px;">${receiptData.dateFormatted}</div>
                    <div style="font-weight: bold; font-size: 11px;">${receiptData.timeFormatted}</div>
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
                    <th width="45%" style="text-align: ${isArabic ? "right" : "left"};">${isArabic ? "الصنف" : "Item"}</th>
                    <th width="15%">${isArabic ? "سعر" : "Price"}</th>
                    <th width="15%">${isArabic ? "ع" : "Qty"}</th>
                    <th width="20%">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
            </thead>
            <tbody>
            ${receiptData.items.map((item) => {
                const productName = isArabic && item.nameAr ? item.nameAr : item.name;
                const unitPrice = (item.total / item.qty).toFixed(2); // سعر القطعة = الإجمالي ÷ الكمية
                
                // تنسيق الـ Variations
                const variationsHTML = formatVariationsHTML(item.variations);

                return `
                  <tr>
                    <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
                      ${productName}
                      ${variationsHTML}
                    </td>
                    <td class="item-price" style="text-align: center; font-weight: bold;">
                      ${unitPrice}
                    </td>
                    <td class="item-qty">${item.qty}</td>
                    <td class="item-total">${item.total.toFixed(2)}</td>
                  </tr>
                `;
            }).join("")}
            </tbody>
        </table>

        <div style="border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-size: 13px;">

            <div class="totals-row">
                <span>${isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>${Number(receiptData.subtotal).toFixed(2)}</span>
            </div>

            ${Number(receiptData.discount) > 0 ? `
            <div class="totals-row" style="color: #d00;">
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
                <span style="font-size: 18px;">${isArabic ? "الإجمالي الكلي" : "GRAND TOTAL"}</span>
                <span style="font-size: 24px;">${Number(receiptData.total).toFixed(2)}</span>
            </div>

        </div>

<div style="text-align: center; margin-top: 15px; font-size: 11px;">
  <p style="margin: 5px 0 0 0;">
    *** ${isArabic ? "شكرًا لزيارتكم" : "Thank you for your visit"} ***
  </p>

  <p style="margin-top: 4px; font-size: 9px; opacity: 0.7;">
    ${isArabic ? "بدعم من" : "Powered by"} <strong>Systego POS</strong>
  </p>

  <p style="margin-top: 2px; font-size: 9px; opacity: 0.6;">
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
  // الأولوية للقيمة داخل الأوبجكت (order_tax.amount) وإذا لم توجد نأخذ القيمة القديمة
  const taxValue = saleData.order_tax?.amount || saleData.tax_amount || 0;
  const discountValue = saleData.order_discount?.amount || saleData.discount || 0;

  // 5. حساب المجموع الفرعي (Subtotal) يدوياً من المنتجات
  // لأن sale.total في الرد القادم هو المبلغ النهائي وليس الفرعي
  const calculatedSubtotal = itemsList.reduce((acc, item) => {
    return acc + (Number(item.subtotal) || (Number(item.price) * Number(item.quantity)) || 0);
  }, 0);

  return {
    // البيانات الأساسية
    invoiceNumber: saleData.reference || saleData._id || "---",
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
    items: itemsList.map((item) => {
        const productOptions = item.product_price_id?.options || [];
        return {
            qty: item.quantity,
            name: item.product_id?.name || "منتج غير معروف",
            nameAr: item.product_id?.ar_name || "",
            price: Number(item.price || 0),
            total: Number(item.subtotal || 0),
            notes: "", 
            addons: [], 
            extras: [],
variations: (() => {
    if (!item.product_price_id?.code) return [];

    const code = item.product_price_id.code;
    const parts = code.split('_');

    // لو في أكتر من جزء، نعتبر اللي بعد الأول هو الـ variation
    if (parts.length > 1) {
        const variationPart = parts.slice(1).join(' '); // لو في أكتر من underscore
        // نحولها لكابيتال أول حرف
        return [{
            name: variationPart.charAt(0).toUpperCase() + variationPart.slice(1).replace(/_/g, ' ')
        }];
    }

    return [];
})(),        };
    }),

    // الحسابات المالية (محدثة)
    subtotal: calculatedSubtotal.toFixed(2), // المجموع المحسوب من العناصر
    discount: Number(discountValue).toFixed(2), // الخصم من الأوبجكت الجديد
    tax: Number(taxValue).toFixed(2),           // الضريبة من الأوبجكت الجديد
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
    if (!qz.websocket.isActive()) {
      toast.error("❌ QZ Tray is not connected.");
      callback();
      return;
    }

    const printJobs = [];

    // 1. طباعة فاتورة الكاشير (للعميل)
    try {
      const cashierPrinterName = await qz.printers.getDefault();
      if (!cashierPrinterName) throw new Error("No default printer found.");

      const cashierHtml = getReceiptHTML(receiptData, {
        design: "full",
        type: "cashier",
      });
      
      const cashierConfig = qz.configs.create(cashierPrinterName);

      printJobs.push(
        qz.print(cashierConfig, [
          { type: "html", format: "plain", data: cashierHtml },
        ])
      );
    } catch (err) {
      console.error(err);
      toast.error("خطأ في الطابعة الافتراضية");
    }

    // 2. إلغاء جزء المطبخ (Kitchen)
    // ...

    await Promise.all(printJobs);
    toast.success("✅ تم الطباعة");
    callback();
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