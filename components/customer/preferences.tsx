"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellIcon, MapPinIcon } from "lucide-react";
import { SettingsRow } from "@/components/customer/settings-ui";
import {
  ensurePushSubscription,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

// The design's 42×24 switch: red when on.
export function Switch({
  on,
  onClick,
  label,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-6 w-[42px] shrink-0 items-center rounded-xl p-0.5 transition-colors disabled:opacity-60",
        on ? "justify-end bg-primary" : "justify-start bg-[#d8d2c5]",
      )}
    >
      <span className="size-5 rounded-full bg-white" />
    </button>
  );
}

// Notifications: the browser owns the permission, so this switch shows
// it and turns it on — turning it off has to happen in the browser's
// site settings, and says so.
export function NotificationsRow() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(notificationPermission());
  }, []);

  async function toggle() {
    if (permission === "granted") {
      toast.info("Notifications are on. To turn them off, use your browser's site settings.");
      return;
    }
    if (permission === "denied") {
      toast.info("Notifications are blocked. Allow them in your browser's site settings.");
      return;
    }
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === "granted") await ensurePushSubscription();
  }

  return (
    <SettingsRow
      icon={BellIcon}
      title="Notifications"
      sub={
        permission === "unsupported"
          ? "Not supported on this browser"
          : permission === "denied"
            ? "Blocked in your browser settings"
            : "Booking updates and messages"
      }
      right={
        <Switch
          on={permission === "granted"}
          onClick={toggle}
          label="Notifications"
          disabled={permission === null || permission === "unsupported"}
        />
      }
    />
  );
}

// Location: same idea — the browser owns it.
export function LocationRow() {
  const [state, setState] = useState<PermissionState | "unknown" | null>(null);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unknown");
      return;
    }
    let status: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((s) => {
        status = s;
        setState(s.state);
        s.onchange = () => setState(s.state);
      })
      .catch(() => setState("unknown"));
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  function toggle() {
    if (state === "granted") {
      toast.info("Location is on. To turn it off, use your browser's site settings.");
      return;
    }
    navigator.geolocation?.getCurrentPosition(
      () => setState("granted"),
      () => toast.info("Location is blocked. Allow it in your browser's site settings."),
    );
  }

  return (
    <SettingsRow
      icon={MapPinIcon}
      title="Location"
      sub="Used to find nearby barbers"
      right={<Switch on={state === "granted"} onClick={toggle} label="Location" disabled={state === null} />}
    />
  );
}
