// Clears the stale Vite service worker left over from a previous dev setup.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister();
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.navigate(client.url));
  });
});
