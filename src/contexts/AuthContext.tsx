import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, name: string, password?: string) => boolean;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
  managedUsers: User[];
  addManagedUser: (u: User) => void;
  updateManagedUser: (u: User) => void;
  deleteManagedUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_PASSWORD = 'Elropero2025*';
const WAREHOUSE_PASSWORD = 'f1234';

function loadJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveJSON(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)); }

const DEFAULT_ADMIN: User = { id: '1', name: 'Administrador', role: 'admin', email: 'admin@elropero.com', password: ADMIN_PASSWORD };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadJSON('boutique_user', null));
  const [managedUsers, setManagedUsers] = useState<User[]>(() => loadJSON('boutique_managed_users', []));

  const login = useCallback((role: UserRole, name: string, password?: string): boolean => {
    if (role === 'admin') {
      if (password !== ADMIN_PASSWORD) return false;
      const u = { ...DEFAULT_ADMIN, name: name || DEFAULT_ADMIN.name };
      setUser(u);
      saveJSON('boutique_user', u);
      return true;
    }
    if (role === 'warehouse') {
      if (password !== WAREHOUSE_PASSWORD) return false;
      const found = managedUsers.find(u => u.role === 'warehouse');
      if (found) {
        setUser(found);
        saveJSON('boutique_user', found);
        return true;
      }
      const u: User = { id: crypto.randomUUID(), name: name || 'Bodega', role: 'warehouse', email: '' };
      setUser(u);
      saveJSON('boutique_user', u);
      return true;
    }
    // seller
    const found = managedUsers.find(u => u.role === role && u.name === name);
    if (found) {
      if (found.password && found.password !== password) return false;
      setUser(found);
      saveJSON('boutique_user', found);
      return true;
    }
    const u: User = { id: crypto.randomUUID(), name: name || 'Vendedor', role, email: '' };
    setUser(u);
    saveJSON('boutique_user', u);
    return true;
  }, [managedUsers]);

  const logout = useCallback(() => { setUser(null); localStorage.removeItem('boutique_user'); }, []);
  const isRole = useCallback((role: UserRole) => user?.role === role, [user]);

  const addManagedUser = useCallback((u: User) => {
    setManagedUsers(prev => { const next = [...prev, u]; saveJSON('boutique_managed_users', next); return next; });
  }, []);
  const updateManagedUser = useCallback((u: User) => {
    setManagedUsers(prev => { const next = prev.map(x => x.id === u.id ? u : x); saveJSON('boutique_managed_users', next); return next; });
  }, []);
  const deleteManagedUser = useCallback((id: string) => {
    setManagedUsers(prev => { const next = prev.filter(x => x.id !== id); saveJSON('boutique_managed_users', next); return next; });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole, managedUsers, addManagedUser, updateManagedUser, deleteManagedUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
