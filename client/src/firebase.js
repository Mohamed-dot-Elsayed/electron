// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyAfsEviaKzmGvOhzWeS1Lqw1-SgFMmlUtc",
    authDomain: "food2go-8676e.firebaseapp.com",
    projectId: "food2go-8676e",
    storageBucket: "food2go-8676e.firebasestorage.app",
    messagingSenderId: "191292342718",
    appId: "1:191292342718:web:ecc1bea17c944969aef9ef",
    measurementId: "G-B3PZS58BJJ"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging };