import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchSiteProfile } from "@/lib/ecommerceApi";

type SiteProfile = {
  siteName: string;
  shortBio: string;
  description: string;
};

function stripHtml(value: string) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const AboutSection = () => {
  const [profile, setProfile] = useState<SiteProfile>({
    siteName: "BINI",
    shortBio: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchSiteProfile();
        if (!isMounted) return;
        setProfile({
          siteName: data.siteName || "Community",
          shortBio: stripHtml(data.shortBio || ""),
          description: stripHtml(data.description || ""),
        });
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load about section")
            : "Failed to load about section";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="about" className="py-24 px-4">
      <div className="container mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl"
        >
          ABOUT
        </motion.h2>

        {loading ? <p className="text-muted-foreground font-body">Loading about...</p> : null}
        {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}

        {!loading && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border/60 bg-card/70 p-6 md:p-8"
          >
            {profile.shortBio ? (
              <p className="text-primary font-body uppercase tracking-widest text-xs md:text-sm mb-4">
                {profile.shortBio}
              </p>
            ) : null}
            <p className="text-foreground/90 font-body text-base md:text-lg leading-relaxed max-w-4xl">
              {profile.description || `About ${profile.siteName}`}
            </p>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
};

export default AboutSection;
