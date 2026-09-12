"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { NumericSetting, PlatformSettings } from "@/lib/platform-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS: {
  key: NumericSetting;
  label: string;
  help: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "fee_percentage",
    label: "Platform commission",
    help: "Of each booking's total. Cash jobs draw it from the barber's wallet.",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.5,
  },
  {
    key: "max_match_radius_km",
    label: "Max match radius",
    help: "How far Quick Match and the barber list reach from the customer.",
    unit: "km",
    min: 0.5,
    max: 50,
    step: 0.5,
  },
  {
    key: "min_wallet_to_go_online",
    label: "Min wallet to go online",
    help: "Barbers below it can't go online, and drop offline when a cash commission takes them under.",
    unit: "₱",
    min: -5000,
    max: 5000,
    step: 50,
  },
  {
    key: "request_timeout_seconds",
    label: "Request timeout",
    help: "Unanswered requests auto-decline after this.",
    unit: "sec",
    min: 15,
    max: 300,
    step: 5,
  },
];

export function SettingsForm({
  initial,
  surcharge,
}: {
  initial: PlatformSettings;
  surcharge: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<NumericSetting, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, String(initial[f.key])])) as Record<
      NumericSetting,
      string
    >,
  );
  const [policyText, setPolicyText] = useState(initial.policy_text);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const f of FIELDS) {
      const value = Number(values[f.key]);
      if (!Number.isFinite(value) || value < f.min || value > f.max) {
        toast.error(`${f.label} must be between ${f.min} and ${f.max}.`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();
    const results = await Promise.all([
      ...FIELDS.map((f) =>
        supabase.from("platform_settings").update({ value: Number(values[f.key]) }).eq("key", f.key),
      ),
      supabase.from("platform_settings").update({ value: policyText }).eq("key", "policy_text"),
    ]);
    setSaving(false);

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      return;
    }

    toast.success("Settings saved — they apply to the next booking.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-border">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Label htmlFor={f.key} className="text-[15px] font-semibold">
                {f.label}
              </Label>
              <span className="text-xs text-muted-foreground">{f.help}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {f.unit === "₱" && <span className="text-sm text-muted-foreground">₱</span>}
              <Input
                id={f.key}
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="h-10 w-24 border-[1.5px] border-outline text-right"
                required
              />
              {f.unit !== "₱" && <span className="w-7 text-sm text-muted-foreground">{f.unit}</span>}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Choose-your-barber fee</span>
            <span className="text-xs text-muted-foreground">
              Added at booking. Set in code (lib/pricing.ts), not here.
            </span>
          </div>
          <span className="shrink-0 text-base font-bold">₱{surcharge}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="policyText" className="text-[15px] font-semibold">
          Policy text
        </Label>
        <Textarea
          id="policyText"
          placeholder="Shown wherever the platform policy is surfaced."
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          rows={3}
          className="border-[1.5px] border-outline"
        />
      </div>

      <Button type="submit" size="lg" disabled={saving} className="h-12 self-start px-6">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
