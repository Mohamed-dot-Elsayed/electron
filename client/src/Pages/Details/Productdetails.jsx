import React, { useMemo } from "react";
import {
  Package,
  MapPin,
  Boxes,
  Building2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useGet } from "../../Hooks/useGet"; // ⚠️ adjust this path to wherever useGet.js actually lives in your project

/**
 * ProductDetails
 * ---------------------------------------------------------------------------
 * GET /pos-home/products/:productId/warehouse-stock
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     message: string,
 *     product: { name, ar_name, image, price, quantity, code, description,
 *                low_stock, cost, whole_price, minimum_quantity_sale,
 *                free_shipping, Is_Online, ... },
 *     warehouseStock: [
 *       { warehouseId, warehouseName, warehouseAddress, quantity, low_stock }
 *     ]
 *   }
 * }
 * ---------------------------------------------------------------------------
 */

const COLORS = {
  page: "#F3F4F7",
  surface: "#FFFFFF",
  ink: "#151821",
  muted: "#646B7A",
  faint: "#9BA1AF",
  line: "#E4E6EC",
  accent: "#2F5FE0",
  accentSoft: "#EAF0FF",
  good: "#1C8A5B",
  goodSoft: "#E7F5EE",
  low: "#C1740F",
  lowSoft: "#FBF0DF",
  out: "#D6455A",
  outSoft: "#FBE9EC",
};

// quantity <= 0 → out · quantity <= threshold → low · else in stock
/* function stockStatus(quantity, threshold) {
  if (threshold && quantity <= threshold)
    return { label: "Low stock", color: COLORS.low, soft: COLORS.lowSoft };
  return { label: "In stock", color: COLORS.good, soft: COLORS.goodSoft };
} */

function StatusPill({ status }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: status.soft, color: status.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {status.label}
    </span>
  );
}

function WarehouseRow({ wh, isLast }) {
 // const status = stockStatus(wh.quantity, wh.low_stock);
  return (
    <tr style={{ borderBottom: isLast ? "none" : `1px solid ${COLORS.line}` }}>
      <td className="py-4 pl-5 pr-3">
        <div className="flex items-center gap-2">
          <Building2
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: COLORS.faint }}
          />
          <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
            {wh.warehouseName}
          </span>
        </div>
      </td>
      <td className="py-4 pr-3 max-w-[300px]">
        <div className="flex items-start gap-2">
          <MapPin
            className="h-3.5 w-3.5 shrink-0 mt-0.5"
            style={{ color: COLORS.faint }}
          />
          <span className="text-sm" style={{ color: COLORS.muted }}>
            {wh.warehouseAddress}
          </span>
        </div>
      </td>
      <td className="py-4 pr-3">
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: COLORS.ink }}
        >
          {wh.quantity.toLocaleString()}
        </span>
      </td>
      <td className="py-4 pr-5">
        <StatusPill status={status} />
      </td>
    </tr>
  );
}

function WarehouseCardMobile({ wh }) {
  //const status = stockStatus(wh.quantity, wh.low_stock);
  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: `1px solid ${COLORS.line}`,
        backgroundColor: COLORS.surface,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
          {wh.warehouseName}
        </span>
        <StatusPill status={status} />
      </div>
      <div className="text-sm mb-3" style={{ color: COLORS.muted }}>
        {wh.warehouseAddress}
      </div>
      <div
        className="font-mono text-sm tabular-nums"
        style={{ color: COLORS.ink }}
      >
        {wh.quantity.toLocaleString()} units
      </div>
    </div>
  );
}

