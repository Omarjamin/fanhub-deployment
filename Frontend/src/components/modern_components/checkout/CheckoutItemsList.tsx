export type CheckoutItem = {
  itemId?: number;
  productId: number;
  variantId: number;
  name: string;
  image: string;
  category?: string;
  variant?: string;
  quantity: number;
  price: number;
  weight?: number;
};

type CheckoutItemsListProps = {
  items: CheckoutItem[];
  formatPeso: (price: number) => string;
};

const CheckoutItemsList = ({ items, formatPeso }: CheckoutItemsListProps) => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
      <h2 className="font-body font-semibold mb-4">Items</h2>
      <div className="space-y-3">
        {items.map((item, index) => (
          <article
            key={`${item.variantId}-${index}`}
            className="rounded-xl border border-border/50 bg-background p-3 flex gap-3"
          >
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-accent/40 shrink-0">
              {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Qty {item.quantity} {item.variant ? `| ${item.variant}` : ""}
              </p>
              {Number(item.weight || 0) > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">Weight: {Number(item.weight)} g each</p>
              ) : null}
              <p className="text-primary font-display mt-1 text-sm">{formatPeso(item.price)}</p>
            </div>
            <p className="font-body text-sm">{formatPeso(item.price * item.quantity)}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CheckoutItemsList;
