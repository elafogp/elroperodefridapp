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

const DEFAULT_ADMIN: User = {
  id: '1',
  name: 'Felipe',
  role: 'admin',
  email: 'felipe@roperodefrida.com',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<User | null>(DEFAULT_ADMIN);
  const [managedUsers, setManagedUsers] = useState<User[]>([]);

  const login = useCallback((_role: UserRole, _name: string, _password?: string): boolean => true, []);
  const logout = useCallback(() => {}, []);
  const isRole = useCallback((role: UserRole) => user?.role === role, [user]);

  const addManagedUser = useCallback((u: User) => {
    setManagedUsers(prev => [...prev, u]);
  }, []);
  const updateManagedUser = useCallback((u: User) => {
    setManagedUsers(prev => prev.map(x => x.id === u.id ? u : x));
  }, []);
  const deleteManagedUser = useCallback((id: string) => {
    setManagedUsers(prev => prev.filter(x => x.id !== id));
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
