"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockIcon, MailIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { roleHomePath } from "@/lib/role-path";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthField, AuthPasswordField, SocialSignIn } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    // The design says "Email or phone number"; only email sign-in is
    // set up for this project, so say so instead of failing obscurely.
    if (!email.includes("@")) {
      setError("Phone number sign-in isn't available yet — use the email you signed up with.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "barber") {
      // Every fresh login starts offline — going online is a deliberate
      // action the barber takes each session, not a persisted default.
      await supabase
        .from("barber_profiles")
        .update({ is_available: false })
        .eq("id", data.user.id);
    }

    setLoading(false);
    router.push(roleHomePath(profile?.role));
    router.refresh();
  }

  return (
    <AuthScreen
      title="Welcome Back"
      subtitle="Log in to your Barbero2Go account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-primary">
            Sign Up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[13px] lg:mt-2 lg:gap-[15px]" noValidate>
        <AuthField
          icon={MailIcon}
          label="Email or phone number"
          type="text"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthPasswordField
          icon={LockIcon}
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Link href="/forgot-password" className="self-end text-[13px] font-bold text-primary lg:text-[13.5px]">
          Forgot password?
        </Link>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="h-[52px] w-full rounded-xl text-base font-bold lg:mt-1 lg:h-[54px]">
          {loading ? "Logging in…" : "Log In"}
        </Button>
      </form>
      <SocialSignIn />
    </AuthScreen>
  );
}
