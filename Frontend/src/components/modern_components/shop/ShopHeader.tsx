import { motion } from "framer-motion";

const ShopHeader = () => {
  return (
    <div className="mb-10">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl md:text-7xl font-display text-gradient mb-4"
      >
        SHOP
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-muted-foreground font-body max-w-2xl"
      >
        Own the look, wear your support, and grab your favorite merch before it sells out.
      </motion.p>
    </div>
  );
};

export default ShopHeader;
