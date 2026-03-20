import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Platforms from './pages/Platforms';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { ACTIVITY_KEY } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ── Inner component so we can call useAuth (must be inside AuthProvider) ──────
function AppRoutes() {
  const { user } = useAuth();
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!user) return; // Only track activity for authenticated users

    const THROTTLE_MS = 60_000; // Write at most once per minute

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastWriteRef.current > THROTTLE_MS) {
        lastWriteRef.current = now;
        localStorage.setItem(ACTIVITY_KEY, now.toString());
      }
    };

    const events = ['click', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, updateActivity));
  }, [user]);

  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected layout */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
            <Navbar />
            <main className="max-w-[1200px] mx-auto w-full">
              <Routes>
                <Route path="/platforms" element={<Platforms />} />
                <Route path="/schedule"  element={<Schedule />} />
                <Route path="/profile"   element={<Profile />} />
                <Route path="*"          element={<Navigate to="/platforms" replace />} />
              </Routes>
            </main>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
