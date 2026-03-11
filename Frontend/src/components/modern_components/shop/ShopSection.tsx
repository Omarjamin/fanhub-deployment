import { useEffect, useMemo, useState } from "react";
import { History, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  fetchAllProductsAcrossCollections,
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
};

const categoryTabs = ["All", "Apparell", "Accessories", "Collectibles", "Music"] as const;
const sortOptions = [
  { value: "default", label: "Sort by: Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

const ShopSection = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<(typeof categoryTabs)[number]>("All");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("default");
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

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

    const loadProducts = async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const data = await fetchAllProductsAcrossCollections(
          collections.map((collection) => collection.id),
        );
        if (!isMounted) return;
        setProducts(data);
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

  const visibleProducts = useMemo(() => {
    const normalizedCategory = activeCategory.toLowerCase();
    const filtered =
      normalizedCategory === "all"
        ? products
        : products.filter((product) => {
            const productCategory = String(product.category || "").trim().toLowerCase();
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
                <History size={18} />
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
