import React from "react";
import { useTranslation } from "react-i18next";

/* ─────────────────────────────────────────────────────────────────
   BundleDetailModal  — opens when user clicks a bundle grid card
───────────────────────────────────────────────────────────────── */
export function BundleDetailModal({ bundle, onClose, onAddToOrder }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === "ar";
    if (!bundle) return null;

    const firstImage = bundle.images?.[0];

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                dir={isArabic ? "rtl" : "ltr"}
            >
                {firstImage && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                        <img
                            src={`data:image/jpeg;base64,${firstImage}`}
                            alt={bundle.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-gray-800">{bundle.name}</h2>
                        <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            -{bundle.savingsPercentage}%
                        </span>
                    </div>

                    <div className="flex items-baseline gap-3 mb-5">
                        <span className="text-3xl font-black text-purple-700">
                            {bundle.price} {t("EGP")}
                        </span>
                        <span className="text-base text-gray-400 line-through">
                            {bundle.originalPrice} {t("EGP")}
                        </span>
                        <span className="text-sm text-green-600 font-semibold">
                            {t("Save")} {bundle.savings}
                        </span>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                            {t("BundleIncludes")}
                        </h3>
                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                            {bundle.products?.map((bp) => (
                                <div
                                    key={bp.productId}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                                >
                                    {bp.product?.image && (
                                        <img
                                            src={bp.product.image}
                                            alt={bp.product.name}
                                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {isArabic
                                                ? bp.product?.ar_name || bp.product?.name
                                                : bp.product?.name}
                                        </p>
                                        {bp.selectedVariation && (
                                            <p className="text-xs text-purple-500 font-medium mt-0.5">
                                                {bp.selectedVariation.options?.map((o) => o.name).join(" / ")}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg shrink-0">
                                        x{bp.quantity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                        >
                            {t("Cancel")}
                        </button>
                        <button
                            onClick={() => {
                                onAddToOrder(bundle);
                                onClose();
                            }}
                            className="flex-1 py-3 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                        >
                            {t("AddToCart")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   BundleScrollCard — compact card for horizontal scrolling
───────────────────────────────────────────────────────────────── */
export function BundleScrollCard({ bundle, onOpenModal }) {
    const { t } = useTranslation();
    const firstImage = bundle.images?.[0];

    return (
        <div
            onClick={() => onOpenModal(bundle)}
            className="flex-shrink-0 w-64 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
        >
            <div className="relative h-28 overflow-hidden bg-gray-50">
                {firstImage ? (
                    <img
                        src={`data:image/jpeg;base64,${firstImage}`}
                        alt={bundle.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                )}
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                    -{bundle.savingsPercentage}%
                </div>
            </div>
            <div className="p-3">
                <h3 className="text-sm font-bold text-gray-800 truncate mb-1">{bundle.name}</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-purple-600 font-bold text-sm">
                            {bundle.price} {t("EGP")}
                        </span>
                        <span className="ml-2 text-[10px] text-gray-400 line-through">
                            {bundle.originalPrice}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   BundlesHorizontalSection — the "Pinned to Top" container
───────────────────────────────────────────────────────────────── */
export function BundlesHorizontalSection({ bundles, onOpenModal, isLoading, t }) {
    if (isLoading) return (
        <div className="flex gap-4 overflow-hidden mb-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="w-64 h-40 bg-gray-50 animate-pulse rounded-2xl shrink-0" />
            ))}
        </div>
    );

    if (!bundles || bundles.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h2 className="text-lg font-black text-gray-800 tracking-tight">
                        {t("SpecialBundles") || "Special Bundles"}
                    </h2>
                </div>
                <div className="h-1 flex-1 mx-4 bg-gradient-to-r from-purple-100 to-transparent rounded-full" />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {bundles.map((bundle) => (
                    <div key={bundle._id} className="snap-start">
                        <BundleScrollCard
                            bundle={bundle}
                            onOpenModal={onOpenModal}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}


/* ─────────────────────────────────────────────────────────────────
   BundleGridCard  — shown in the main product grid
───────────────────────────────────────────────────────────────── */
export function BundleGridCard({ bundle, onOpenModal }) {
    const { t } = useTranslation();
    const firstImage = bundle.images?.[0];

    return (
        <div
            className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 relative pb-16 cursor-pointer"
            onClick={() => onOpenModal(bundle)}
        >
            {/* Image */}
            <div className="relative h-32 bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden">
                {firstImage ? (
                    <img
                        src={`data:image/jpeg;base64,${firstImage}`}
                        alt={bundle.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                )}
                <span className="absolute top-2 right-2 bg-green-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    -{bundle.savingsPercentage}%
                </span>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="text-base font-semibold text-gray-800 truncate">{bundle.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    {bundle.products?.length} {t("Items")}
                </p>
            </div>

            {/* Price */}
            <div className="px-3">
                <div className="text-sm font-bold text-bg-primary">
                    <span className="text-purple-600 line-through mr-1">
                        {bundle.originalPrice} {t("EGP")}
                    </span>
                    <span className="text-gray-800">
                        {bundle.price} {t("EGP")}
                    </span>
                </div>
                <p className="text-xs text-green-600 font-semibold mt-0.5">
                    {t("Save")} {bundle.savings} {t("EGP")}
                </p>
            </div>

            {/* Add button */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-white">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenModal(bundle);
                    }}
                    className="w-full py-1 px-2 text-sm rounded bg-bg-primary text-white hover:bg-purple-700 transition-colors"
                >
                    {t("AddToCart")}
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   Default export — the "Offers" sidebar button (like a category)
───────────────────────────────────────────────────────────────── */
export default function BundlesSidebarButton({ isActive, onSelect, count }) {
    const { t } = useTranslation();

    return (
        <button
            onClick={onSelect}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 min-h-[100px] w-full ${isActive
                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-md"
                : "border-transparent bg-gray-700 hover:bg-gray-700/80  text-white "
                }`}
        >
            <div
                className={`w-10 h-10 mb-2 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-purple-100" : "bg-amber-500"
                    }`}
            >
                <span className="text-2xl">🎁</span>
            </div>
            <span className="text-xs font-bold text-center leading-tight">
                {t("Bundles")}
            </span>
            {count > 0 && (
                <span
                    className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isActive
                        ? "bg-purple-200 text-purple-700"
                        : "bg-white/20 text-white"
                        }`}
                >
                    {count}
                </span>
            )}
        </button>
    );
}
