import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  buildEcommerceLoginUrl,
  fetchProductWithVariants,
  isEcommerceLoggedIn,
  toExternalUrl,
} from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";

type Product = {
  product_id?: number;
  id?: number;
  name?: string;
  description?: string;
  img_url?: string;
  image_url?: string;
  image?: string;
};

type Variant = {
  product_variant_id?: number;
  variant_id?: number;
  id?: number;
  variant_name?: string;
  variant_values?: string;
  price?: number;
  stock?: number;
  weight?: number;
  weight_g?: number;
  weight_in_grams?: number;
};

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

const BuyNowConfirm = () => {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProductWithVariants(productId);
        if (!isMounted) return;
        setProduct(data.product || null);
        const list = Array.isArray(data.variants) ? data.variants : [];
        setVariants(list);
        const firstVariantId = Number(
          list[0]?.product_variant_id || list[0]?.variant_id || list[0]?.id || 0,
        );
        setSelectedVariantId(firstVariantId);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load product details")
            : "Failed to load product details";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (productId) loadDetails();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const selectedVariant = useMemo(
    () =>
      variants.find(
        (variant) =>
          Number(variant.product_variant_id || variant.variant_id || variant.id || 0) === selectedVariantId,
      ) || null,
    [selectedVariantId, variants],
  );

  const itemPrice = Number(selectedVariant?.price || 0);
  const totalPrice = itemPrice * quantity;
  const image = toExternalUrl(product?.img_url || product?.image_url || product?.image || "", "");

  const handleConfirmBuyNow = async () => {
    if (!isEcommerceLoggedIn()) {
      toast({
        title: "Login required",
        description: "Please sign in first to continue.",
      });
      window.setTimeout(() => {
        window.location.href = buildEcommerceLoginUrl(undefined, `/shop/product/${productId}`);
      }, 450);
      return;
    }

    if (!selectedVariantId) {
      toast({
        title: "Select variant",
        description: "Please select a variant first.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      navigate("/checkout", {
        state: {
          items: [
            {
              productId: Number(product?.product_id || product?.id || 0),
              variantId: Number(selectedVariantId),
              name: String(product?.name || "Product"),
              image,
              quantity,
              price: Number(selectedVariant?.price || 0),
              category: "",
              variant: String(selectedVariant?.variant_values || selectedVariant?.variant_name || ""),
              weight: Number(
                selectedVariant?.weight || selectedVariant?.weight_g || selectedVariant?.weight_in_grams || 0,
              ),
            },
          ],
        },
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Buy now failed")
          : "Buy now failed";
      if (/sign in|login|unauthorized|401/i.test(message)) {
        toast({
          title: "Login required",
          description: "Please sign in first to continue.",
        });
        window.setTimeout(() => {
          window.location.href = buildEcommerceLoginUrl(undefined, `/shop/product/${productId}`);
        }, 450);
        return;
      }
      toast({
        title: "Buy now failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-16 px-4 py-16">
        <div className="container mx-auto">
          {!loading ? (
            <button
              type="button"
              onClick={() => navigate("/shop")}
              aria-label="Back to shop"
              className="fixed left-4 top-24 z-40 h-10 w-10 rounded-xl border border-border/70 bg-card/80 backdrop-blur text-foreground inline-flex items-center justify-center hover:border-primary/60 hover:text-primary transition"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}

          {loading ? <p className="text-muted-foreground font-body">Loading item...</p> : null}
          {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}

          {!loading && !error && product ? (
            <div className="mx-auto max-w-lg">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-3 md:p-4">
                <div className="grid lg:grid-cols-[130px_1fr] gap-3 lg:gap-4">
                  <div className="mx-auto w-[140px]">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Product"}
                        className="w-[140px] h-[120px] object-contain rounded-xl bg-accent/40"
                      />
                    ) : null}
                  </div>
                  <div className="p-1">
                    <h1 className="font-display text-2xl md:text-3xl text-gradient">{product.name || "Product"}</h1>
                    <p className="text-primary font-display text-lg md:text-xl mt-1">{formatPeso(itemPrice)}</p>
                    {product.description ? (
                      <p className="text-muted-foreground font-body mt-3 leading-relaxed">{product.description}</p>
                    ) : null}

                    <div className="mt-4">
                      <label className="block text-sm font-body text-foreground mb-2">Quantity</label>
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-border/60 overflow-hidden">
                          <button
                            type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="h-10 w-10 bg-card hover:bg-accent transition"
                          >
                            -
                          </button>
                          <span className="h-10 min-w-12 px-3 inline-flex items-center justify-center font-body">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => prev + 1)}
                            className="h-10 w-10 bg-card hover:bg-accent transition"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmBuyNow}
                          disabled={submitting}
                          className="h-10 rounded-full bg-primary text-primary-foreground px-5 text-sm font-body font-semibold hover:opacity-90 transition disabled:opacity-70"
                        >
                          {submitting ? "Processing..." : "Buy Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground font-body">Order Summary</p>
                  <p className="mt-2 font-body">Item: {product.name}</p>
                  <p className="font-body">Quantity: {quantity}</p>
                  <p className="mt-1 font-display text-xl text-primary">Total: {formatPeso(totalPrice)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuyNowConfirm;
