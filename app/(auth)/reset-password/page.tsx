"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { roleHomePath } from "@/lib/role-path";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthPasswordField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

// The landing page for the emailed reset link: it carries a one-time
// `code` that signs the customer in just long enough to choose a new
// password.
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");
    (async () => {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) return setReady("invalid");
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(session ? "ok" : "invalid");
    })();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
    setLoading(false);
    router.push(roleHomePath(profile?.role));
    router.refresh();
  }

  if (ready === "invalid") {
    return (
      <AuthScreen
        title="Link expired"
        subtitle="This reset link is invalid or has already been used. Request a new one."
        footer={
          <Link href="/forgot-password" className="font-bold text-primary">
            Send a new link
          </Link>
        }
      >
        <span />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Set a new password"
      subtitle="Choose a password you'll remember."
      footer={
        <Link href="/login" className="font-bold text-primary">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[13px] lg:mt-2 lg:gap-[15px]" noValidate>
        <AuthPasswordField
          icon={LockIcon}
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={ready === "checking"}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading || ready === "checking"}
          className="h-[52px] w-full rounded-xl text-base font-bold lg:mt-1 lg:h-[54px]"
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthScreen>
  );
}
