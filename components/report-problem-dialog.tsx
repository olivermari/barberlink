"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "service_quality", label: "Service quality" },
  { value: "no_show", label: "No-show" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "other", label: "Other" },
] as const;

export function ReportProblemDialog({
  bookingId,
  raisedBy,
  variant = "button",
}: {
  bookingId: string;
  raisedBy: string;
  // "link": a plain text trigger for dense lists (History) where a full
  // outlined button on every row was the loudest thing on the screen.
  // "ink": the Customer UI's full-width ink-outlined "Report an issue".
  variant?: "button" | "link" | "ink";
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("service_quality");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("disputes").insert({
      booking_id: bookingId,
      raised_by: raisedBy,
      category,
      description,
    });

    setLoading(false);

    if (error) {
      toast.error(friendlyError(error, "Couldn't send that report. Try again."));
      return;
    }

    toast.success("Reported — our team will take a look.");
    setOpen(false);
    setSubmitted(true);
    setDescription("");
  }

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        Reported — we&apos;re looking into it.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          variant === "ink" ? (
            <button
              type="button"
              className="w-full rounded-[11px] border border-foreground p-3 text-center text-sm font-bold transition-colors hover:bg-wash"
            />
          ) : variant === "link" ? (
            <button
              type="button"
              className="-m-2.5 p-2.5 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            />
          ) : (
            <Button variant="outline" size="sm" />
          )
        }
      >
        {variant === "ink" ? "Report an issue" : "Report a problem"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            This goes to the platform admin, not the other party.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="disputeCategory">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => value && setCategory(value)}
            >
              <SelectTrigger id="disputeCategory" className="w-full">
                <SelectValue>
                  {(value: string) =>
                    CATEGORIES.find((c) => c.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="disputeDescription">What happened?</Label>
            <Textarea
              id="disputeDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
