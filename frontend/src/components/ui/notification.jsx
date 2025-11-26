import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/apiClient";

export function NotificationPopup({ open, onClose, title, message, type = "success" }) {
  const [settings, setSettings] = React.useState({
    enabled: true,
    duration: 4000
  });

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const cachedSettings = localStorage.getItem('app_notification_settings');
        if (cachedSettings) {
          setSettings(JSON.parse(cachedSettings));
        } else {
          const appSettings = await api.entities.AppSettings.list();
          const enabledSetting = appSettings.find(s => s.setting_key === 'notifications_enabled');
          const durationSetting = appSettings.find(s => s.setting_key === 'notification_duration');
          
          const newSettings = {
            enabled: enabledSetting ? enabledSetting.setting_value === 'true' : true,
            duration: parseInt(durationSetting?.setting_value || '4000')
          };
          setSettings(newSettings);
          localStorage.setItem('app_notification_settings', JSON.stringify(newSettings));
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  React.useEffect(() => {
    if (open && settings.enabled) {
      const timer = setTimeout(() => {
        onClose();
      }, settings.duration);
      return () => clearTimeout(timer);
    } else if (open && !settings.enabled) {
      onClose();
    }
  }, [open, onClose, settings]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case "info":
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      default:
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
    }
  };

  const getBarColor = () => {
    switch (type) {
      case "success":
        return "bg-green-600 dark:bg-green-500";
      case "error":
        return "bg-red-600 dark:bg-red-500";
      case "info":
        return "bg-blue-600 dark:bg-blue-500";
      default:
        return "bg-green-600 dark:bg-green-500";
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-100 dark:bg-green-900/30";
      case "error":
        return "bg-red-100 dark:bg-red-900/30";
      case "info":
        return "bg-blue-100 dark:bg-blue-900/30";
      default:
        return "bg-green-100 dark:bg-green-900/30";
    }
  };

  if (!settings.enabled) {
    return null;
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 pointer-events-none" role="status" aria-live="polite" aria-atomic="true">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 max-w-md mx-4 pointer-events-auto overflow-hidden"
            tabIndex={-1}
          >
            <div className={'h-1 ' + getBarColor()} />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + getIconBgColor()}>
                  {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {title}
                    </h3>
                  )}
                  <p className="text-slate-600 dark:text-slate-400">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  type = "danger",
  showCancel = true 
}) {
  return (
    <AnimatePresence>
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              {title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {message}
            </p>
            <div className="flex gap-3 justify-end">
              {showCancel && (
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                onClick={() => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                className={type === "danger" ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
