import { ArrowLeft, CreditCard } from "lucide-react";

type CheckoutHeaderProps = {
  onBack: () => void;
};

const CheckoutHeader = ({ onBack }: CheckoutHeaderProps) => {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm font-body hover:border-primary/60 hover:text-primary transition"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="mt-5 mb-8 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl border border-border/60 bg-card/70 inline-flex items-center justify-center text-primary">
          <CreditCard size={20} />
        </div>
        <div>
          <h1 className="font-display text-4xl text-black">Checkout</h1>
          <p className="text-black font-body text-sm">Complete your order details below.</p>
        </div>
      </div>
    </>
  );
};

export default CheckoutHeader;
