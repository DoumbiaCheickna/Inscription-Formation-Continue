// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDZHA0ne_E4x9CzK_E29j5_tOYAjTtrnrM",
  authDomain: "drop-iibs.firebaseapp.com",
  projectId: "drop-iibs",
  storageBucket: "drop-iibs.firebasestorage.app",
  messagingSenderId: "113120592091",
  appId: "1:113120592091:web:2586508f5323aeeefe0cfe",
  measurementId: "G-S6JHM7K801"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);

// Références aux services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();