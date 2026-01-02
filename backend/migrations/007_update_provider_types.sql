-- Update ai_providers table to support all provider types used by the application
-- Remove the restrictive CHECK constraint and allow any provider type

-- Drop the old constraint
ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_provider_type_check;

-- Add a more permissive constraint that includes all supported provider types
ALTER TABLE ai_providers ADD CONSTRAINT ai_providers_provider_type_check
  CHECK (provider_type IN (
    'openai',
    'anthropic',
    'grok',
    'custom',
    'gemini',
    'openrouter',
    'groq',
    'perplexity',
    'deepseek',
    'mistral'
  ));
