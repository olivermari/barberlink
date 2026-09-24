"use client";

import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// "View on map" / "Pin on map": the full-size, draggable pin.
export function PinDialog({
  open,
  onOpenChange,
  position,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { lat: number; lng: number };
  onPick: (next: { lat: number; lng: number }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4 rounded-[14px] border border-line p-5 ring-0 sm:max-w-md">
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">Pin your spot</DialogTitle>
          <DialogDescription>Tap the map or drag the pin — your barber navigates to it.</DialogDescription>
        </div>
        <div className="isolate h-72 overflow-hidden rounded-[11px] border border-line">
          <LocationPicker position={position} onChange={onPick} />
        </div>
        <DialogClose render={<Button className="h-12 rounded-xl text-[15px] font-bold" />}>Done</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
