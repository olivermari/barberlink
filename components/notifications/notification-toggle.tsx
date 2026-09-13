"use client";

import { useEffect, useState } from "react";
import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react";
import {
  ensurePushSubscription,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";

// Enables the push notifications the trigger-driven backend sends (see
// supabase/migrations/0026_push_triggers.sql) — this is the one-time
// permission prompt plus registering this device's push subscription.
// Renders nothing where the API doesn't exist (iOS Safari outside an
// installed PWA — installing it via the manifest unlocks this there).
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
    const current = notificationPermission();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(current);
    // Heals a dropped/never-stored subscription for a returning visitor
    // who already granted permission — cheap and idempotent.
    if (current === "granted") ensurePushSubscription();
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
        if (next === "granted") await ensurePushSubscription();
      }}
    >
      <BellIcon />
    </Button>
  );
}
