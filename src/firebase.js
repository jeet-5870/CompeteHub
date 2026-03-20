import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from "firebase/auth";
import { initializeFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Your web app's Firebase configuration 
// (User is expected to swap this config temporarily via the UI or `.env`)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const firebaseAuth = {
  // Login with Email/Password
  // rememberMe=true → persist across browser sessions (localStorage)
  // rememberMe=false → persist only for this tab (sessionStorage)
  async login(email, password, rememberMe = true) {
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Firebase Login Error:", error.code, error.message);
      throw error;
    }
  },

  // Signup with Email/Password
  async register(username, email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Firebase Register Error:", error.code, error.message);
      throw error;
    }
  },

  // Initiate OAuth redirect (Google or GitHub)
  // Call this when the user clicks a social login button.
  async oauthRedirect(providerName) {
    const provider = providerName === 'github' ? githubProvider : googleProvider;
    await signInWithRedirect(auth, provider);
    // The page will navigate away — no return value.
  },

  // Capture the OAuth result after returning from the provider redirect.
  // Call this once on mount in Login/Signup components.
  async getRedirectUser() {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error.code, error.message);
      throw error;
    }
  },

  // Firestore: Save User Preferences
  async saveUserPreferences(uid, data) {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, data, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error.code, error.message);
      throw error;
    }
  },

  // Firestore: Get User Preferences
  async getUserPreferences(uid) {
    try {
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Firestore Fetch Error:", error.code, error.message);
      throw error;
    }
  }
};
