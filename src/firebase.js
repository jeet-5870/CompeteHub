import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from "firebase/auth";
import { initializeFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const firebaseAuth = {
  /**
   * @param {boolean} remember
   */
  async login(email, password, remember = false) {
    try {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      localStorage.setItem('ch_last_activity', Date.now().toString());

      return userCredential.user;
    } catch (error) {
      console.error("Firebase Login Error:", error.code, error.message);
      throw error;
    }
  },
  async register(username, email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await this.saveUserPreferences(userCredential.user.uid, {
        username,
        email,
        userPlatforms: [],
        githubHandle: '',
        isProfileComplete: false,
        createdAt: new Date().toISOString()
      });
      return userCredential.user;
    } catch (error) {
      console.error("Firebase Register Error:", error.code, error.message);
      throw error;
    }
  },

  async oauthSignIn(providerName) {
    try {
      const provider = providerName === 'github' ? githubProvider : googleProvider;
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);

      localStorage.setItem('ch_last_activity', Date.now().toString());
      return result.user;
    } catch (error) {
      console.error("Firebase OAuth Error:", error.code, error.message);
      throw error;
    }
  },

  async logout() {
    try {
      localStorage.removeItem('ch_last_activity');
      localStorage.removeItem('ch_login_ts');
      await signOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error.code, error.message);
      throw error;
    }
  },

  async saveUserPreferences(uid, data) {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, data, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error.code, error.message);
      throw error;
    }
  },
  async saveUserPlatforms(uid, userPlatforms) {
    try {
      if (!Array.isArray(userPlatforms)) {
        throw new Error("userPlatforms must be an array");
      }
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { userPlatforms }, { merge: true });
    } catch (error) {
      console.error("Firestore Save Platforms Error:", error.code, error.message);
      throw error;
    }
  },

  async getUserPreferences(uid) {
    try {
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Firestore Fetch Error:", error.code, error.message);
      throw error;
    }
  }
};

const analytics = getAnalytics(app);
