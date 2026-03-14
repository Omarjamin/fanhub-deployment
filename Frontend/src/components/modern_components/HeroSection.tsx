import { useMemo } from "react";
import { motion } from "framer-motion";
import { getModernResolvedSite } from "@/lib/modern-react/site";

const SOCIAL_ICONS = {
  instagram: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980429/instagram_zwwjvb.png",
  facebook: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980422/facebook_otf7ub.png",
  tiktok: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980419/tiktok_i3uoas.png",
  spotify: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980414/spotify_n9ygps.png",
  x: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980413/twitter_jzfvjn.png",
  youtube: "https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772980408/youtube_mrubg2.png",
} as const;

function normalizeExternalUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

const HeroSection = () => {
  const site = useMemo(() => getModernResolvedSite(), []);
  const heroImage = site.leadImage || site.groupPhoto;
  const socials = useMemo(
    () =>
      [
        { key: "instagram", href: normalizeExternalUrl(site.raw?.instagram_url), label: "Instagram" },
        { key: "facebook", href: normalizeExternalUrl(site.raw?.facebook_url), label: "Facebook" },
        { key: "tiktok", href: normalizeExternalUrl(site.raw?.tiktok_url), label: "TikTok" },
        { key: "spotify", href: normalizeExternalUrl(site.raw?.spotify_url), label: "Spotify" },
        { key: "x", href: normalizeExternalUrl(site.raw?.x_url), label: "X" },
        { key: "youtube", href: normalizeExternalUrl(site.raw?.youtube_url), label: "YouTube" },
      ].filter((item) => item.href),
    [site.raw],
  );

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

      <div className="container mx-auto px-4 z-10">
        {socials.length ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="mx-auto flex w-fit max-w-full flex-col items-center gap-4 rounded-[28px] border border-white/15 bg-black/20 px-5 py-4 text-center backdrop-blur-md md:px-7"
          >
            <p className="text-[0.65rem] font-body uppercase tracking-[0.34em] text-white/72 md:text-xs">
              Follow {site.siteName}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              {socials.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${site.siteName} ${item.label}`}
                  className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/14 bg-white/10 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/18"
                >
                  <img
                    src={SOCIAL_ICONS[item.key]}
                    alt={item.label}
                    className="h-5 w-5 object-contain opacity-90 transition group-hover:opacity-100"
                  />
                </a>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
};

export default HeroSection;
