import { useState, useEffect, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getModernResolvedSite } from "@/lib/modern-react/site";

const navItems = ["Home", "About", "Members", "Music", "Events", "Shop"];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );
  const site = useMemo(() => getModernResolvedSite(), []);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(site.logo) && !logoFailed;
  const heroNavText = "rgba(255,255,255,0.96)";
  const heroNavMuted = "rgba(255,255,255,0.84)";
  const scrolledNavText = "var(--theme-nav-text, var(--color-on-surface, #111111))";
  const scrolledNavMuted = "color-mix(in srgb, var(--theme-nav-text, var(--color-on-surface, #111111)) 78%, white 22%)";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const scrollTo = (sectionId: string) => {
    if (sectionId === "shop") {
      navigate("/shop");
      setMobileOpen(false);
      return;
    }

    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: sectionId } });
      setMobileOpen(false);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "backdrop-blur-xl shadow-lg" : "bg-transparent"
      }`}
      style={
        isScrolled
          ? {
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 88%, white 12%), color-mix(in srgb, var(--color-primary-soft) 96%, var(--color-surface) 4%))",
              borderBottom: "1px solid color-mix(in srgb, var(--color-primary) 22%, white 78%)",
            }
          : undefined
      }
    >
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => scrollTo("home")}
          className="flex items-center gap-2"
          style={{ background: "transparent", border: "none", padding: 0 }}
        >
          {showLogo ? (
            <img
              src={site.logo}
              alt={`${site.siteName} Logo`}
              className={`h-8 ${isScrolled ? "" : "brightness-0 invert"}`}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="font-display text-xl uppercase tracking-[0.22em]"
              style={{ color: isScrolled ? scrolledNavText : heroNavText }}
            >
              {site.siteName}
            </span>
          )}
        </button>

        {isDesktop ? (
        <ul className="gap-8" style={{ display: "flex", alignItems: "center", listStyle: "none", margin: 0, padding: 0 }}>
          {navItems.map((item) => (
            <li key={item}>
              <button
                onClick={() => scrollTo(item.toLowerCase())}
                className="font-body text-sm font-medium transition-colors uppercase tracking-widest"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: isScrolled ? scrolledNavMuted : heroNavMuted,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = isScrolled ? scrolledNavText : heroNavText;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = isScrolled ? scrolledNavMuted : heroNavMuted;
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
        ) : null}

        {!isDesktop ? (
          <button
            style={{ color: isScrolled ? scrolledNavText : heroNavText, background: "transparent", border: "none", padding: 0 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        ) : null}
      </nav>

      {!isDesktop && mobileOpen && (
        <div
          className="backdrop-blur-xl border-t"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 90%, white 10%), color-mix(in srgb, var(--color-surface) 92%, var(--color-primary-soft) 8%))",
            borderColor: "color-mix(in srgb, var(--color-primary) 18%, white 82%)",
          }}
        >
          <ul className="flex flex-col items-center gap-6 py-8" style={{ listStyle: "none", margin: 0 }}>
            {navItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => scrollTo(item.toLowerCase())}
                  className="font-body text-lg transition-colors uppercase tracking-widest"
                  style={{ color: scrolledNavMuted, background: "transparent", border: "none", padding: 0 }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = scrolledNavText;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = scrolledNavMuted;
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
