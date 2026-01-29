import { z } from 'zod';

// ============================================
// Common/Reusable Schemas
// ============================================

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim()
  .max(255, 'Email must be 255 characters or less');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

// For routes using integer IDs (like subscription plans)
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

// For routes using UUID IDs (like resumes, users)
export const uuidParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID')
});

// Safe string with trimming (HTML encoding is handled by React at render time)
// Note: We don't HTML-encode on input because:
// 1. React automatically escapes strings in JSX
// 2. Encoding on input causes issues when data is used in non-HTML contexts (JSON, exports, etc.)
// 3. Double-encoding can occur if output libraries also encode
export const safeString = (maxLength = 1000) =>
  z.string().max(maxLength).transform(str => str.trim());

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().max(100, 'Name must be 100 characters or less').optional().default('')
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  new_password: passwordSchema
});

export const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
  is_subscribed: z.boolean().optional(),
  subscription_plan: z.string().max(50).optional(),
  subscription_end_date: z.string().datetime().optional().nullable()
});

// ============================================
// Resume Schemas
// ============================================

export const createResumeSchema = z.object({
  title: safeString(200).refine(val => val.trim().length > 0, 'Title is required'),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  source_type: z.enum(['manual', 'upload', 'uploaded', 'ai']).optional().default('manual'),
  file_url: z.string().max(500).nullish(),
  last_edited_step: z.string().max(50).nullish()
});

export const updateResumeSchema = z.object({
  title: safeString(200).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  source_type: z.enum(['manual', 'upload', 'uploaded', 'ai']).optional(),
  file_url: z.string().max(500).nullish(),
  last_edited_step: z.string().max(50).nullish()
});

// Personal info schema for resume data
export const personalInfoSchema = z.object({
  full_name: z.string().max(100).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().max(30).optional().default(''),
  location: z.string().max(200).optional().default(''),
  linkedin: z.string().url().optional().or(z.literal('')).default(''),
  website: z.string().url().optional().or(z.literal('')).default(''),
  github: z.string().url().optional().or(z.literal('')).default('')
}).optional();

// Work experience entry
const workExperienceEntrySchema = z.object({
  company: z.string().max(200).optional().default(''),
  position: z.string().max(200).optional().default(''),
  location: z.string().max(200).optional().default(''),
  start_date: z.string().max(20).optional().default(''),
  end_date: z.string().max(20).optional().default(''),
  current: z.boolean().optional().default(false),
  responsibilities: z.array(z.string().max(2000)).optional().default([])
});

// Education entry
const educationEntrySchema = z.object({
  institution: z.string().max(200).optional().default(''),
  degree: z.string().max(200).optional().default(''),
  field_of_study: z.string().max(200).optional().default(''),
  location: z.string().max(200).optional().default(''),
  graduation_date: z.string().max(20).optional().default(''),
  gpa: z.string().max(20).optional().default(''),
  honors: z.string().max(500).optional().default('')
});

// Skills category
const skillsCategorySchema = z.object({
  category: z.string().max(100).optional().default('Skills'),
  items: z.array(z.string().max(100)).optional().default([])
});

// Certification entry
const certificationEntrySchema = z.object({
  name: z.string().max(200).optional().default(''),
  issuer: z.string().max(200).optional().default(''),
  date_obtained: z.string().max(20).optional().default(''),
  expiry_date: z.string().max(20).optional().default(''),
  credential_id: z.string().max(100).optional().default('')
});

// Project entry
const projectEntrySchema = z.object({
  name: z.string().max(200).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  technologies: z.array(z.string().max(100)).optional().default([]),
  url: z.string().url().optional().or(z.literal('')).default('')
});

// Language entry
const languageEntrySchema = z.object({
  language: z.string().max(100).optional().default(''),
  proficiency: z.string().max(50).optional().default('')
});

// Full resume data schema
export const resumeDataSchema = z.object({
  resume_id: z.number().int().positive().optional(),
  personal_info: personalInfoSchema.optional(),
  professional_summary: z.string().max(5000).optional().default(''),
  work_experience: z.array(workExperienceEntrySchema).optional().default([]),
  education: z.array(educationEntrySchema).optional().default([]),
  skills: z.array(skillsCategorySchema).optional().default([]),
  certifications: z.array(certificationEntrySchema).optional().default([]),
  projects: z.array(projectEntrySchema).optional().default([]),
  languages: z.array(languageEntrySchema).optional().default([]),
  job_description: z.string().max(10000).optional().default(''),
  template_id: z.string().max(50).optional().default('modern'),
  cover_letter: z.string().max(10000).optional().default(''),
  ai_metadata: z.record(z.unknown()).optional().default({}),
  ats_analysis_results: z.record(z.unknown()).optional().default({})
});

