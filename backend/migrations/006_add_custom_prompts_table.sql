-- Create custom_prompts table for AI prompt management

CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type VARCHAR(100),
  provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, created_by)
);

CREATE INDEX idx_custom_prompts_created_by ON custom_prompts(created_by);
CREATE INDEX idx_custom_prompts_prompt_type ON custom_prompts(prompt_type);
CREATE INDEX idx_custom_prompts_is_active ON custom_prompts(is_active);
