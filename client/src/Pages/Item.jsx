import React, { useState, useMemo, useCallback, useEffect } from "react";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useProductModal } from "@/Hooks/useProductModal";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import BundlesSidebarButton, { BundleGridCard, BundleDetailModal } from "./BundlesSection";
import { useTranslation } from "react-i18next";
import { buildProductPayload } from "@/services/productProcessor";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getAuthToken = () => sessionStorage.getItem("token");

const apiFetcher = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return res.json();
};

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ onAddToOrder }) {
  const [activeTab, setActiveTab] = useState("category"); // category, brand, feature, bundles
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [selectedBundle, setSelectedBundle] = useState(null); // for bundle detail modal
  const { t, i18n } = useTranslation();
  const orderType = sessionStorage.getItem("order_type") || "dine_in";
  const { postData: postOrder, loading: orderLoading } = usePost();

  const {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExclusionChange,
    setQuantity,
    handleExtraDecrement,
  } = useProductModal();

  // ✅ Debounce: نستنى 300ms بعد ما اليوزر يوقف الكتابة قبل ما نبعت الـ API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ✅ 1. جلب Categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetcher("api/pos-home/categories"),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const categories = useMemo(() => {
    return categoriesData?.data?.category || [];
  }, [categoriesData]);

  // ✅ 2. جلب Brands
  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetcher("api/pos-home/brands"),
    staleTime: 10 * 60 * 1000,
  });

  const brands = useMemo(() => {
    return brandsData?.data?.brand || [];
  }, [brandsData]);

  // ✅ 3. جلب Featured Products
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: () => apiFetcher("api/pos-home/featured"),
    enabled: activeTab === "feature",
    staleTime: 10 * 60 * 1000,
  });

  const featuredProducts = useMemo(() => {
    return featuredData?.data?.products || [];
  }, [featuredData]);

  // ✅ 4. جلب Products حسب Category
  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useQuery({
    queryKey: ["categoryProducts", selectedCategory],
    queryFn: () => apiFetcher(`api/pos-home/categories/${selectedCategory}/products`),
    enabled: activeTab === "category" && selectedCategory !== "all",
    staleTime: 5 * 60 * 1000,
  });

  const categoryProducts = useMemo(() => {
    return categoryProductsData?.data?.products || [];
  }, [categoryProductsData]);

  // ✅ 4b. Global Search — نجيب منتجات كل الـ categories بالـ parallel
  //     وندمجهم ف list واحدة للفلترة على الفرونت
  const globalSearchActive =
    activeTab === "category" && selectedCategory === "all" && debouncedSearch.length > 0;

  const categoryQueries = useQueries({
    queries: categories.map((cat) => ({
      queryKey: ["categoryProducts", cat._id],
      queryFn: () => apiFetcher(`api/pos-home/categories/${cat._id}/products`),
      staleTime: 10 * 60 * 1000, // cache 10 دقايق
      enabled: globalSearchActive && categories.length > 0,
    })),
  });

  const allProductsLoading = categoryQueries.some((q) => q.isLoading);

  // دمج وتخليص من التكرار
  const allProducts = useMemo(() => {
    const seen = new Set();
    return categoryQueries
      .flatMap((q) => q.data?.data?.products || [])
      .filter((p) => {
        if (seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });
  }, [categoryQueries]);


  // ✅ 5. جلب Products حسب Brand
  const { data: brandProductsData, isLoading: brandProductsLoading } = useQuery({
    queryKey: ["brandProducts", selectedBrand],
    queryFn: () => apiFetcher(`api/pos-home/brands/${selectedBrand}/products`),
    enabled: activeTab === "brand" && selectedBrand !== "all",
    staleTime: 5 * 60 * 1000,
  });

  const brandProducts = useMemo(() => {
    return brandProductsData?.data?.products || [];
  }, [brandProductsData]);

  // ✅ 6. Bundles
  const { data: bundlesData, isLoading: bundlesLoading } = useGet(
    "api/pos-home/bundles",
    { useCache: true }
  );
  const bundles = useMemo(() => bundlesData?.data?.bundles || [], [bundlesData]);

  // ✅ 7. تحديد المنتجات حسب الـ Tab
  const productsSource = useMemo(() => {
    if (activeTab === "bundles") return [];
    if (activeTab === "feature") return featuredProducts;
    if (activeTab === "brand") {
      return selectedBrand === "all" ? [] : brandProducts;
    }
    if (activeTab === "category") {
      // لو فيه بحث و مفيش category مختارة → نستخدم كل المنتجات
      if (globalSearchActive) return allProducts;
      return selectedCategory === "all" ? [] : categoryProducts;
    }
    return [];
  }, [activeTab, featuredProducts, brandProducts, categoryProducts, selectedBrand, selectedCategory, globalSearchActive, allProducts]);


  // ✅ 8. فلترة المنتجات حسب البحث على الفرونت
  const filteredProducts = useMemo(() => {
    let products = productsSource;
    const query = debouncedSearch.toLowerCase();

    // لو فيه query → نفلتر محلياً سواء global search أو category مختارة
    if (query) {
      products = products.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const nameAr = (p.ar_name || p.name_ar || "").toLowerCase();
        const code = (p.product_code || "").toString().toLowerCase();
        return name.includes(query) || nameAr.includes(query) || code.includes(query);
      });
    }

    return products;
  }, [productsSource, debouncedSearch]);



  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // ✅ 8. Handle Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory("all");
    setSelectedBrand("all");
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  // ✅ 9. Handle Category Select
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  // ✅ 10. Handle Brand Select
  const handleBrandSelect = (brandId) => {
    setSelectedBrand(brandId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const handleShowMoreProducts = () => {
    setVisibleProductCount((prev) => prev + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS);
  };

  const createTempId = (productId) =>
    `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddToOrder = useCallback(async (product, customQuantity = 1) => {
    const orderedQty = Number(customQuantity);
    const startQty = Number(product.start_quantaty);
    const isWholesale = startQty > 0 && orderedQty >= startQty && product.whole_price;
    const basePrice = isWholesale
      ? parseFloat(product.whole_price)
      : parseFloat(product.price_after_discount || product.price || product.originalPrice || 0);
    // ------------------

    let addonsTotal = 0;
    if (product.selectedExtras && product.selectedExtras.length > 0) {
      const extraCounts = {};
      product.selectedExtras.forEach(extraId => {
        extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
      });
      Object.entries(extraCounts).forEach(([extraId, count]) => {
        let extra = product.addons?.find(a => a.id === parseInt(extraId));
        if (!extra) extra = product.allExtras?.find(e => e.id === parseInt(extraId));
        if (extra) {
          const extraPrice = parseFloat(
            extra.price_after_discount || extra.price_after_tax || extra.price || 0
          );
          addonsTotal += extraPrice * count;
        }
      });
    }

    let variationsTotal = 0;
    if (product.selectedVariation && product.variations) {
      product.variations.forEach(variation => {
        const selectedOptions = product.selectedVariation[variation.id];
        if (selectedOptions) {
          if (variation.type === 'single') {
            const option = variation.options?.find(opt => opt.id === selectedOptions);
            if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
          } else if (variation.type === 'multiple') {
            const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
            optionsArray.forEach(optionId => {
              const option = variation.options?.find(opt => opt.id === optionId);
              if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
            });
          }
        }
      });
    }

    const itemPrice = basePrice + addonsTotal + variationsTotal;
    if (itemPrice <= 0) {
      toast.error(t("InvalidProductPrice"));
      return;
    }

    const quantity = product.weight_status === 1
      ? Number(product.quantity || customQuantity || 1)
      : parseInt(customQuantity) || 1;

    const itemTotal = itemPrice * quantity;

    if (orderType === "take_away" || orderType === "delivery") {
      const newItem = {
        ...product,
        temp_id: createTempId(product._id),
        count: quantity,
        price: itemPrice,
        originalPrice: basePrice,
        totalPrice: itemTotal,
        quantity: product.weight_status === 1 ? quantity : product.quantity,
        preparation_status: "pending",
        notes: product.notes || "",
        allSelectedVariations: product.allSelectedVariations || [],
        selectedExtras: product.selectedExtras || [],
        selectedExcludes: product.selectedExcludes || [],
        selectedAddons: product.selectedAddons || [],
      };
      onAddToOrder(newItem);
      toast.success(t("ProductAddedToCart"));
      return;
    }

    if (orderType === "dine_in") {
      const tableId = sessionStorage.getItem("table_id");
      if (!tableId) {
        toast.error(t("PleaseSelectTableFirst"));
        return;
      }

      const processedItem = buildProductPayload({
        ...product,
        price: itemPrice,
        count: quantity,
      });

      const payload = {
        table_id: tableId,
        cashier_id: sessionStorage.getItem("cashier_id"),
        amount: itemTotal.toFixed(2),
        total_tax: (itemTotal * 0.14).toFixed(2),
        total_discount: "0.00",
        notes: "Added from POS",
        source: "web",
        products: [processedItem],
      };

      try {
        const response = await postOrder("cashier/dine_in_order", payload, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        });

        let cartId = null;
        if (response?.cart_id) cartId = response.cart_id;
        else if (response?.id) cartId = response.id;
        else if (response?.success?.cart_id) cartId = response.success.cart_id;
        else if (response?.data?.cart_id) cartId = response.data.cart_id;

        const newItem = {
          ...product,
          temp_id: createTempId(product._id),
          count: quantity,
          price: itemPrice,
          originalPrice: basePrice,
          totalPrice: itemTotal,
          cart_id: cartId ? cartId.toString() : null,
          preparation_status: "pending",
          notes: product.notes || "",
        };

        onAddToOrder(newItem);
        toast.success(t("ProductAddedToTable", { table: tableId }));
      } catch (err) {
        console.error("Dine-in order error:", err);
        toast.error(err.response?.data?.message || t("FailedToAddToTable"));
      }
    }
  }, [orderType, onAddToOrder, postOrder, t]);

  // ✅ Handle adding a Bundle to the order
  const handleAddBundleToOrder = useCallback((bundle) => {
    const bundleItem = {
      _id: bundle._id,
      temp_id: `bundle_${bundle._id}_${Date.now()}`,
      name: bundle.name,
      price: bundle.price, // Discounted price
      originalPrice: bundle.price,
      totalPrice: bundle.price,
      count: 1,
      quantity: 1,
      isBundle: true,
      bundleProducts: bundle.products,
      preparation_status: "pending",
      notes: "",
      selectedExtras: [],
      selectedExcludes: [],
    };

    onAddToOrder(bundleItem);
    toast.success(t("BundleAddedToCart"));
  }, [onAddToOrder, t]);

  const handleAddFromModal = (enhancedProduct, options = {}) => {
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity, options);
  };

  const isAnyLoading = categoriesLoading || brandsLoading || categoryProductsLoading || brandProductsLoading || featuredLoading || allProductsLoading;
  const isArabic = i18n.language === "ar";

  if (isAnyLoading && !categories.length) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>

      {/* 1. الصف العلوي: البحث + التبديل بين (Category/Brand/Feature) */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">

        {/* حقل البحث */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder={t("SearchByProductName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-gray-50/50"
          />
        </div>

        {/* أزرار التبديل (Tabs) */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: "category", label: t("Categories") },
            { id: "brand", label: t("Brands") },
            { id: "feature", label: t("Featured") },
            { id: "bundles", label: t("Bundles") }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. الجزء الرئيسي: التصنيفات على اليسار والمنتجات على اليمين / فوق و أسفل في الموبايل */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 overflow-hidden">

        {/* قائمة التصنيفات العمودية (Side Menu) / الأفقية في الموبايل */}
        <div className="w-full md:w-38 flex-shrink-0 overflow-x-auto md:overflow-y-auto pr-2 custom-scrollbar flex flex-row md:flex-col gap-2 pb-2 md:pb-0 items-center md:items-stretch">

          {/* 🎁 Bundles button — Pinned at TOP of sidebar */}
          <BundlesSidebarButton
            isActive={activeTab === "bundles"}
            onSelect={() => handleTabChange("bundles")}
            count={bundles.length}
          />

          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2 mb-2 px-2">
            {activeTab === "category" ? t("Categories") : activeTab === "brand" ? t("Brands") : activeTab === "bundles" ? t("Bundles") : t("Featured")}
          </h3>

          {activeTab === "category" && categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => handleCategorySelect(cat._id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center p-2 md:p-4 rounded-xl transition-all border-2 min-w-[80px] md:min-w-0 md:min-h-[100px] ${selectedCategory === cat._id
                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-md"
                : "border-gray-100 bg-white text-gray-600 hover:border-purple-200"
                }`}
            >
              {cat.image_link && (
                <img src={cat.image_link} alt="" className="w-10 h-10 object-contain mb-2 rounded-full" />
              )}
              <span className="text-xs font-bold text-center leading-tight">
                {isArabic ? cat.ar_name || cat.name : cat.name}
              </span>
            </button>
          ))}

          {activeTab === "brand" && brands.map((brand) => (
            <button
              key={brand._id}
              onClick={() => handleBrandSelect(brand._id)}
              className={`p-4 rounded-2xl transition-all border-2 text-center font-bold text-sm ${selectedBrand === brand._id
                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-md"
                : "border-gray-100 bg-white text-gray-600 hover:border-purple-200"
                }`}
            >
              {brand.name}
            </button>
          ))}
        </div>

        {/* Main Grid: Bundles or Products */}
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar mt-2 md:mt-0">
          {activeTab === "bundles" ? (
            bundlesLoading ? (
              <div className="flex justify-center items-center h-64"><Loading /></div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-20 text-gray-400">{t("NoBundlesFound")}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {bundles.map((bundle) => (
                  <BundleGridCard
                    key={bundle._id}
                    bundle={bundle}
                    onOpenModal={setSelectedBundle}
                  />
                ))}
              </div>
            )
          ) : (
            isAnyLoading ? (
              <div className="flex justify-center items-center h-64"><Loading /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">{t("NoProductsFound")}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {productsToDisplay.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onAddToOrder={handleAddToOrder}
                      onOpenModal={openProductModal}
                      orderLoading={orderLoading}
                    />
                  ))}
                </div>

                {visibleProductCount < filteredProducts.length && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={handleShowMoreProducts}
                      className="bg-purple-600 hover:bg-purple-700 px-10 py-6 rounded-2xl text-lg font-bold shadow-lg shadow-purple-200"
                    >
                      {t("ShowMoreProducts")}
                    </Button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* ✅ Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        selectedProduct={selectedProduct}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        totalPrice={totalPrice}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExclusionChange={handleExclusionChange}
        onExtraDecrement={handleExtraDecrement}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddFromModal}
        orderLoading={orderLoading}
      />

      {orderLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[10000]">
          <Loading />
        </div>
      )}

      {/* ✅ Bundle Detail Modal */}
      {selectedBundle && (
        <BundleDetailModal
          bundle={selectedBundle}
          onClose={() => setSelectedBundle(null)}
          onAddToOrder={handleAddBundleToOrder}
        />
      )}
    </div>
  );
}