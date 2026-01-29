import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Save, Settings as SettingsIcon, Bell, Clock, Layout, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Known interface settings with human-readable metadata
const KNOWN_SETTINGS = {
  notifications_enabled: {
    label: 'Enable Notifications',
    description: 'Show popup notifications for important events and updates across the app',
    type: 'boolean',
    defaultValue: 'true',
    section: 'notifications',
  },
  notification_duration: {
    label: 'Notification Duration (ms)',
    description: 'How long popup notifications stay visible before auto-dismissing. Default: 4000ms (4 seconds)',
    type: 'number',
    defaultValue: '4000',
    min: 1000,
    max: 30000,
    step: 500,
    section: 'notifications',
  },
  default_theme: {
    label: 'Default Theme',
    description: 'The color theme new users see when they first visit the app. Users can override this in their Account Settings.',
    type: 'select',
    defaultValue: 'system',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System (follow OS)' },
    ],
    section: 'appearance',
  },
  landing_animations_enabled: {
    label: 'Landing Page Animations',
    description: 'Enable animated transitions and effects on the public landing page. Disable to improve performance on slower devices.',
    type: 'boolean',
    defaultValue: 'true',
    section: 'appearance',
  },
  max_resumes_per_user: {
    label: 'Max Resumes Per User',
    description: 'Maximum number of resumes a single user can create. Set to 0 for unlimited.',
    type: 'number',
    defaultValue: '50',
    min: 0,
    max: 1000,
    step: 1,
    section: 'limits',
  },
  maintenance_mode: {
    label: 'Maintenance Mode',
    description: 'When enabled, non-admin users see a maintenance page instead of the app. Use during deployments or database migrations.',
    type: 'boolean',
    defaultValue: 'false',
    section: 'system',
  },
};

