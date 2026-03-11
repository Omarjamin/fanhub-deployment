import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { products } from "@/data/biniData";

const MerchSection = () => {
  return (
    <section id="shop" className="py-24 px-4">
      <div className="container mx-auto">
        <div className="mb-12">
          <motion.h2
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-display text-gradient mb-4"
          >
            SHOP
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground font-body max-w-2xl"
          >
            Official BINI merchandise — Show your BLOOM pride!
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-xl bg-accent">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full font-body">
                    {product.collection}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow cursor-pointer">
                    <ShoppingBag className="text-primary-foreground" size={20} />
                  </div>
                </div>
              </div>
              <h3 className="mt-4 font-body font-semibold text-foreground">{product.name}</h3>
              <p className="text-secondary font-display text-xl">{product.price}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MerchSection;
