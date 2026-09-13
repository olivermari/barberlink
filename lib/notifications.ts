// Real Web Push: a service worker (public/sw.js) shows the native popup,
// woken by the browser's push service independently of whether this tab
// is even running — that's what reaches the mobile notification bar
// while the browser is minimized, which the old direct Notification()
// call could never do (mobile OSes suspend a backgrounded tab's JS
// within seconds, so there's nothing left to call it). notify() below
// is toast-only now; the service worker is the single place a native
// popup comes from, on both mobile and desktop.

export function notificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

// Registers the service worker and makes sure a PushSubscription for
// this device is stored server-side. Safe to call repeatedly (on every
// mount where permission is already granted, not just the first grant)
// — pushManager.subscribe() returns the existing subscription if one is
// already active, and /api/push/subscribe upserts by endpoint.
export async function ensurePushSubscription() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!notificationsSupported() || Notification.permission !== "granted" || !publicKey) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    // Best-effort: a failure here just means push delivery is degraded
    // to the in-page toast for this device, nothing else in the app
    // depends on it.
  }
}

export function notify({
  title,
  body,
  toastFn,
}: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  // Injected so callers can pick toast.info/success/warning; defaults
  // to a plain toast import to keep this file framework-light.
  toastFn: (message: string) => void;
}) {
  toastFn(body ? `${title} — ${body}` : title);
}
