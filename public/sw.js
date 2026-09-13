// Vanilla service worker, hand-written (no Workbox/next-pwa) — this app
// still doesn't do offline caching, only push. Registered by
// lib/notifications.ts's ensurePushSubscription().

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// The server (app/api/push/dispatch) already knows whether this event
// matters to this user — this handler's only job is deciding whether to
// show a native popup on top of the in-page toast the open tab already
// rendered from its own Realtime subscription. If a visible, focused tab
// exists, skip the popup; that's the same "don't double up" rule that
// used to live in lib/notifications.ts's old direct Notification() call.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const isForeground = windows.some((c) => c.visibilityState === "visible" && c.focused);
      if (isForeground) return;

      await self.registration.showNotification(data.title, {
        body: data.body || undefined,
        tag: data.tag || undefined,
        icon: "/images/barbero2go-mark.svg",
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
