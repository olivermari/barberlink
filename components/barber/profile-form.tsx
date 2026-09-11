"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/section-label";

export function ProfileForm({
  barberId,
  fullName,
  phone,
  bio,
  yearsExperience,
  baseAddress,
  serviceRadiusKm,
}: {
  barberId: string;
  fullName: string | null;
  phone: string | null;
  bio: string | null;
  yearsExperience: number | null;
  baseAddress: string | null;
  serviceRadiusKm: number | null;
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
      toast.error(profileError?.message ?? barberError?.message);
      return;
    }

    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="bio"
          className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
        >
          Bio
        </Label>
        <Textarea
          id="bio"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Fades, tapers, beard work — what you're known for."
          className="border-[1.5px] border-outline"
        />
        <p className="text-xs text-muted-foreground">
          Two or three lines, shown on your public profile.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Details</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="fullName" label="Full name">
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </Field>
          <Field id="phone" label="Phone">
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field id="yearsExperience" label="Years of experience">
            <Input
              id="yearsExperience"
              type="number"
              min={0}
              value={form.yearsExperience}
              onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
            />
          </Field>
          <Field id="serviceRadiusKm" label="Service radius (km)">
            <Input
              id="serviceRadiusKm"
              type="number"
              min={0}
              step="0.5"
              value={form.serviceRadiusKm}
              onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
            />
          </Field>
          <Field id="baseAddress" label="Base address" className="sm:col-span-2">
            <Input
              id="baseAddress"
              value={form.baseAddress}
              onChange={(e) => setForm({ ...form, baseAddress: e.target.value })}
              placeholder="Barangay, city"
            />
          </Field>
        </div>
      </div>

      <Button type="submit" variant="outline" disabled={loading} className="self-start">
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
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
