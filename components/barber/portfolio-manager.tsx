"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

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
      toast.error(uploadError.message);
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
      toast.error(insertError.message);
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

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Photo removed.");
    router.refresh();
  }

  const upload = () => fileInputRef.current?.click();

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <SectionLabel>Portfolio</SectionLabel>
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="text-sm font-semibold text-primary disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload"}
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

      {portfolio.length === 0 ? (
        <button
          type="button"
          onClick={upload}
          className="flex h-24 items-center justify-center rounded-lg border-[1.5px] border-dashed border-input text-sm text-muted-foreground"
        >
          Add photos of your cuts — customers look at these first.
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {portfolio.map((item) => (
            <div key={item.id} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.caption ?? "Portfolio photo"}
                className="size-full rounded-[4px] border border-input object-cover"
              />
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute top-1 right-1 bg-background/90"
                disabled={deletingId === item.id}
                onClick={() => handleDelete(item)}
              >
                <Trash2Icon />
                <span className="sr-only">Delete photo</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
