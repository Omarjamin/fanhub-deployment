import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { addProductToCart, buildEcommerceLoginUrl, isEcommerceLoggedIn } from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
};

type ProductGridProps = {
  products: Product[];
};

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

const ProductGrid = ({ products }: ProductGridProps) => {
  const navigate = useNavigate();

  const handleAddToCart = async (product: Product) => {
    if (!isEcommerceLoggedIn()) {
      toast({
        title: "Login required",
        description: "Please sign in first to add items to cart.",
      });
      window.setTimeout(() => {
        window.location.href = buildEcommerceLoginUrl(undefined, "/shop");
      }, 450);
      return;
    }

    try {
      await addProductToCart(product.id, 1);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added.`,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to add item")
          : "Failed to add item";
      if (/sign in|login|unauthorized|401/i.test(message)) {
        toast({
          title: "Login required",
          description: "Please sign in to continue.",
        });
        window.setTimeout(() => {
          window.location.href = buildEcommerceLoginUrl(undefined, "/shop");
        }, 450);
        return;
      }
      toast({
        title: "Cart error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <motion.article
          key={product.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group rounded-2xl border border-border/60 bg-card/70 overflow-hidden"
        >
          <div className="relative bg-accent">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full aspect-square bg-accent" />
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-body font-semibold">{product.name}</h3>
                <p className="text-primary font-display text-xl mt-1">{formatPeso(product.price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/shop/product/${product.id}`)}
                  className="rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold px-3 py-1.5 hover:opacity-90 transition"
                >
                  Buy Now
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  aria-label="Add to cart"
                  className="h-9 w-9 rounded-xl border border-border/70 bg-card text-foreground inline-flex items-center justify-center hover:border-primary/60 hover:text-primary transition"
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
            {product.description ? (
              <p className="text-muted-foreground text-sm font-body mt-2 line-clamp-2">{product.description}</p>
            ) : null}
          </div>
        </motion.article>
      ))}
    </div>
  );
};

export default ProductGrid;
