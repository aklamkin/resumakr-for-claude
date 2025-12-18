-- Add missing columns to ai_providers table to support enhanced provider configuration

-- Add api_endpoint column (stores custom API endpoint URLs)
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS api_endpoint TEXT;

-- Add model_name column (stores the specific model to use, e.g., 'gpt-4', 'claude-3')
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);

-- Add config column (stores additional configuration as JSON)
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Update existing rows to have empty config if null
UPDATE ai_providers SET config = '{}'::jsonb WHERE config IS NULL;
