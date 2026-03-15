import { useState, useEffect, useMemo } from "react";
import { LogOut, Menu, User, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getModernResolvedSite } from "@/lib/modern-react/site";
import { getAuthToken, removeAuthToken } from "@/services/ecommerce_services/auth/auth.js";
import { getModernSiteSlug } from "@/lib/modern-react/context";
import { isEcommerceLoggedIn, setEcommercePostLoginRedirect } from "@/lib/ecommerceApi";

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
  const siteSlug = useMemo(() => getModernSiteSlug(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken(siteSlug)));
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const site = useMemo(() => getModernResolvedSite(), []);
  const profilePath = useMemo(
    () => siteSlug ? `/fanhub/community-platform/${siteSlug}/profile` : "/fanhub/community-platform",
    [siteSlug],
  );
  const showLogo = Boolean(site.logo) && !logoFailed;
  const heroNavText = "rgba(255,255,255,0.98)";
  const heroNavMuted = "rgba(255,255,255,0.9)";
  const scrolledNavText = "var(--theme-nav-text, var(--color-on-surface, #111111))";
  const scrolledNavMuted = "color-mix(in srgb, var(--theme-nav-text, var(--color-on-surface, #111111)) 78%, white 22%)";
  const isHomeRoute = location.pathname === "/";
  const useHeroNav = isHomeRoute && !isScrolled;
  const desktopLinkColor = useHeroNav ? heroNavMuted : scrolledNavMuted;
  const desktopLinkHover = "var(--color-accent, #ff1493)";

  const brandShellStyle = {
    padding: isDesktop ? "0.52rem 0.9rem" : "0.42rem 0.72rem",
    borderRadius: "1rem",
    border: useHeroNav
      ? "1px solid rgba(255,255,255,0.28)"
      : "1px solid color-mix(in srgb, var(--color-primary) 16%, white 84%)",
    background: useHeroNav
      ? "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))"
      : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76))",
    boxShadow: useHeroNav
      ? "0 10px 24px rgba(0,0,0,0.18)"
      : "0 9px 20px rgba(15,23,42,0.10)",
    backdropFilter: "blur(12px)",
  } as const;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    const handleAuthRefresh = () => setIsAuthenticated(Boolean(getAuthToken(siteSlug)));
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    window.addEventListener("storage", handleAuthRefresh);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("storage", handleAuthRefresh);
    };
  }, [siteSlug]);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      removeAuthToken(siteSlug);
      setIsAuthenticated(false);
      navigate("/signin");
      return;
    }
    navigate("/signin");
  };

  const scrollTo = (sectionId: string) => {
    if (sectionId === "shop") {
      if (!isEcommerceLoggedIn()) {
        setEcommercePostLoginRedirect("/shop");
        navigate("/signin");
        setMobileOpen(false);
        return;
      }
      const alreadyOnShop = location.pathname === "/shop";
      navigate("/shop");
      if (alreadyOnShop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      }
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
    gap: "1.7rem",
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
    fontSize: "0.82rem",
    fontWeight: 700,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    textDecoration: "none",
    textShadow: isScrolled ? "none" : "0 1px 10px rgba(0,0,0,0.22)",
    cursor: "pointer",
  };

  const authButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.5rem",
    borderRadius: "999px",
    border: useHeroNav
      ? "1px solid rgba(255,255,255,0.45)"
      : "1px solid color-mix(in srgb, var(--color-primary) 22%, white 78%)",
    background: useHeroNav
      ? "rgba(255,255,255,0.12)"
      : "color-mix(in srgb, var(--color-primary-soft) 75%, white 25%)",
    color: useHeroNav ? heroNavText : scrolledNavText,
    width: "2.35rem",
    height: "2.35rem",
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 shadow-lg transition-all duration-300"
      style={{
        background: useHeroNav
          ? "linear-gradient(180deg, rgba(20, 18, 24, 0.24), rgba(20, 18, 24, 0.08))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 90%, white 10%), color-mix(in srgb, var(--color-primary-soft) 97%, var(--color-surface) 3%))",
        borderBottom: useHeroNav
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid color-mix(in srgb, var(--color-primary) 22%, white 78%)",
      }}
    >
      <nav className="container mx-auto flex min-h-[4rem] items-center justify-between gap-4 px-4 md:min-h-[4.35rem]">
        <button
          type="button"
          onClick={() => scrollTo("home")}
          className="modern-nav-button flex items-center gap-2"
          style={showLogo ? brandShellStyle : undefined}
        >
          {showLogo ? (
            <img
              src={site.logo}
              alt={`${site.siteName} Logo`}
              className="modern-nav-logo h-10 w-auto max-w-[132px] object-contain md:h-11 md:max-w-[152px]"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="font-display text-xl uppercase tracking-[0.22em] md:text-[1.55rem]"
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

        {isDesktop ? (
          <div className="flex items-center gap-3">
            <button
              className="modern-nav-button"
              style={authButtonStyle}
              onClick={handleAuthClick}
              aria-label={isAuthenticated ? "Log Out" : "Sign In"}
              title={isAuthenticated ? "Log Out" : "Sign In"}
            >
              {isAuthenticated ? <LogOut size={18} /> : <User size={18} />}
            </button>
          </div>
        ) : null}

        {!isDesktop && (
          <button
            type="button"
            className="modern-nav-button inline-flex items-center justify-center rounded-full px-3 py-2"
            style={{
              ...actionBaseStyle,
              color: useHeroNav ? heroNavText : scrolledNavText,
            }}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </nav>

      {!isDesktop && mobileOpen ? (
        <div
          className="border-t"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 92%, white 8%), color-mix(in srgb, var(--color-surface) 93%, var(--color-primary-soft) 7%))",
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
          <div className="flex flex-col items-center gap-3 pb-8">
            <button
              className="modern-nav-button"
              style={authButtonStyle}
              onClick={() => {
                handleAuthClick();
                setMobileOpen(false);
              }}
              aria-label={isAuthenticated ? "Log Out" : "Sign In"}
              title={isAuthenticated ? "Log Out" : "Sign In"}
            >
              {isAuthenticated ? <LogOut size={18} /> : <User size={18} />}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
