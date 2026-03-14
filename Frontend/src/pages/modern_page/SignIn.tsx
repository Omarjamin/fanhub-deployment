import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "@/components/modern_components/AuthShell";
import { loginUser } from "@/services/ecommerce_services/auth/signin.js";
import { getAuthToken } from "@/services/ecommerce_services/auth/auth.js";
import { getModernSiteSlug } from "@/lib/modern-react/context";
import { clearEcommercePostLoginRedirect, getEcommercePostLoginRedirect } from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";

const SignIn = () => {
  const navigate = useNavigate();
  const siteSlug = useMemo(() => getModernSiteSlug(), []);
  const redirectTo = useMemo(() => getEcommercePostLoginRedirect("/", siteSlug), [siteSlug]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getAuthToken(siteSlug)) {
      clearEcommercePostLoginRedirect();
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, siteSlug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Missing fields",
        description: "Email and password are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await loginUser({
        email: email.trim(),
        password,
        site_slug: siteSlug,
      });
      toast({
        title: "Login successful",
        description: "Welcome back.",
      });
      clearEcommercePostLoginRedirect();
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Login failed")
          : "Login failed";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign In"
      subtitle="Access your account to continue shopping, manage orders, and join the community."
      footerText="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkTo="/signup"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2 text-sm font-body text-foreground">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-2xl border border-border/60 bg-background px-4 outline-none transition focus:border-primary/60"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-body text-foreground">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-2xl border border-border/60 bg-background px-4 outline-none transition focus:border-primary/60"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
        >
          {submitting ? "Signing In..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Need an account first?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:opacity-80">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default SignIn;
