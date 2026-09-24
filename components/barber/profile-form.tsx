"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Caption, PRIMARY_ACTION } from "@/components/customer/ui";

export function ProfileForm({
  barberId,
  fullName,
  phone,
  bio,
  yearsExperience,
  baseAddress,
  serviceRadiusKm,
  maxMatchRadiusKm,
  onSaved,
}: {
  barberId: string;
  fullName: string | null;
  phone: string | null;
  bio: string | null;
  yearsExperience: number | null;
  baseAddress: string | null;
  serviceRadiusKm: number | null;
  // Matching is capped platform-wide (platform_settings) regardless of
  // what a barber sets here — worth saying next to the field, or a
  // barber can set 5km and never learn why jobs past 1km never arrive.
  maxMatchRadiusKm: number;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: fullName ?? "",
    phone: phone ?? "",
    bio: bio ?? "",
    yearsExperience: yearsExperience?.toString() ?? "",
    baseAddress: baseAddress ?? "",
    serviceRadiusKm: serviceRadiusKm?.toString() ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const [{ error: profileError }, { error: barberError }] = await Promise.all([
      supabase
        .from("profiles")
        .update({ full_name: form.fullName, phone: form.phone || null })
        .eq("id", barberId),
      supabase
        .from("barber_profiles")
        .update({
          bio: form.bio || null,
          years_experience: form.yearsExperience ? Number(form.yearsExperience) : null,
          base_address: form.baseAddress || null,
          service_radius_km: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : null,
        })
        .eq("id", barberId),
    ]);

    setLoading(false);

    if (profileError || barberError) {
      toast.error(friendlyError(profileError ?? barberError, "Couldn't save your profile. Try again."));
      return;
    }

    toast.success("Profile updated.");
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">
          <Caption>Bio</Caption>
        </Label>
        <Textarea
          id="bio"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Fades, tapers, beard work — what you're known for."
          className="rounded-xl border-field bg-white px-3.5 py-3 text-[15px]"
        />
        <p className="text-xs text-faint">
          Two or three lines, shown on your public profile.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Caption>Details</Caption>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="fullName" label="Full name">
            <Input
              className="h-12 rounded-xl border-field bg-white px-3.5 text-[15px]"
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </Field>
          <Field id="phone" label="Phone">
            <Input
              className="h-12 rounded-xl border-field bg-white px-3.5 text-[15px]"
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field id="yearsExperience" label="Years of experience">
            <Input
              className="h-12 rounded-xl border-field bg-white px-3.5 text-[15px]"
              id="yearsExperience"
              type="number"
              min={0}
              value={form.yearsExperience}
              onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
            />
          </Field>
          <Field id="serviceRadiusKm" label="Service radius (km)">
            <Input
              className="h-12 rounded-xl border-field bg-white px-3.5 text-[15px]"
              id="serviceRadiusKm"
              type="number"
              min={0}
              step="0.5"
              value={form.serviceRadiusKm}
              onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
            />
            <p className="text-xs text-faint">
              Matching is capped at {maxMatchRadiusKm} km platform-wide, so a wider radius here
              won&apos;t bring in jobs past that.
            </p>
          </Field>
          <Field id="baseAddress" label="Base address" className="sm:col-span-2">
            <Input
              className="h-12 rounded-xl border-field bg-white px-3.5 text-[15px]"
              id="baseAddress"
              value={form.baseAddress}
              onChange={(e) => setForm({ ...form, baseAddress: e.target.value })}
              placeholder="Barangay, city"
            />
          </Field>
        </div>
      </div>

      {/* Was styled as a secondary/outline button despite being this
          section's one save action — the customer profile form's save
          button is already primary; this matches it. */}
      <Button type="submit" disabled={loading} className={PRIMARY_ACTION}>
        {loading ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-[13px] font-bold">{label}</Label>
      {children}
    </div>
  );
}
