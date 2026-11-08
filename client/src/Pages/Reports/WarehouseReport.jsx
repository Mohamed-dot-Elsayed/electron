import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Search } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getWarehouse = (response) =>
  response?.data?.warehouse ||
  response?.data?.branch ||
  response?.data?.destination ||
  response?.warehouse ||
  response?.branch ||
  response?.destination ||
  (response?.data && !Array.isArray(response.data) ? response.data : {}) ||
  {};

const getProducts = (response) => {
  const products =
    response?.data?.products ??
    response?.data?.data?.products ??
    response?.products ??
    (Array.isArray(response?.data) ? response.data : []);

  return Array.isArray(products) ? products : [];
};

const WarehouseReport = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { data, isLoading: loading, error } =
    useGet("api/admin/pos/warehouse/products");

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const warehouse = getWarehouse(data);
  const products = getProducts(data);

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => {
        const productDetails =
          product?.productId && typeof product.productId === "object"
            ? product.productId
            : product?.product && typeof product.product === "object"
              ? product.product
              : product;
        const variationText = (product.variationOptions || [])
          .map((option) => {
            if (!option?.name) return null;
            const variationName = isArabic
              ? option.variationId?.ar_name || option.variationId?.name
              : option.variationId?.name;
            return variationName
              ? `${variationName}: ${option.name}`
              : option.name;
          })
          .filter(Boolean)
          .join(" | ");
        const baseName = isArabic
          ? productDetails.ar_name || productDetails.name
          : productDetails.name || productDetails.ar_name;
        const unitPrice = Number(
          product.productPriceId?.price ??
            product.productPrice?.price ??
            product.price ??
            0,
        );
        const quantity = Number(
          product.stock_quantity ?? product.quantity ?? 0,
        );

        return {
          ...product,
          displayName: `${baseName || ""}${
            variationText ? ` - ${variationText}` : ""
          }`,
          image: product.image || productDetails.image,
          code:
            product.productPriceId?.code ||
            product.productPrice?.code ||
            product.code ||
            productDetails.code,
          quantity,
          lowStock:
            product.low_stock ??
            product.lowStock ??
            productDetails.low_stock ??
            0,
          unitPrice,
          totalPrice: unitPrice * quantity,
        };
      }),
    [isArabic, products],
  );

  const summary = useMemo(
    () =>
      enrichedProducts.reduce(
        (totals, product) => ({
          totalQuantity: totals.totalQuantity + (Number(product.quantity) || 0),
          totalAmount: totals.totalAmount + (Number(product.totalPrice) || 0),
        }),
        { totalQuantity: 0, totalAmount: 0 },
      ),
    [enrichedProducts],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return enrichedProducts;

    return enrichedProducts.filter((product) =>
      `${product.displayName} ${product.code || ""}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [enrichedProducts, search]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  if (loading && !data) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error.message || t("FailedLoadingWarehouseReport")}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900">
            {t("Warehouse")}:{" "}
            {isArabic
              ? warehouse.ar_name || warehouse.name
              : warehouse.name || warehouse.ar_name}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="text-gray-400">{t("Phone")}</span>
            <span className="font-medium text-gray-900">
              {warehouse.phone || warehouse.phone_number || "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">{t("TotalQuantity")}</span>
            <span className="text-lg font-black text-gray-900">
              {summary.totalQuantity.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">{t("TotalAmount")}</span>
            <span className="text-lg font-black text-emerald-600">
              {formatCurrency(summary.totalAmount)}{" "}
              <span className="text-xs font-medium text-gray-400">EGP</span>
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          {t("InventoryManagement")}
        </h2>

        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-gray-100 p-2 sm:flex-row">
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
          <label className="sr-only" htmlFor="warehouse-report-page-size">
            {t("ItemsPerPage")}
          </label>
          <select
            id="warehouse-report-page-size"
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">{t("Product")}</th>
                <th className="px-3 py-3 font-semibold">{t("Quantity")}</th>
                <th className="px-3 py-3 font-semibold">
                  {t("LowStockAlert")}
                </th>
                <th className="px-3 py-3 font-semibold">{t("UnitPrice")}</th>
                <th className="px-3 py-3 font-semibold">{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product, index) => (
                <tr
                  key={
                    product.stockId ||
                    product._id ||
                    `${product.displayName}-${index}`
                  }
                  className="border-t border-gray-100 transition-colors even:bg-gray-50/70 hover:bg-gray-50"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {product.displayName || t("Product")}
                        </p>
                        {product.code && (
                          <p className="font-mono text-xs text-gray-500">
                            {product.code}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-lg bg-gray-100 px-3 py-1 font-bold text-gray-900">
                      {product.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-lg bg-rose-50 px-3 py-1 font-bold text-rose-600">
                      {Number(product.lowStock) || 0}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-700">
                    {formatCurrency(product.unitPrice)}{" "}
                    <span className="text-xs font-medium text-gray-400">
                      EGP
                    </span>
                  </td>
                  <td className="px-3 py-3 font-black text-emerald-600">
                    {formatCurrency(product.totalPrice)}{" "}
                    <span className="text-xs font-medium text-gray-400">
                      EGP
                    </span>
                  </td>
                </tr>
              ))}
              {!visibleProducts.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-sm text-gray-500"
                  >
                    {t("NoWarehouseProductsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 pt-3 text-sm text-gray-500">
          <span>
            {filteredProducts.length
              ? `${(page - 1) * pageSize + 1}-${Math.min(
                  page * pageSize,
                  filteredProducts.length,
                )} / ${filteredProducts.length}`
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
    </div>
  );
};

export default WarehouseReport;
