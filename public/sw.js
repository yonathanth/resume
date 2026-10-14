// FitCV service worker — browser push notifications only (no caching).
// Registered from Settings → Notifications when the user opts in.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Resumate", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Resumate";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/favicon.ico",
      data: { url: typeof data.url === "string" ? data.url : "/dashboard" },
    })
  );
});

// Only open app paths or https links.
function safeUrl(url) {
  if (typeof url !== "string") return "/dashboard";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^https:\/\//i.test(url)) return url;
  return "/dashboard";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safeUrl(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
