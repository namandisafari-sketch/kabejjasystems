import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

const hasFirebaseConfig = Boolean(
  apiKey && apiKey !== "your-firebase-api-key" &&
  projectId && projectId !== "your-firebase-project-id"
);

let auth: any = null;
let db: any = null;
let storage: any = null;

if (hasFirebaseConfig) {
  try {
    const existingApp = getApps().length > 0 ? getApps()[0] : undefined;
    const app = existingApp || initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch {
    // Firebase initialization failed
  }
}

export { auth, db, storage };
export default auth ? { auth, db, storage } : null;
