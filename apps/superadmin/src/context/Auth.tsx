import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('superadmin_token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('superadmin_role'));

  useEffect(() => {
    if (token) localStorage.setItem('superadmin_token', token);
    else localStorage.removeItem('superadmin_token');
  }, [token]);

  useEffect(() => {
    if (role) localStorage.setItem('superadmin_role', role);
    else localStorage.removeItem('superadmin_role');
  }, [role]);

  const login = (newToken: string, newRole: string) => {
    setToken(newToken);
    setRole(newRole);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
