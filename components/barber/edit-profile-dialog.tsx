"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/barber/profile-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FormProps = React.ComponentProps<typeof ProfileForm>;

// The Barber UI shows the profile read-only — bio, name, numbers — and
// puts editing one tap away: "Edit profile" on the web card, and the bio
// card on phones. The form itself is the app's existing one.
export function EditProfileDialog({
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
  ...form
}: Omit<FormProps, "onSaved"> & {
  trigger?: React.ReactNode;
  triggerClassName?: string;
  // Controlled use, when something else (the section nav) opens it.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger != null && <DialogTrigger className={triggerClassName}>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90svh] gap-3 overflow-y-auto rounded-[14px] p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold tracking-[-0.02em]">Edit profile</DialogTitle>
          <DialogDescription>Your bio and details show on your public profile.</DialogDescription>
        </DialogHeader>
        <ProfileForm {...form} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
