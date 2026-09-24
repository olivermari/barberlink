"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIMARY_ACTION } from "@/components/customer/ui";

const FIELD = "h-12 rounded-xl border-field bg-white px-3.5 text-[15px]";

export function CustomerProfileForm({
  customerId,
  fullName,
  phone,
  email,
}: {
  customerId: string;
  fullName: string | null;
  phone: string | null;
  email: string;
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
      toast.error(friendlyError(error, "Couldn't save your profile. Try again."));
      return;
    }

    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName" className="text-[13px] font-bold">
          Full name
        </Label>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-[13px] font-bold">
          Email
        </Label>
        <Input id="email" value={email} readOnly disabled className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone" className="text-[13px] font-bold">
          Phone number
        </Label>
        <Input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={FIELD}
        />
      </div>

      <Button type="submit" disabled={loading} className={PRIMARY_ACTION}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
