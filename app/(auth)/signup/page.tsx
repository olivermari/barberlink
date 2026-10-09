"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockIcon, MailIcon, UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthField, AuthPasswordField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { BARBER_APPLY_URL } from "@/lib/marketing-site";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Every signup is a customer: the database ignores any role sent
        // here (0032). Barbers apply on the marketing site instead.
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, there's no session yet.
    if (!data.session) {
      setConfirmSent(true);
      return;
    }

    router.push("/customer");
    router.refresh();
  }

  if (confirmSent) {
    return (
      <AuthScreen
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Confirm your address, then log in.`}
        footer={
          <Link href="/login" className="font-bold text-primary">
            Back to log in
          </Link>
        }
      >
        <span />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Let’s get you started"
      subtitle="Create your account and book a barber to your door."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary">
            Log in
          </Link>
          <span className="mt-2 block">
            Are you a barber?{" "}
            <a href={BARBER_APPLY_URL} className="font-bold text-primary">
              Apply to join
            </a>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[13px] lg:gap-[15px]">
        <AuthField
          icon={UserIcon}
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <AuthField
          icon={MailIcon}
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthPasswordField
          icon={LockIcon}
          label="Password"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="h-[52px] w-full rounded-xl text-base font-bold lg:h-[54px]">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthScreen>
  );
}
