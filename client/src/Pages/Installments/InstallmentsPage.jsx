import React, { useMemo, useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loader from "@/components/Loading";

const currency = (value) => Number(value || 0).toFixed(2);

const statusClass = (status) => {
  if (status === "paid") return "bg-teal-100 text-teal-700";
  if (status === "overdue") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-gray-200 text-gray-600";
  return "bg-amber-100 text-amber-700";
};

const PayInstallmentModal = ({ data, onClose, onPaid }) => {
  const { t, i18n } = useTranslation();
  const { putData, loading } = usePut();

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(
          i18n.language === "ar" ? "ar-EG" : "en-GB",
        )
      : "-";

  const financialAccounts = useMemo(() => {
    try {
      const parsed = JSON.parse(
        sessionStorage.getItem("financial_accounts") || "[]",
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const [accountId, setAccountId] = useState(
    financialAccounts[0]?._id ? String(financialAccounts[0]._id) : "",
  );
  const [amount, setAmount] = useState(String(data.remaining_amount || ""));

  const maxAmount = Number(data.remaining_amount || 0);

  const handleSubmit = async () => {
    const value = Number(amount) || 0;

    if (!accountId) return toast.error(t("installments.errors.selectAccount"));
    if (value <= 0) return toast.error(t("installments.errors.invalidAmount"));
    if (value > maxAmount + 0.001) {
      return toast.error(
        t("installments.errors.maxAmount", { amount: currency(maxAmount) }),
      );
    }

    try {
      await putData(
        `api/admin/pos/installments/plans/${data.plan_id}/items/${data._id}/pay`,
        {
          amount: value,
          financials: [{ account_id: accountId, amount: value }],
          note: t("installments.note"),
        },
      );

      toast.success(t("installments.collected"));
      onPaid?.();
      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          t("installments.errors.collectFailed"),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {t("installments.collectTitle")}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">{t("installments.customer")}</span>
            <span className="font-semibold">
              {data.customer_id?.name || t("installments.unknownCustomer")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t("installments.plan")}</span>
            <span className="font-semibold">
              {data.plan?.plan_number || data.plan_id}
            </span>
          </div>
          {data.plan?.source && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {t("installments.source")}
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  data.plan.source === "ecommerce"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-cyan-100 text-cyan-700"
                }`}
              >
                {data.plan.source === "ecommerce"
                  ? t("installments.sourceEcommerce")
                  : t("installments.sourcePos")}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">{t("installments.dueDate")}</span>
            <span className="font-semibold">{formatDate(data.due_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              {t("installments.itemRemaining")}
            </span>
            <span className="font-bold text-[#8B2635]">
              {currency(maxAmount)} {t("EGP")}
            </span>
          </div>
        </div>

        <label className="block text-xs text-gray-600 mb-1">
          {t("installments.collectionAccount")}
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full mb-3 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          {financialAccounts.length === 0 && (
            <option value="">{t("installments.noAccounts")}</option>
          )}
          {financialAccounts.map((acc) => (
            <option key={acc._id} value={String(acc._id)}>
              {acc.name}
            </option>
          ))}
        </select>

        <label className="block text-xs text-gray-600 mb-1">
          {t("installments.amount")}
        </label>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mb-4 text-sm border border-gray-300 rounded-lg px-3 py-2"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium"
          >
            {t("installments.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#8B2635] hover:bg-[#7a2030] text-white font-bold disabled:opacity-60"
          >
            {loading
              ? t("installments.collecting")
              : t("installments.confirmCollect")}
          </button>
        </div>
      </div>
    </div>
  );
};

const InstallmentsPage = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const statusLabel = (status) => {
    if (status === "paid") return t("installments.status.paid");
    if (status === "overdue") return t("installments.status.overdue");
    if (status === "cancelled") return t("installments.status.cancelled");
    return t("installments.status.pending");
  };

  const sourceLabel = (source) =>
    source === "ecommerce"
      ? t("installments.sourceEcommerce")
      : t("installments.sourcePos");

  const sourceClass = (source) =>
    source === "ecommerce"
      ? "bg-violet-100 text-violet-700 border-violet-200"
      : "bg-cyan-100 text-cyan-700 border-cyan-200";

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(
          i18n.language === "ar" ? "ar-EG" : "en-GB",
        )
      : "-";

  const { data, isLoading, error, refetch } = useGet(
    "api/admin/pos/installments/due",
  );

  const rows = useMemo(() => {
    const list = data?.data?.installments || [];
    const keyword = search.trim().toLowerCase();

    const filtered = keyword
      ? list.filter((row) => {
          const name = String(row.customer_id?.name || "").toLowerCase();
          const phone = String(row.customer_id?.phone_number || "").toLowerCase();
          const plan = String(row.plan?.plan_number || "").toLowerCase();
          return (
            name.includes(keyword) ||
            phone.includes(keyword) ||
            plan.includes(keyword)
          );
        })
      : list;

    const map = new Map();

    filtered.forEach((row) => {
      const key = String(row.plan_id);
      if (!map.has(key)) {
        map.set(key, {
          plan_id: row.plan_id,
          plan: row.plan || null,
          customer: row.customer_id || null,
          items: [],
          remaining: 0,
        });
      }
      const group = map.get(key);
      group.items.push(row);
      group.remaining += Number(row.remaining_amount || 0);
    });

    return Array.from(map.values());
  }, [data, search]);

  const totalRemaining = useMemo(
    () => rows.reduce((sum, group) => sum + group.remaining, 0),
    [rows],
  );

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <p className="text-center text-red-500 mt-8">
        {error?.message || t("installments.loadingFailed")}
      </p>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#8B2635]">
            {t("installments.title")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("installments.dueTotal")}: {currency(totalRemaining)}{" "}
            {t("EGP")}
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("installments.searchPlaceholder")}
          className="w-full sm:w-72 text-sm border border-gray-300 rounded-xl px-3 py-2"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          {t("installments.noDue")}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((group) => (
            <div
              key={group.plan_id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-l from-amber-50 to-white border-b border-amber-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {group.customer?.name ||
                        t("installments.unknownCustomer")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {group.customer?.phone_number || "-"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs bg-amber-100 text-amber-800 rounded-lg px-2 py-1 font-mono">
                      {group.plan?.plan_number || "—"}
                    </span>
                    {group.plan?.source && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sourceClass(
                          group.plan.source,
                        )}`}
                      >
                        {sourceLabel(group.plan.source)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs sm:text-sm">
                  <div>
                    <span className="block text-gray-500">
                      {t("installments.planTotal")}
                    </span>
                    <b className="text-gray-700">
                      {currency(group.plan?.total_payable)}
                    </b>
                  </div>
                  <div>
                    <span className="block text-gray-500">
                      {t("installments.paid")}
                    </span>
                    <b className="text-teal-700">
                      {currency(
                        Number(group.plan?.paid_amount || 0) +
                          Number(group.plan?.down_payment || 0),
                      )}
                    </b>
                  </div>
                  <div>
                    <span className="block text-gray-500">
                      {t("installments.remaining")}
                    </span>
                    <b className="text-[#8B2635]">
                      {currency(group.plan?.remaining_amount ?? group.remaining)}
                    </b>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {t("installments.installmentNumber", {
                            number: item.sequence,
                          })}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusClass(
                            item.status,
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(item.due_date)} —{" "}
                        {t("installments.remainingAmount", {
                          amount: currency(item.remaining_amount),
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelected(item)}
                      disabled={item.status === "paid"}
                      className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-[#8B2635] text-white hover:bg-[#7a2030] disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {t("installments.collect")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <PayInstallmentModal
          data={selected}
          onClose={() => setSelected(null)}
          onPaid={() => refetch()}
        />
      )}
    </div>
  );
};

export default InstallmentsPage;
