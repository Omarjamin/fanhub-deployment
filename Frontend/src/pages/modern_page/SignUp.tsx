import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "@/components/modern_components/AuthShell";
import { registerUser } from "@/services/ecommerce_services/auth/signup_user.js";
import { getModernSiteSlug } from "@/lib/modern-react/context";
import { toast } from "@/hooks/use-toast";

const SignUp = () => {
  const navigate = useNavigate();
  const siteSlug = useMemo(() => getModernSiteSlug(), []);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestOtp = async () => {
    if (!firstname.trim() || !lastname.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Missing fields",
        description: "Complete all required fields first.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        email: email.trim(),
        site_slug: siteSlug,
        request_email_otp: true,
      });
      setOtpRequested(true);
      toast({
        title: "OTP sent",
        description: `A verification code was sent to ${email.trim()}.`,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to request OTP")
          : "Failed to request OTP";
      if (/already sent/i.test(message)) {
        setOtpRequested(true);
      }
      toast({
        title: "OTP request failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpRequested) {
      await requestOtp();
      return;
    }

    if (!otp.trim()) {
      toast({
        title: "OTP required",
        description: "Enter the verification code sent to your email.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        username: email.trim(),
        email: email.trim(),
        password,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        imageUrl: "none",
        site_slug: siteSlug,
        email_otp: otp.trim(),
      });
      toast({
        title: "Account created",
        description: "You can sign in now.",
      });
      navigate("/signin", { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Registration failed")
          : "Registration failed";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign Up"
      subtitle="Create your account for checkout, order tracking, and modern community access."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/signin"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-body text-foreground">
            First Name
            <input
              type="text"
              value={firstname}
              onChange={(event) => setFirstname(event.target.value)}
              className="h-12 rounded-2xl border border-border/60 bg-background px-4 outline-none transition focus:border-primary/60"
              placeholder="First name"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-body text-foreground">
            Last Name
            <input
              type="text"
              value={lastname}
              onChange={(event) => setLastname(event.target.value)}
              className="h-12 rounded-2xl border border-border/60 bg-background px-4 outline-none transition focus:border-primary/60"
              placeholder="Last name"
            />
          </label>
        </div>

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
            placeholder="Create a password"
            autoComplete="new-password"
          />
        </label>

        {otpRequested ? (
          <label className="flex flex-col gap-2 text-sm font-body text-foreground">
            Verification Code
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="h-12 rounded-2xl border border-border/60 bg-background px-4 outline-none transition focus:border-primary/60"
              placeholder="Enter OTP from email"
            />
          </label>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
        >
          {submitting
            ? (otpRequested ? "Creating Account..." : "Sending OTP...")
            : (otpRequested ? "Verify and Create Account" : "Send Verification Code")}
        </button>

        {otpRequested ? (
          <button
            type="button"
            disabled={submitting}
            onClick={requestOtp}
            className="w-full rounded-full border border-border/70 bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary disabled:opacity-70"
          >
            Resend OTP
          </button>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/signin" className="font-semibold text-primary hover:opacity-80">
            Sign In
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default SignUp;
