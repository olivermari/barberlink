"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";

// Second step of the admin login: a 6-digit code from an authenticator app
// (TOTP). The middleware sends any admin whose session is still password-only
// (aal1) here, and the database only treats a session as admin once it's
// aal2 (0033), so a stolen password alone can't do anything.
//
// First visit: the admin has no factor yet, so we enroll one and show its QR
// code; entering the first code verifies it. Every later login: just the code.
type Mode =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "failed"; message: string };

export default function TwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError || !factors) {
        if (!cancelled) setMode({ kind: "failed", message: "Couldn't load your sign-in settings. Refresh to try again." });
        return;
      }

      const verified = factors.totp.find((f) => f.status === "verified");
      if (verified) {
        if (!cancelled) setMode({ kind: "verify", factorId: verified.id });
        return;
      }

      // A setup that was started but never confirmed leaves an unverified
      // factor behind; clear it so enrolling again doesn't collide with it.
      for (const f of factors.all) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Barbero2Go admin",
      });
      if (cancelled) return;
      if (enrollError || !enrolled) {
        setMode({ kind: "failed", message: "Couldn't start two-step setup. Refresh to try again." });
        return;
      }
      setMode({
        kind: "enroll",
        factorId: enrolled.id,
        qr: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "enroll" && mode.kind !== "verify") return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code,
    });
    if (verifyError) {
      setSubmitting(false);
      setCode("");
      setError("That code didn't work. Codes change every 30 seconds — try the current one.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const footer = (
    <button type="button" onClick={signOut} className="font-bold text-primary">
      Sign out
    </button>
  );

  if (mode.kind === "loading" || mode.kind === "failed") {
    return (
      <AuthScreen
        title="Two-step sign-in"
        subtitle={mode.kind === "failed" ? mode.message : "Checking your sign-in…"}
        footer={footer}
      >
        <span />
      </AuthScreen>
    );
  }

  const enrolling = mode.kind === "enroll";

  return (
    <AuthScreen
      title={enrolling ? "Set up two-step sign-in" : "Enter your code"}
      subtitle={
        enrolling
          ? "Admin accounts need a code from an authenticator app as well as the password. Scan this with Google Authenticator, Microsoft Authenticator or similar, then enter the 6-digit code it shows."
          : "Open your authenticator app and enter the 6-digit code for Barbero2Go."
      }
      footer={footer}
    >
      {enrolling && (
        <div className="flex flex-col items-center gap-3">
          {/* Supabase returns the QR code as an SVG data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mode.qr}
            alt="QR code to add Barbero2Go to your authenticator app"
            width={176}
            height={176}
            className="rounded-[11px] border border-field bg-white p-2"
          />
          <p className="text-center text-[13px] text-muted-foreground">
            Can&apos;t scan? Enter this key in the app instead:
            <span className="mt-1 block font-mono text-[13px] tracking-wider break-all text-foreground select-all">
              {mode.secret}
            </span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[13px] lg:gap-[15px]" noValidate>
        <AuthField
          icon={KeyRoundIcon}
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="h-[52px] w-full rounded-xl text-base font-bold lg:h-[54px]">
          {submitting ? "Checking…" : enrolling ? "Turn on and continue" : "Continue"}
        </Button>
      </form>
    </AuthScreen>
  );
}
