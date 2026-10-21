"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { APPLICATION_STAGES, type ApplicationStage } from "@/lib/barber-applications";
import { Button } from "@/components/ui/button";

// Moves an application between stages. Only `status` is writable from the
// admin app (0034's column grant), so this can't touch anything else.
export function ApplicationStageForm({
  applicationId,
  stage,
}: {
  applicationId: string;
  stage: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ApplicationStage | null>(null);

  async function moveTo(next: ApplicationStage) {
    if (next === stage || pending) return;
    setPending(next);
    const { data, error } = await createClient()
      .from("barber_applications")
      .update({ status: next })
      .eq("id", applicationId)
      .select("id");
    setPending(null);
    if (error || !data?.length) {
      toast.error(error?.message ?? "That didn't save. Sign in again with your authenticator code.");
      return;
    }
    toast.success("Stage updated.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Application stage">
      {APPLICATION_STAGES.map((s) => (
        <Button
          key={s.value}
          type="button"
          size="sm"
          variant={s.value === stage ? "default" : "outline"}
          aria-pressed={s.value === stage}
          disabled={pending !== null}
          onClick={() => moveTo(s.value)}
        >
          {pending === s.value ? "Saving…" : s.label}
        </Button>
      ))}
    </div>
  );
}
