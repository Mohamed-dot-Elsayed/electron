importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAfsEviaKzmGvOhzWeS1Lqw1-SgFMmlUtc",
    authDomain: "food2go-8676e.firebaseapp.com",
    projectId: "food2go-8676e",
    storageBucket: "food2go-8676e.firebasestorage.app",
    messagingSenderId: "191292342718",
    appId: "1:191292342718:web:ecc1bea17c944969aef9ef",
    measurementId: "G-B3PZS58BJJ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification;
    self.registration.showNotification(title, {
        body,
    });
});