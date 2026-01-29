import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthGuard';
import {
  Monitor, Users, Brain, FileText, CreditCard,
  Ticket, HelpCircle, Shield, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap
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
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('resumakr_admin_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-card border-r flex flex-col transition-all duration-200`}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Resumakr
              </h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
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
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t">
          {!collapsed && adminUser && (
            <div className="mb-2 px-2">
              <p className="text-sm font-medium truncate">{adminUser.full_name || adminUser.email}</p>
              <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
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
