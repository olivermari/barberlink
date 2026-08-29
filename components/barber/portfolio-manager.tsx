"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [caption, setCaption] = useState("");
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
      caption: caption || null,
    });

    setUploading(false);

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Portfolio
      </h2>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="sm:max-w-xs"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-muted-foreground file:mr-2 file:h-8 file:rounded-lg file:border-0 file:bg-secondary file:px-2.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
      </div>
      {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}

      {portfolio.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {portfolio.map((item) => (
            <div key={item.id} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.caption ?? "Portfolio photo"}
                className="size-full rounded-md object-cover"
              />
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute top-1 right-1"
                disabled={deletingId === item.id}
                onClick={() => handleDelete(item)}
              >
                <Trash2Icon />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
