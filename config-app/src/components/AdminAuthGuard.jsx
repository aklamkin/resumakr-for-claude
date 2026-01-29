import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '@/api/adminApiClient';
import { Loader2 } from 'lucide-react';

const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export default function AdminAuthGuard({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('resumakr_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    adminApi.auth.me()
      .then(res => {
        setAdminUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('resumakr_admin_token');
        navigate('/login');
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ adminUser, setAdminUser }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
