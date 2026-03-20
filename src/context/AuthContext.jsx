import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

// ── Session constants (exported so App.jsx / Login.jsx can share them) ────────
export const SESSION_KEY   = 'ch_login_ts';
export const ACTIVITY_KEY  = 'ch_last_activity';
const SESSION_TTL_MS       = 3 * 24 * 60 * 60 * 1000; // 3 days since login
const INACTIVITY_TTL_MS    = 3 * 24 * 60 * 60 * 1000; // 3 days of inactivity

function clearSessionKeys() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const now         = Date.now();
        const loginStamp  = localStorage.getItem(SESSION_KEY);
        const activityTs  = localStorage.getItem(ACTIVITY_KEY);

        // 1. Stamp login time on first sight of this session
        if (!loginStamp) {
          localStorage.setItem(SESSION_KEY,  now.toString());
          localStorage.setItem(ACTIVITY_KEY, now.toString());
          setUser(currentUser);
          setLoading(false);
          return;
        }

        // 2. Check inactivity — has the user been idle for > 3 days?
        const lastActivity = activityTs ? Number(activityTs) : Number(loginStamp);
        if (now - lastActivity > INACTIVITY_TTL_MS) {
          console.info('Session expired: inactivity > 3 days. Signing out.');
          clearSessionKeys();
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        // 3. Check absolute session age — logged in > 3 days ago regardless of activity
        if (now - Number(loginStamp) > SESSION_TTL_MS) {
          console.info('Session expired: login age > 3 days. Signing out.');
          clearSessionKeys();
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        // 4. All checks passed — valid session
        setUser(currentUser);
      } else {
        // User is signed out — wipe any stale stamps
        clearSessionKeys();
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
