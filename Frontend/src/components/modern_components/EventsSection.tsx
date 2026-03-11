import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ticket, ExternalLink } from "lucide-react";
import { fetchEventPosters } from "@/lib/ecommerceApi";

type EventPoster = {
  id: string;
  name: string;
  image: string;
  ticketLink: string;
};

export const EventsSection = () => {
  const [events, setEvents] = useState<EventPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchEventPosters();
        if (!isMounted) return;
        setEvents(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load events")
            : "Failed to load events";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="events" className="py-24 px-4 bg-card">
      <div className="container mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-display text-gradient mb-4"
        >
          EVENTS
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-muted-foreground font-body mb-12 max-w-2xl"
        >
          Catch BINI live - Get your tickets now!
        </motion.p>

        {loading ? <p className="text-muted-foreground font-body">Loading events...</p> : null}
        {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}
        {!loading && !error && events.length === 0 ? (
          <p className="text-muted-foreground font-body">No events yet.</p>
        ) : null}

        {!loading && !error ? (
          <div className="grid md:grid-cols-2 gap-8">
            {events.map((event, i) => (
              <motion.a
                key={event.id}
                href={event.ticketLink}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-2xl bg-accent">
                  {event.image ? (
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-accent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-display text-2xl md:text-3xl text-foreground group-hover:text-primary transition-colors">
                      {event.name}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-primary">
                      <Ticket size={18} />
                      <span className="font-body text-sm">Get Tickets</span>
                      <ExternalLink size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default EventsSection;
