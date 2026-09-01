"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VerificationRow({
  barberId,
  fullName,
  bio,
  yearsExperience,
  baseAddress,
  idDocumentUrl,
  submittedAt,
}: {
  barberId: string;
  fullName: string;
  bio: string | null;
  yearsExperience: number | null;
  baseAddress: string | null;
  idDocumentUrl: string | null;
  submittedAt: string;
}) {
  const [loading, setLoading] = useState<"verified" | "rejected" | null>(null);
  const [resolved, setResolved] = useState(false);

  async function decide(next: "verified" | "rejected") {
    setLoading(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("barber_profiles")
      .update({ verification_status: next })
      .eq("id", barberId);
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      next === "verified"
        ? `${fullName} is now verified.`
        : `${fullName}'s application was rejected.`,
    );
    setResolved(true);
  }

  if (resolved) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {fullName}
          <span className="text-xs font-normal text-muted-foreground">
            Applied {new Date(submittedAt).toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Experience: </span>
            {yearsExperience != null ? `${yearsExperience} yr` : "Not provided"}
          </p>
          <p>
            <span className="text-muted-foreground">Base address: </span>
            {baseAddress ?? "Not provided"}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {bio || "No bio provided."}
        </p>
        {idDocumentUrl ? (
          <a
            href={idDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            View submitted ID document
          </a>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No ID document uploaded yet — approving activates the account
            without one on file.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => decide("rejected")}
          >
            {loading === "rejected" ? "Rejecting..." : "Reject"}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => decide("verified")}
          >
            {loading === "verified" ? "Approving..." : "Approve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
