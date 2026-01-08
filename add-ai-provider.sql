-- Add OpenAI as the default AI provider
-- This uses the API key from your .env file

INSERT INTO ai_providers (
  name,
  provider_type,
  api_key,
  api_endpoint,
  model_name,
  config,
  is_active,
  is_default
) VALUES (
  'OpenAI',
  'openai',
  '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',
  'https://api.openai.com/v1',
  'gpt-4o-mini',
  '{"api_key": "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"}'::jsonb,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  is_active = true,
  is_default = true;
