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
  length?: number;
  width?: number;
  height?: number;
};

type CheckoutItemsListProps = {
  items: CheckoutItem[];
  formatPeso: (price: number) => string;
};

const formatPackageSize = (length = 0, width = 0, height = 0) => {
  const resolvedLength = Number(length || 0);
  const resolvedWidth = Number(width || 0);
  const resolvedHeight = Number(height || 0);
  if (resolvedLength <= 0 && resolvedWidth <= 0 && resolvedHeight <= 0) return "";
  return `${resolvedLength} x ${resolvedWidth} x ${resolvedHeight} cm`;
};

const CheckoutItemsList = ({ items, formatPeso }: CheckoutItemsListProps) => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 text-black">
      <h2 className="font-body font-semibold mb-4">Items</h2>
      <div className="space-y-3">
        {items.map((item, index) => {
          const itemWeight = Number(item.weight || 0);
          const packageSize = formatPackageSize(item.length, item.width, item.height);

          return (
            <article
              key={`${item.variantId}-${index}`}
              className="rounded-xl border border-border/50 bg-background p-3 flex gap-3"
            >
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-accent/40 shrink-0">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-black mt-0.5">
                  Qty {item.quantity} {item.variant ? `| ${item.variant}` : ""}
                </p>
                {itemWeight > 0 ? (
                  <p className="text-xs text-black mt-0.5">Weight: {itemWeight} g each</p>
                ) : null}
                {packageSize ? (
                  <p className="text-xs text-black mt-0.5">Package: {packageSize}</p>
                ) : null}
                <p className="text-primary font-display mt-1 text-sm">{formatPeso(item.price)}</p>
              </div>
              <p className="font-body text-sm">{formatPeso(item.price * item.quantity)}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutItemsList;
