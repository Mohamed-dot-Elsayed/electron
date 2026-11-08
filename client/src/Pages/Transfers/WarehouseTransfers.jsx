import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Eye,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { usePut } from "@/Hooks/usePut";
import Loading from "@/components/Loading";

const getArray = (response, keys) => {
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce((current, part) => current?.[part], response);
    if (Array.isArray(value)) return value;
  }
  return Array.isArray(response?.data) ? response.data : [];
};

const getTransfer = (response) =>
  response?.data?.transfer ||
  response?.data?.data?.transfer ||
  response?.transfer ||
  response?.data?.data ||
  response?.data ||
  response;

const getProductDetails = (item) =>
  item?.productId && typeof item.productId === "object"
    ? item.productId
    : item?.product && typeof item.product === "object"
      ? item.product
      : item;

const getProductId = (item) =>
  item?.productId?._id ||
  item?.productId ||
  item?.product?._id ||
  item?.product ||
  item?._id;

const getPriceId = (item) =>
  item?.productPriceId?._id || item?.productPriceId || null;

const getProductName = (item, isArabic) => {
  const product = getProductDetails(item);
  const name = isArabic
    ? product?.ar_name || product?.name
    : product?.name || product?.ar_name;
  const variant =
    item?.productPriceId?.code ||
    item?.productPrice?.code ||
    item?.code;
  return variant ? `${name || ""} - ${variant}` : name || item?.code || "";
};

