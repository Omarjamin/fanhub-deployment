import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Cog, PackageCheck, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchOrderById } from "@/lib/ecommerceApi";

type ConfirmationItem = {
  name?: string;
  product_name?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  product_price?: number;
  amount?: number;
  weight_g?: number;
  weight?: number;
  length_cm?: number;
  length?: number;
  width_cm?: number;
  width?: number;
  height_cm?: number;
  height?: number;
};

type ShippingAddress = {
  region?: string;
  region_name?: string;
  province?: string;
  cityMunicipality?: string;
  city_municipality?: string;
  barangay?: string;
  zipCode?: string;
  zip_code?: string;
  streetAddress?: string;
  street_address?: string;
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

type OrderRecord = {
  order_id?: number;
  subtotal?: number;
  shipping_fee?: number;
  total?: number;
  payment_method?: string;
  status?: string;
  tracking_number?: string | null;
  courier?: string | null;
  shipping_address?: ShippingAddress;
  items?: ConfirmationItem[];
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

function normalizeTrackingNumber(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function normalizeCourier(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
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

function resolveItemPrice(item: ConfirmationItem) {
  const price = Number(
    item.price ??
      item.unit_price ??
      item.product_price ??
      item.amount ??
      0,
  );
  return Number.isFinite(price) ? price : 0;
}

function resolveItemShippingMeta(item: ConfirmationItem) {
  const weight = Number(item.weight_g ?? item.weight ?? 0);
  const length = Number(item.length_cm ?? item.length ?? 0);
  const width = Number(item.width_cm ?? item.width ?? 0);
  const height = Number(item.height_cm ?? item.height ?? 0);
  const parts = [];

  if (Number.isFinite(weight) && weight > 0) {
    parts.push(`${weight}g each`);
  }
  if (
    (Number.isFinite(length) && length > 0) ||
    (Number.isFinite(width) && width > 0) ||
    (Number.isFinite(height) && height > 0)
  ) {
    parts.push(`${Math.max(length, 0)} x ${Math.max(width, 0)} x ${Math.max(height, 0)} cm`);
  }

  return parts.join(" • ");
}

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ConfirmationState;
  const [resolvedOrder, setResolvedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    let active = true;
    const numericOrderId = Number(state.orderId || 0);
    if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) return () => {
      active = false;
    };

    fetchOrderById(numericOrderId)
      .then((order) => {
        if (!active) return;
        setResolvedOrder(order);
      })
      .catch(() => {
        if (!active) return;
        setResolvedOrder(null);
      });

    return () => {
      active = false;
    };
  }, [state.orderId]);

  const activeOrder = resolvedOrder;
  const items = Array.isArray(activeOrder?.items) && activeOrder.items.length
    ? activeOrder.items
    : (Array.isArray(state.items) ? state.items : []);
  const itemName = String(activeOrder?.items?.[0]?.product_name || activeOrder?.items?.[0]?.name || state.itemName || "Item");
  const quantity = Number(
    state.quantity ||
    items.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0) ||
    0,
  );
  const computedItemsSubtotal = items.reduce(
    (sum, entry) => sum + resolveItemPrice(entry) * Number(entry.quantity || 0),
    0,
  );
  const subtotal = Number(activeOrder?.subtotal ?? state.subtotal ?? computedItemsSubtotal ?? state.totalPrice ?? 0);
  const shippingFee = Number(activeOrder?.shipping_fee ?? state.shippingFee ?? 0);
  const totalPrice = Number(activeOrder?.total ?? state.totalPrice ?? (subtotal + shippingFee));
  const unitPrice = Number(
    state.unitPrice ||
    (quantity > 0 ? computedItemsSubtotal / quantity : 0) ||
    (quantity > 0 ? subtotal / quantity : 0),
  );
  const remainingStock = Number(state.remainingStock || 0);
  const paymentMethod = String(activeOrder?.payment_method || state.paymentMethod || "cod").toLowerCase() === "cod"
    ? "Cash on Delivery"
    : String(activeOrder?.payment_method || state.paymentMethod || "N/A");
  const shippingAddress = activeOrder?.shipping_address || state.shippingAddress || {};
  const trackingNumber = normalizeTrackingNumber(activeOrder?.tracking_number);
  const currentStatus = normalizeOrderStatus(activeOrder?.status || "pending");
  const courierDisplayValue = getCourierDisplayValue(currentStatus, normalizeCourier(activeOrder?.courier));
  const stepKeys = ["pending", "processing", "shipped", "completed"];
  const currentStepIndex = Math.max(stepKeys.indexOf(currentStatus), 0);
  const steps = [
    { key: "pending", title: "Pending", desc: "Order received", Icon: CheckCircle2 },
    { key: "processing", title: "Processing", desc: "Preparing items", Icon: Cog },
    { key: "shipped", title: "Shipped", desc: "On its way", Icon: Truck },
    { key: "completed", title: "Completed", desc: "Delivered successfully", Icon: PackageCheck },
  ];

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
                  <p className="mt-1 font-body text-black">
                    Current status: {formatOrderStatus(currentStatus)}.
                  </p>
                </div>
              </div>

              <h2 className="mt-6 font-display text-2xl text-foreground">What's Next?</h2>
              <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                {steps.map((step, index) => {
                  const isReached = index <= currentStepIndex;
                  const Icon = step.Icon;

                  return (
                    <div
                      key={step.key}
                      className={isReached
                        ? "rounded-2xl border border-primary/30 bg-primary/10 p-4"
                        : "rounded-2xl border border-border/60 bg-background p-4"}
                      >
                        <div className={isReached
                          ? "h-10 w-10 rounded-full bg-background inline-flex items-center justify-center text-primary"
                          : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-black"}
                        >
                          <Icon size={18} />
                        </div>
                      <p className="mt-3 font-body font-semibold text-black">{step.title}</p>
                      <p className="text-sm text-black">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid lg:grid-cols-[1fr_340px] gap-4">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h3 className="font-body font-semibold text-black">Order Details</h3>
                <div className="mt-3 space-y-2 text-sm font-body text-black">
                  <p className="text-black">
                    Order ID: <span className="font-semibold text-black">{activeOrder?.order_id || state.orderId || "N/A"}</span>
                  </p>
                  <p className="text-black">
                    Payment Method: <span className="font-semibold text-black">{paymentMethod}</span>
                  </p>
                  {courierDisplayValue ? (
                    <p className="text-black">
                      Courier: <span className="font-semibold text-black">{courierDisplayValue}</span>
                    </p>
                  ) : null}
                  {trackingNumber ? (
                    <p className="text-black">
                      Tracking Number: <span className="font-semibold text-black">{trackingNumber}</span>
                    </p>
                  ) : null}
                  {items.length ? (
                    <div className="mt-3 space-y-1">
                      {items.map((entry, index) => (
                        <div className="text-black" key={`${entry.product_name || entry.name || "item"}-${index}`}>
                          <p className="text-black">
                            {entry.product_name || entry.name || itemName} x {Number(entry.quantity || 0)} -{" "}
                            <span className="font-semibold text-black">{formatPeso(resolveItemPrice(entry))}</span>
                          </p>
                          {resolveItemShippingMeta(entry) ? (
                            <p className="text-xs text-black/70">{resolveItemShippingMeta(entry)}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-black">
                      Item: <span className="font-semibold text-black">{itemName}</span>
                    </p>
                  )}
                  <p className="text-black">
                    Quantity: <span className="font-semibold text-black">{quantity}</span>
                  </p>
                  <p className="text-black">
                    Unit Price: <span className="font-semibold text-black">{formatPeso(unitPrice)}</span>
                  </p>
                  <p className="text-black">
                    Subtotal: <span className="font-semibold text-black">{formatPeso(subtotal)}</span>
                  </p>
                  <p className="text-black">
                    Shipping Fee: <span className="font-semibold text-black">{formatPeso(shippingFee)}</span>
                  </p>
                  <p className="text-black">
                    Total: <span className="font-semibold text-primary">{formatPeso(totalPrice)}</span>
                  </p>
                  {remainingStock > 0 ? (
                    <p className="text-black">
                      Remaining Stock: <span className="font-semibold text-black">{remainingStock}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h3 className="font-body font-semibold text-black">Shipping Address</h3>
                <div className="mt-3 space-y-1 text-sm font-body text-black">
                  <p className="text-black">{shippingAddress.streetAddress || shippingAddress.street_address || "N/A"}</p>
                  <p className="text-black">{shippingAddress.barangay || "N/A"}</p>
                  <p className="text-black">
                    {shippingAddress.cityMunicipality || shippingAddress.city_municipality || "N/A"}, {shippingAddress.province || "N/A"}
                  </p>
                  <p className="text-black">{shippingAddress.region || shippingAddress.region_name || "N/A"}</p>
                  <p className="text-black">{shippingAddress.zipCode || shippingAddress.zip_code || "N/A"}</p>
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
