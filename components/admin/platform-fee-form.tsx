"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PlatformFeeForm({
  initialFeePercent,
  initialPolicyText,
}: {
  initialFeePercent: number;
  initialPolicyText: string;
}) {
  const [feePercent, setFeePercent] = useState(String(initialFeePercent));
  const [policyText, setPolicyText] = useState(initialPolicyText);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const [{ error: feeError }, { error: policyError }] = await Promise.all([
      supabase
        .from("platform_settings")
        .update({ value: Number(feePercent) })
        .eq("key", "fee_percentage"),
      supabase
        .from("platform_settings")
        .update({ value: policyText })
        .eq("key", "policy_text"),
    ]);

    setSaving(false);

    if (feeError || policyError) {
      toast.error(feeError?.message ?? policyError?.message ?? "Couldn't save settings.");
      return;
    }

    toast.success("Platform settings saved — takes effect on the next booking.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="feePercent">Platform commission (%)</Label>
        <Input
          id="feePercent"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={feePercent}
          onChange={(e) => setFeePercent(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="policyText">Policy text</Label>
        <Textarea
          id="policyText"
          placeholder="Shown to customers/barbers wherever policy text is surfaced."
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={saving} className="self-start">
        {saving ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
