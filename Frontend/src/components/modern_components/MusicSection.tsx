import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { fetchDiscographyAlbums } from "@/lib/ecommerceApi";

type Album = {
  id: string;
  title: string;
  year: string;
  songs: number;
  cover: string;
  link: string;
};

const MusicSection = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlbums = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchDiscographyAlbums();
        if (!isMounted) return;
        setAlbums(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load discography")
            : "Failed to load discography";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAlbums();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="music" className="py-24 px-4">
      <div className="container mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-4xl font-display text-gradient md:text-5xl lg:text-6xl"
        >
          DISCOGRAPHY
        </motion.h2>

        {loading ? <p className="text-muted-foreground font-body">Loading albums...</p> : null}
        {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}
        {!loading && !error && albums.length === 0 ? (
          <p className="text-muted-foreground font-body">No albums yet.</p>
        ) : null}

        {!loading && !error ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {albums.map((album, i) => (
              <motion.a
                key={album.id}
                href={album.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/70 p-3">
                  {album.cover ? (
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="aspect-square w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-accent" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <ExternalLink className="text-primary-foreground" size={20} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-muted-foreground font-body text-sm">
                    {album.year} - {album.songs} {album.songs === 1 ? "song" : "songs"}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MusicSection;
