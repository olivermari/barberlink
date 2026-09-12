"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; name: string; price: number; durationMinutes: number };

// Edits service_catalog; 0020's trigger copies each change onto every
// barber's active services.
export function CatalogForm({ items }: { items: Item[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(
    items.map((i) => ({ ...i, priceInput: String(i.price), durationInput: String(i.durationMinutes) })),
  );
  const [saving, setSaving] = useState(false);

  const changed = rows.filter(
    (r) => Number(r.priceInput) !== r.price || Number(r.durationInput) !== r.durationMinutes,
  );

  async function save() {
    for (const r of changed) {
      if (!(Number(r.priceInput) > 0) || !(Number(r.durationInput) > 0)) {
        toast.error(`${r.name} needs a price and duration above zero.`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();
    const results = await Promise.all(
      changed.map((r) =>
        supabase
          .from("service_catalog")
          .update({ price: Number(r.priceInput), duration_minutes: Number(r.durationInput) })
          .eq("id", r.id)
          .select("id")
          .maybeSingle(),
      ),
    );
    setSaving(false);

    const failed = results.find((r) => r.error || !r.data);
    if (failed) {
      toast.error(failed.error?.message ?? "Couldn't save the menu.");
      return;
    }

    setRows((prev) =>
      prev.map((r) => ({ ...r, price: Number(r.priceInput), durationMinutes: Number(r.durationInput) })),
    );
    toast.success("Menu updated for every barber.");
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No catalog yet — run migration 0020.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border rounded-lg border-[1.5px] border-outline">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
            <span className="min-w-0 flex-1 text-base font-semibold">{r.name}</span>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              ₱
              <Input
                type="number"
                min={1}
                step={10}
                value={r.priceInput}
                aria-label={`${r.name} price`}
                onChange={(e) =>
                  setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, priceInput: e.target.value } : x)))
                }
                className="h-10 w-24 border-[1.5px] border-outline text-right text-foreground"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Input
                type="number"
                min={5}
                step={5}
                value={r.durationInput}
                aria-label={`${r.name} duration in minutes`}
                onChange={(e) =>
                  setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, durationInput: e.target.value } : x)))
                }
                className="h-10 w-20 border-[1.5px] border-outline text-right text-foreground"
              />
              min
            </label>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className="self-start"
        onClick={save}
        disabled={saving || changed.length === 0}
      >
        {saving ? "Saving…" : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "No changes"}
      </Button>
    </div>
  );
}
