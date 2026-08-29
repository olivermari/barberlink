"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

const EMPTY_FORM = { name: "", description: "", price: "", durationMinutes: "30" };

export function ServiceManager({
  barberId,
  services,
}: {
  barberId: string;
  services: Service[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      price: service.price.toString(),
      durationMinutes: service.duration_minutes.toString(),
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      duration_minutes: Number(form.durationMinutes),
    };

    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert({ ...payload, barber_id: barberId });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setOpen(false);
    toast.success(editing ? "Service updated." : "Service added.");
    router.refresh();
  }

  async function toggleActive(service: Service) {
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    router.refresh();
  }

  async function handleDelete(service: Service) {
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", service.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Service deleted.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Services
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" onClick={openCreate} />}>
            Add service
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
              <DialogDescription>
                Customers see this on your public profile.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="serviceName">Name</Label>
                <Input
                  id="serviceName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="serviceDescription">Description</Label>
                <Input
                  id="serviceDescription"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="servicePrice">Price (₱)</Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="serviceDuration">Duration (min)</Label>
                  <Input
                    id="serviceDuration"
                    type="number"
                    min={5}
                    step="5"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editing ? "Save changes" : "Add service"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 && (
        <p className="text-sm text-muted-foreground">No services yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {service.name}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">₱{service.price}</Badge>
                  {!service.is_active && <Badge variant="outline">Archived</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                {service.description && (
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {service.duration_minutes} min
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(service)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(service)}>
                  {service.is_active ? "Archive" : "Unarchive"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(service)}>
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
