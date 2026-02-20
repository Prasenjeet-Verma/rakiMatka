importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBTNYutsoWV32W4PI409PlmHwfOErM0QTE",
  authDomain: "matka-7f973.firebaseapp.com",
  projectId: "matka-7f973",
  storageBucket: "matka-7f973.firebasestorage.app",
  messagingSenderId: "428729119315",
  appId: "1:428729119315:web:fe6823a4fab66107f5cca6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message ", payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png" // optional
  });
});