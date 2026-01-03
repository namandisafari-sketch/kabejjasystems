import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration - uses publishable keys from env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export const initializeFirebase = () => {
  if (!app) {
    // Only initialize if we have the required config
    if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    } else {
      console.warn('Firebase config not available - using Supabase auth as fallback');
    }
  }
  return { app, auth };
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

export { app, auth };
