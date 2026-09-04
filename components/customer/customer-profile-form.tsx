"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerProfileForm({
  customerId,
  fullName,
  phone,
}: {
  customerId: string;
  fullName: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: fullName ?? "",
    phone: phone ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.fullName, phone: form.phone || null })
      .eq("id", customerId);

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
