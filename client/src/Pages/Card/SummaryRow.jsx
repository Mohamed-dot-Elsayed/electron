import React from "react";
import { useTranslation } from "react-i18next";

const SummaryRow = ({ label, value }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const safeValue = Number(value || 0);

  return (
    <div
      className={`flex justify-between items-center py-1 ${isArabic ? "flex-row-reverse" : ""
        }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-700">
        {safeValue.toFixed(2)} {isArabic ? "ج.م" : "EGP"}
      </span>
    </div>
  );
};

export default SummaryRow;
