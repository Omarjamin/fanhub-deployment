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
          className="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl"
        >
          EVENTS
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-muted-foreground font-body mb-12 max-w-2xl"
        >
          Browse the latest event posters and ticket links for this community.
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
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-accent/20 p-4 md:p-5">
                  <div className="flex min-h-[22rem] items-center justify-center overflow-hidden rounded-xl bg-background/35 p-3 md:min-h-[28rem] md:p-4">
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.name}
                        className="max-h-[20rem] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02] md:max-h-[26rem]"
                      />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-accent" />
                    )}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <h3 className="font-display text-xl text-foreground transition-colors group-hover:text-primary md:text-2xl">
                      {event.name}
                    </h3>
                    <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-2 text-foreground">
                      <Ticket size={16} />
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
