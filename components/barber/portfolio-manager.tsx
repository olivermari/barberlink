"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Button } from "@/components/ui/button";
import { Caption } from "@/components/customer/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PortfolioItem = {
  id: string;
  image_url: string;
  caption: string | null;
  storage_path: string | null;
};

export function PortfolioManager({
  barberId,
  portfolio,
}: {
  barberId: string;
  portfolio: PortfolioItem[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PortfolioItem | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${barberId}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("barber-portfolio")
      .upload(path, file);

    if (uploadError) {
      setUploading(false);
      toast.error(friendlyError(uploadError, "Couldn't upload that photo. Try again."));
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("barber-portfolio").getPublicUrl(path);

    const { error: insertError } = await supabase.from("barber_portfolio").insert({
      barber_id: barberId,
      image_url: publicUrl,
      storage_path: path,
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (insertError) {
      toast.error(friendlyError(insertError, "Couldn't add that photo. Try again."));
      return;
    }

    toast.success("Photo added.");
    router.refresh();
  }

  async function handleDelete(item: PortfolioItem) {
    setDeletingId(item.id);
    const supabase = createClient();

    if (item.storage_path) {
      await supabase.storage.from("barber-portfolio").remove([item.storage_path]);
    }

    const { error } = await supabase.from("barber_portfolio").delete().eq("id", item.id);
    setDeletingId(null);
    setPendingDelete(null);

    if (error) {
      toast.error(friendlyError(error, "Couldn't delete that photo. Try again."));
      return;
    }

    toast.success("Photo removed.");
    router.refresh();
  }

  const upload = () => fileInputRef.current?.click();

  return (
    <section id="portfolio" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[14px] border border-line bg-white p-3.5">
      <div className="flex items-center justify-between">
        <Caption>Portfolio</Caption>
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="-m-2.5 p-2.5 text-[13px] font-bold text-primary disabled:opacity-60"
        >
          {uploading ? "Uploading…" : (
            <>
              Upload<span className="max-lg:hidden"> photos</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 lg:grid-cols-7 lg:gap-2.5">
        {portfolio.map((item) => (
          <div key={item.id} className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption ?? "Portfolio photo"}
              className="size-full rounded-lg border border-photo-border object-cover lg:rounded-[9px]"
            />
            <button
              type="button"
              aria-label="Delete photo"
              disabled={deletingId === item.id}
              onClick={() => setPendingDelete(item)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 shadow-sm disabled:opacity-60"
            >
              <Trash2Icon className="size-3" aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          aria-label="Add a photo"
          className="flex aspect-square items-center justify-center rounded-lg border-[1.5px] border-dashed border-line-strong text-[22px] text-[#a49c90] transition-colors hover:bg-wash disabled:opacity-60 lg:rounded-[9px] lg:text-2xl"
        >
          +
        </button>
      </div>
      <span className="text-[12.5px] text-faint lg:text-[13px] lg:text-[#6a635a]">
        <span className="lg:hidden">First three are what customers see.</span>
        <span className="hidden lg:inline">First three photos are what customers see on your card.</span>
      </span>

      <Dialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
            <Button
              variant="destructive"
              disabled={deletingId != null}
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              {deletingId != null ? "Deleting…" : "Yes, delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
