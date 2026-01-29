import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthGuard';
import {
  Monitor, Users, Brain, FileText, CreditCard,
  Ticket, HelpCircle, Shield, LogOut,
  Zap, FileCheck
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Interface', icon: Monitor },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/providers', label: 'AI Providers', icon: Brain },
  { path: '/prompts', label: 'Prompts', icon: FileText },
  { path: '/plans', label: 'Plans', icon: CreditCard },
  { path: '/stripe', label: 'Stripe', icon: Zap },
  { path: '/codes', label: 'Coupon Codes', icon: Ticket },
  { path: '/help', label: 'Help & FAQs', icon: HelpCircle },
  { path: '/admin-users', label: 'Admin Users', icon: Shield },
];

export default function AdminLayout({ children }) {
  const { adminUser } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('resumakr_admin_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} overflow-hidden bg-card border-r flex flex-col transition-all duration-200`}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Header - Branding */}
        <div className="px-3 py-3 border-b flex items-center flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <div className={`min-w-0 whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100 delay-75'}`}>
              <h1 className="text-lg font-bold tracking-tight">Resumakr</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100 delay-75'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t">
          <div className={`mb-2 px-3 whitespace-nowrap transition-opacity duration-150 ${collapsed || !adminUser ? 'opacity-0 h-0 mb-0 overflow-hidden' : 'opacity-100 delay-75'}`}>
            <p className="text-sm font-medium truncate">{adminUser?.full_name || adminUser?.email}</p>
            <p className="text-xs text-muted-foreground truncate">{adminUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100 delay-75'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
