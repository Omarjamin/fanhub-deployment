import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { siteInfo } from "@/data/biniData";

const navItems = ["Home", "About", "Members", "Music", "Events", "Shop"];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
        <button onClick={() => scrollTo("home")} className="flex items-center gap-2">
          <img src={siteInfo.logo} alt="BINI Logo" className="h-8 brightness-0 invert" />
        </button>

        <ul className="hidden md:flex gap-8">
          {navItems.map((item) => (
            <li key={item}>
              <button
                onClick={() => scrollTo(item.toLowerCase())}
                className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {mobileOpen && (
        <div
          className="md:hidden backdrop-blur-xl border-t"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 90%, white 10%), color-mix(in srgb, var(--color-surface) 92%, var(--color-primary-soft) 8%))",
            borderColor: "color-mix(in srgb, var(--color-primary) 18%, white 82%)",
          }}
        >
          <ul className="flex flex-col items-center gap-6 py-8">
            {navItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => scrollTo(item.toLowerCase())}
                  className="font-body text-lg text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
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
