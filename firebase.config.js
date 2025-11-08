// Firebase configuration for TN Happy Kids Management System
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAOe14nuMyBsjjKSWPOZoIeFjFk2C59AFc",
  authDomain: "management-7c3d1.firebaseapp.com",
  projectId: "management-7c3d1",
  storageBucket: "management-7c3d1.firebasestorage.app",
  messagingSenderId: "346018395555",
  appId: "1:346018395555:web:df8675bc8d265c0be6d616",
  measurementId: "G-QPZQ7VFK4E"
};

// Production domain configuration
export const PRODUCTION_DOMAIN = "appv5.tnhappykids.in";
export const AUTHORIZED_DOMAINS = [
  "management-7c3d1.firebaseapp.com",
  "appv5.tnhappykids.in",
  "localhost"
];

// VAPID Key for Push Notifications
export const VAPID_KEY = "BM9DOjtOmhF9g6TKqWJiowmUHzhrk9NKdEjSG1XNekcPsEDXN3q44IGm-QiAVgcls8qR8atU_iGWRAH1MR7B1W4";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