export const updateResumeDataSchema = resumeDataSchema.partial();

// ============================================
// Subscription & Payment Schemas
// ============================================

export const createPlanSchema = z.object({
  name: safeString(100).refine(val => val.trim().length > 0, 'Name is required'),
  description: z.string().max(1000).optional().default(''),
  price: z.number().min(0, 'Price must be non-negative'),
  billing_period: z.enum(['monthly', 'yearly', 'one-time']).optional().default('monthly'),
  features: z.record(z.unknown()).optional().default({}),
  is_active: z.boolean().optional().default(true),
  stripe_price_id: z.string().max(100).optional()
});

export const updatePlanSchema = createPlanSchema.partial();

export const checkoutSchema = z.object({
  plan_id: z.coerce.number().int().positive('Plan ID is required'),
  coupon_code: z.string().max(50).optional()
});

// ============================================
// Coupon Schemas
// ============================================

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Discount value must be positive'),
  max_uses: z.number().int().positive().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  applicable_plans: z.array(z.number().int().positive()).optional().default([])
});

export const updateCouponSchema = createCouponSchema.partial();

export const validateCouponSchema = z.object({
  coupon_code: z.string().min(1, 'Coupon code is required'),
  plan_id: z.coerce.number().int().positive().optional()
});

// ============================================
// AI Provider Schemas
// ============================================

export const createProviderSchema = z.object({
  name: safeString(100).refine(val => val.trim().length > 0, 'Name is required'),
  provider_type: z.enum(['openai', 'gemini', 'openrouter', 'groq', 'perplexity', 'anthropic']),
  api_key: z.string().min(1, 'API key is required').max(500),
  model_name: z.string().max(100).optional(),
  is_active: z.boolean().optional().default(true),
  is_default: z.boolean().optional().default(false),
  config: z.record(z.unknown()).optional().default({})
});

export const updateProviderSchema = createProviderSchema.partial();

export const testProviderSchema = z.object({
  provider_type: z.enum(['openai', 'gemini', 'openrouter', 'groq', 'perplexity', 'anthropic']),
  api_key: z.string().min(1, 'API key is required'),
  model_name: z.string().optional()
});

// ============================================
// Custom Prompt Schemas
// ============================================

export const createPromptSchema = z.object({
  name: safeString(100).refine(val => val.trim().length > 0, 'Name is required'),
  prompt_type: z.string().max(50),
  prompt_text: z.string().min(1).max(10000),
  is_active: z.boolean().optional().default(true),
  variables: z.array(z.string().max(50)).optional().default([])
});

export const updatePromptSchema = createPromptSchema.partial();

// ============================================
// User Management Schemas (Admin)
// ============================================

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  full_name: z.string().max(100).optional().default(''),
  role: z.enum(['user', 'admin']).optional().default('user'),
  is_subscribed: z.boolean().optional().default(false)
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  full_name: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  is_subscribed: z.boolean().optional(),
  subscription_plan: z.string().max(50).optional().nullable(),
  subscription_end_date: z.string().datetime().optional().nullable()
});

// ============================================
// AI Invocation Schemas
// ============================================

export const invokeAISchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000),
  system_prompt: z.string().max(10000).optional(),
  provider_id: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(100000).optional()
});

export const analyzeATSSchema = z.object({
  job_description: z.string().min(1, 'Job description is required').max(20000),
  resume_data: z.record(z.unknown())
});

// ============================================
// File Upload Schemas
// ============================================

export const extractFileSchema = z.object({
  file_url: z.string().min(1, 'File URL is required')
});

// ============================================
// Pagination & Query Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().max(50).optional()
});

export const resumeQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  source_type: z.enum(['manual', 'upload', 'ai']).optional()
});

// ============================================
// Settings Schemas
// ============================================

export const updateSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional()
});

// ============================================
// Version Schemas
// ============================================

export const createVersionSchema = z.object({
  resume_id: z.number().int().positive(),
  version_name: safeString(100).optional(),
  snapshot_data: z.record(z.unknown()),
  notes: z.string().max(1000).optional()
});

export const updateVersionSchema = z.object({
  version_name: safeString(100).optional(),
  notes: z.string().max(1000).optional()
});
