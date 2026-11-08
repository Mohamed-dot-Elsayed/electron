import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePost } from "@/Hooks/usePost";
import { usePosSelections } from "@/Hooks/usePosSelections";
import { toast } from "react-toastify";

export default function AddCustomer({ onClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { postData, loading } = usePost();
  const { countries, customerGroups } = usePosSelections();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    address: "",
    country: "",
    city: "",
    customer_group_id: "",
  });

  // --- التعديل هنا ---
  // البحث عن البلد المختار واستخراج مصفوفة المدن منه
  const selectedCountry = countries.find(
    (country) => country._id === form.country
  );
  const cities = selectedCountry?.cities || [];
  // -------------------



  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      await postData("api/admin/customer/", form);
      toast.success(t("CustomerAddedSuccessfully"));
      onClose();
    } catch (err) {
      console.error("Error adding customer:", err);
      toast.error(
        err?.response?.data?.error?.message || t("ErrorAddingCustomer"),
      );
    }
  };

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-[500px] max-h-[90vh] overflow-y-auto p-6 relative">

        {/* زر X للإغلاق */}
        <button
          onClick={onClose}
          className={`absolute ${isArabic ? "left-3" : "right-3"} top-3 text-xl font-bold text-gray-600 hover:text-red-500`}
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-4">{t("AddCustomer")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <input
            name="name"
            placeholder={t("Name")}
            value={form.name}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="email"
            placeholder={t("Email")}
            value={form.email}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="phone_number"
            placeholder={t("Phone")}
            value={form.phone_number}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="address"
            placeholder={t("CustomerAddress")}
            value={form.address}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          {/* Country Select */}
          <select
            name="country"
            value={form.country}
            onChange={(e) => {
              // هذا الجزء صحيح - يقوم بمسح المدينة عند تغيير البلد
              setForm({ ...form, country: e.target.value, city: "" });
            }}
            className="border p-2 rounded"
          >

            <option value="">{t("SelectCountry")}</option>
            {countries.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>

          {/* City Select */}
          <select
            name="city"
            value={form.city}
            onChange={handleChange}
            // تعطيل حقل المدينة إذا لم يتم اختيار بلد أو كانت قائمة المدن فارغة
            disabled={!form.country || cities.length === 0}
            className="border p-2 rounded"
          >
            <option value="">{t("SelectCity")}</option>
            {cities.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>


          {/* Customer Group */}
          <select
            name="customer_group_id"
            value={form.customer_group_id}
            onChange={handleChange}
            className="border p-2 rounded col-span-2"
          >
            <option value="">{t("SelectCustomerGroup")}</option>
            {customerGroups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

        </div>

        <button
          onClick={handleSubmit}
          className="mt-5 w-full bg-bg-primary text-white py-2 rounded hover:bg-purple-700 transition"
        >
          {loading ? t("Saving") : t("SaveCustomer")}
        </button>
      </div>
    </div>
  );
}