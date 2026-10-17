// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCgGpNFLLqnzaQ1MyMDibEHsuKQWO8AEKA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "school-lms-portal.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "school-lms-portal",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "school-lms-portal.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "110278421910",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:110278421910:web:ee4e15262271278d2601b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with modern multi-tab offline persistence (Firebase v10+ standard)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  db = getFirestore(app);
}

// Initialize Firebase Storage
const storage = getStorage(app);

// Secondary app instance for admin user management (avoids logging out the admin)
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
const adminAuth = getAuth(secondaryApp);

export { app, auth, db, adminAuth, storage, firebaseConfig };

