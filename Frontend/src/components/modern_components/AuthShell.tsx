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
    <div
      className="relative min-h-screen bg-cover bg-center text-foreground"
      style={{
        backgroundImage: "url('/sbngot.jpg')",
        backgroundColor: "var(--color-primary-soft, #f4d8df)",
      }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full max-w-md rounded-[28px] border border-border/60 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-8">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-primary"
          >
            Back to Home
          </Link>
          <h2 className="mt-3 pb-1 font-display text-4xl leading-[1.15] text-gradient">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link to={footerLinkTo} className="font-semibold text-primary transition hover:opacity-80">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
