import { motion } from "framer-motion";
import { Play, Music } from "lucide-react";
import { siteInfo } from "@/data/biniData";

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/flames2.webp')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/55" />

      <div className="container mx-auto px-4 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <img 
            src={siteInfo.logo} 
            alt="BINI Logo" 
            className="h-24 md:h-32 mx-auto mb-4 brightness-0 invert"
          />
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
