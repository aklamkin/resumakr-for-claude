#!/bin/bash

echo "Migrating all base44 references to api..."

# Files to update
FILES=(
  "frontend/src/api/entities.js"
  "frontend/src/api/functions.js"
  "frontend/src/api/integrations.js"
  "frontend/src/components/admin/SubscriptionPlanManager.jsx"
  "frontend/src/components/coupon/CouponCodeManager.jsx"
  "frontend/src/components/help/FAQManager.jsx"
  "frontend/src/components/help/HelpConfigManager.jsx"
  "frontend/src/components/hooks/useAIImprovement.jsx"
  "frontend/src/components/hooks/useResumeData.jsx"
  "frontend/src/components/hooks/useVersionControl.jsx"
  "frontend/src/components/resume/CoverLetterModal.jsx"
  "frontend/src/pages/AdminMonetization.jsx"
  "frontend/src/pages/BuildWizard.jsx"
  "frontend/src/pages/Documentation.jsx"
  "frontend/src/pages/Help.jsx"
  "frontend/src/pages/Home.jsx"
  "frontend/src/pages/MyResumes.jsx"
  "frontend/src/pages/Pricing.jsx"
  "frontend/src/pages/ResumeReview.jsx"
  "frontend/src/pages/SettingsCampaigns.jsx"
  "frontend/src/pages/SettingsCodes.jsx"
  "frontend/src/pages/SettingsHelp.jsx"
  "frontend/src/pages/SettingsPlans.jsx"
  "frontend/src/pages/SettingsPrompts.jsx"
  "frontend/src/pages/SettingsProviders.jsx"
  "frontend/src/pages/SubscriptionManagement.jsx"
  "frontend/src/pages/UploadResume.jsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    # Replace import statement
    sed -i 's/import { base44 } from "@\/api\/base44Client"/import api from "@\/api\/apiClient"/g' "$file"
    sed -i 's/import {base44} from "@\/api\/base44Client"/import api from "@\/api\/apiClient"/g' "$file"
    # Replace all base44. references with api.
    sed -i 's/base44\./api\./g' "$file"
  fi
done

echo "✓ Migration complete!"