const SECTIONS = [
  { key: 'notifications', label: 'Notifications', icon: Bell, description: 'Control popup notification behavior for all users' },
  { key: 'appearance', label: 'Appearance & Layout', icon: Layout, description: 'Default look and feel of the application' },
  { key: 'limits', label: 'Limits', icon: Shield, description: 'Resource limits applied to user accounts' },
  { key: 'system', label: 'System', icon: SettingsIcon, description: 'System-wide operational settings' },
];

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [editValues, setEditValues] = useState({});
  const [error, setError] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  const fetchSettings = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await adminApi.settings.list();
      setSettings(res.data);
      const values = {};
      res.data.forEach((s) => {
        values[s.setting_key] = s.setting_value;
      });
      // Fill in defaults for known settings that don't exist in DB yet
      Object.entries(KNOWN_SETTINGS).forEach(([key, meta]) => {
        if (!(key in values)) {
          values[key] = meta.defaultValue;
        }
      });
      setEditValues(values);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings(true);
  }, []);

  const handleSave = async (key) => {
    const meta = KNOWN_SETTINGS[key];
    const value = editValues[key];
    const settingType = meta?.type === 'select' ? 'string' : (meta?.type || 'string');

    setSaving((prev) => ({ ...prev, [key]: true }));
    setSuccessKey(null);
    try {
      await adminApi.settings.update(key, {
        setting_value: String(value),
        setting_type: settingType === 'number' ? 'number' : (settingType === 'boolean' ? 'boolean' : 'string'),
      });
      await fetchSettings();
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save setting');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggle = async (key) => {
    const currentValue = editValues[key];
    const newValue = currentValue === 'true' ? 'false' : 'true';
    setEditValues((prev) => ({ ...prev, [key]: newValue }));
    setSaving((prev) => ({ ...prev, [key]: true }));
    setSuccessKey(null);
    try {
      await adminApi.settings.update(key, {
        setting_value: newValue,
        setting_type: 'boolean',
      });
      await fetchSettings();
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update setting');
      setEditValues((prev) => ({ ...prev, [key]: currentValue }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <h1 className="text-2xl font-bold">Interface Settings</h1>
          <p className="text-muted-foreground text-sm">Configure application interface for all users</p>
        </div>
        <div className="p-6 text-red-600">{error}</div>
      </div>
    );
  }

  // Separate known settings by section, and collect unknown ones
  const knownKeys = new Set(Object.keys(KNOWN_SETTINGS));
  const unknownSettings = settings.filter((s) => !knownKeys.has(s.setting_key));

  const renderSettingField = (key) => {
    const meta = KNOWN_SETTINGS[key];
    if (!meta) return null;

    if (meta.type === 'boolean') {
      return (
        <div
          key={key}
          className="flex items-center justify-between p-4 border rounded-lg bg-slate-50"
        >
          <div className="flex-1 mr-4">
            <Label className="font-medium">{meta.label}</Label>
            <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {successKey === key && (
              <span className="text-xs text-green-600 font-medium">Saved</span>
            )}
            <Switch
              checked={editValues[key] === 'true'}
              onCheckedChange={() => handleToggle(key)}
              disabled={saving[key]}
            />
          </div>
        </div>
      );
    }

    if (meta.type === 'number') {
      return (
        <div key={key} className="p-4 border rounded-lg bg-slate-50 space-y-2">
          <Label className="font-medium">{meta.label}</Label>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
          <div className="flex gap-3 items-center">
            <Input
              type="number"
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={editValues[key] || ''}
              onChange={(e) =>
                setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="max-w-[200px]"
            />
            <Button
              onClick={() => handleSave(key)}
              disabled={saving[key]}
              size="sm"
            >
              {saving[key] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
            {successKey === key && (
              <span className="text-xs text-green-600 font-medium">Saved</span>
            )}
          </div>
        </div>
      );
    }

    if (meta.type === 'select') {
      return (
        <div key={key} className="p-4 border rounded-lg bg-slate-50 space-y-2">
          <Label className="font-medium">{meta.label}</Label>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
          <div className="flex gap-3 items-center">
            <select
              value={editValues[key] || meta.defaultValue}
              onChange={(e) =>
                setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {meta.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              onClick={() => handleSave(key)}
              disabled={saving[key]}
              size="sm"
            >
              {saving[key] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
            {successKey === key && (
              <span className="text-xs text-green-600 font-medium">Saved</span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Interface Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure application interface and behavior for all users
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Known settings grouped by section */}
        {SECTIONS.map((section) => {
          const sectionKeys = Object.entries(KNOWN_SETTINGS)
            .filter(([, meta]) => meta.section === section.key)
            .map(([key]) => key);

          if (sectionKeys.length === 0) return null;

          const Icon = section.icon;
          return (
            <Card key={section.key} className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">{section.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
              <div className="space-y-4">
                {sectionKeys.map((key) => renderSettingField(key))}
              </div>
            </Card>
          );
        })}

        {/* Unknown / custom settings from DB (generic key-value editor) */}
        {unknownSettings.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Other Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Additional settings stored in the database
            </p>
            <div className="space-y-4">
              {unknownSettings.map((setting) => {
                if (setting.setting_type === 'boolean') {
                  return (
                    <div
                      key={setting.setting_key}
                      className="flex items-center justify-between p-4 border rounded-lg bg-slate-50"
                    >
                      <div>
                        <Label className="font-medium">{setting.setting_key}</Label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={editValues[setting.setting_key] === 'true'}
                        onCheckedChange={() => handleToggle(setting.setting_key)}
                        disabled={saving[setting.setting_key]}
                      />
                    </div>
                  );
                }
                return (
                  <div key={setting.setting_key} className="p-4 border rounded-lg bg-slate-50 space-y-2">
                    <Label className="font-medium">{setting.setting_key}</Label>
                    {setting.description && (
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    )}
                    <div className="flex gap-3">
                      <Input
                        value={editValues[setting.setting_key] || ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.setting_key]: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleSave(setting.setting_key)}
                        disabled={saving[setting.setting_key]}
                        size="sm"
                      >
                        {saving[setting.setting_key] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type: {setting.setting_type || 'string'}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
