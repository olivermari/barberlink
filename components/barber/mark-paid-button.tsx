"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// For cash jobs completed before 0018. Completing a cash job now marks it
// paid by itself, so only older unpaid jobs in History still need this.
export function MarkPaidButton({
  bookingId,
  className,
}: {
  bookingId: string;
  className?: string;
}) {
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

    toast.success("Cash received.");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      className={cn("h-12 text-[15px] font-bold", className)}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Updating…" : "Mark cash received"}
    </Button>
  );
}
