import { createContext, useContext, useEffect, useState } from 'react';
import { storage, KEYS } from './storage.js';
import { USERS } from '../data/seed.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get(KEYS.AUTH, null));

  useEffect(() => {
    if (user) storage.set(KEYS.AUTH, user);
    else storage.remove(KEYS.AUTH);
  }, [user]);

  const login = (role, email) => {
    if (role !== 'admin' && role !== 'agent') {
      return { ok: false, error: 'Only Admin and Agent roles can sign in.' };
    }
    const candidates = USERS.filter((u) => u.role === role);
    const matched = email ? candidates.find((u) => u.email.toLowerCase() === email.toLowerCase()) : candidates[0];
    if (!matched) return { ok: false, error: `No ${role} account found for "${email}"` };
    setUser(matched);
    return { ok: true, user: matched };
  };

  const logout = () => setUser(null);

  const switchUser = (id) => {
    const found = USERS.find((u) => u.id === id);
    if (found) setUser(found);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchUser, allUsers: USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
