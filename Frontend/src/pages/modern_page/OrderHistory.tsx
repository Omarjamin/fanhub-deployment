import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchOrderHistory, toExternalUrl } from "@/lib/ecommerceApi";
import { formatPackageDimensions } from "@/utils/package-dimensions.js";

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
    product_image?: string;
    product_image_url?: string;
    product_img?: string;
    image?: string;
    image_url?: string;
    img_url?: string;
    thumbnail?: string;
    thumb?: string;
    quantity?: number;
    price?: number;
    weight_g?: number;
    weight?: number;
    length_cm?: number;
    length?: number;
    width_cm?: number;
    width?: number;
    height_cm?: number;
    height?: number;
  }>;
};

type AnyRecord = Record<string, any>;

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
  return "border-border/60 bg-background text-black";
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

function formatPeso(price: number | string) {
  const normalized = typeof price === "number" ? price : Number(String(price ?? "").replace(/,/g, ""));
  if (!Number.isFinite(normalized)) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(normalized);
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstFinite(values: unknown[]) {
  for (const value of values) {
    const parsed = toNumber(value, NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function resolveOrderAmounts(order: HistoryItem) {
  const raw = (order || {}) as AnyRecord;
  const summary = (raw.summary_data || raw.summaryData || {}) as AnyRecord;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSubtotal = items.reduce(
    (sum, item) =>
      sum + toNumber(item?.price, 0) * toNumber(item?.quantity ?? 0, 0),
    0,
  );

  let subtotal = firstFinite([
    raw.subtotal,
    raw.sub_total,
    raw.subtotal_amount,
    raw.subTotal,
    summary.subtotal,
    summary.sub_total,
    summary.subtotal_amount,
    summary.subTotal,
  ]);
  if (!Number.isFinite(subtotal)) subtotal = itemsSubtotal;

  let shippingFee = firstFinite([
    raw.shipping_fee,
    raw.shippingFee,
    raw.shipping_fee_amount,
    summary.shipping_fee,
    summary.shippingFee,
    summary.shipping_fee_amount,
  ]);

  let total = firstFinite([
    raw.total,
    raw.total_amount,
    raw.totalAmount,
    summary.total,
    summary.total_amount,
    summary.totalAmount,
  ]);

  if (!Number.isFinite(shippingFee)) {
    if (Number.isFinite(total) && Number.isFinite(subtotal)) {
      shippingFee = Math.max(0, total - subtotal);
    } else {
      shippingFee = 0;
    }
  }

  if (!Number.isFinite(total)) {
    total = subtotal + shippingFee;
  }

  return {
    subtotal,
    shippingFee,
    total,
  };
}

function resolveItemShippingMeta(item: NonNullable<HistoryItem["items"]>[number]) {
  const weight = toNumber(item?.weight_g ?? item?.weight, 0);
  const length = toNumber(item?.length_cm ?? item?.length, 0);
  const width = toNumber(item?.width_cm ?? item?.width, 0);
  const height = toNumber(item?.height_cm ?? item?.height, 0);
  const parts = [];

  if (weight > 0) {
    parts.push(`${weight}g each`);
  }
  if (length > 0 || width > 0 || height > 0) {
    parts.push(formatPackageDimensions(length, width, height));
  }

  return parts.join(" • ");
}

function resolveOrderItemImage(item: NonNullable<HistoryItem["items"]>[number]) {
  const raw =
    item?.product_image ||
    item?.product_image_url ||
    item?.product_img ||
    item?.image_url ||
    item?.image ||
    item?.img_url ||
    item?.thumbnail ||
    item?.thumb ||
    "";
  if (!raw) return "";
  return toExternalUrl(String(raw), "");
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
        setOrders(Array.isArray(rows) ? (rows as HistoryItem[]) : []);
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
    () => orders.reduce((sum, order) => sum + resolveOrderAmounts(order).total, 0),
    [orders],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 px-4 py-16 text-black">
        <div className="container mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-border/60 bg-card/70 inline-flex items-center justify-center text-primary">
              <ClipboardList size={20} />
            </div>
            <div>
              <h1 className="font-display text-4xl text-gradient">Order History</h1>
              <p className="text-black font-body text-sm">
                {orders.length} order{orders.length === 1 ? "" : "s"} • Total spent {formatPeso(totalSpent)}
              </p>
            </div>
          </div>

          {loading ? <p className="text-black font-body">Loading order history...</p> : null}
          {!loading && error ? <p className="text-black font-body">{error}</p> : null}

          {!loading && !error && orders.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 md:p-10 text-center">
              <p className="text-black font-body">No orders yet.</p>
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
                const resolvedAmounts = resolveOrderAmounts(order);

                return (
                  <article
                    key={order.order_id}
                    className="rounded-2xl border border-border/60 bg-card/70 p-5 text-black"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-body font-semibold text-black">Order #{order.order_id}</p>
                        <p className="text-xs text-black">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`text-xs rounded-full border px-3 py-1 uppercase tracking-wide ${getStatusBadgeClasses(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </div>

                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <div className="mt-3 space-y-3 text-sm font-body">
                        {order.items.map((item, index) => {
                          const imageUrl = resolveOrderItemImage(item);
                          return (
                            <div key={`${order.order_id}-${index}`} className="flex items-start gap-3 text-black">
                              <div className="h-14 w-14 rounded-xl border border-border/60 bg-accent/50 overflow-hidden shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={String(item.product_name || item.name || "Item")}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-accent/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-black">
                                  {String(item.product_name || item.name || "Item")} x {Number(item.quantity || 0)}
                                </p>
                                {resolveItemShippingMeta(item) ? (
                                  <p className="text-xs text-black/70">{resolveItemShippingMeta(item)}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm font-body">
                      <div className="space-y-1" style={{ color: "#000" }}>
                        <p className="text-black">
                          Payment: <span className="font-semibold">{payment}</span>
                        </p>
                        {courierDisplayValue ? (
                          <p className="text-black">
                            Courier: <span className="font-semibold">{courierDisplayValue}</span>
                          </p>
                        ) : null}
                        {trackingDisplayValue ? (
                          <p className="text-black">
                            Tracking Number: <span className="font-semibold">{trackingDisplayValue}</span>
                          </p>
                        ) : null}
                        <p className="text-black">
                          Subtotal: <span className="font-semibold">{formatPeso(resolvedAmounts.subtotal)}</span>
                        </p>
                        <p className="text-black">
                          Shipping: <span className="font-semibold">{formatPeso(resolvedAmounts.shippingFee)}</span>
                        </p>
                        <p className="text-black">
                          Total: <span className="font-semibold" style={{ color: "#000" }}>{formatPeso(resolvedAmounts.total)}</span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-black">Shipping Address</p>
                        <p className="text-black">{address.street_address || address.street || "N/A"}</p>
                        <p className="text-black">{address.barangay || "N/A"}</p>
                        <p className="text-black">{address.city_municipality || address.city || "N/A"}, {address.province || "N/A"}</p>
                        <p className="text-black">{address.region_name || address.region || "N/A"} {address.zip_code || address.zip || ""}</p>
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
