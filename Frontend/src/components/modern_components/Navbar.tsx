import { useEffect, useMemo, useState } from "react";
import {
  History,
  LogOut,
  Menu,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getModernResolvedSite } from "@/lib/modern-react/site";
import { isEcommerceLoggedIn, setEcommercePostLoginRedirect } from "@/lib/ecommerceApi";
import { getActiveSiteSlug } from "@/lib/site-context.js";
import {
  authHeaders,
  removeAuthToken,
} from "@/services/ecommerce_services/auth/auth.js";
import { api as buildEcommerceApiUrl } from "@/services/ecommerce_services/config.js";
import { showConfirmToast, showToast } from "@/utils/toast.js";

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => isEcommerceLoggedIn());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const site = useMemo(() => getModernResolvedSite(), []);
  const siteSlug = useMemo(() => getActiveSiteSlug(), [location.pathname]);
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
    letterSpacing: "0.28em",
    textTransform: "uppercase" as const,
    textDecoration: "none",
    textShadow: isScrolled ? "none" : "0 1px 10px rgba(0,0,0,0.22)",
    cursor: "pointer",
  };

  const actionBaseStyle = {
    borderRadius: "999px",
    border: useHeroNav
      ? "1px solid rgba(255,255,255,0.2)"
      : "1px solid color-mix(in srgb, var(--color-primary) 18%, white 82%)",
    background: useHeroNav
      ? "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))"
      : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.84))",
    color: useHeroNav ? heroNavText : scrolledNavText,
    boxShadow: useHeroNav
      ? "0 8px 18px rgba(0,0,0,0.15)"
      : "0 8px 16px rgba(15,23,42,0.08)",
  } as const;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 36);
    const handleResize = () => {
      const nextIsDesktop = window.innerWidth >= 768;
      setIsDesktop(nextIsDesktop);
      if (nextIsDesktop) {
        setMobileOpen(false);
      }
    };
    const syncAuthState = () => {
      setIsAuthenticated(isEcommerceLoggedIn());
    };

    handleScroll();
    handleResize();
    syncAuthState();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focus", syncAuthState);
    };
  }, [siteSlug]);

  useEffect(() => {
    setIsAuthenticated(isEcommerceLoggedIn());
  }, [location.pathname, siteSlug]);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const scrollTo = (sectionId: string) => {
    if (sectionId === "shop") {
      navigate("/shop");
      closeMobileMenu();
      return;
    }

    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: sectionId } });
      closeMobileMenu();
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    closeMobileMenu();
  };

  const routeToSignIn = (redirectPath = "/") => {
    setEcommercePostLoginRedirect(redirectPath, siteSlug);
    closeMobileMenu();
    navigate("/signin");
  };

  const requireAuth = (targetLabel: string, redirectPath: string, onSuccess: () => void) => {
    if (isAuthenticated) {
      onSuccess();
      closeMobileMenu();
      return;
    }

    showToast(`Sign in to access ${targetLabel}.`, "error");
    routeToSignIn(redirectPath);
  };

  const handleLogout = () => {
    if (isLoggingOut) return;

    showConfirmToast(
      "Log out of your account?",
      async () => {
        setIsLoggingOut(true);
        try {
          await fetch(buildEcommerceApiUrl("/users/logout"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(siteSlug),
            },
            credentials: "include",
          });
        } catch (error) {
          console.error("Logout request failed", error);
        } finally {
          removeAuthToken(siteSlug);
          setIsAuthenticated(false);
          setIsLoggingOut(false);
          closeMobileMenu();
          showToast("You have been logged out successfully.", "success");
          navigate("/signin", { replace: true });
        }
      },
      () => {},
    );
  };

  const authActions = isAuthenticated
    ? [
        {
          key: "orders",
          label: "Orders",
          Icon: History,
          onClick: () => requireAuth("your orders", "/order-history", () => navigate("/order-history")),
        },
        {
          key: "cart",
          label: "Cart",
          Icon: ShoppingCart,
          onClick: () => requireAuth("your cart", "/cart", () => navigate("/cart")),
        },
        {
          key: "profile",
          label: "Profile",
          Icon: UserRound,
          onClick: () =>
            requireAuth("your profile", "/", () => {
              window.location.assign(profilePath);
            }),
        },
        {
          key: "logout",
          label: isLoggingOut ? "Logging out" : "Logout",
          Icon: LogOut,
          onClick: handleLogout,
        },
      ]
    : [
        {
          key: "signin",
          label: "Sign In",
          Icon: UserRound,
          onClick: () => routeToSignIn(location.pathname || "/"),
        },
      ];

  const renderActions = (mobile = false) => (
    <div className={mobile ? "grid gap-2 pt-2" : "flex items-center gap-2"}>
      {authActions.map(({ key, label, Icon, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={`modern-nav-button inline-flex items-center justify-center gap-2 font-body font-semibold transition ${
            mobile ? "w-full px-4 py-3 text-sm" : "px-3.5 py-2 text-xs"
          }`}
          style={{
            ...actionBaseStyle,
            width: mobile ? "100%" : "auto",
            letterSpacing: mobile ? "0.06em" : "0.08em",
            textTransform: mobile ? "none" : "uppercase",
          }}
        >
          <Icon size={mobile ? 17 : 15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

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
          <>
            <ul style={desktopNavStyle}>
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
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
            {renderActions(false)}
          </>
        ) : (
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
          <div className="container mx-auto px-4 py-5">
            <ul className="flex flex-col items-center gap-5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {navItems.map((item) => (
                <li key={item.id} className="w-full">
                  <button
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className="modern-nav-button w-full font-body text-base font-semibold uppercase tracking-[0.18em] transition-colors"
                    style={{
                      color: scrolledNavMuted,
                      padding: "0.25rem 0",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = desktopLinkHover;
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
            <div className="mt-5 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 14%, white 86%)" }}>
              {renderActions(true)}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
