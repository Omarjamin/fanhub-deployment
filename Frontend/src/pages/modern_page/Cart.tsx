import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatPackageDimensions } from "@/utils/package-dimensions.js";
import {
  buildEcommerceLoginUrl,
  fetchCartItems,
  removeCartItem,
  setEcommercePostLoginRedirect,
  updateCartItemQuantity,
} from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";

type CartItem = {
  itemId: number;
  productId: number;
  variantId: number;
  name: string;
  image: string;
  category: string;
  variant: string;
  quantity: number;
  price: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
};

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatItemPackageSize(item: CartItem) {
  return formatPackageDimensions(item.length || 0, item.width || 0, item.height || 0, {
    emptyLabel: "",
  });
}

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyVariantId, setBusyVariantId] = useState<number | null>(null);

  const loadCart = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCartItems();
      setItems(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to load cart")
          : "Failed to load cart";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );
  const loginRequired = /sign in|login|unauthorized|401/i.test(error);

  const handleQuantityChange = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return;
    setBusyVariantId(item.variantId);
    try {
      await updateCartItemQuantity(item.variantId, nextQty);
      setItems((prev) =>
        prev.map((entry) =>
          entry.variantId === item.variantId ? { ...entry, quantity: nextQty } : entry,
        ),
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to update quantity")
          : "Failed to update quantity";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyVariantId(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    setBusyVariantId(item.variantId);
    try {
      await removeCartItem(item.variantId);
      setItems((prev) => prev.filter((entry) => entry.variantId !== item.variantId));
      toast({
        title: "Removed",
        description: `${item.name} removed from cart.`,
        variant: "destructive",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to remove item")
          : "Failed to remove item";
      toast({
        title: "Remove failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyVariantId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-border/60 bg-card/70 inline-flex items-center justify-center text-primary">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="font-display text-4xl text-gradient">Your Cart</h1>
              <p className="text-muted-foreground font-body text-sm">Review items before checkout.</p>
            </div>
          </div>

          {loading ? <p className="text-muted-foreground font-body">Loading cart...</p> : null}
          {!loading && error ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-6">
              <p className="text-muted-foreground font-body">{error}</p>
              {loginRequired ? (
                <a
                  href={buildEcommerceLoginUrl()}
                  onClick={() => setEcommercePostLoginRedirect("/cart")}
                  className="inline-block mt-4 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm font-body font-semibold hover:opacity-90 transition"
                >
                  Sign in to view cart
                </a>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
              <p className="text-muted-foreground font-body">Your cart is empty.</p>
              <Link
                to="/shop"
                className="inline-block mt-4 rounded-full bg-primary px-5 py-2.5 text-black text-sm font-body font-semibold hover:text-black"
              >
                Continue Shopping
              </Link>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <section className="space-y-4">
                {items.map((item) => {
                  const packageSize = formatItemPackageSize(item);

                  return (
                    <article
                      key={`${item.itemId}-${item.variantId}`}
                      className="rounded-2xl border border-border/60 bg-card/70 p-4"
                    >
                      <div className="flex gap-4">
                        <div className="h-24 w-24 rounded-xl bg-accent/40 border border-border/40 overflow-hidden shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-body font-semibold text-foreground">{item.name}</h3>
                          <p className="text-xs text-muted-foreground font-body mt-1">
                            {item.category || "General"} • {item.variant}
                          </p>
                          {Number(item.weight || 0) > 0 ? (
                            <p className="text-xs text-muted-foreground font-body mt-1">
                              {Number(item.weight || 0)}g each
                            </p>
                          ) : null}
                          {packageSize ? (
                            <p className="text-xs text-muted-foreground font-body mt-1">{packageSize}</p>
                          ) : null}
                          <p className="text-primary font-display text-lg mt-2">{formatPeso(item.price)}</p>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="inline-flex items-center rounded-xl border border-border/60 overflow-hidden">
                              <button
                                type="button"
                                disabled={busyVariantId === item.variantId}
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                className="h-9 w-9 bg-card hover:bg-accent transition"
                              >
                                -
                              </button>
                              <span className="h-9 min-w-10 px-2 inline-flex items-center justify-center text-sm font-body">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={busyVariantId === item.variantId}
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                className="h-9 w-9 bg-card hover:bg-accent transition"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={busyVariantId === item.variantId}
                              onClick={() => handleRemove(item)}
                              className="h-9 w-9 rounded-xl border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 inline-flex items-center justify-center transition"
                              aria-label="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <aside className="rounded-2xl border border-border/60 bg-card/70 p-5 h-fit sticky top-24">
                <h2 className="font-display text-2xl text-gradient">Summary</h2>
                <div className="mt-4 space-y-2 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPeso(subtotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/checkout", {
                      state: {
                        items,
                      },
                    })
                  }
                  className="mt-5 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-body font-semibold hover:opacity-90 transition"
                >
                  Proceed to Checkout
                </button>
              </aside>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
