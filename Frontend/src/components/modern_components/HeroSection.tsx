import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getModernResolvedSite } from "@/lib/modern-react/site";

const HeroSection = () => {
  const site = useMemo(() => getModernResolvedSite(), []);
  const [logoFailed, setLogoFailed] = useState(false);
  const heroImage = site.leadImage || site.groupPhoto;
  const showLogo = Boolean(site.logo) && !logoFailed;

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: heroImage ? `url('${heroImage}')` : "url('/flames2.webp')",
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
          {showLogo ? (
            <img
              src={site.logo}
              alt={`${site.siteName} Logo`}
              className="h-24 md:h-32 mx-auto mb-4 brightness-0 invert"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <h1 className="font-display text-5xl md:text-7xl text-white tracking-[0.28em] uppercase">
              {site.siteName}
            </h1>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mx-auto max-w-3xl"
        >
          {site.shortBio ? (
            <p className="mb-4 text-xs md:text-sm font-body uppercase tracking-[0.38em] text-white/75">
              {site.shortBio}
            </p>
          ) : null}
          <p className="text-lg md:text-2xl font-body leading-relaxed text-white/92">
            {site.description || `Welcome to ${site.siteName}.`}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
