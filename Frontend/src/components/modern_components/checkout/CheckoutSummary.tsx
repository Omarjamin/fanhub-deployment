type CheckoutSummaryProps = {
  totalQuantity: number;
  totalWeight: number;
  packageDimensions?: {
    package_length_cm?: number;
    package_width_cm?: number;
    package_height_cm?: number;
  };
  subtotal: number;
  shippingFee: number | null;
  shippingCourier?: string;
  shippingRegion?: string;
  shippingSource?: string;
  total: number;
  submitting: boolean;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  formatPeso: (price: number) => string;
};

const CheckoutSummary = ({
  totalQuantity,
  totalWeight,
  packageDimensions,
  subtotal,
  shippingFee,
  shippingCourier,
  shippingRegion,
  shippingSource,
  total,
  submitting,
  paymentMethod,
  onPaymentMethodChange,
  formatPeso,
}: CheckoutSummaryProps) => {
  const packageLength = Number(packageDimensions?.package_length_cm || 0);
  const packageWidth = Number(packageDimensions?.package_width_cm || 0);
  const packageHeight = Number(packageDimensions?.package_height_cm || 0);
  const hasPackageDimensions = packageLength > 0 || packageWidth > 0 || packageHeight > 0;
  const shippingLogicLabel =
    shippingSource === "advanced_rule"
      ? "Advanced rule matched"
      : shippingSource === "legacy_weight_tiers"
        ? "Default weight rate"
        : "Waiting for address";

  return (
    <aside className="rounded-2xl border border-border/60 bg-card/70 p-5 h-fit sticky top-24 text-black">
      <h2 className="font-display text-2xl text-gradient">Order Summary</h2>
      <div className="mt-4 space-y-2 text-sm font-body text-black">
        <div className="flex justify-between">
          <span className="text-black">Items</span>
          <span className="text-black">{totalQuantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Subtotal</span>
          <span className="text-black">{formatPeso(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Total Weight</span>
          <span className="text-black">{totalWeight > 0 ? `${totalWeight} g` : "--"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black">Package Size</span>
          <span className="text-right text-black">
            {hasPackageDimensions ? `${packageLength} x ${packageWidth} x ${packageHeight} cm` : "--"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Shipping</span>
          <span className="text-black">{shippingFee === null ? "--" : formatPeso(shippingFee)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black">Courier</span>
          <span className="text-right text-black">{shippingCourier || "--"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black">Shipping Rule</span>
          <span className="text-right text-black">{shippingLogicLabel}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black">Destination</span>
          <span className="text-right text-black">{shippingRegion || "--"}</span>
        </div>
        <div className="h-px bg-border/60 my-2" />
        <div className="flex justify-between text-base">
          <span className="text-black">Total</span>
          <span className="font-display text-primary">{formatPeso(total)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-background p-3">
        <p className="text-sm font-body font-semibold text-black">Payment Method</p>
        <button
          type="button"
          onClick={() => onPaymentMethodChange(paymentMethod === "cod" ? "" : "cod")}
          className="mt-2 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-body transition bg-card text-black hover:bg-accent"
        >
          <input
            type="radio"
            name="payment_method"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="h-4 w-4 accent-primary pointer-events-none"
          />
          Cash on Delivery
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-body font-semibold hover:opacity-90 transition disabled:opacity-70"
      >
        {submitting ? "Placing order..." : "Place Order"}
      </button>
    </aside>
  );
};

export default CheckoutSummary;
