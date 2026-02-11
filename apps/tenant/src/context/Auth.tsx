import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: string | null;
  companyId: string | null;
  login: (token: string, role: string, companyId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('tenant_token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('tenant_role'));
  const [companyId, setCompanyId] = useState<string | null>(localStorage.getItem('tenant_companyId'));

  useEffect(() => {
    if (token) localStorage.setItem('tenant_token', token);
    else localStorage.removeItem('tenant_token');
  }, [token]);

  useEffect(() => {
    if (role) localStorage.setItem('tenant_role', role);
    else localStorage.removeItem('tenant_role');
  }, [role]);

  useEffect(() => {
    if (companyId) localStorage.setItem('tenant_companyId', companyId);
    else localStorage.removeItem('tenant_companyId');
  }, [companyId]);

  const login = (newToken: string, newRole: string, newCompanyId?: string) => {
    setToken(newToken);
    setRole(newRole);
    setCompanyId(newCompanyId || null);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setCompanyId(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, companyId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};