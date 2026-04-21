// Service Worker para recibir notificaciones push en segundo plano
// Este archivo DEBE estar en /public para que el navegador lo registre correctamente
 
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
 
firebase.initializeApp({
  apiKey: "AIzaSyDBGn9iqZ8h7AxWu7n6CDdDQMWivMcssTw",
  authDomain: "appvacas-383c2.firebaseapp.com",
  projectId: "appvacas-383c2",
  storageBucket: "appvacas-383c2.firebasestorage.app",
  messagingSenderId: "209590275513",
  appId: "1:209590275513:web:e25ea7b8e4526b58c7ba68"
});
 
const messaging = firebase.messaging();
 
// Cuando llega una notificación y la app está en segundo plano o cerrada
messaging.onBackgroundMessage((payload) => {
  console.log("Notificación en segundo plano:", payload);
 
  const title = payload.notification?.title || "Nueva notificación";
  const options = {
    body: payload.notification?.body || "",
    icon: "/favicon.svg",
    requireInteraction: true
};
  self.registration.showNotification(title, options);
});
 