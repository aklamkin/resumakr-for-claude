import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileCheck, User,
  HelpCircle, DollarSign,
  ChevronRight, ChevronLeft, CreditCard
} from "lucide-react";
import api from "@/api/apiClient";

const navigationItems = [
  {
    title: "My Resumes",
    url: createPageUrl("MyResumes"),
    icon: FileCheck,
    requiresAuth: true,
  },
  {
    title: "Pricing",
    url: createPageUrl("Pricing"),
    icon: DollarSign,
  },
  {
    title: "Help",
    url: createPageUrl("Help"),
    icon: HelpCircle,
  },
];

export default function Layout({ children, currentPageName, isPublicPage }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('resumakr_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await api.auth.me();
      setUser(userData);
    } catch (err) {
      console.error("Error loading user:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const visibleNavItems = user
    ? navigationItems
    : navigationItems.filter(item => !item.requiresAuth);

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col flex-shrink-0 transition-all duration-200`}>
        {/* Header - Logo */}
        <div className="border-b border-border/50 bg-muted/30 px-3 py-3 flex items-center justify-between flex-shrink-0">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0 hover:opacity-80 transition-all mx-auto"
            >
              <FileCheck className="h-5 w-5 text-white" />
            </button>
          ) : (
            <>
              <Link
                to={user ? createPageUrl("MyResumes") : "/"}
                className="flex items-center gap-3 rounded-lg transition-all hover:opacity-80 cursor-pointer min-w-0"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
                  <FileCheck className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight">Resumakr</h1>
                  <p className="text-xs text-muted-foreground">Build Your Future</p>
                </div>
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.url;
            const isSubscribed = user?.is_subscribed && user?.subscription_end_date && new Date(user.subscription_end_date) > new Date();
            const displayTitle = item.title === "Pricing" && isSubscribed ? "My Plan" : item.title;
            const DisplayIcon = item.title === "Pricing" && isSubscribed ? CreditCard : item.icon;

            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-muted text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title={collapsed ? displayTitle : undefined}
              >
                <DisplayIcon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{displayTitle}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer - User Area */}
        {user && (
          <div className="border-t border-border/50 bg-muted/30 p-2 flex-shrink-0">
            <Link
              to={createPageUrl("AccountSettings")}
              className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all hover:bg-muted/70 cursor-pointer group"
              title={collapsed ? (user.full_name || user.email) : undefined}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <User className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
          </div>
        )}
      </aside>

      <main id="main-scroll-container" className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
