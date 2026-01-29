import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileCheck, User,
  HelpCircle, DollarSign,
  ChevronRight, CreditCard
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
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
    // Will show "My Plan" for subscribers (handled in render)
  },
  {
    title: "Help",
    url: createPageUrl("Help"),
    icon: HelpCircle,
  },
];

export default function Layout({ children, currentPageName, isPublicPage }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

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
    <SidebarProvider className="h-screen flex">
      <style>{`
        :root {
          --sidebar-width: 280px;
          --sidebar-width-icon: 60px;
        }

        /* Ensure sidebar has full height flex layout */
        [data-sidebar="sidebar"] {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
        }

        /* Custom scrollbar for sidebar */
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 3px;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.3);
        }

        /* Smooth transitions for sidebar */
        .sidebar-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Avatar gradient background */
        .avatar-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
        }

        /* Subscription card gradient */
        .subscription-card {
          background: linear-gradient(135deg, hsl(var(--accent) / 0.1) 0%, hsl(var(--primary) / 0.05) 100%);
          border: 1px solid hsl(var(--accent) / 0.2);
        }

        .subscription-card-active {
          background: linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%);
        }

        /* Nav item hover effect */
        .nav-item-hover {
          position: relative;
          overflow: hidden;
        }

        .nav-item-hover::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 3px;
          background: hsl(var(--accent));
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }

        .nav-item-hover:hover::before,
        .nav-item-hover[data-active="true"]::before {
          transform: scaleY(1);
        }
      `}</style>

      <Sidebar collapsible="none" className="border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
        {/* Header - Clickable logo area */}
        <SidebarHeader className="border-b border-border/50 bg-muted/30 px-4 py-4 flex-shrink-0">
          <Link
            to={user ? createPageUrl("MyResumes") : "/"}
            className="flex items-center gap-3 rounded-lg transition-all hover:opacity-80 cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">Resumakr</h1>
              <p className="text-xs text-muted-foreground">Build Your Future</p>
            </div>
          </Link>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="sidebar-scroll px-3 py-4 flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  // Show "My Plan" instead of "Pricing" for subscribed users
                  const isSubscribed = user?.is_subscribed && user?.subscription_end_date && new Date(user.subscription_end_date) > new Date();
                  const displayTitle = item.title === "Pricing" && isSubscribed ? "My Plan" : item.title;
                  const DisplayIcon = item.title === "Pricing" && isSubscribed ? CreditCard : item.icon;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "nav-item-hover h-10 px-3 gap-3 rounded-lg transition-all sidebar-transition",
                          "hover:bg-muted/70 hover:text-foreground",
                          isActive && "bg-muted text-foreground font-medium shadow-sm"
                        )}
                        data-active={isActive}
                      >
                        <Link to={item.url} className="flex items-center">
                          <DisplayIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{displayTitle}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        {/* Footer - Clickable User Area (goes to Account) */}
        {user && (
          <SidebarFooter className="border-t border-border/50 bg-muted/30 px-2 py-2 flex-shrink-0">
            <Link
              to={createPageUrl("AccountSettings")}
              className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all hover:bg-muted/70 cursor-pointer group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </SidebarFooter>
        )}
      </Sidebar>

      <main id="main-scroll-container" className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </SidebarProvider>
  );
}
