"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Tell customers about your experience and specialties."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="yearsExperience">Years of experience</Label>
        <Input
          id="yearsExperience"
          type="number"
          min={0}
          value={form.yearsExperience}
          onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="baseAddress">Base address</Label>
        <Input
          id="baseAddress"
          value={form.baseAddress}
          onChange={(e) => setForm({ ...form, baseAddress: e.target.value })}
          placeholder="Barangay, city"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
        <Input
          id="serviceRadiusKm"
          type="number"
          min={0}
          step="0.5"
          value={form.serviceRadiusKm}
          onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
