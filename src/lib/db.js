/**
 * A simple mock database using localStorage to simulate backend operations
 * for CompeteHub's authentication and user data.
 */

const DB_KEY = 'competehub_users';
const SESSION_KEY = 'competehub_session';

// Initialize DB if empty
const initDB = () => {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify([]));
  }
};

// Simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const dbact = {
  // Register a new user
  async register(username, email, password) {
    await delay(800);
    initDB();
    const users = JSON.parse(localStorage.getItem(DB_KEY));
    
    if (users.find(u => u.email === email)) {
      throw new Error('Email already in use');
    }
    if (users.find(u => u.username === username)) {
      throw new Error('Username already in use');
    }
    
    const newUser = { id: Date.now().toString(), username, email, password }; // In a real app, hash the password!
    users.push(newUser);
    localStorage.setItem(DB_KEY, JSON.stringify(users));
    
    // Auto login
    this.createSession(newUser);
    return newUser;
  },

  // Login existing user
  async login(email, password) {
    await delay(800);
    initDB();
    const users = JSON.parse(localStorage.getItem(DB_KEY));
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    this.createSession(user);
    return user;
  },

  // Mock OAuth Signup
  async oauthSignup(username, email, provider) {
    await delay(1000);
    initDB();
    const users = JSON.parse(localStorage.getItem(DB_KEY));
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
      throw new Error(`Account already exists with this email.`);
    }
    
    if (users.find(u => u.username === username)) {
      throw new Error('Username already in use');
    }

    const newUser = { id: Date.now().toString(), username, email, provider };
    users.push(newUser);
    localStorage.setItem(DB_KEY, JSON.stringify(users));
    
    this.createSession(newUser);
    return newUser;
  },

  // Mock OAuth Login
  async oauthLogin(provider) {
    await delay(1000);
    initDB();
    const users = JSON.parse(localStorage.getItem(DB_KEY));
    
    // In a real app, this would use the OAuth token to find the user.
    // Here we just find the first user that matches the provider, or fail.
    const user = users.find(u => u.provider === provider);
    if (!user) {
      throw new Error(`No ${provider} account found. Please sign up first.`);
    }
    
    this.createSession(user);
    return user;
  },

  // Logout
  async logout() {
    await delay(300);
    localStorage.removeItem(SESSION_KEY);
  },

  // Session management
  createSession(user) {
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: sessionToken, userId: user.id, username: user.username, email: user.email }));
  },

  getSession() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }
};
