"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Marked as paid.");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-11 flex-1 sm:h-7 sm:flex-none"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Updating..." : "Mark cash received"}
    </Button>
  );
}
