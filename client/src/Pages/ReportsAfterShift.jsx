// src/Pages/EndShiftReportModal.jsx
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaShoppingCart,
  FaReceipt,
  FaCheckCircle,
  FaPrint,
  FaTimes,
  FaArrowDown,
  FaArrowUp,
  FaUndoAlt,
} from "react-icons/fa";

// ─── ترويسة موحدة ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-purple-600" />
    {title}
  </h3>
);

// ─── بطاقة إحصائية ───
const CompactStatCard = ({ icon: Icon, title, value, subValue }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
    <div className="p-3 rounded-full bg-white shadow-sm text-purple-600">
      <Icon className="text-xl" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
        {title}
      </p>
      <p className="font-bold text-gray-800 text-lg">{value}</p>
      {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
    </div>
  </div>
);

// ─── دالة بناء HTML للطباعة ───
const buildPrintHTML = ({ reportData, t, formatAmount, isArabic }) => {
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};

  const report = apiData?.report || {};
  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || [];
  const totals = financialSummary.totals || {};
  const ordersSummary = report.ordersSummary || {};
  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];
  const returnsData = report.returns || {};
  const returnsList = returnsData.rows || [];
  const returnsCount = returnsList.length;

  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(
        isArabic ? "ar-EG" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      )
    : "--:--";

  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(
        isArabic ? "ar-EG" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      )
    : t("Now") || "الآن";

  const printDate = new Date().toLocaleString(isArabic ? "ar-EG" : "en-US");

  // ✅ تنسيق الأرقام بدون عملة (للجداول)
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const accountsRows = accounts
    .map(
      (acc) => `
      <tr>
        <td>${acc.name === "cash" ? t("Cash") : acc.name}</td>
        <td class="num">${fmt(acc.salesAmount)}</td>
        <td class="num">${acc.expensesAmount > 0 ? `-${fmt(acc.expensesAmount)}` : "0"}</td>
        <td class="num">${acc.returnsAmount > 0 ? `-${fmt(acc.returnsAmount)}` : "0"}</td>
        <td class="num bold">${fmt(acc.net)}</td>
      </tr>
    `,
    )
    .join("");

  const expensesRows = expensesList
    .map(
      (exp) => `
      <tr>
        <td>${exp.description || "-"}</td>
        <td>${exp.account?.name || "-"}</td>
        <td class="num">${fmt(Math.abs(exp.amount || 0))}</td>
      </tr>
    `,
    )
    .join("");

  const returnsRows = returnsList
    .map(
      (ret, idx) => `
      <tr>
        <td>${ret.description || ret.order_id || `#${idx + 1}`}</td>
        <td>${ret.account?.name || "-"}</td>
        <td class="num">${fmt(Math.abs(ret.amount || 0))}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html dir="${isArabic ? "rtl" : "ltr"}">
    <head>
      <meta charset="UTF-8">
      <title>${t("EndShiftReport")}</title>
      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @page {
          size: 80mm auto;
          margin: 1mm;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: visible !important;
        }
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          font-size: 10px;
          color: #000;
          background: #fff;
          direction: ${isArabic ? "rtl" : "ltr"};
          line-height: 1.35;
          padding: 2px;
        }

        /* ===== Header ===== */
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .header .title {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 2px 0;
        }
        .header .subtitle {
          font-size: 9px;
          margin: 1px 0;
        }
        .header .subtitle.date {
          direction: ltr;
          unicode-bidi: embed;
        }

        /* ===== Section ===== */
        .section {
          margin-bottom: 6px;
        }
        .section-title {
          font-weight: bold;
          font-size: 10px;
          border-bottom: 1px solid #000;
          margin: 0 0 3px 0;
          padding-bottom: 2px;
          display: block;
          text-align: ${isArabic ? "right" : "left"};
          direction: ${isArabic ? "rtl" : "ltr"};
        }

        /* ===== Row ===== */
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
          font-size: 10px;
          gap: 4px;
          direction: ${isArabic ? "rtl" : "ltr"};
        }
        .row span:first-child {
          flex-shrink: 0;
          white-space: nowrap;
          text-align: ${isArabic ? "right" : "left"};
        }
        .row span:last-child {
          text-align: ${isArabic ? "left" : "right"};
          word-break: break-word;
          overflow-wrap: anywhere;
          min-width: 0;
          direction: ltr;
          unicode-bidi: embed;
        }
        .bold { font-weight: bold; }

        /* ===== Table ===== */
        .table {
          width: 100% !important;
          border-collapse: collapse;
          font-size: 8px;
          margin-top: 3px;
          table-layout: fixed;
          direction: ${isArabic ? "rtl" : "ltr"};
        }
        .table th {
          border-bottom: 1px solid #000;
          text-align: center;
          font-weight: bold;
          padding: 2px 1px;
          font-size: 7px;
          white-space: normal;
          word-break: break-word;
          line-height: 1.2;
        }
        .table td {
          border-bottom: 1px dotted #ccc;
          padding: 2px 1px;
          font-size: 7.5px;
          vertical-align: middle;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          text-align: center;
        }
        .table td.num {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          text-align: center;
          font-size: 7px;
          direction: ltr;
          unicode-bidi: embed;
        }

        /* ===== Total Box ===== */
        .total-box {
          border-top: 2px dashed #000;
          border-bottom: 2px dashed #000;
          padding: 6px 0;
          margin-top: 6px;
          text-align: center;
        }
        .total-label {
          font-weight: bold;
          font-size: 12px;
        }
        .total-value {
          font-size: 15px;
          font-weight: bold;
          margin-top: 3px;
          word-break: break-word;
          overflow-wrap: anywhere;
          direction: ltr;
          unicode-bidi: embed;
        }

        /* ===== Footer ===== */
        .footer {
          text-align: center;
          font-size: 8px;
          margin-top: 10px;
          border-top: 1px solid #000;
          padding-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${t("EndShiftReport")}</div>
        ${
          message.includes("preview")
            ? `<div class="subtitle">(${t("Preview")})</div>`
            : ""
        }
        <div class="subtitle date">${printDate}</div>
      </div>

      <div class="section">
        <span class="section-title">${t("ShiftInfo")}</span>
        <div class="row"><span>${t("ShiftID")}:</span><span>#${shift._id?.slice(-6) || "N/A"}</span></div>
        <div class="row"><span>${t("From")}:</span><span>${shiftStart}</span></div>
        <div class="row"><span>${t("To")}:</span><span>${shiftEnd}</span></div>
        <div class="row"><span>${t("TotalOrders")}:</span><span>${ordersSummary.totalOrders || 0}</span></div>
        <div class="row"><span>${t("TotalReturns")}:</span><span>${returnsCount}</span></div>
      </div>

      <div class="section">
        <span class="section-title">${t("FinancialDetails")}</span>
        <table class="table">
          <colgroup>
            <col style="width:24%">
            <col style="width:21%">
            <col style="width:18%">
            <col style="width:16%">
            <col style="width:21%">
          </colgroup>
          <thead>
            <tr>
              <th>${t("Method")}</th>
              <th>${t("Sales")}</th>
              <th>${t("Exp.")}</th>
              <th>${t("Ret.")}</th>
              <th>${t("Net")}</th>
            </tr>
          </thead>
          <tbody>
            ${accountsRows || `<tr><td colspan="5" style="text-align:center">-</td></tr>`}
          </tbody>
        </table>
      </div>

      ${
        expensesList.length > 0
          ? `
        <div class="section">
          <span class="section-title">${t("ExpensesList")}</span>
          <table class="table">
            <colgroup>
              <col style="width:50%">
              <col style="width:25%">
              <col style="width:25%">
            </colgroup>
            <thead>
              <tr>
                <th>${t("Desc")}</th>
                <th>${t("Acc")}</th>
                <th>${t("Val")}</th>
              </tr>
            </thead>
            <tbody>${expensesRows}</tbody>
          </table>
        </div>
      `
          : ""
      }

      ${
        returnsList.length > 0
          ? `
        <div class="section">
          <span class="section-title">${t("ReturnsList")}</span>
          <table class="table">
            <colgroup>
              <col style="width:50%">
              <col style="width:25%">
              <col style="width:25%">
            </colgroup>
            <thead>
              <tr>
                <th>${t("Desc")}</th>
                <th>${t("Acc")}</th>
                <th>${t("Val")}</th>
              </tr>
            </thead>
            <tbody>${returnsRows}</tbody>
          </table>
        </div>
      `
          : ""
      }

      <div class="section">
        <div class="row bold">
          <span>${t("TotalSales")}:</span>
          <span>${fmt(totals.totalSales)}</span>
        </div>
        <div class="row bold">
          <span>${t("TotalExpenses")}:</span>
          <span>-${fmt(totals.totalExpenses)}</span>
        </div>
        <div class="row bold">
          <span>${t("TotalReturns")} (${returnsCount}):</span>
          <span>-${fmt(totals.totalReturns)}</span>
        </div>
        ${
          totals.unassignedReturnsAmount > 0
            ? `
          <div class="row">
            <span>${t("UnassignedReturns")}:</span>
            <span>-${fmt(totals.unassignedReturnsAmount)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="total-box">
        <div class="total-label">${t("NetCashInDrawer")}</div>
        <div class="total-value">${fmt(totals.netCashInDrawer)} ${t("EGP")}</div>
      </div>

      <div class="footer">${t("SystemGeneratedReport")}</div>
    </body>
    </html>
  `;
};

// ─── المكون الرئيسي ───
export default function EndShiftReportModal({
  reportData,
  onClose,
  onConfirmClose,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};
  const report = apiData?.report || {};

  const ordersSummary = report.ordersSummary || { totalOrders: 0 };

  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || [];
  const totals = financialSummary.totals || {
    totalSales: 0,
    totalExpenses: 0,
    totalReturns: 0,
    unassignedReturnsAmount: 0,
    netCashInDrawer: 0,
  };

  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];

  const returnsData = report.returns || {};
  const returnsList = returnsData.rows || [];
  const returnsCount = returnsList.length;

  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(
        isArabic ? "ar-EG" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      )
    : "--:--";

  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(
        isArabic ? "ar-EG" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      )
    : t("Now");

  const handlePrint = async () => {
    const printHTML = buildPrintHTML({
      reportData,
      t,
      formatAmount,
      isArabic,
    });

    if (window.electronAPI?.printHtml) {
      try {
        const printers = await window.electronAPI.getPrinters();
        const defaultPrinter =
          printers.find((p) => p.isDefault)?.name || printers[0]?.name || "";

        console.log("=== FRONTEND: SENDING TO PRINT ===", {
          printer: defaultPrinter,
          htmlLength: printHTML.length,
        });

        const result = await window.electronAPI.printHtml(
          printHTML,
          defaultPrinter,
          {
            pageHeight: 0,
            pageWidth: 512, // ✅ 72mm (زي الأوردر العادي)
          },
        );

        console.log("=== FRONTEND: PRINT RESULT ===", result);
        return;
      } catch (err) {
        console.error("Electron print error:", err);
      }
    }

    const printWindow = window.open("", "_blank", "width=500,height=800");
    if (!printWindow) {
      console.error("Could not open print window");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-sans">
      <div
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="bg-bg-primary p-6 text-white flex justify-between items-center relative overflow-hidden">
          <div className="z-10">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FaReceipt className="text-white/80" />
              {t("EndShiftReport")}
            </h2>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <FaTimes size={18} />
          </button>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CompactStatCard
              icon={FaClock}
              title={t("ShiftDuration")}
              value={`${shiftStart} - ${shiftEnd}`}
              subValue={new Date().toLocaleDateString()}
            />
            <CompactStatCard
              icon={FaShoppingCart}
              title={t("TotalOrders")}
              value={ordersSummary.totalOrders}
            />
            <CompactStatCard
              icon={FaUndoAlt}
              title={t("TotalReturns")}
              value={returnsCount}
              subValue={formatAmount(totals.totalReturns)}
            />
          </div>

          <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FaMoneyBillWave size={14} className="text-bg-primary" />
                {t("FinancialDetails")}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-6 py-4 text-start">{t("Account")}</th>
                    <th className="px-6 py-4 text-start">{t("Sales")}</th>
                    <th className="px-6 py-4 text-start">{t("Expenses")}</th>
                    <th className="px-6 py-4 text-start">{t("Returns")}</th>
                    <th className="px-6 py-4 text-start">{t("Net")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {accounts.map((acc, index) => (
                    <tr
                      key={index}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {acc.name === "cash"
                          ? t("Cash")
                          : acc.name.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-green-600 font-black">
                        {formatAmount(acc.salesAmount)}
                      </td>
                      <td className="px-6 py-4 text-red-400 font-bold">
                        {acc.expensesAmount > 0
                          ? `-${formatAmount(acc.expensesAmount)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-orange-500 font-bold">
                        {acc.returnsAmount > 0
                          ? `-${formatAmount(acc.returnsAmount)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 bg-gray-50/50">
                        {formatAmount(acc.net)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-gray-900 text-white font-black">
                    <td className="px-6 py-5 rounded-bl-[1.5rem]">
                      {t("Total")}
                    </td>
                    <td className="px-6 py-5 text-green-400">
                      {formatAmount(totals.totalSales)}
                    </td>
                    <td className="px-6 py-5 text-red-400">
                      -{formatAmount(totals.totalExpenses)}
                    </td>
                    <td className="px-6 py-5 text-orange-400">
                      -{formatAmount(totals.totalReturns)}
                    </td>
                    <td className="px-6 py-5 text-white rounded-br-[1.5rem]">
                      {formatAmount(totals.netCashInDrawer)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {totals.unassignedReturnsAmount > 0 && (
              <div className="px-6 py-3 bg-orange-50 border-t border-orange-100 text-xs font-bold text-orange-600 flex justify-between">
                <span>{t("UnassignedReturns")}</span>
                <span>-{formatAmount(totals.unassignedReturnsAmount)}</span>
              </div>
            )}
          </div>

          {expensesList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <FaArrowDown className="text-red-500" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">
                  {t("ExpensesBreakdown")}
                </h3>
              </div>
              <div className="space-y-3">
                {expensesList.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500 font-black text-xs border border-gray-100 group-hover:bg-red-500 group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          {exp.description}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                          <FaArrowUp size={8} /> {t("Account")}:{" "}
                          <span className="text-gray-500">
                            {exp.account?.name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-red-500 text-lg">
                      -{formatAmount(Math.abs(exp.amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {returnsList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <FaUndoAlt className="text-orange-500" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">
                  {t("ReturnsBreakdown")}
                </h3>
              </div>
              <div className="space-y-3">
                {returnsList.map((ret, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-orange-500 font-black text-xs border border-gray-100 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          {ret.description ||
                            ret.order_id ||
                            `${t("Return")} #${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                          <FaArrowUp size={8} /> {t("Account")}:{" "}
                          <span className="text-gray-500">
                            {ret.account?.name || "-"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-orange-500 text-lg">
                      -{formatAmount(Math.abs(ret.amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-gray-800 to-black rounded-[2.5rem] p-8 text-center text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom duration-700">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                {t("NetCashInDrawer")}
              </p>
              <h1 className="text-5xl font-black tracking-tighter group-hover:scale-110 transition-transform duration-500">
                {formatAmount(totals.netCashInDrawer)}
              </h1>
              <div className="w-16 h-1 bg-bg-primary mx-auto my-4 rounded-full opacity-50" />
              <p className="text-[10px] text-white/30 font-bold">
                {t("CalculatedFrom")}: {t("TotalSales")} - {t("TotalExpenses")}{" "}
                - {t("TotalReturns")}
              </p>
            </div>
            <FaMoneyBillWave className="absolute -bottom-6 -right-6 text-9xl text-white opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent)]" />
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-white flex gap-4">
          <button
            onClick={handlePrint}
            className="w-16 h-16 flex items-center justify-center bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-bg-primary transition-all shadow-sm"
          >
            <FaPrint size={20} />
          </button>

          <button
            onClick={onConfirmClose}
            className="flex-1 px-8 py-5 bg-bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-purple-100 hover:shadow-2xl hover:shadow-purple-200 hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center gap-3"
          >
            <FaCheckCircle size={18} />
            {t("ConfirmCloseShift")}
          </button>
        </div>
      </div>
    </div>
  );
}
