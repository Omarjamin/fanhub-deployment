import { motion } from "framer-motion";

type Collection = {
  id: string;
  name: string;
  image: string;
};

type CollectionTabsProps = {
  collections: Collection[];
  activeCollectionId: string;
  onSelect: (collectionId: string) => void;
};

const CollectionTabs = ({ collections, activeCollectionId, onSelect }: CollectionTabsProps) => {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {collections.map((collection, index) => {
        const active = activeCollectionId === collection.id;
        return (
          <motion.button
            key={collection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(collection.id)}
            className={`relative overflow-hidden rounded-2xl border text-left transition ${
              active
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-card/70 hover:border-primary/40"
            }`}
          >
            <div className="h-28 bg-accent">
              {collection.image ? (
                <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="p-3">
              <p className="font-body font-semibold text-sm">{collection.name}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CollectionTabs;
