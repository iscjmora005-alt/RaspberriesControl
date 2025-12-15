// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCF3jfa5udQL2eMIAA-6ERamOii3sfL5Mo",
  authDomain: "raspberriescontrol.firebaseapp.com",
  projectId: "raspberriescontrol",
  storageBucket: "raspberriescontrol.firebasestorage.app",
  messagingSenderId: "7053191023",
  appId: "1:7053191023:web:7e56de8ec084903221ea9a"
};
// -------------------------------------------------

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Cloud Firestore y exportarlo para usarlo en la app
export const db = getFirestore(app);

console.log("🔥 Firebase Firestore inicializado");