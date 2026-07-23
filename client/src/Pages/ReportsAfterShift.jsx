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
  FaArrowUp
} from "react-icons/fa";

// ─── ترويسة موحدة لأقسام التقرير ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-purple-600" />
    {title}
  </h3>
);

// ─── بطاقة إحصائية مبسطة ───
const CompactStatCard = ({ icon: Icon, title, value, subValue }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
    <div className="p-3 rounded-full bg-white shadow-sm text-purple-600">
      <Icon className="text-xl" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{title}</p>
      <p className="font-bold text-gray-800 text-lg">{value}</p>
      {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
    </div>
  </div>
);

// ─── مكون تقرير الطباعة ───
const PrintableReport = React.forwardRef(({ reportData, t, formatAmount, isArabic }, ref) => {
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};

  // استخراج البيانات بناءً على هيكل الـ JSON الجديد
  const report = apiData?.report || {};
  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || []; // تفاصيل كل خزنة/طريقة دفع
  const totals = financialSummary.totals || {}; // الإجماليات العامة
  const ordersSummary = report.ordersSummary || {};
  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];

  // التواريخ
  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : "--:--";
  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now") || "الآن";

  return (
    <div ref={ref} className="print-report-container" style={{ display: 'none' }}>
      <style>
        {`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0.5cm; font-family: 'Tahoma', sans-serif; font-size: 12px; color: #000; direction: ${isArabic ? "rtl" : "ltr"}; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 10px; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; display: block; font-size: 13px; padding-bottom: 2px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
          .table th { border-bottom: 1px solid #000; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold; padding: 2px; }
          .table td { border-bottom: 1px dotted #ccc; padding: 3px 2px; }
          .total-box { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin-top: 10px; font-weight: bold; font-size: 14px; text-align: center; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; }
          .bold { font-weight: bold; }
        }
        `}
      </style>

      <div className="header">
        <div className="title">{t("EndShiftReport")}</div>
        <div className="subtitle">{message.includes("preview") ? `(${t("Preview")})` : ""}</div>
        <div className="subtitle">{new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</div>
      </div>

      <div className="section">
        <span className="section-title">{t("ShiftInfo")}</span>
        <div className="row"><span>{t("ShiftID")}:</span> <span>#{shift._id?.slice(-6) || "N/A"}</span></div>
        <div className="row"><span>{t("From")}:</span> <span>{shiftStart}</span></div>
        <div className="row"><span>{t("To")}:</span> <span>{shiftEnd}</span></div>
        <div className="row"><span>{t("TotalOrders")}:</span> <span>{ordersSummary.totalOrders || 0}</span></div>
      </div>

      {/* تفاصيل الحسابات (Financial Breakdown) */}
      <div className="section">
        <span className="section-title">{t("FinancialDetails")}</span>
        <table className="table">
          <thead>
            <tr>
              <th width="30%">{t("Method")}</th>
              <th width="25%">{t("Sales")}</th>
              <th width="20%">{t("Exp.")}</th>
              <th width="25%">{t("Net")}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, idx) => (
              <tr key={idx}>
                <td>{acc.name === "cash" ? t("Cash") : acc.name}</td>
                <td>{formatAmount(acc.salesAmount, "")}</td>
                <td>{acc.expensesAmount > 0 ? `-${formatAmount(acc.expensesAmount, "")}` : "0"}</td>
                <td className="bold">{formatAmount(acc.net, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المصروفات التفصيلية */}
      {expensesList.length > 0 && (
        <div className="section">
          <span className="section-title">{t("ExpensesList")}</span>
          <table className="table">
            <thead>
              <tr>
                <th>{t("Desc")}</th>
                <th>{t("Acc")}</th>
                <th>{t("Val")}</th>
              </tr>
            </thead>
            <tbody>
              {expensesList.map((exp, idx) => (
                <tr key={idx}>
                  <td>{exp.description}</td>
                  <td>{exp.account?.name}</td>
                  <td>{formatAmount(Math.abs(exp.amount), "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* الملخص المالي النهائي */}
      <div className="section">
        <div className="row bold">
          <span>{t("TotalSales")}:</span>
          <span>{formatAmount(totals.totalSales)}</span>
        </div>
        <div className="row bold">
          <span>{t("TotalExpenses")}:</span>
          <span>-{formatAmount(totals.totalExpenses)}</span>
        </div>
      </div>

      <div className="total-box">
        <div>{t("NetCashInDrawer")}</div>
        <div style={{ fontSize: "18px", marginTop: "5px" }}>{formatAmount(totals.netCashInDrawer)}</div>
      </div>

      <div className="footer">
        {t("SystemGeneratedReport")}
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

// ─── المكون الرئيسي (Modal) ───
export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  // استخراج البيانات من الـ Response
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};
  const report = apiData?.report || {};

  // 1. ملخص الطلبات
  const ordersSummary = report.ordersSummary || { totalOrders: 0 };

  // 2. الملخص المالي (Accounts & Totals)
  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || []; // المصفوفة التي تحتوي على cash, visa, etc.
  const totals = financialSummary.totals || { totalSales: 0, totalExpenses: 0, netCashInDrawer: 0 };

  // 3. المصروفات
  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];

  // تنسيق العملة
  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  // توقيتات الشيفت
  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : "--:--";
  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now");

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <title>${t("EndShiftReport")}</title>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300" dir={isArabic ? "rtl" : "ltr"}>

        {/* Premium Header */}
        <div className="bg-bg-primary p-6 text-white flex justify-between items-center relative overflow-hidden">
          <div className="z-10">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FaReceipt className="text-white/80" />
              {t("EndShiftReport")}
            </h2>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">{message}</p>
          </div>
          <button onClick={onClose} className="z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <FaTimes size={18} />
          </button>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">

          {/* Shift Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {/* Financial Breakdown Table */}
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
                    <th className="px-6 py-4 text-start">{t("Net")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {accounts.map((acc, index) => (
                    <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {acc.name === "cash" ? t("Cash") : acc.name.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-green-600 font-black">
                        {formatAmount(acc.salesAmount)}
                      </td>
                      <td className="px-6 py-4 text-red-400 font-bold">
                        {acc.expensesAmount > 0 ? `-${formatAmount(acc.expensesAmount)}` : "-"}
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 bg-gray-50/50">
                        {formatAmount(acc.net)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-900 text-white font-black">
                    <td className="px-6 py-5 rounded-bl-[1.5rem]">{t("Total")}</td>
                    <td className="px-6 py-5 text-green-400">{formatAmount(totals.totalSales)}</td>
                    <td className="px-6 py-5 text-red-400">-{formatAmount(totals.totalExpenses)}</td>
                    <td className="px-6 py-5 text-white rounded-br-[1.5rem]">{formatAmount(totals.netCashInDrawer)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses Detail Section */}
          {expensesList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <FaArrowDown className="text-red-500" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">{t("ExpensesBreakdown")}</h3>
              </div>
              <div className="space-y-3">
                {expensesList.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500 font-black text-xs border border-gray-100 group-hover:bg-red-500 group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{exp.description}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                          <FaArrowUp size={8} /> {t("Account")}: <span className="text-gray-500">{exp.account?.name}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-red-500 text-lg">-{formatAmount(Math.abs(exp.amount || 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Net Cash Card */}
          <div className="bg-gradient-to-br from-gray-800 to-black rounded-[2.5rem] p-8 text-center text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom duration-700">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t("NetCashInDrawer")}</p>
              <h1 className="text-5xl font-black tracking-tighter group-hover:scale-110 transition-transform duration-500">{formatAmount(totals.netCashInDrawer)}</h1>
              <div className="w-16 h-1 bg-bg-primary mx-auto my-4 rounded-full opacity-50" />
              <p className="text-[10px] text-white/30 font-bold">
                {t("CalculatedFrom")}: {t("TotalSales")} - {t("TotalExpenses")}
              </p>
            </div>
            {/* Background decoration */}
            <FaMoneyBillWave className="absolute -bottom-6 -right-6 text-9xl text-white opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent)]" />
          </div>

        </div>

        {/* Footer Actions */}
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

      {/* Hidden Print Component */}
      <PrintableReport
        ref={printRef}
        reportData={reportData}
        t={t}
        formatAmount={formatAmount}
        isArabic={isArabic}
      />
    </div>
  );
}