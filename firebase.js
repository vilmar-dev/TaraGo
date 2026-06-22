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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (compat SDK, loaded via <script> tags in index.html)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();