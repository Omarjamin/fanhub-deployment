import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchSiteMembers } from "@/lib/ecommerceApi";

type Member = {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
};

const MembersSection = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadMembers = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchSiteMembers();
        if (!isMounted) return;
        setMembers(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load members")
            : "Failed to load members";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="members" className="py-24 px-4 bg-card">
      <div className="container mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-4xl font-display text-gradient md:text-5xl lg:text-6xl"
        >
          MEMBERS
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-muted-foreground font-body mb-12 max-w-2xl"
        >
          Meet the members
        </motion.p>

        {loading ? <p className="text-muted-foreground font-body">Loading members...</p> : null}
        {!loading && error ? <p className="text-muted-foreground font-body">{error}</p> : null}
        {!loading && !error && members.length === 0 ? (
          <p className="text-muted-foreground font-body">No members yet.</p>
        ) : null}

        {!loading && !error ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 bg-accent/25 p-3 md:p-4">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-full w-full object-contain object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/92 via-background/18 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
                    <p className="text-sm text-primary font-body">{member.role}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">
                      {member.description}
                    </p>
                  </div>
                </div>
                <h3 className="mt-3 font-display text-xl text-foreground group-hover:text-primary transition-colors text-center">
                  {member.name}
                </h3>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MembersSection;
