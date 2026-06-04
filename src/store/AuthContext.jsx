import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../services/auth.js';

const AuthContext = createContext(null);

const USER_KEY = 'gcat:user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Listen for forced logout (e.g. expired refresh token)
  useEffect(() => {
    const handler = () => { setUser(null); localStorage.removeItem(USER_KEY); };
    window.addEventListener('gcat:logout', handler);
    return () => window.removeEventListener('gcat:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    try {
      const result = await apiLogin(email, password);
      setUser(result.user);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return { ok: true, user: result.user };
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed' };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
