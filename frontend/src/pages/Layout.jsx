
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileCheck, Home, Settings as SettingsIcon, LogOut, User, HelpCircle, DollarSign, Brain, FileText, Ticket, Tag, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
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

const settingsItems = [
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = React.useState(null);
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);

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

        .dark input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.8;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
        <Sidebar className="border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
          <SidebarHeader className="border-b border-slate-200/60 dark:border-slate-800/60 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">Resumakr</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Build Your Future</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-400 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {isAdmin && (
                    <SidebarMenuItem>
                      <div>
                        <button
                          onClick={() => setSettingsExpanded(!settingsExpanded)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-400 transition-all duration-200 rounded-lg mb-1 ${
                            currentPageName?.startsWith('Settings') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <SettingsIcon className="w-4 h-4" />
                            <span>Settings</span>
                          </div>
                          {settingsExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        {settingsExpanded && (
                          <div className="ml-7 mt-1 space-y-1">
                            {settingsItems.map((item) => (
                              <SidebarMenuButton
                                key={item.title}
                                asChild
                                className={`hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-400 transition-all duration-200 rounded-lg ${
                                  location.pathname === item.url ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <Link to={item.url} className="flex items-center gap-3 px-3 py-2 text-sm">
                                  <item.icon className="w-3.5 h-3.5" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        )}
                      </div>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 dark:border-slate-800/60 p-4">
            {user && (
              <div className="space-y-3">
                
                <ThemeToggle />
                          
                {subscriptionInfo && (
                  <button
                    onClick={handleSubscriptionClick}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${subscriptionInfo.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {subscriptionInfo.isActive ? (
                              subscriptionInfo.plan === 'daily' ? 'Daily' : 
                              subscriptionInfo.plan === 'weekly' ? 'Weekly' : 
                              subscriptionInfo.plan === 'monthly' ? 'Monthly' :
                              subscriptionInfo.plan === 'annual' ? 'Annual' : 'Active'
                            ) : 'No Plan'}
                          </span>
                        </div>
                        {subscriptionInfo.isActive ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Until {formatDateWithYear(subscriptionInfo.endDate)}
                          </p>
                        ) : (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            Subscribe →
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )}
                          
                <div className="flex items-center gap-3 px-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Resumakr</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
