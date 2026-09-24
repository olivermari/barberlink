"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthPasswordField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { PRIMARY_ACTION } from "@/components/customer/ui";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Use at least 6 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    toast.success("Password updated.");
    router.push("/customer/profile");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[13px]" noValidate>
      <AuthPasswordField
        icon={LockIcon}
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <AuthPasswordField
        icon={LockIcon}
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className={PRIMARY_ACTION}>
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
