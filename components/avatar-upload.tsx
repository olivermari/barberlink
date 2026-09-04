"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AvatarUpload({
  userId,
  avatarUrl,
  fallback,
}: {
  userId: string;
  avatarUrl: string | null;
  fallback: string;
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
      toast.error(uploadError.message);
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
      toast.error(updateError.message);
      return;
    }

    toast.success("Profile photo updated.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo" />}
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <CameraIcon />
          {uploading ? "Uploading..." : "Change photo"}
        </Button>
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
