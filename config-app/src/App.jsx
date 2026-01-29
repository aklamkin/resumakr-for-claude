import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import AdminLayout from '@/components/AdminLayout';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import Settings from '@/pages/Settings';
import UsersPage from '@/pages/Users';
import Providers from '@/pages/Providers';
import Prompts from '@/pages/Prompts';
import Plans from '@/pages/Plans';
import Stripe from '@/pages/Stripe';
import Codes from '@/pages/Codes';
import Help from '@/pages/Help';
import AdminUsers from '@/pages/AdminUsers';

function ProtectedRoutes() {
  return (
    <AdminAuthGuard>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Settings />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/stripe" element={<Stripe />} />
          <Route path="/codes" element={<Codes />} />
          <Route path="/help" element={<Help />} />
          <Route path="/admin-users" element={<AdminUsers />} />
        </Routes>
      </AdminLayout>
    </AdminAuthGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/config">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
