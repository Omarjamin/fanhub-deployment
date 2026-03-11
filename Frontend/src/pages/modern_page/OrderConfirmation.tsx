import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Cog, PackageCheck, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type ConfirmationItem = {
  name?: string;
  quantity?: number;
  price?: number;
};

type ShippingAddress = {
  region?: string;
  province?: string;
  cityMunicipality?: string;
  barangay?: string;
  zipCode?: string;
  streetAddress?: string;
};

type ConfirmationState = {
  orderId?: number | null;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  remainingStock?: number;
  subtotal?: number;
  shippingFee?: number;
  paymentMethod?: string;
  items?: ConfirmationItem[];
  shippingAddress?: ShippingAddress;
};

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ConfirmationState;

  const itemName = String(state.itemName || "Item");
  const quantity = Number(state.quantity || 0);
  const unitPrice = Number(state.unitPrice || 0);
  const totalPrice = Number(state.totalPrice || 0);
  const remainingStock = Number(state.remainingStock || 0);
  const subtotal = Number(state.subtotal || totalPrice || 0);
  const shippingFee = Number(state.shippingFee || 0);
  const paymentMethod = String(state.paymentMethod || "cod").toLowerCase() === "cod"
    ? "Cash on Delivery"
    : String(state.paymentMethod || "N/A");
  const items = Array.isArray(state.items) ? state.items : [];
  const shippingAddress = state.shippingAddress || {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-16 px-4 py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h1 className="font-display text-3xl text-gradient">Order Successful</h1>
                  <p className="text-muted-foreground font-body mt-1">
                    Your order is received. We will process it shortly.
                  </p>
                </div>
              </div>

              <h2 className="mt-6 font-display text-2xl">What's Next?</h2>
              <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <div className="h-10 w-10 rounded-full bg-background inline-flex items-center justify-center text-primary">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="font-body font-semibold mt-3">Order Placed</p>
                  <p className="text-sm text-muted-foreground">Order received</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="h-10 w-10 rounded-full bg-card inline-flex items-center justify-center text-muted-foreground">
                    <Cog size={18} />
                  </div>
                  <p className="font-body font-semibold mt-3">Processing</p>
                  <p className="text-sm text-muted-foreground">Preparing items</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="h-10 w-10 rounded-full bg-card inline-flex items-center justify-center text-muted-foreground">
                    <Truck size={18} />
                  </div>
                  <p className="font-body font-semibold mt-3">Shipped</p>
                  <p className="text-sm text-muted-foreground">On its way</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="h-10 w-10 rounded-full bg-card inline-flex items-center justify-center text-muted-foreground">
                    <PackageCheck size={18} />
                  </div>
                  <p className="font-body font-semibold mt-3">Delivered</p>
                  <p className="text-sm text-muted-foreground">Enjoy your merch</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid lg:grid-cols-[1fr_340px] gap-4">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h3 className="font-body font-semibold">Order Details</h3>
                <div className="mt-3 space-y-2 text-sm font-body">
                  <p>
                    Order ID: <span className="font-semibold">{state.orderId || "N/A"}</span>
                  </p>
                  <p>
                    Payment Method: <span className="font-semibold">{paymentMethod}</span>
                  </p>
                  {items.length ? (
                    <div className="mt-3 space-y-1">
                      {items.map((entry, index) => (
                        <p key={`${entry.name || "item"}-${index}`}>
                          {entry.name || itemName} x {Number(entry.quantity || 0)} -{" "}
                          <span className="font-semibold">{formatPeso(Number(entry.price || 0))}</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p>
                      Item: <span className="font-semibold">{itemName}</span>
                    </p>
                  )}
                  <p>
                    Quantity: <span className="font-semibold">{quantity}</span>
                  </p>
                  <p>
                    Unit Price: <span className="font-semibold">{formatPeso(unitPrice)}</span>
                  </p>
                  <p>
                    Subtotal: <span className="font-semibold">{formatPeso(subtotal)}</span>
                  </p>
                  <p>
                    Shipping Fee: <span className="font-semibold">{shippingFee > 0 ? formatPeso(shippingFee) : "--"}</span>
                  </p>
                  <p>
                    Total: <span className="font-semibold text-primary">{formatPeso(totalPrice)}</span>
                  </p>
                  {remainingStock > 0 ? (
                    <p>
                      Remaining Stock: <span className="font-semibold">{remainingStock}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h3 className="font-body font-semibold">Shipping Address</h3>
                <div className="mt-3 space-y-1 text-sm font-body text-muted-foreground">
                  <p>{shippingAddress.streetAddress || "N/A"}</p>
                  <p>{shippingAddress.barangay || "N/A"}</p>
                  <p>
                    {shippingAddress.cityMunicipality || "N/A"}, {shippingAddress.province || "N/A"}
                  </p>
                  <p>{shippingAddress.region || "N/A"}</p>
                  <p>{shippingAddress.zipCode || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/order-history")}
                className="rounded-2xl bg-foreground text-background px-5 py-3 text-sm font-body font-semibold hover:opacity-90 transition"
              >
                View Order History
              </button>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="rounded-2xl border border-border/70 bg-card text-foreground px-5 py-3 text-sm font-body font-semibold hover:border-primary/60 hover:text-primary transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;
