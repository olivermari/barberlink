"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DOCUMENT_KINDS,
  DOCUMENTS_BUCKET,
  REQUIRED_DOCUMENT_COUNT,
  REQUIRED_DOCUMENT_KINDS,
} from "@/lib/barber-documents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

export type BarberDocument = { kind: string; storagePath: string; url: string | null };

// The barber's side of verification (A2/A5). Files go to a private
// bucket; admins see them through signed URLs.
export function VerificationDocuments({
  barberId,
  status,
  documents,
  infoRequest,
}: {
  barberId: string;
  status: string;
  documents: BarberDocument[];
  infoRequest: string | null;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const byKind = new Map(documents.map((d) => [d.kind, d]));
  const requiredDone = documents.filter((d) => REQUIRED_DOCUMENT_KINDS.has(d.kind)).length;

  async function upload(kind: string, file: File) {
    setUploading(kind);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${barberId}/${kind}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file);
    if (uploadError) {
      setUploading(null);
      toast.error(uploadError.message);
      return;
    }

    const { error } = await supabase
      .from("barber_documents")
      .upsert(
        { barber_id: barberId, kind, storage_path: path, uploaded_at: new Date().toISOString() },
        { onConflict: "barber_id,kind" },
      );
    if (error) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      setUploading(null);
      toast.error(error.message);
      return;
    }

    const previous = byKind.get(kind)?.storagePath;
    if (previous) await supabase.storage.from(DOCUMENTS_BUCKET).remove([previous]);

    setUploading(null);
    toast.success("Uploaded.");
    router.refresh();
  }

  async function resubmit() {
    setSending(true);
    const { error } = await createClient().rpc("resubmit_verification");
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sent — an admin will take another look.");
    router.refresh();
  }

  return (
    <section id="documents" className="flex scroll-mt-20 flex-col gap-2.5">
      <SectionLabel>Verification documents</SectionLabel>

      {status === "needs_info" && (
        <div className="flex flex-col gap-1 rounded-lg border-2 border-primary p-3.5">
          <span className="text-sm font-bold">An admin needs more from you</span>
          <p className="text-sm text-ink-soft">
            {infoRequest || "Check your documents below and re-upload anything unclear."}
          </p>
        </div>
      )}
      {status === "rejected" && (
        <p className="text-sm text-muted-foreground">
          Your application was rejected. Contact support if you think that&apos;s a mistake.
        </p>
      )}
      {status === "pending" && (
        <p className="text-sm text-muted-foreground">
          {requiredDone} of {REQUIRED_DOCUMENT_COUNT} required documents uploaded.{" "}
          {requiredDone < REQUIRED_DOCUMENT_COUNT
            ? "An admin reviews your application once all three are in."
            : "An admin is reviewing your application."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {DOCUMENT_KINDS.map(({ kind, label, required }) => {
          const doc = byKind.get(kind);
          return (
            <div key={kind} className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[5px] border border-input bg-placeholder">
                {doc?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.url} alt={label} className="size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] text-faint">
                    {required ? "Required" : "Optional"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="font-semibold">{label}</span>
                <label
                  className={cn(
                    "cursor-pointer font-semibold text-primary",
                    uploading !== null && "pointer-events-none opacity-60",
                  )}
                >
                  {uploading === kind ? "Uploading…" : doc ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) upload(kind, file);
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {status === "needs_info" && (
        <Button
          size="lg"
          className="h-12"
          onClick={resubmit}
          disabled={sending || requiredDone < REQUIRED_DOCUMENT_COUNT}
        >
          {sending ? "Sending…" : "Send for review"}
        </Button>
      )}
    </section>
  );
}
