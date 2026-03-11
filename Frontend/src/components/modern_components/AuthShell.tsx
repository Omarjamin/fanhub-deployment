import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getModernResolvedSite } from "@/lib/modern-react/site";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
};

const AuthShell = ({
  title,
  subtitle,
  children,
  footerText,
  footerLinkLabel,
  footerLinkTo,
}: AuthShellProps) => {
  const site = getModernResolvedSite();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="relative hidden overflow-hidden lg:flex lg:items-end"
          style={{
            backgroundImage: site.leadImage ? `url('${site.leadImage}')` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "var(--color-primary-soft, #f4d8df)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/65" />
          <div className="relative z-10 w-full p-10 xl:p-14">
            {site.logo ? (
              <img
                src={site.logo}
                alt={`${site.siteName} Logo`}
                className="mb-8 h-16 w-auto max-w-[220px] object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <p className="mb-8 font-display text-4xl uppercase tracking-[0.28em] text-white">
                {site.siteName}
              </p>
            )}
            <p className="max-w-xl text-sm uppercase tracking-[0.34em] text-white/72">
              {site.shortBio || "Modern community storefront"}
            </p>
            <h1 className="mt-5 max-w-2xl font-display text-5xl leading-[0.95] text-white xl:text-6xl">
              {site.description || `Welcome to ${site.siteName}.`}
            </h1>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
          <div className="w-full max-w-md rounded-[28px] border border-border/60 bg-card/88 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm md:p-8">
            <Link
              to="/"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-primary"
            >
              Back to Home
            </Link>
            <h2 className="mt-5 font-display text-4xl text-gradient">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <p className="mt-6 text-sm text-muted-foreground">
              {footerText}{" "}
              <Link to={footerLinkTo} className="font-semibold text-primary transition hover:opacity-80">
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;
