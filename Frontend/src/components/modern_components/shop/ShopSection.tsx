import { useEffect, useMemo, useState } from "react";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  fetchAllProductsAcrossCollections,
  fetchProductWithVariants,
  fetchShopCollections,
} from "@/lib/ecommerceApi";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductGrid from "@/components/shop/ProductGrid";

type Collection = {
  id: string;
  name: string;
  image: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category?: string;
  collectionId?: string;
  collectionName?: string;
  variantLabel?: string;
};

type ProductDetails = Record<string, any>;
type ProductVariant = Record<string, any>;

const sortOptions = [
  { value: "default", label: "Sort by: Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

const normalizeNumericValue = (value: unknown, fallback = 0) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const negative = raw.startsWith("-");
  const unsigned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!unsigned) return fallback;

  const firstDotIndex = unsigned.indexOf(".");
  const normalized =
    firstDotIndex === -1
      ? unsigned
      : `${unsigned.slice(0, firstDotIndex).replace(/\./g, "") || "0"}.${unsigned
          .slice(firstDotIndex + 1)
          .replace(/\./g, "")}`;
  const parsed = Number(`${negative ? "-" : ""}${normalized}`);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveVariantSummary = (details: ProductDetails, variants: ProductVariant[]) => {
  const label = String(
    details?.variant_values ||
      details?.variant_name ||
      details?.variant ||
      "",
  ).trim();
  if (label) return label;

  const variantLabels = variants
    .map((variant) =>
      String(variant?.name || variant?.variant_values || variant?.variant_name || "").trim(),
    )
    .filter(Boolean);

  const count = Number(
    variantLabels.length ||
    details?.variant_count ||
      details?.variantCount ||
      details?.variants_count ||
      variants.length ||
      0,
  );
  if (count > 1) return `${count} variants`;
  if (count === 1) return variantLabels[0] || "1 variant";
  return "";
};

const resolveProductPrice = (
  details: ProductDetails,
  variants: ProductVariant[],
  fallbackPrice = 0,
) => {
  const variantPrices = variants
    .map((variant) => normalizeNumericValue(variant?.price, 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (variantPrices.length) return Math.min(...variantPrices);

  return normalizeNumericValue(
    details?.display_price ||
      details?.price ||
      details?.product_price ||
      details?.unit_price ||
      details?.amount ||
      details?.cost ||
      details?.retail_price ||
      details?.sale_price ||
      details?.min_price ||
      details?.max_price ||
      details?.base_price ||
      fallbackPrice ||
      0,
    0,
  );
};

const ShopSection = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("default");
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  const categoryTabs = useMemo(() => {
    const fromCollections = collections
      .map((collection) => String(collection.name || "").trim())
      .filter(Boolean);
    const fromProducts = products
      .map((product) => String(product.category || product.collectionName || "").trim())
      .filter(Boolean);
    const ordered = fromCollections.length ? fromCollections : fromProducts;
    const unique = Array.from(new Set(ordered));
    return ["All", ...unique];
  }, [collections, products]);

  useEffect(() => {
    if (!categoryTabs.length) return;
    if (!categoryTabs.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categoryTabs]);

  useEffect(() => {
    let isMounted = true;

    const loadCollections = async () => {
      setLoadingCollections(true);
      setError("");
      try {
        const data = await fetchShopCollections();
        if (!isMounted) return;
        setCollections(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load collections")
            : "Failed to load collections";
        setError(message);
      } finally {
        if (isMounted) setLoadingCollections(false);
      }
    };

    loadCollections();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (collections.length === 0) return;
    let isMounted = true;
    const collectionLookup = new Map(
      collections.map((collection) => [String(collection.id || "").trim(), collection.name]),
    );

    const loadProducts = async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const data = await fetchAllProductsAcrossCollections(
          collections.map((collection) => collection.id),
        );
        if (!isMounted) return;
        const normalized = data.map((product) => {
          const collectionId = String(product.collectionId || "").trim();
          const fallbackCategory = collectionLookup.get(collectionId) || product.collectionName || "";
          return {
            ...product,
            category: String(product.category || fallbackCategory || "").trim(),
          };
        });
        const enriched = await Promise.all(
          normalized.map(async (product) => {
            if (product.price > 0 && product.variantLabel) return product;
            try {
              const details = await fetchProductWithVariants(product.id);
              const detailProduct =
                details?.product && typeof details.product === "object"
                  ? (details.product as ProductDetails)
                  : {};
              const variants = Array.isArray(details?.variants)
                ? (details.variants as ProductVariant[])
                : [];
              const resolvedPrice = resolveProductPrice(detailProduct, variants, product.price);
              const resolvedVariantLabel = resolveVariantSummary(detailProduct, variants);

              return {
                ...product,
                price: resolvedPrice > 0 ? resolvedPrice : product.price,
                variantLabel: resolvedVariantLabel || product.variantLabel,
              };
            } catch (_) {
              return product;
            }
          }),
        );
        if (!isMounted) return;
        setProducts(enriched);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load products")
            : "Failed to load products";
        setError(message);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [collections]);

  const normalizeCategory = (value: string) => String(value || "").trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    const normalizedCategory = normalizeCategory(activeCategory);
    const filtered =
      normalizedCategory === "all"
        ? products
        : products.filter((product) => {
            const productCategory = normalizeCategory(product.category || "");
            if (!productCategory) return false;
            if (normalizedCategory === "apparell") {
              return productCategory === "apparel" || productCategory === "apparell";
            }
            return productCategory === normalizedCategory;
          });

    const sorted = [...filtered];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name-desc") sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted;
  }, [activeCategory, products, sortBy]);

  return (
    <section id="shop" className="py-24 px-4">
      <div className="container mx-auto">
        <ShopHeader />

        {loadingCollections ? <p className="text-muted-foreground font-body">Loading collections...</p> : null}
        {!loadingCollections && error ? <p className="text-muted-foreground font-body">{error}</p> : null}

        {!loadingCollections && !error ? (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((category) => {
                const active = category === activeCategory;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm font-body transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card/70 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/order-history")}
                className="h-10 w-10 rounded-xl border border-border/60 bg-card/70 text-foreground inline-flex items-center justify-center transition hover:border-primary/50 hover:text-primary"
                aria-label="Order History"
                title="Order History"
              >
                <ClipboardList size={18} />
              </button>
              <button
                onClick={() => navigate("/cart")}
                className="h-10 w-10 rounded-xl border border-border/60 bg-card/70 text-foreground inline-flex items-center justify-center transition hover:border-primary/50 hover:text-primary"
                aria-label="Cart"
                title="Cart"
              >
                <ShoppingCart size={18} />
              </button>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as (typeof sortOptions)[number]["value"])}
                className="h-10 rounded-xl border border-border/60 bg-card/70 px-3 text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          {loadingProducts ? <p className="text-muted-foreground font-body">Loading products...</p> : null}
          {!loadingProducts && !error && visibleProducts.length === 0 ? (
            <p className="text-muted-foreground font-body">No items in this collection yet.</p>
          ) : null}
          {!loadingProducts && !error && visibleProducts.length > 0 ? (
            <ProductGrid products={visibleProducts} />
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
