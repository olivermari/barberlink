"use client";

import { useState } from "react";
import Link from "next/link";
import { MailIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter the email you signed up with.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthScreen
      title={sent ? "Check your email" : "Forgot password?"}
      subtitle={
        sent
          ? `If ${email.trim()} has an account, a reset link is on its way.`
          : "Enter your email and we'll send you a link to set a new password."
      }
      footer={
        <Link href="/login" className="font-bold text-primary">
          Back to log in
        </Link>
      }
    >
      {!sent && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-[13px] lg:mt-2 lg:gap-[15px]" noValidate>
          <AuthField
            icon={MailIcon}
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="h-[52px] w-full rounded-xl text-base font-bold lg:mt-1 lg:h-[54px]">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
