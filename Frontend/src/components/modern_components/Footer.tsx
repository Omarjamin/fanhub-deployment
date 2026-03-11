import { FormEvent, useEffect, useState } from "react";
import { Send, Mail, ShieldCheck } from "lucide-react";
import { fetchSiteProfile } from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";

const DEFAULT_API_V1 = "https://fanhub-deployment-production.up.railway.app/v1";

function resolveApiV1(): string {
  return String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, "");
}

function resolveSiteSlug(): string {
  const fromEnv = String(import.meta.env.VITE_SITE_SLUG || "").trim().toLowerCase();
  if (fromEnv) return fromEnv;

  const fromSession = String(
    sessionStorage.getItem("site_slug") ||
      sessionStorage.getItem("community_type") ||
      "bini",
  )
    .trim()
    .toLowerCase();

  return fromSession || "bini";
}

const Footer = () => {
  const [siteName, setSiteName] = useState("BINI");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSite = async () => {
      try {
        const data = await fetchSiteProfile();
        if (!isMounted) return;
        setSiteName(data.siteName || "BINI");
      } catch (_) {
        if (!isMounted) return;
        setSiteName("BINI");
      }
    };

    loadSite();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide your name and message.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const siteSlug = resolveSiteSlug();
      const response = await fetch(`${resolveApiV1()}/admin/suggestions/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: String(import.meta.env.VITE_API_KEY || "thread"),
        },
        body: JSON.stringify({
          community_name: siteSlug || "general",
          suggestion_text: `Admin contact from ${name}${email ? ` (${email})` : ""}: ${message}`,
          contact_email: email.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      toast({
        title: "Message sent",
        description: "Your message has been sent to the admin.",
      });

      setName("");
      setEmail("");
      setMessage("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to send message")
          : "Failed to send message";
      toast({
        title: "Send failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="px-4 pb-8 pt-16 border-t border-border/60 bg-gradient-to-b from-card/30 via-card/60 to-background">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 md:gap-10 items-start">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-6 md:p-8">
            <h3 className="font-display text-3xl md:text-4xl text-gradient">Contact Admin</h3>
            <p className="mt-4 text-muted-foreground font-body leading-relaxed">
              Send your concern, feedback, or report directly to the admin team for this community site.
            </p>
            <div className="mt-6 space-y-3 text-sm font-body text-foreground/80">
              <p className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                Current site: <span className="font-semibold ml-1 capitalize">{siteName}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-primary" />
                Admin replies are sent based on provided contact details.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border/60 bg-background/80 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-sm font-body text-foreground">
                Your Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  required
                  className="h-11 rounded-xl border border-border bg-card px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter your name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-body text-foreground">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="h-11 rounded-xl border border-border bg-card px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter your email"
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-sm font-body text-foreground">
              Message
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="rounded-xl border border-border bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                placeholder="Type your message for the admin"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground font-body text-sm font-semibold transition hover:opacity-90 disabled:opacity-70"
            >
              <Send size={16} />
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-center space-y-1">
          <p className="text-sm text-muted-foreground font-body">
            © {new Date().getFullYear()} {siteName} Fanhub. Educational Purposes Only.
          </p>
          <p className="text-xs text-muted-foreground/70 font-body">
            This is an unofficial fan-made site.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
