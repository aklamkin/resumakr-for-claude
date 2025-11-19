import React from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { NotificationPopup } from "../components/ui/notification";
import { motion } from "framer-motion";
import CouponCodeManager from "../components/coupon/CouponCodeManager";

export default function SettingsCodes() {
  const [notification, setNotification] = React.useState({ open: false, title: "", message: "", type: "success" });
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    base44.auth.me().then(currentUser => {
      setUser(currentUser);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="p-12 border-2 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Access Denied</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Settings are only available to administrators.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Coupon Codes</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage discount codes for subscriptions</p>
        </motion.div>

        <CouponCodeManager showNotification={showNotification} />
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}