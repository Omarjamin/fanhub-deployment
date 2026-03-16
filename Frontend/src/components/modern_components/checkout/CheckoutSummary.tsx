type CheckoutSummaryProps = {
  totalQuantity: number;
  totalWeight: number;
  subtotal: number;
  shippingFee: number | null;
  total: number;
  submitting: boolean;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  formatPeso: (price: number) => string;
};

const CheckoutSummary = ({
  totalQuantity,
  totalWeight,
  subtotal,
  shippingFee,
  total,
  submitting,
  paymentMethod,
  onPaymentMethodChange,
  formatPeso,
}: CheckoutSummaryProps) => {
  return (
    <aside className="rounded-2xl border border-border/60 bg-card/70 p-5 h-fit sticky top-24 text-black">
      <h2 className="font-display text-2xl text-gradient">Order Summary</h2>
      <div className="mt-4 space-y-2 text-sm font-body">
        <div className="flex justify-between">
          <span className="text-black">Items</span>
          <span>{totalQuantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Subtotal</span>
          <span>{formatPeso(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Total Weight</span>
          <span>{totalWeight > 0 ? `${totalWeight} g` : "--"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">Shipping</span>
          <span>{shippingFee === null ? "--" : formatPeso(shippingFee)}</span>
        </div>
        <div className="h-px bg-border/60 my-2" />
        <div className="flex justify-between text-base">
          <span>Total</span>
          <span className="font-display text-primary">{formatPeso(total)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-background p-3">
        <p className="text-sm font-body font-semibold">Payment Method</p>
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