function BackButton({ navigate }) {
  return (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 mb-4 hover:opacity-80 transition-opacity"
      style={{
        color: COLORS.ink,
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10 animate-pulse">
      <div
        className="h-4 w-40 rounded mb-4"
        style={{ backgroundColor: COLORS.line }}
      />
      <div
        className="rounded-2xl h-48"
        style={{ backgroundColor: COLORS.line }}
      />
      <div
        className="h-4 w-56 rounded mt-8 mb-3"
        style={{ backgroundColor: COLORS.line }}
      />
      <div
        className="rounded-2xl h-40"
        style={{ backgroundColor: COLORS.line }}
      />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <AlertTriangle
        className="h-6 w-6 mx-auto mb-3"
        style={{ color: COLORS.out }}
      />
      <p className="text-sm font-medium" style={{ color: COLORS.ink }}>
        Couldn't load this product
      </p>
      <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm font-medium rounded-lg px-4 py-2"
          style={{ backgroundColor: COLORS.accentSoft, color: COLORS.accent }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default function ProductDetails({ productId: productIdProp }) {
  const navigate = useNavigate();
  const { id: routeProductId } = useParams();
  const productId = productIdProp || routeProductId;
  const { data, isLoading, error, refetch } = useGet(
    productId ? `api/pos-home/products/${productId}/warehouse-stock` : null,
  );

  const product = data?.data?.product;
  const warehouseStock = data?.data?.warehouseStock || [];

  const totals = useMemo(() => {
    const totalStock = warehouseStock.reduce(
      (s, w) => s + (w.quantity || 0),
      0,
    );
    const outCount = warehouseStock.filter((w) => w.quantity <= 0).length;
    const lowCount = warehouseStock.filter(
      (w) => w.quantity > 0 && w.low_stock && w.quantity <= w.low_stock,
    ).length;
    return { totalStock, outCount, lowCount, whCount: warehouseStock.length };
  }, [warehouseStock]);

  if (!productId) {
    return (
      <div style={{ backgroundColor: COLORS.page, minHeight: "100%" }}>
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <BackButton navigate={navigate} />
        </div>
        <ErrorState message="No product id was found in the URL or props." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ backgroundColor: COLORS.page, minHeight: "100%" }}>
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <BackButton navigate={navigate} />
        </div>
        <Skeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: COLORS.page, minHeight: "100%" }}>
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <BackButton navigate={navigate} />
        </div>
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ backgroundColor: COLORS.page, minHeight: "100%" }}>
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <BackButton navigate={navigate} />
        </div>
        <ErrorState message="No product data was returned." />
      </div>
    );
  }

 // const overallStatus = stockStatus(product.quantity, product.low_stock);
  const hasCode = product.code && product.code !== "null";

  return (
    <div
      style={{ backgroundColor: COLORS.page, minHeight: "100%" }}
      className="w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .pd-display { font-family: 'Space Grotesk', ui-sans-serif, sans-serif; }
        .pd-body { font-family: 'Inter', ui-sans-serif, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
      `}</style>

      <div className="pd-body max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <BackButton navigate={navigate} />

        {/* ── Product card ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.line}`,
          }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* image */}
            <div
              className="sm:w-48 shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: COLORS.accentSoft }}
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package
                  className="h-16 w-16 m-8"
                  style={{ color: COLORS.accent }}
                  strokeWidth={1.3}
                />
              )}
            </div>

            {/* details */}
            <div className="flex-1 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1
                    className="pd-display text-2xl font-semibold"
                    style={{ color: COLORS.ink }}
                  >
                    {product.name}
                  </h1>
                  {product.ar_name && (
                    <span
                      className="text-sm"
                      style={{ color: COLORS.muted }}
                      dir="rtl"
                    >
                      {product.ar_name}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="pd-display text-2xl font-semibold"
                    style={{ color: COLORS.ink }}
                  >
                    EGP {Number(product.price).toFixed(2)}
                  </div>
                  {hasCode && (
                    <span
                      className="font-mono text-xs inline-block mt-1 rounded px-1.5 py-0.5"
                      style={{
                        backgroundColor: COLORS.accentSoft,
                        color: COLORS.accent,
                      }}
                    >
                      {product.code}
                    </span>
                  )}
                </div>
              </div>

              {product.description && (
                <p
                  className="text-sm mt-4 leading-relaxed"
                  style={{ color: COLORS.muted }}
                >
                  {product.description}
                </p>
              )}

              <div
                className="my-5 border-t border-dashed"
                style={{ borderColor: COLORS.line }}
              />

              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <span className="text-xs" style={{ color: COLORS.faint }}>
                  Total quantity across warehouses
                </span>
                {/* <StatusPill status={overallStatus} /> */}
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: COLORS.faint }}>
                    Cost
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: COLORS.ink }}
                  >
                    EGP {Number(product.cost).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: COLORS.faint }}>
                    Wholesale price
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: COLORS.ink }}
                  >
                    EGP {Number(product.whole_price).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: COLORS.faint }}>
                    Low stock threshold
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: COLORS.ink }}
                  >
                    {product.low_stock}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: COLORS.faint }}>
                    Min. sale qty
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: COLORS.ink }}
                  >
                    {product.minimum_quantity_sale}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Warehouse inventory ───────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4" style={{ color: COLORS.ink }} />
              <h2
                className="pd-display text-base font-semibold"
                style={{ color: COLORS.ink }}
              >
                Warehouse Inventory
              </h2>
            </div>
            <span className="font-mono text-xs" style={{ color: COLORS.muted }}>
              {totals.whCount} location{totals.whCount === 1 ? "" : "s"} ·{" "}
              {totals.totalStock.toLocaleString()} units total
            </span>
          </div>

          {warehouseStock.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.line}`,
              }}
            >
              <p className="text-sm" style={{ color: COLORS.muted }}>
                No warehouse stock records for this product.
              </p>
            </div>
          ) : (
            <>
              {/* desktop table */}
              <div
                className="hidden sm:block rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.line}`,
                }}
              >
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                      {["Warehouse", "Address", "Stock"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold uppercase tracking-wide py-3 first:pl-5 last:pr-5 px-0 pr-3"
                          style={{ color: COLORS.faint }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseStock.map((wh, i) => (
                      <WarehouseRow
                        key={wh.warehouseId}
                        wh={wh}
                        isLast={i === warehouseStock.length - 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* mobile cards */}
              <div className="sm:hidden flex flex-col gap-3">
                {warehouseStock.map((wh) => (
                  <WarehouseCardMobile key={wh.warehouseId} wh={wh} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
