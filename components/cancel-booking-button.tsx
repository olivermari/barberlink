"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CANCELLABLE_STATUSES = ["queued", "pending", "accepted", "on_the_way"];

export function CancelBookingButton({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!CANCELLABLE_STATUSES.includes(status)) return null;

  async function handleCancel() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setOpen(false);
    toast.success("Booking cancelled.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Cancel booking
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. The barber will be notified.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep booking
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? "Cancelling..." : "Yes, cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
