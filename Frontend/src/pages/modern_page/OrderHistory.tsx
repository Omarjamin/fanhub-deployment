import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchOrderHistory } from "@/lib/ecommerceApi";

type HistoryItem = {
  order_id: number;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  status: string;
  tracking_number?: string | null;
  courier?: string | null;
  tracking_updated_at?: string | null;
  created_at: string;
  shipping_address?: Record<string, string>;
  items?: Array<{
    product_name?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};

function normalizeOrderStatus(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "pending";
  if (["order placed", "placed", "confirmed"].includes(normalized)) return "pending";
  if (normalized === "canceled") return "cancelled";
  if (normalized === "delivered") return "completed";
  return normalized;
}

function formatOrderStatus(value: string) {
  const normalized = normalizeOrderStatus(value);
  if (normalized === "pending") return "Pending";
  if (normalized === "processing") return "Processing";
  if (normalized === "shipped") return "Shipped";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return "Cancelled";
  return normalized;
}

function getStatusBadgeClasses(value: string) {
  const normalized = normalizeOrderStatus(value);
  if (normalized === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "processing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "shipped") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (normalized === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border/60 bg-background text-foreground";
}

function normalizeTrackingNumber(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function normalizeCourier(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function getTrackingDisplayValue(status: string, trackingNumber: string) {
  if (trackingNumber) return trackingNumber;
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === "shipped" || normalizedStatus === "completed") {
    return "Not assigned yet";
  }
  return "";
}

function getCourierDisplayValue(status: string, courier: string) {
  if (courier) return courier;
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === "shipped" || normalizedStatus === "completed") {
    return "Not assigned yet";
  }
  return "";
}

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const OrderHistory = () => {
  const [orders, setOrders] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    fetchOrderHistory()
      .then((rows) => {
        if (!mounted) return;
        setOrders(Array.isArray(rows) ? rows : []);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load order history")
            : "Failed to load order history";
        setError(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-16 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-border/60 bg-card/70 inline-flex items-center justify-center text-primary">
              <History size={20} />
            </div>
            <div>
              <h1 className="font-display text-4xl text-gradient">Order History</h1>
              <p className="text-muted-foreground font-body text-sm">
                {orders.length} order{orders.length === 1 ? "" : "s"} • Total spent {formatPeso(totalSpent)}
              </p>
            </div>
          </div>

          {loading ? <p className="text-muted-foreground font-body">Loading order history...</p> : null}
          {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}

          {!loading && !error && orders.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 md:p-10 text-center">
              <p className="text-muted-foreground font-body">No orders yet.</p>
              <Link
                to="/shop"
                className="inline-block mt-6 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm font-body font-semibold"
              >
                Back to Shop
              </Link>
            </div>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const address = order.shipping_address || {};
                const payment = String(order.payment_method || "cod").toLowerCase() === "cod"
                  ? "Cash on Delivery"
                  : String(order.payment_method || "N/A");
                const trackingNumber = normalizeTrackingNumber(order.tracking_number);
                const courier = normalizeCourier(order.courier);
                const trackingDisplayValue = getTrackingDisplayValue(order.status, trackingNumber);
                const courierDisplayValue = getCourierDisplayValue(order.status, courier);

                return (
                  <article
                    key={order.order_id}
                    className="rounded-2xl border border-border/60 bg-card/70 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-body font-semibold">Order #{order.order_id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`text-xs rounded-full border px-3 py-1 uppercase tracking-wide ${getStatusBadgeClasses(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </div>

                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <div className="mt-3 space-y-1 text-sm font-body text-muted-foreground">
                        {order.items.map((item, index) => (
                          <p key={`${order.order_id}-${index}`}>
                            {String(item.product_name || item.name || "Item")} x {Number(item.quantity || 0)}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm font-body">
                      <div className="space-y-1">
                        <p>
                          Payment: <span className="font-semibold">{payment}</span>
                        </p>
                        {courierDisplayValue ? (
                          <p>
                            Courier: <span className="font-semibold">{courierDisplayValue}</span>
                          </p>
                        ) : null}
                        {trackingDisplayValue ? (
                          <p>
                            Tracking Number: <span className="font-semibold">{trackingDisplayValue}</span>
                          </p>
                        ) : null}
                        <p>
                          Subtotal: <span className="font-semibold">{formatPeso(order.subtotal)}</span>
                        </p>
                        <p>
                          Shipping: <span className="font-semibold">{order.shipping_fee > 0 ? formatPeso(order.shipping_fee) : "--"}</span>
                        </p>
                        <p>
                          Total: <span className="font-semibold text-primary">{formatPeso(order.total)}</span>
                        </p>
                      </div>

                      <div className="space-y-1 text-muted-foreground">
                        <p className="font-semibold text-foreground">Shipping Address</p>
                        <p>{address.street_address || address.street || "N/A"}</p>
                        <p>{address.barangay || "N/A"}</p>
                        <p>{address.city_municipality || address.city || "N/A"}, {address.province || "N/A"}</p>
                        <p>{address.region_name || address.region || "N/A"} {address.zip_code || address.zip || ""}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderHistory;
