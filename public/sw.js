// Service Worker for Push Notifications
const CACHE_NAME = "vango-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received", event);

  if (!event.data) {
    console.log("No data in push event");
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || "default",
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "VANGO", options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked", event);

  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event - basic caching strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});