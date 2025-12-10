// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACvC_hSZUaqEDh1r9ohjUS2fZhr0iJXqY",
  authDomain: "stockpilot-e2a28.firebaseapp.com",
  projectId: "stockpilot-e2a28",
  storageBucket: "stockpilot-e2a28.firebasestorage.app",
  messagingSenderId: "1067461917580",
  appId: "1:1067461917580:web:e70b5f8b465d4182e1f4a9",
  measurementId: "G-L0PWL48295"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
