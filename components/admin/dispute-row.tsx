"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CATEGORY_LABEL: Record<string, string> = {
  service_quality: "Service quality",
  no_show: "No-show",
  payment_issue: "Payment issue",
  other: "Other",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  investigating: "secondary",
  resolved: "default",
  dismissed: "outline",
};

export function DisputeRow({
  disputeId,
  category,
  description,
  status,
  resolutionNotes,
  createdAt,
  reporterName,
  barberName,
  serviceName,
  bookingPrice,
  bookingAddress,
}: {
  disputeId: string;
  category: string | null;
  description: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  reporterName: string;
  barberName: string | null;
  serviceName: string | null;
  bookingPrice: number | null;
  bookingAddress: string | null;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [notes, setNotes] = useState(resolutionNotes ?? "");
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(next: string) {
    setLoading(next);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("disputes")
      .update({ status: next, resolution_notes: notes, admin_id: user?.id })
      .eq("id", disputeId);

    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setCurrentStatus(next);
    toast.success(`Marked ${next}.`);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {CATEGORY_LABEL[category ?? ""] ?? category ?? "Report"}
          <Badge variant={STATUS_VARIANT[currentStatus] ?? "outline"}>
            {currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Reported by {reporterName} · {new Date(createdAt).toLocaleDateString()}
        </p>
        {(serviceName || barberName || bookingPrice != null) && (
          <p className="text-sm text-muted-foreground">
            {serviceName ?? "Booking"}
            {barberName && ` with ${barberName}`}
            {bookingPrice != null && ` · ₱${bookingPrice}`}
            {bookingAddress && ` · ${bookingAddress}`}
          </p>
        )}
        <p className="text-sm">{description || "No description provided."}</p>

        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Resolution notes (visible to admins only)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null || currentStatus === "investigating"}
              onClick={() => updateStatus("investigating")}
            >
              {loading === "investigating" ? "Saving..." : "Investigate"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null || currentStatus === "dismissed"}
              onClick={() => updateStatus("dismissed")}
            >
              {loading === "dismissed" ? "Saving..." : "Dismiss"}
            </Button>
            <Button
              size="sm"
              disabled={loading !== null || currentStatus === "resolved"}
              onClick={() => updateStatus("resolved")}
            >
              {loading === "resolved" ? "Saving..." : "Resolve"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
