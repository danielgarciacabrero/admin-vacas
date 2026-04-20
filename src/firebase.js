import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDBGn9iqZ8h7AxWu7n6CDdDQMWivMcssTw",
  authDomain: "appvacas-383c2.firebaseapp.com",
  projectId: "appvacas-383c2",
  storageBucket: "appvacas-383c2.firebasestorage.app",
  messagingSenderId: "209590275513",
  appId: "1:209590275513:web:e25ea7b8e4526b58c7ba68"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = "BOEIxMO6mc-kGvt_vqhJGaaZ2jCaW9BBH4528SaHnAWDVIe5HY32svi6NWPtnc-sRE0fNhy26ZCNdphLs4_Fras";

// Pide permiso al usuario y obtiene el token FCM
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permiso de notificaciones denegado");
      return null;
    }

    // Registrar el service worker manualmente
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    console.log("Token FCM obtenido:", token);
    return token;
  } catch (error) {
    console.error("Error obteniendo token FCM:", error);
    return null;
  }
};

// Escucha notificaciones cuando la app está en primer plano
export const onForegroundMessage = (callback) => {
  onMessage(messaging, (payload) => {
    console.log("Notificación en primer plano:", payload);
    callback(payload);
  });
};