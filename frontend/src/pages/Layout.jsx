import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileCheck, Home, Settings as SettingsIcon, LogOut, User, HelpCircle, DollarSign, Brain, FileText, Ticket, Tag, TrendingUp, ChevronDown, ChevronRight, Monitor, Users } from "lucide-react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import api from "@/api/apiClient";
import ThemeToggle from "../components/ThemeToggle";
import { formatDateWithYear } from "../components/utils/dateUtils";

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
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = React.useState(null);
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    // Auto-expand settings if on a settings page
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
      
      if (userData.is_subscribed && userData.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        const isActive = endDate > now;
        
        setSubscriptionInfo({
          isActive,
          plan: userData.subscription_plan,
          endDate: userData.subscription_end_date
        });
        
        if (!isActive) {
          await api.auth.updateMe({ is_subscribed: false });
        }
      } else {
        setSubscriptionInfo({ isActive: false });
      }
    } catch (err) {
      console.error("Error loading user:", err);
      setUser(null);
      setSubscriptionInfo({ isActive: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setSubscriptionInfo(null);
  };

  const handleSubscriptionClick = () => {
    navigate(createPageUrl("SubscriptionManagement"));
  };

  const isAdmin = user?.role === 'admin';
  
  // Filter navigation items based on auth status
  const visibleNavItems = user 
    ? navigationItems 
    : navigationItems.filter(item => !item.requiresAuth);

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 222 47% 11%;
          --primary-foreground: 210 40% 98%;
          --accent: 217 91% 60%;
          --accent-hover: 217 91% 50%;
        }
        
        .dark {
          --primary: 210 40% 98%;
          --primary-foreground: 222 47% 11%;
          --accent: 217 91% 60%;
          --accent-hover: 217 91% 70%;
        }
      `}</style>
      
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-bold">Resumakr</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Build Your Future</p>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <div className="px-3 py-2">
                <button
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                  className="flex w-full items-center justify-between text-sm font-semibold hover:bg-accent/10 rounded-md px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Admin Settings</span>
                  </div>
                  {settingsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {settingsExpanded && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    
                    {settingsItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-0">
        <div className="px-4 py-2 border-b">
          <ThemeToggle />
        </div>
        <div className="p-4">
          {!loading && (
            <>
              {user ? (
                <div className="space-y-3">
                  {subscriptionInfo?.isActive && (
                    <div className="px-3 py-2 bg-accent/10 rounded-md">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Tag className="h-4 w-4 text-accent" />
                        <span className="text-accent">{subscriptionInfo.plan} Plan</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Until {formatDateWithYear(subscriptionInfo.endDate)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="flex-shrink-0"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                  {!subscriptionInfo?.isActive && (
                    <Button onClick={handleSubscriptionClick} className="w-full" size="sm">
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full" size="sm">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </>
          )}
                </div>
      </SidebarFooter>
      </Sidebar>

      <main className="flex-1 overflow-auto">
        <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            {!loading && !user && (
              <Button asChild size="sm">
                <Link to="/login">Log In</Link>
              </Button>
            )}
          </div>
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
