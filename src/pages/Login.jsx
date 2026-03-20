import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Code, Eye, EyeOff, Github } from 'lucide-react';
import { firebaseAuth } from '../firebase';
import { ACTIVITY_KEY } from '../context/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result on mount
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const user = await firebaseAuth.getRedirectUser();
        if (user) {
          navigate('/platforms');
        }
      } catch (err) {
        console.error("Redirect Auth Error:", err.code, err.message);
        setError(mapAuthError(err));
      }
    };
    handleRedirect();
  }, [navigate]);

  const mapAuthError = (err) => {
    let themedMessage = err.message;
    if (err.code === 'auth/invalid-credential') themedMessage = "Invalid credentials. Please check your email and password.";
    if (err.code === 'auth/user-not-found') themedMessage = "Email not found. Please sign up first.";
    if (err.code === 'auth/wrong-password') themedMessage = "Incorrect password. Please try again.";
    if (err.code === 'auth/popup-closed-by-user') themedMessage = "Login cancelled by user.";
    if (err.code === 'auth/internal-assertion-failed') themedMessage = "Authentication engine error. Using redirect flow should resolve this.";
    return themedMessage;
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    await authenticate(firebaseAuth.login(email, password, rememberMe));
  };

  const handleOAuthLogin = async (providerName) => {
    setError(null);
    setLoading(true);
    try {
      await firebaseAuth.oauthRedirect(providerName);
      // Page will redirect — no further action needed
    } catch (err) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  const authenticate = async (authPromise) => {
    setError(null);
    setLoading(true);

    try {
      const user = await authPromise;
      if (user) {
        // Seed the inactivity clock the moment they log in
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        navigate('/platforms');
      } else {
        throw new Error("Authentication failed unexpectedly.");
      }
    } catch (err) {
      console.error("Auth Exception:", err.code, err.message);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Background radial gradient */}
      <div
        className="absolute top-0 left-[50%] -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(31,111,235,0.08), transparent 60%)'
        }}
      />

      {/* Logo Section */}
      <div className="flex flex-col items-center mb-8 z-10 text-center">
        <div className="flex items-center gap-2 mb-2 font-mono text-2xl font-semibold">
          <Code className="text-[var(--color-text-primary)] w-8 h-8" strokeWidth={2.5} />
          <span>CompeteHub</span>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm tracking-wide">
          Your competitive programming command center
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[380px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-8 z-10 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <h1 className="text-[20px] font-semibold mb-6 flex justify-center">Sign in to CompeteHub</h1>

        {error && (
          <div className="mb-4 p-2 bg-[rgba(248,81,73,0.1)] border border-[var(--color-accent-red)] rounded-md text-[var(--color-accent-red)] text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-accent-blue)] focus:outline-offset-1 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Password</label>
              <a href="#" className="text-xs text-[var(--color-accent-blue)] hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md pl-3 pr-10 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline focus:outline-2 focus:outline-[var(--color-accent-blue)] focus:outline-offset-1 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded bg-[var(--color-bg-primary)] border-[var(--color-border)] w-3.5 h-3.5 accent-[var(--color-accent-blue)]"
            />
            <label htmlFor="remember" className="text-sm text-[var(--color-text-primary)] cursor-pointer">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-[var(--color-btn-primary-bg)] border border-[var(--color-btn-primary-border)] text-white text-sm font-medium rounded-md py-1.5 hover:brightness-90 transition-all font-mono tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-[var(--color-border-muted)]"></div>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">OR</span>
          <div className="h-px flex-1 bg-[var(--color-border-muted)]"></div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium rounded-md py-1.5 hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-text-secondary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github size={18} />
            <span>Continue with GitHub</span>
          </button>

          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium rounded-md py-1.5 hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-text-secondary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      <div className="mt-8 text-sm z-10 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl py-4 px-12 bg-[var(--color-bg-secondary)] shadow-sm">
        New to CompeteHub? {' '}
        <Link to="/signup" className="flex-1 text-[var(--color-accent-blue)] hover:underline font-medium">Create an account</Link>
      </div>
    </div>
  );
};

export default Login;
