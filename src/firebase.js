// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgGpNFLLqnzaQ1MyMDibEHsuKQWO8AEKA",
  authDomain: "school-lms-portal.firebaseapp.com",
  projectId: "school-lms-portal",
  storageBucket: "school-lms-portal.firebasestorage.app",
  messagingSenderId: "110278421910",
  appId: "1:110278421910:web:ee4e15262271278d2601b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
