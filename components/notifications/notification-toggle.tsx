"use client";

import { useEffect, useState } from "react";
import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react";
import { notificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { Button } from "@/components/ui/button";

// Enables the OS notifications that JobsBadgeProvider / ActiveBookingBar
// / AdminNotificationProvider fire — this is just the one-time
// permission prompt. Renders nothing where the API doesn't exist (iOS
// Safari outside an installed PWA).
//
// "unsupported" is the only state ever rendered on the server (window
// doesn't exist there) and on the client's first paint, before this
// component's own effect has had a chance to read the real value — so
// both renders agree and hydration doesn't mismatch. The real value
// only shows up on the client-only re-render right after mount.
export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(notificationPermission());
  }, []);

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        aria-label="Notifications enabled"
        title="Notifications enabled"
      >
        <BellRingIcon />
      </Button>
    );
  }

  if (permission === "denied") {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        aria-label="Notifications blocked — enable them in your browser's site settings"
        title="Notifications blocked — enable them in your browser's site settings"
      >
        <BellOffIcon />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Enable notifications"
      title="Enable notifications"
      onClick={async () => {
        const next = await requestNotificationPermission();
        setPermission(next);
      }}
    >
      <BellIcon />
    </Button>
  );
}
