import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileCheck, Home, Settings as SettingsIcon, User,
  HelpCircle, DollarSign, Brain, FileText, Ticket, Tag,
  TrendingUp, ChevronDown, ChevronRight, Monitor, Users
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
import ThemeToggle from "../components/ThemeToggle";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
  },
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
    title: "Account",
    url: createPageUrl("AccountSettings"),
    icon: User,
    requiresAuth: true,
  },
  {
    title: "Help",
    url: createPageUrl("Help"),
    icon: HelpCircle,
  },
];

const settingsItems = [
  {
    title: "Interface",
    url: createPageUrl("SettingsInterface"),
    icon: Monitor,
  },
  {
    title: "Users",
    url: createPageUrl("SettingsUsers"),
    icon: Users,
  },
  {
    title: "AI Providers",
    url: createPageUrl("SettingsProviders"),
    icon: Brain,
  },
  {
    title: "Prompts",
    url: createPageUrl("SettingsPrompts"),
    icon: FileText,
  },
  {
    title: "Plans",
    url: createPageUrl("SettingsPlans"),
    icon: DollarSign,
  },
  {
    title: "Coupon Codes",
    url: createPageUrl("SettingsCodes"),
    icon: Ticket,
  },
  {
    title: "Campaigns",
    url: createPageUrl("SettingsCampaigns"),
    icon: TrendingUp,
  },
  {
    title: "Help & FAQs",
    url: createPageUrl("SettingsHelp"),
    icon: HelpCircle,
  },
];

export default function Layout({ children, currentPageName, isPublicPage }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    const isSettingsPage = currentPageName?.startsWith('Settings');
    setSettingsExpanded(isSettingsPage);
  }, [currentPageName]);

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

  const isAdmin = user?.role === 'admin';
  const visibleNavItems = user
    ? navigationItems
    : navigationItems.filter(item => !item.requiresAuth);

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --sidebar-width: 280px;
          --sidebar-width-icon: 60px;
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

      <Sidebar collapsible="none" className="border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Header */}
        <SidebarHeader className="border-b border-border/50 bg-muted/30 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">Resumakr</h1>
              <p className="text-xs text-muted-foreground">Build Your Future</p>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="sidebar-scroll px-3 py-4">
          {/* Main Navigation */}
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
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
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Settings Section */}
          {isAdmin && (
            <SidebarGroup className="mt-4 px-0">
              <div className="mb-2 px-3">
                <button
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                  className={cn(
                    "flex w-full items-center justify-between h-10 px-3 rounded-lg",
                    "text-sm font-semibold transition-all sidebar-transition",
                    "hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="h-4 w-4 flex-shrink-0" />
                    <span>Admin Settings</span>
                  </div>
                  <div>
                    {settingsExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform" />
                    )}
                  </div>
                </button>
              </div>

              {settingsExpanded && (
                <SidebarGroupContent className="animate-in slide-in-from-top-2 duration-200">
                  <SidebarMenu className="space-y-1">
                    {settingsItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={cn(
                              "nav-item-hover h-9 px-3 gap-3 rounded-lg transition-all sidebar-transition",
                              "hover:bg-muted/70 hover:text-foreground text-sm pl-6",
                              isActive && "bg-muted text-foreground font-medium"
                            )}
                            data-active={isActive}
                          >
                            <Link to={item.url} className="flex items-center">
                              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer - Theme Toggle at Bottom */}
        <SidebarFooter className="border-t border-border/50 bg-muted/30 p-4">
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </SidebarProvider>
  );
}
