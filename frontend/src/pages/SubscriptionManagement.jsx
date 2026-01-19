import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ArrowLeft, AlertCircle, Zap, Sparkles, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmDialog, NotificationPopup } from "../components/ui/notification";

const PLAN_ICONS = {
  daily: Zap,
  weekly: Sparkles,
  monthly: Crown,
  annual: Crown
};

const PLAN_NAMES = {
  daily: "Daily Pass",
  weekly: "Weekly Plan",
  monthly: "Monthly Plan",
  annual: "Annual Plan"
};

const PLAN_PRICES = {
  daily: "$0.99/day",
  weekly: "$6.49/week",
  monthly: "$29.99/month",
  annual: "$199/year"
};

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch (err) {
      console.error("Error loading user:", err);
      showNotification("Failed to load user data", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  const handleCancelSubscription = () => {
    setConfirmDialog({
      open: true,
      title: "Cancel Subscription?",
      message: "Your subscription will remain active until the end of your current billing cycle. You can continue using all features until then. Are you sure you want to cancel?",
      onConfirm: async () => {
        setCancelling(true);
        try {
          await api.auth.updateMe({
            is_subscribed: false,
            cancelled_at: new Date().toISOString()
          });
          showNotification(
            "Your subscription has been cancelled. You'll retain access until the end of your billing cycle.",
            "Subscription Cancelled"
          );
          await loadUser();
        } catch (err) {
          showNotification("Failed to cancel subscription. Please try again.", "Error", "error");
        } finally {
          setCancelling(false);
        }
      }
    });
  };

  const handleReactivate = async () => {
    setCancelling(true);
    try {
      await api.auth.updateMe({
        is_subscribed: true,
        cancelled_at: null
      });
      showNotification("Your subscription has been reactivated!", "Welcome Back");
      await loadUser();
    } catch (err) {
      showNotification("Failed to reactivate subscription. Please try again.", "Error", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = () => {
    navigate(createPageUrl("Pricing"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }

  const isActive = user?.is_subscribed && user?.subscription_end_date && new Date(user.subscription_end_date) > new Date();
  const isCancelled = user?.cancelled_at && isActive;
  const plan = user?.subscription_plan;
  const PlanIcon = PLAN_ICONS[plan] || Sparkles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("MyResumes"))}
            className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Subscription Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Manage your Resumakr subscription</p>

          {/* Current Plan Status */}
          <Card className={`p-8 border-2 mb-6 ${
            isActive && !isCancelled
              ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
              : isCancelled
              ? "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          }`}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                {isActive ? (
                  <div className={`w-16 h-16 bg-gradient-to-br ${
                    plan === 'daily' ? 'from-blue-600 to-blue-700' :
                    plan === 'weekly' ? 'from-indigo-600 to-indigo-700' :
                    plan === 'monthly' ? 'from-purple-600 to-purple-700' :
                    'from-emerald-600 to-emerald-700'
                  } rounded-xl flex items-center justify-center shadow-lg`}>
                    <PlanIcon className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl flex items-center justify-center shadow-lg">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {isActive ? PLAN_NAMES[plan] || "Active Subscription" : "No Active Subscription"}
                    </h2>
                    {isActive && !isCancelled && (
                      <Badge className="bg-green-600 dark:bg-green-500 text-white">
                        Active
                      </Badge>
                    )}
                    {isCancelled && (
                      <Badge className="bg-yellow-600 dark:bg-yellow-500 text-white">
                        Cancelling
                      </Badge>
                    )}
                  </div>

                  {isActive && (
                    <>
                      <p className="text-lg text-slate-700 dark:text-slate-300 mb-3">
                        {PLAN_PRICES[plan]}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {isCancelled ? "Active until" : "Renews on"}: {new Date(user.subscription_end_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        {user.subscription_start_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span className="text-slate-600 dark:text-slate-400">
                              Started: {new Date(user.subscription_start_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {!isActive && (
                    <p className="text-slate-600 dark:text-slate-400">
                      Subscribe to unlock unlimited resume creation, AI improvements, and all premium features.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isActive && !isCancelled && (
                  <>
                    <Button
                      onClick={handleUpgrade}
                      variant="outline"
                      className="border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                    >
                      Change Plan
                    </Button>
                    <Button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      variant="outline"
                      className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        "Cancel Subscription"
                      )}
                    </Button>
                  </>
                )}

                {isCancelled && (
                  <Button
                    onClick={handleReactivate}
                    disabled={cancelling}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reactivating...
                      </>
                    ) : (
                      "Reactivate Subscription"
                    )}
                  </Button>
                )}

                {!isActive && (
                  <Button
                    onClick={() => navigate(createPageUrl("Pricing"))}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    View Plans
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Cancellation Notice */}
          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      Subscription Cancellation Scheduled
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Your subscription will remain active until <strong>{new Date(user.subscription_end_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</strong>. After this date, you won't be charged again and your access to premium features will end. You can reactivate anytime before then.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Plan Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                {isActive ? "Your Plan Includes" : "Plan Features"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Unlimited resume creation and storage",
                  "AI-powered resume improvements",
                  "ATS compatibility analysis",
                  "Multiple resume versions tracking",
                  "Cover letter generation",
                  "Professional resume templates",
                  "Export to PDF/DOCX formats"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      isActive ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"
                    }`} />
                    <span className={isActive ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
}