const getStoredWarehouseId = () => {
  try {
    const storedWarehouse = sessionStorage.getItem("warehouseId");
    if (storedWarehouse) {
      const parsed = JSON.parse(storedWarehouse);
      if (typeof parsed === "string") return parsed;
      if (parsed?._id) return String(parsed._id);
    }
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return String(user?.warehouse_id?._id || user?.warehouse_id || "");
  } catch {
    return "";
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const getTransferProducts = (transfer) =>
  transfer?.products ||
  transfer?.requested_products ||
  transfer?.items ||
  transfer?.approved_products ||
  [];

const isTransferFinal = (transfer) =>
  ["received", "completed", "approved", "rejected"].includes(
    String(transfer?.status || transfer?.state || "").toLowerCase(),
  );

const WarehouseTransfers = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const {
    data: transfersResponse,
    isLoading: transfersLoading,
    error: transfersError,
    refetch: refetchTransfers,
  } = useGet("api/admin/pos/transfer");
  const { data: warehousesResponse, isLoading: warehousesLoading } =
    useGet("api/admin/pos-home/warehouses");
  const { data: productsResponse, isLoading: productsLoading } =
    useGet("api/admin/pos/warehouse/products");
  const {
    isLoading: detailLoading,
    refetch: fetchTransfer,
  } = useGet(null);
  const { postData, loading: creating } = usePost();
  const { putData, loading: approving } = usePut();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [transferProducts, setTransferProducts] = useState([
    { productId: "", productPriceId: null, quantity: 1 },
  ]);
  const [approvedQuantities, setApprovedQuantities] = useState({});

  const transfers = getArray(transfersResponse, [
    "data.transfers",
    "data.data.transfers",
    "transfers",
    "data.data",
    "data",
  ]);
  const warehouses = getArray(warehousesResponse, [
    "data.warehouses",
    "data.data.warehouses",
    "warehouses",
    "data.data",
    "data",
  ]);
  const products = getArray(productsResponse, [
    "data.products",
    "data.data.products",
    "products",
    "data.data",
    "data",
  ]);
  const currentWarehouseId = getStoredWarehouseId();

  const filteredTransfers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const status = String(transfer.status || transfer.state || "").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        (statusFilter === "approved" &&
          ["completed", "received"].includes(status)) ||
        (statusFilter === "completed" && status === "received");
      const sourceName =
        transfer.fromWarehouseId?.name ||
        transfer.fromWarehouse?.name ||
        transfer.from_warehouse?.name ||
        transfer.sourceWarehouse?.name ||
        "";
      const targetName =
        transfer.toWarehouseId?.name ||
        transfer.toWarehouse?.name ||
        transfer.to_warehouse?.name ||
        transfer.destinationWarehouse?.name ||
        "";
      const reference =
        transfer.reference ||
        transfer.reference_number ||
        transfer.transferNumber ||
        transfer.code ||
        transfer._id ||
        "";
      const matchesSearch =
        !term ||
        `${reference} ${sourceName} ${targetName}`
          .toLowerCase()
          .includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, transfers]);

  const pageCount = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const visibleTransfers = filteredTransfers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const openTransferDetails = async (transfer) => {
    const id = transfer?._id || transfer?.id;
    if (!id) {
      toast.error(t("TransferIdMissing"));
      return;
    }

    setShowDetails(true);
    setActiveTransfer(null);
    setApprovedQuantities({});
    try {
      const response = await fetchTransfer(`api/admin/pos/transfer/${id}`);
      const details = getTransfer(response);
      setActiveTransfer(details);
      const requested = getTransferProducts(details);
      const existingApprovals =
        details?.approved_products || details?.approvedProducts || [];
      setApprovedQuantities(
        Object.fromEntries(
          requested.map((item, index) => {
            const approval = existingApprovals.find(
              (approvedItem) =>
                String(getProductId(approvedItem)) ===
                  String(getProductId(item)) &&
                String(getPriceId(approvedItem) || "") ===
                  String(getPriceId(item) || ""),
            );
            return [
              String(index),
              Number(
                approval?.quantity ??
                  item.approved_quantity ??
                  item.approvedQuantity ??
                  item.quantity ??
                  0,
              ),
            ];
          }),
        ),
      );
    } catch (error) {
      toast.error(error?.message || t("FailedToLoadTransfer"));
      setShowDetails(false);
    }
  };

  const resetCreateForm = () => {
    setToWarehouseId("");
    setReason("");
    setTransferProducts([{ productId: "", productPriceId: null, quantity: 1 }]);
  };

  const addProductRow = () => {
    setTransferProducts((current) => [
      ...current,
      { productId: "", productPriceId: null, quantity: 1 },
    ]);
  };

  const updateProductRow = (index, changes) => {
    setTransferProducts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  };

  const handleCreateTransfer = async (event) => {
    event.preventDefault();
    const selectedProducts = transferProducts.filter(
      (item) => item.productId && Number(item.quantity) > 0,
    );
    if (!toWarehouseId || !selectedProducts.length) {
      toast.error(t("CompleteTransferRequiredFields"));
      return;
    }

    try {
      await postData("api/admin/pos/transfer", {
        toWarehouseId,
        products: selectedProducts.map((item) => ({
          productId: item.productId,
          productPriceId: item.productPriceId || null,
          quantity: Number(item.quantity),
        })),
        reason: reason.trim(),
      });
      toast.success(t("TransferCreatedSuccessfully"));
      setShowCreate(false);
      resetCreateForm();
      await refetchTransfers();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || t("TransferCreateFailed"),
      );
    }
  };

  const handleApproveTransfer = async (event) => {
    event.preventDefault();
    const transferId = activeTransfer?._id || activeTransfer?.id;
    const warehouseId =
      activeTransfer?.warehouseId?._id ||
      activeTransfer?.warehouseId ||
      activeTransfer?.warehouse_id?._id ||
      activeTransfer?.warehouse_id ||
      activeTransfer?.toWarehouseId?._id ||
      activeTransfer?.toWarehouseId ||
      activeTransfer?.to_warehouse_id ||
      activeTransfer?.toWarehouse?._id ||
      activeTransfer?.to_warehouse?._id ||
      currentWarehouseId;
    if (!transferId || !warehouseId) {
      toast.error(t("TransferWarehouseMissing"));
      return;
    }

    const approvedProducts = getTransferProducts(activeTransfer).map(
      (item, index) => ({
        productId: getProductId(item),
        productPriceId: getPriceId(item),
        quantity: Math.max(
          0,
          Number(approvedQuantities[String(index)]) || 0,
        ),
      }),
    );

    try {
      await putData(`api/admin/pos/transfer/${transferId}`, {
        warehouseId,
        approved_products: approvedProducts,
      });
      toast.success(t("TransferApprovalSaved"));
      setShowDetails(false);
      setActiveTransfer(null);
      await refetchTransfers();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || t("TransferApprovalFailed"),
      );
    }
  };

  if (transfersLoading && !transfersResponse) return <Loading />;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
          <ArrowLeftRight className="h-6 w-6 text-rose-600" />
          {t("WarehouseTransfers")}
        </h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          {t("AddTransfer")}
        </button>
      </header>

      {transfersError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {transfersError.message || t("FailedToLoadTransfers")}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-gray-100 p-2 lg:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-red-400 px-3 py-2 focus-within:ring-2 focus-within:ring-red-100">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("SearchByNameCode")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </label>
          <select
            aria-label={t("ItemsPerPage")}
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} {t("ItemsPerPage")}
              </option>
            ))}
          </select>
          <label className="relative">
            <span className="sr-only">{t("TransferStatus")}</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm text-gray-700"
            >
              <option value="all">{t("AllStatuses")}</option>
              <option value="pending">{t("Pending")}</option>
              <option value="approved">{t("TransferStatus_approved")}</option>
              <option value="received">{t("TransferStatus_received")}</option>
              <option value="completed">{t("Completed")}</option>
              <option value="rejected">{t("Rejected")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">{t("Reference")}</th>
                <th className="px-3 py-3 font-semibold">{t("FromWarehouse")}</th>
                <th className="px-3 py-3 font-semibold">{t("ToWarehouse")}</th>
                <th className="px-3 py-3 font-semibold">{t("Date")}</th>
                <th className="px-3 py-3 font-semibold">{t("TransferStatus")}</th>
                <th className="px-3 py-3 font-semibold">{t("ItemsCount")}</th>
                <th className="px-3 py-3 font-semibold">{t("Quantities")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransfers.map((transfer, index) => {
                const requested = getTransferProducts(transfer);
                const requestedQuantity = requested.reduce(
                  (sum, item) => sum + (Number(item.quantity) || 0),
                  0,
                );
                const approvedQuantity = requested.reduce(
                  (sum, item) =>
                    sum +
                    (Number(item.approved_quantity ?? item.approvedQuantity) ||
                      0),
                  0,
                );
                const approvedTotal = Array.isArray(transfer.approved_products)
                  ? transfer.approved_products.reduce(
                      (sum, item) => sum + (Number(item.quantity) || 0),
                      0,
                    )
                  : approvedQuantity;
                const rejectedQuantity = Array.isArray(
                  transfer.rejected_products,
                )
                  ? transfer.rejected_products.reduce(
                      (sum, item) => sum + (Number(item.quantity) || 0),
                      0,
                    )
                  : Math.max(0, requestedQuantity - approvedTotal);
                const status = String(
                  transfer.status || transfer.state || "pending",
                ).toLowerCase();
                const reference =
                  transfer.reference ||
                  transfer.reference_number ||
                  transfer.transferNumber ||
                  transfer.code ||
                  transfer._id ||
                  "-";
                const key = transfer._id || transfer.id || `${reference}-${index}`;
                const sourceName =
                  transfer.fromWarehouseId?.name ||
                  transfer.fromWarehouse?.name ||
                  transfer.from_warehouse?.name ||
                  transfer.sourceWarehouse?.name ||
                  "-";
                const targetName =
                  transfer.toWarehouseId?.name ||
                  transfer.toWarehouse?.name ||
                  transfer.to_warehouse?.name ||
                  transfer.destinationWarehouse?.name ||
                  "-";

                return (
                  <tr
                    key={key}
                    className="border-t border-gray-100 transition-colors even:bg-gray-50/70 hover:bg-gray-50"
                  >
                    <td className="px-3 py-3 font-medium text-gray-800">
                      {reference}
                    </td>
                    <td className="px-3 py-3">{sourceName}</td>
                    <td className="px-3 py-3">{targetName}</td>
                    <td className="px-3 py-3">
                      {formatDate(
                        transfer.date ||
                          transfer.createdAt ||
                          transfer.created_at,
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ["received", "completed", "approved"].includes(status)
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "rejected"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t(
                          `TransferStatus_${status}`,
                          status.charAt(0).toUpperCase() + status.slice(1),
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">{requested.length}</td>
                    <td className="px-3 py-3 text-xs leading-5">
                      <div>
                        {t("Requested")}:{" "}
                        <strong>{requestedQuantity}</strong>
                      </div>
                      <div className="text-emerald-700">
                        {t("Approved")}: <strong>{approvedTotal}</strong>
                      </div>
                      <div className="text-rose-600">
                        {t("Rejected")}: <strong>{rejectedQuantity}</strong>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleTransfers.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-gray-500"
                  >
                    {t("NoTransfersFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 pt-3 text-sm text-gray-500">
          <span>
            {filteredTransfers.length
              ? `${(page - 1) * pageSize + 1}-${Math.min(
                  page * pageSize,
                  filteredTransfers.length,
                )} / ${filteredTransfers.length}`
              : "0"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("Previous")}
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("Next")}
            </button>
          </div>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
          <form
            onSubmit={handleCreateTransfer}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                {t("AddTransfer")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
                aria-label={t("Close")}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 block text-sm font-semibold text-gray-700">
              {t("ToWarehouse")}
              <select
                required
                value={toWarehouseId}
                onChange={(event) => setToWarehouseId(event.target.value)}
                disabled={warehousesLoading}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-rose-400"
              >
                <option value="">{t("SelectWarehouse")}</option>
                {warehouses
                  .filter(
                    (warehouse) =>
                      String(warehouse._id || warehouse.id) !==
                      String(currentWarehouseId),
                  )
                  .map((warehouse) => (
                    <option
                      key={warehouse._id || warehouse.id}
                      value={warehouse._id || warehouse.id}
                    >
                      {(isArabic
                        ? warehouse.ar_name || warehouse.name
                        : warehouse.name || warehouse.ar_name) || "-"}
                    </option>
                  ))}
              </select>
            </label>

            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t("Products")}</h3>
              <button
                type="button"
                onClick={addProductRow}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Plus className="h-4 w-4" />
                {t("AddProduct")}
              </button>
            </div>

            <div className="space-y-3">
              {transferProducts.map((item, index) => {
                const selectedProduct = products.find(
                  (product) =>
                    String(getProductId(product)) === String(item.productId) &&
                    String(getPriceId(product) || "") ===
                      String(item.productPriceId || ""),
                );
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[1fr_120px_40px]"
                  >
                    <label className="min-w-0 text-xs font-semibold text-gray-500">
                      {t("Product")}
                      <select
                        required
                        value={
                          selectedProduct
                            ? `${getProductId(selectedProduct)}::${getPriceId(selectedProduct) || ""}`
                            : ""
                        }
                        onChange={(event) => {
                          const [productId, productPriceId] =
                            event.target.value.split("::");
                          updateProductRow(index, {
                            productId,
                            productPriceId: productPriceId || null,
                          });
                        }}
                        disabled={productsLoading}
                        className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800"
                      >
                        <option value="">{t("SelectProduct")}</option>
                        {products.map((product, productIndex) => {
                          const id = getProductId(product);
                          const priceId = getPriceId(product);
                          return (
                            <option
                              key={`${id}-${priceId || productIndex}`}
                              value={`${id}::${priceId || ""}`}
                            >
                              {getProductName(product, isArabic)}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-500">
                      {t("Quantity")}
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(event) =>
                          updateProductRow(index, {
                            quantity: event.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-800"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={transferProducts.length === 1}
                      onClick={() =>
                        setTransferProducts((current) =>
                          current.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                      aria-label={t("RemoveProduct")}
                      className="mt-5 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {selectedProduct && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 sm:col-span-3">
                        <Package className="h-3.5 w-3.5" />
                        {t("Available")}:{" "}
                        {selectedProduct.stock_quantity ??
                          selectedProduct.quantity ??
                          "-"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <label className="mt-4 block text-sm font-semibold text-gray-700">
              {t("Reason")}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 font-normal outline-none focus:border-rose-400"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={creating || productsLoading || warehousesLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {creating ? t("Submitting") : t("CreateTransfer")}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                {t("TransferDetails")}
              </h2>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                aria-label={t("Close")}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading || !activeTransfer ? (
              <div className="flex justify-center py-10">
                <Loading />
              </div>
            ) : (
              <form onSubmit={handleApproveTransfer}>
                {isTransferFinal(activeTransfer) && (
                  <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    {t("TransferCannotBeChanged")}
                  </div>
                )}
                <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-gray-500">{t("Reference")}: </span>
                    <strong>
                      {activeTransfer.reference ||
                        activeTransfer.reference_number ||
                        activeTransfer.transferNumber ||
                        activeTransfer.code ||
                        activeTransfer._id}
                    </strong>
                  </p>
                  <p>
                    <span className="text-gray-500">{t("TransferStatus")}: </span>
                    <strong>
                      {activeTransfer.status || activeTransfer.state || "-"}
                    </strong>
                  </p>
                  <p>
                    <span className="text-gray-500">{t("FromWarehouse")}: </span>
                    <strong>
                      {activeTransfer.fromWarehouseId?.name ||
                        activeTransfer.fromWarehouse?.name ||
                        activeTransfer.from_warehouse?.name ||
                        "-"}
                    </strong>
                  </p>
                  <p>
                    <span className="text-gray-500">{t("ToWarehouse")}: </span>
                    <strong>
                      {activeTransfer.toWarehouseId?.name ||
                        activeTransfer.toWarehouse?.name ||
                        activeTransfer.to_warehouse?.name ||
                        "-"}
                    </strong>
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-3">{t("Product")}</th>
                        <th className="px-3 py-3">{t("Requested")}</th>
                        <th className="px-3 py-3">{t("ApprovedQuantity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTransferProducts(activeTransfer).map(
                        (item, index) => (
                          <tr
                            key={`${getProductId(item)}-${index}`}
                            className="border-t border-gray-100"
                          >
                            <td className="px-3 py-3 font-medium text-gray-800">
                              {getProductName(item, isArabic)}
                            </td>
                            <td className="px-3 py-3">
                              {Number(item.quantity) || 0}
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                max={Number(item.quantity) || undefined}
                                value={approvedQuantities[String(index)] ?? 0}
                                onChange={(event) =>
                                  setApprovedQuantities((current) => ({
                                    ...current,
                                    [String(index)]: event.target.value,
                                  }))
                                }
                                className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-rose-400"
                              />
                            </td>
                          </tr>
                        ),
                      )}
                      {!getTransferProducts(activeTransfer).length && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            {t("NoTransferProducts")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    {t("Close")}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      approving ||
                      !getTransferProducts(activeTransfer).length ||
                      isTransferFinal(activeTransfer)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {approving ? t("Submitting") : t("SaveApproval")}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default WarehouseTransfers;
