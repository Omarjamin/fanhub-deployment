import { useState, useEffect, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getModernResolvedSite } from "@/lib/modern-react/site";

const navItems = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Members", id: "members" },
  { label: "Music", id: "music" },
  { label: "Events", id: "events" },
  { label: "Shop", id: "shop" },
];

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
  const heroNavText = "rgba(255,255,255,0.98)";
  const heroNavMuted = "rgba(255,255,255,0.9)";
  const scrolledNavText = "var(--theme-nav-text, var(--color-on-surface, #111111))";
  const scrolledNavMuted = "color-mix(in srgb, var(--theme-nav-text, var(--color-on-surface, #111111)) 78%, white 22%)";
  const isHomeRoute = location.pathname === "/";
  const useHeroNav = isHomeRoute && !isScrolled;
  const desktopLinkColor = useHeroNav ? heroNavMuted : scrolledNavMuted;
  const desktopLinkHover = useHeroNav ? "var(--color-accent, #ff1493)" : "var(--color-accent, #ff1493)";
  const brandShellStyle = {
    padding: isDesktop ? "0.7rem 1rem" : "0.55rem 0.8rem",
    borderRadius: "1.25rem",
    border: useHeroNav ? "1px solid rgba(255,255,255,0.34)" : "1px solid color-mix(in srgb, var(--color-primary) 16%, white 84%)",
    background: useHeroNav
      ? "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.6))"
      : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76))",
    boxShadow: useHeroNav
      ? "0 12px 26px rgba(0,0,0,0.18)"
      : "0 10px 22px rgba(15,23,42,0.10)",
    backdropFilter: "blur(12px)",
  } as const;

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

  const desktopNavStyle = {
    display: "flex",
    alignItems: "center",
    gap: "2.35rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
    flex: "0 1 auto",
  };

  const linkBaseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    padding: 0,
    minWidth: "fit-content",
    lineHeight: 1,
    fontSize: "0.96rem",
    fontWeight: 700,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    textDecoration: "none",
    textShadow: isScrolled ? "none" : "0 1px 10px rgba(0,0,0,0.22)",
    cursor: "pointer",
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 shadow-lg transition-all duration-300"
      style={{
        background: useHeroNav
          ? "linear-gradient(180deg, rgba(20, 18, 24, 0.24), rgba(20, 18, 24, 0.08))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 88%, white 12%), color-mix(in srgb, var(--color-primary-soft) 96%, var(--color-surface) 4%))",
        borderBottom: useHeroNav
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid color-mix(in srgb, var(--color-primary) 22%, white 78%)",
      }}
    >
      <nav className="container mx-auto px-4 min-h-[5rem] md:min-h-[5.5rem] flex items-center justify-between gap-6">
        <button
          onClick={() => scrollTo("home")}
          className="modern-nav-button flex items-center gap-2"
          style={showLogo ? brandShellStyle : undefined}
        >
          {showLogo ? (
            <img
              src={site.logo}
              alt={`${site.siteName} Logo`}
              className="modern-nav-logo h-12 w-auto max-w-[152px] object-contain md:h-14 md:max-w-[176px]"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="font-display text-2xl uppercase tracking-[0.24em] md:text-[1.75rem]"
              style={{ color: useHeroNav ? heroNavText : scrolledNavText }}
            >
              {site.siteName}
            </span>
          )}
        </button>

        {isDesktop ? (
        <ul style={desktopNavStyle}>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className="modern-nav-button"
                style={{
                  ...linkBaseStyle,
                  color: desktopLinkColor,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = desktopLinkHover;
                  event.currentTarget.style.background = "transparent";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = desktopLinkColor;
                  event.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        ) : null}

        {!isDesktop ? (
          <button
            className="modern-nav-button"
            style={{ color: useHeroNav ? heroNavText : scrolledNavText }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        ) : null}
      </nav>

      {!isDesktop && mobileOpen && (
        <div
          className="border-t"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 90%, white 10%), color-mix(in srgb, var(--color-surface) 92%, var(--color-primary-soft) 8%))",
            borderColor: "color-mix(in srgb, var(--color-primary) 18%, white 82%)",
          }}
        >
          <ul className="flex flex-col items-center gap-6 py-8" style={{ listStyle: "none", margin: 0 }}>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollTo(item.id)}
                  className="modern-nav-button font-body text-lg transition-colors uppercase tracking-widest"
                  style={{
                    color: scrolledNavMuted,
                    padding: 0,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = "var(--color-accent, #ff1493)";
                    event.currentTarget.style.background = "transparent";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = scrolledNavMuted;
                    event.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
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
