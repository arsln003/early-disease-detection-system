// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
 apiKey: "AIzaSyArnfs7IqSpxMPT04xEbqtReoqp7g0fY6s",
  authDomain: "early-disease-detection-system.firebaseapp.com",
  projectId: "early-disease-detection-system",
  storageBucket: "early-disease-detection-system.firebasestorage.app",
  messagingSenderId: "48076998071",
  appId: "1:48076998071:web:964f7a88fe136bd36a9432",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = { body: payload.notification.body };
  self.registration.showNotification(notificationTitle, notificationOptions);
});