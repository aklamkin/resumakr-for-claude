import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { NotificationPopup } from '../components/ui/notification';
import api from '../api/apiClient';

export default function SettingsInterface() {
  const queryClient = useQueryClient();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationDuration, setNotificationDuration] = useState(4000);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });

  const showNotification = (message, title = "", type = "success") => {
    if (notificationsEnabled) {
      setNotification({ open: true, title, message, type });
    }
  };

  const { isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await api.entities.AppSettings.list();
      const enabledSetting = settings.find(s => s.setting_key === 'notifications_enabled');
      const durationSetting = settings.find(s => s.setting_key === 'notification_duration');

      if (enabledSetting) {
        setNotificationsEnabled(enabledSetting.setting_value === 'true');
      }
      if (durationSetting) {
        setNotificationDuration(parseInt(durationSetting.setting_value));
      }

      return settings;
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }) =>
      api.entities.AppSettings.update(key, {
        setting_value: String(value),
        setting_type: typeof value === 'boolean' ? 'boolean' : 'number'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['app-settings']);
      localStorage.removeItem("app_notification_settings");
      showNotification('Settings saved successfully', 'Success', 'success');
    },
    onError: (error) => {
      showNotification(error.response?.data?.error || 'Failed to save settings', 'Error', 'error');
    }
  });

  const handleNotificationsToggle = (enabled) => {
    setNotificationsEnabled(enabled);
    updateSettingMutation.mutate({ key: 'notifications_enabled', value: enabled });
  };

  const handleDurationChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setNotificationDuration(value);
  };

  const handleDurationSave = () => {
    updateSettingMutation.mutate({ key: 'notification_duration', value: notificationDuration });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Interface Settings</CardTitle>
          <CardDescription>
            Configure application interface preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notifications</h3>

            <div className="flex items-center justify-between p-4 border rounded-lg dark:border-slate-700">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled">Enable Notifications</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Show notifications for important events and updates
                </p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
                disabled={updateSettingMutation.isPending}
              />
            </div>

            <div className="p-4 border rounded-lg dark:border-slate-700 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-duration">Notification Duration (milliseconds)</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  How long notifications stay visible before auto-dismissing
                </p>
              </div>
              <div className="flex gap-3">
                <Input
                  id="notification-duration"
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={notificationDuration}
                  onChange={handleDurationChange}
                  className="max-w-[200px]"
                />
                <Button
                  onClick={handleDurationSave}
                  disabled={updateSettingMutation.isPending}
                >
                  {updateSettingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
