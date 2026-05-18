importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_FQpu0SSBXnmKckA8Gd7RO4CqTo_-gV8",
  authDomain: "ehad-fyp.firebaseapp.com",
  projectId: "ehad-fyp",
  storageBucket: "ehad-fyp.firebasestorage.app",
  messagingSenderId: "106151657765",
  appId: "1:106151657765:web:89ffdd7d5d84cb3d7ddacc"
});

const messaging = firebase.messaging();

// Background logic
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // 🔥 FIX: Check both data and notification blocks for title/body
  const notificationTitle = payload.data?.title || payload.notification?.title || '🩺 AI Diagnostic Alert';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'New patient report update available.',
    icon: '/favicon.ico',
    requireInteraction: true, // 🔥 Yeh OS ko force karega screen par dikhane ke liye
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked!', event.notification.data);
  event.notification.close();

  const urlToOpen = self.location.origin + '/doctor/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});