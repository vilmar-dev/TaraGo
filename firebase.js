// =====================================================
// FIREBASE CONFIGURATION
// =====================================================
// Replace the values below with your own Firebase project's
// config object. You can find this in:
// Firebase Console → Project Settings → General → Your apps → SDK setup and config
//
// IMPORTANT: This project uses the Firebase REALTIME DATABASE
// (not Firestore). Make sure "Realtime Database" is enabled in
// your Firebase Console (Build → Realtime Database → Create Database).
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyDKl444XUtu3GLzS4qtVoh50oCluj7CXsY",
  authDomain: "tarago-c7011.firebaseapp.com",
  databaseURL: "https://tarago-c7011-default-rtdb.firebaseio.com",
  projectId: "tarago-c7011",
  storageBucket: "tarago-c7011.firebasestorage.app",
  messagingSenderId: "1021517695715",
  appId: "1:1021517695715:web:b43c4dd0fe115c15b393d6"
};

// Initialize Firebase (compat SDK, loaded via <script> tags in index.html)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
