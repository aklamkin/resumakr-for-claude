-- Seed interface settings that the admin can control via the config app
INSERT INTO app_settings (setting_key, setting_value, setting_type) VALUES
  ('notifications_enabled', 'true', 'boolean'),
  ('notification_duration', '4000', 'number'),
  ('default_theme', 'system', 'string'),
  ('landing_animations_enabled', 'true', 'boolean'),
  ('max_resumes_per_user', '50', 'number'),
  ('maintenance_mode', 'false', 'boolean')
ON CONFLICT (setting_key) DO NOTHING;
