"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/customer/ui";

export function AvatarUpload({
  userId,
  avatarUrl,
  fallback,
  children,
  badge,
  photoClassName,
}: {
  userId: string;
  avatarUrl: string | null;
  fallback: string;
  // Name and details shown between the photo and the button (B5 header).
  children?: React.ReactNode;
  // The Barber UI's avatar: just the photo with a camera badge on its
  // corner that opens the file picker.
  badge?: boolean;
  photoClassName?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    // Fixed path per user — re-uploading overwrites in place instead
    // of accumulating files, since there's only ever one avatar.
    const path = `${userId}/avatar`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error(friendlyError(uploadError, "Couldn't upload that photo. Try again."));
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // The path never changes on re-upload, so bust the cache with a
    // query param or the browser (and everyone else's) old copy sticks.
    const freshUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: freshUrl })
      .eq("id", userId);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (updateError) {
      toast.error(friendlyError(updateError, "Couldn't save your photo. Try again."));
      return;
    }

    toast.success("Profile photo updated.");
    router.refresh();
  }

  if (badge) {
    return (
      <div className="relative shrink-0">
        <Photo src={avatarUrl} name={fallback} className={photoClassName ?? "size-[62px]"} />
        <button
          type="button"
          aria-label="Change photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-foreground text-white disabled:opacity-60"
        >
          <CameraIcon className="size-[11px]" aria-hidden />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo" />}
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {children && <div className="min-w-0 flex-1">{children}</div>}
      <div className="shrink-0">
        {children ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="-m-2.5 p-2.5 text-sm font-semibold text-primary disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Replace photo"}
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <CameraIcon />
            {uploading ? "Uploading..." : "Change photo"}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
