"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ServiceArea = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  is_active: boolean;
};

// Lipa City, the launch market, so a fresh pin starts somewhere useful.
const DEFAULT_CENTER = { lat: 13.9411, lng: 121.1631 };

export function CoverageManager({
  initialAreas,
}: {
  initialAreas: ServiceArea[];
}) {
  const [areas, setAreas] = useState(initialAreas);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState("10");
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_areas")
      .insert({
        name,
        center_lat: center.lat,
        center_lng: center.lng,
        radius_km: Number(radius),
      })
      .select("id, name, center_lat, center_lng, radius_km, is_active")
      .single();

    setSaving(false);

    if (error || !data) {
      toast.error(error?.message ?? "Couldn't add that area.");
      return;
    }

    setAreas((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setRadius("10");
    setShowMap(false);
    toast.success(`${data.name} added.`);
  }

  async function toggleActive(area: ServiceArea) {
    const supabase = createClient();
    const { error } = await supabase
      .from("service_areas")
      .update({ is_active: !area.is_active })
      .eq("id", area.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAreas((prev) =>
      prev.map((a) => (a.id === area.id ? { ...a, is_active: !a.is_active } : a)),
    );
  }

  async function remove(area: ServiceArea) {
    const supabase = createClient();
    const { error } = await supabase.from("service_areas").delete().eq("id", area.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAreas((prev) => prev.filter((a) => a.id !== area.id));
    toast.success(`${area.name} removed.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add a coverage area</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="areaName">Name</Label>
              <Input
                id="areaName"
                placeholder="e.g. Quezon City"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="areaRadius">Radius (km)</Label>
              <Input
                id="areaRadius"
                type="number"
                min={1}
                step="0.5"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Center</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap((v) => !v)}
                >
                  {showMap ? "Hide map" : "Pin on map"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </p>
              {showMap && (
                <div className="h-56 w-full overflow-hidden rounded-lg border">
                  <LocationPicker position={center} onChange={setCenter} />
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving || !name} className="self-start">
              {saving ? "Adding..." : "Add area"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground">No coverage areas yet.</p>
        )}
        {areas.map((area) => (
          <Card key={area.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {area.name}
                <Badge variant={area.is_active ? "default" : "outline"}>
                  {area.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {area.radius_km} km around {area.center_lat.toFixed(4)},{" "}
                {area.center_lng.toFixed(4)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleActive(area)}>
                  {area.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(area)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
