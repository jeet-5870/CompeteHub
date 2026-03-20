import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Platforms from './pages/Platforms';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// console.log("Vite Env Check:", import.meta.env);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Main Layout containing Navbar */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
                <Navbar />
                <main className="max-w-[1200px] mx-auto w-full">
                  <Routes>
                    <Route path="/platforms" element={<Platforms />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/platforms" replace />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
