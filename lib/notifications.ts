// Desktop/OS notifications, layered on top of the sonner toasts that
// already fire throughout the app. No service worker, no push
// subscriptions — this only reaches a tab that's open somewhere (even
// backgrounded), never a fully closed browser. iOS Safari has no
// Notification API outside an installed PWA; notificationsSupported()
// covers that as "unsupported", not an error.

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
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

// Always toasts (today's behavior). Only pops an OS notification when
// permission is granted AND the tab isn't the one you're looking at —
// no redundant popup on top of a toast you can already see.
export function notify({
  title,
  body,
  url,
  tag,
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

  if (
    !notificationsSupported() ||
    Notification.permission !== "granted" ||
    (!document.hidden && document.hasFocus())
  ) {
    return;
  }

  const n = new Notification(title, {
    body,
    tag,
    icon: "/icon.svg",
  });
  n.onclick = () => {
    window.focus();
    if (url) location.assign(url);
    n.close();
  };
}
