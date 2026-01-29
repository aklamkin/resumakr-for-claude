-- Migration: Enhance custom_prompts for comprehensive AI prompt management
-- Adds system prompt support, configurable parameters, and seeds all 9 AI prompt types

-- Add new columns
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2);
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS max_tokens INTEGER;
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS available_variables JSONB DEFAULT '[]';

-- Make created_by nullable for system prompts
ALTER TABLE custom_prompts ALTER COLUMN created_by DROP NOT NULL;

-- System prompts are unique by prompt_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_prompts_type
  ON custom_prompts (prompt_type) WHERE is_system = true;

-- Seed all 9 system prompt types with exact current hardcoded prompts

-- 1. Resume Parsing
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Resume Parsing',
  'Extracts structured resume data from uploaded PDF/DOCX files. Used during resume upload.',
  'resume_parsing',
  'You are a JSON-only output system. Return ONLY valid, parseable JSON with no markdown, no code blocks, no explanations. Every field must be filled with either extracted data or an empty string/array.',
  E'You are a professional resume parser. Your task is to extract ALL information from this resume with extreme accuracy and attention to detail.\n\n===== RESUME TEXT =====\n{resume_text}\n=======================\n\nEXTRACTION INSTRUCTIONS:\n\n1. PERSONAL INFORMATION:\n   - Extract: full_name, email, phone, location, linkedin, website, github\n   - For LinkedIn/website/github: extract full URLs if present, or just usernames\n   - Location: City, State format preferred\n\n2. PROFESSIONAL SUMMARY:\n   - Extract the complete professional summary/objective section\n   - If multiple paragraphs, combine them with proper spacing\n   - Do NOT summarize - extract verbatim\n\n3. WORK EXPERIENCE (CRITICAL - BE THOROUGH):\n   - Extract EVERY job position, even if briefly mentioned\n   - For EACH position extract:\n     * company: Company name exactly as written\n     * position: Job title exactly as written\n     * location: City, State if available\n     * start_date: Convert to "Month Year" format (e.g., "January 2020", "Jan 2020")\n     * end_date: Convert to "Month Year" format, or leave empty if current\n     * current: true if currently working there, false otherwise\n     * responsibilities: Extract EVERY bullet point as separate array item\n   - For responsibilities:\n     * Each bullet point is a separate string in the array\n     * Remove bullet characters (\\u2022, -, *) but keep the full text\n     * Preserve exact wording - do NOT paraphrase or shorten\n     * Include metrics, percentages, numbers exactly as shown\n\n4. EDUCATION:\n   - Extract EVERY degree/certification program\n   - For EACH education entry extract:\n     * institution: School/University name exactly as written\n     * degree: Full degree name (e.g., "Bachelor of Science")\n     * field_of_study: Major/field (e.g., "Computer Science")\n     * location: City, State if available\n     * graduation_date: Month and Year if available\n     * gpa: If mentioned\n     * honors: Dean''s List, Summa Cum Laude, etc. if mentioned\n\n5. SKILLS:\n   - Group skills by category (e.g., "Technical Skills", "Languages", "Tools")\n   - For EACH category extract:\n     * category: The category name\n     * items: Array of individual skills\n   - Split comma-separated skills into array items\n   - Extract ALL skills mentioned, don''t skip any\n\n6. CERTIFICATIONS:\n   - Extract EVERY certification with name, issuer, dates if available\n\n7. PROJECTS:\n   - Extract personal/professional projects with descriptions and technologies\n\n8. LANGUAGES:\n   - Extract spoken languages and proficiency levels\n\nCRITICAL FORMAT REQUIREMENTS:\n- Return ONLY valid JSON, no markdown, no code blocks, no explanations\n- Use double quotes for all strings\n- Use empty strings "" for missing data, NEVER null\n- Dates: Use "Month Year" format (e.g., "January 2020", "Jan 2020")\n- Arrays: Each item properly separated by commas\n- Ensure all brackets and braces are properly closed\n- Escape special characters in strings\n\nJSON STRUCTURE TO RETURN:\n{\n  "personal_info": {\n    "full_name": "",\n    "email": "",\n    "phone": "",\n    "location": "",\n    "linkedin": "",\n    "website": "",\n    "github": ""\n  },\n  "professional_summary": "",\n  "work_experience": [\n    {\n      "company": "",\n      "position": "",\n      "location": "",\n      "start_date": "Month Year",\n      "end_date": "Month Year",\n      "current": false,\n      "responsibilities": ["responsibility 1", "responsibility 2"]\n    }\n  ],\n  "education": [\n    {\n      "institution": "",\n      "degree": "",\n      "field_of_study": "",\n      "location": "",\n      "graduation_date": "Month Year",\n      "gpa": "",\n      "honors": ""\n    }\n  ],\n  "skills": [\n    {\n      "category": "Category Name",\n      "items": ["skill1", "skill2", "skill3"]\n    }\n  ],\n  "certifications": [\n    {\n      "name": "",\n      "issuer": "",\n      "date_obtained": "",\n      "expiry_date": "",\n      "credential_id": ""\n    }\n  ],\n  "projects": [\n    {\n      "name": "",\n      "description": "",\n      "technologies": ["tech1", "tech2"],\n      "url": ""\n    }\n  ],\n  "languages": [\n    {\n      "language": "",\n      "proficiency": ""\n    }\n  ]\n}\n\nBE EXTREMELY THOROUGH. Extract EVERYTHING. Do NOT skip or summarize ANY information.',
  0.0,
  8000,
  true,
  true,
  '[{"name": "resume_text", "description": "The raw text extracted from the uploaded PDF/DOCX file"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 2. ATS Analysis (Free)
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'ATS Analysis (Free)',
  'Simplified ATS compatibility analysis for free-tier users. Returns score only.',
  'ats_analysis_free',
  'You are an expert ATS system analyst.',
  E'Analyze this resume against the job description for ATS compatibility. Provide ONLY a compatibility score.\n\nJob Description:\n{job_description}\n\nResume:\n{resume_text}\n\nRespond with JSON: {"score": <0-100>}\nOnly the score, nothing else.',
  0.3,
  200,
  true,
  true,
  '[{"name": "job_description", "description": "The target job description to analyze against"}, {"name": "resume_text", "description": "The resume content formatted as text"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. ATS Analysis (Paid)
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'ATS Analysis (Paid)',
  'Full ATS compatibility analysis for paid users. Returns score, keywords, and recommendations.',
  'ats_analysis_paid',
  'You are an expert ATS system analyst.',
  E'Analyze this resume against the job description for ATS compatibility.\n\nJob Description:\n{job_description}\n\nResume:\n{resume_text}\n\nInstructions:\n1. Extract up to 20 important keywords/phrases from the job description (keywords_extracted_jd)\n2. For each keyword in keywords_extracted_jd, check if it appears (or a close equivalent) in the resume\n3. keywords_found_resume = keywords from keywords_extracted_jd that ARE in the resume\n4. missing_keywords = keywords from keywords_extracted_jd that are NOT in the resume\n5. IMPORTANT: keywords_found_resume + missing_keywords must equal keywords_extracted_jd (no overlap, no extras)\n6. score = percentage of keywords_extracted_jd found in resume\n\nRespond with ONLY valid JSON (no markdown):\n{\n  "score": <0-100>,\n  "keywords_extracted_jd": ["keyword1", ...],\n  "keywords_found_resume": ["subset of above found in resume"],\n  "missing_keywords": ["subset of above NOT in resume"],\n  "recommendations": ["one sentence each, max 5"]\n}',
  0.3,
  8000,
  true,
  true,
  '[{"name": "job_description", "description": "The target job description to analyze against"}, {"name": "resume_text", "description": "The resume content formatted as text"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 4. Improve Bullets
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Improve Bullets',
  'Improves work experience bullet points. Used when clicking the improve button on individual responsibilities.',
  'improve_bullets',
  'Professional resume writer. Improve text: same length (±20%), keep facts exact, use action verbs, return improved text only.',
  E'Improve the following resume section. Keep it roughly the same length.\n\n{ats_instructions}\n\nContent:\n{section_content}',
  0.3,
  500,
  true,
  true,
  '[{"name": "section_content", "description": "The bullet point(s) to improve"}, {"name": "missing_keywords", "description": "Comma-separated missing ATS keywords to try to incorporate"}, {"name": "ats_instructions", "description": "Auto-generated ATS optimization instructions (built from missing_keywords)"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 5. Improve Summary
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Improve Summary',
  'Improves the professional summary section. Used when clicking improve on the summary from the review page.',
  'improve_summary',
  'Professional resume writer. Improve text: same length (±20%), keep facts exact, use action verbs, return improved text only.',
  E'Improve the following resume section. Keep it roughly the same length.\n\n{ats_instructions}\n\nContent:\n{section_content}',
  0.3,
  500,
  true,
  true,
  '[{"name": "section_content", "description": "The professional summary text to improve"}, {"name": "missing_keywords", "description": "Comma-separated missing ATS keywords to try to incorporate"}, {"name": "ats_instructions", "description": "Auto-generated ATS optimization instructions (built from missing_keywords)"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 6. Improve Skills
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Improve Skills',
  'Refines skill names within a category. Used when clicking improve on a skills section.',
  'improve_skills',
  'Professional resume writer. Refine skills: keep same length (±20%), no new skills, no duplicates, pipe-separated output only. Make professional/industry-standard.',
  E'Refine ONLY the wording/naming of these skills for THIS SPECIFIC category. Output must be roughly the same size as input. Do NOT add new skills. Do NOT create duplicates. Keep each skill specific and technical. Return the refined list separated by pipe character (|).\n\n{ats_instructions}\n\nContent:\n{section_content}',
  0.3,
  500,
  true,
  true,
  '[{"name": "section_content", "description": "Pipe-separated list of skills in this category"}, {"name": "missing_keywords", "description": "Comma-separated missing ATS keywords to try to incorporate"}, {"name": "ats_instructions", "description": "Auto-generated ATS optimization instructions (built from missing_keywords)"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 7. Cover Letter (Short)
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Cover Letter (Short)',
  'Generates a concise cover letter (3-4 paragraphs, 250-300 words). Used in the cover letter modal.',
  'cover_letter_short',
  'You are a professional cover letter writer.',
  E'You are a professional cover letter writer. Create a compelling cover letter based on the candidate''s resume and the job description provided.\n\nCRITICAL INSTRUCTIONS:\n1. NEVER make up information or hallucinate details\n2. Only use information explicitly provided in the resume\n3. Be professional, enthusiastic, and concise\n4. Address how the candidate''s actual experience matches the job requirements\n5. Do NOT include salutation, date, or closing - ONLY the body paragraphs\n6. Start directly with the first paragraph\n\nResume Information:\n{resume_summary}\n\n{job_description_section}\n\nWrite a concise, impactful cover letter that:\n- Highlights the candidate''s relevant experience and skills\n- Shows enthusiasm for the position\n- Explains why they''re a good fit\n- Maintains a professional tone\n- Keep it to 3-4 short paragraphs (250-300 words maximum)\n\nReturn ONLY the body paragraphs, no salutation, no date, no closing signature.',
  0.7,
  2000,
  true,
  true,
  '[{"name": "resume_summary", "description": "Formatted resume summary with name, experience, skills, education"}, {"name": "job_description", "description": "The target job description"}, {"name": "job_description_section", "description": "Auto-formatted job description section (includes header if provided)"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 8. Cover Letter (Long)
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Cover Letter (Long)',
  'Generates a detailed cover letter (4-5 paragraphs, 400-500 words). Used in the cover letter modal.',
  'cover_letter_long',
  'You are a professional cover letter writer.',
  E'You are a professional cover letter writer. Create a compelling cover letter based on the candidate''s resume and the job description provided.\n\nCRITICAL INSTRUCTIONS:\n1. NEVER make up information or hallucinate details\n2. Only use information explicitly provided in the resume\n3. Be professional, enthusiastic, and concise\n4. Address how the candidate''s actual experience matches the job requirements\n5. Do NOT include salutation, date, or closing - ONLY the body paragraphs\n6. Start directly with the first paragraph\n\nResume Information:\n{resume_summary}\n\n{job_description_section}\n\nWrite a detailed, comprehensive cover letter that:\n- Highlights the candidate''s relevant experience and skills\n- Shows enthusiasm for the position\n- Explains why they''re a good fit\n- Maintains a professional tone\n- Provide more detail about experiences and skills, 4-5 paragraphs (400-500 words)\n\nReturn ONLY the body paragraphs, no salutation, no date, no closing signature.',
  0.7,
  2000,
  true,
  true,
  '[{"name": "resume_summary", "description": "Formatted resume summary with name, experience, skills, education"}, {"name": "job_description", "description": "The target job description"}, {"name": "job_description_section", "description": "Auto-formatted job description section (includes header if provided)"}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 9. Improve Summary (Dedicated)
INSERT INTO custom_prompts (name, description, prompt_type, system_prompt, prompt_text, temperature, max_tokens, is_system, is_active, available_variables)
VALUES (
  'Improve Summary (Dedicated)',
  'Dedicated endpoint for improving professional summary with job description context. Used by the /improve-summary API endpoint.',
  'improve_summary_dedicated',
  'You are an expert resume writer.',
  E'You are an expert resume writer. Improve the following professional summary to be more impactful and ATS-friendly.\n\nCurrent Summary:\n{current_summary}\n\nJob Description: {job_description}\n\nRequirements: Keep 3-4 sentences, use action verbs, include keywords. Return ONLY the improved summary.',
  0.7,
  500,
  true,
  true,
  '[{"name": "current_summary", "description": "The current professional summary text"}, {"name": "job_description", "description": "The target job description (may be ''Not provided'')"}]'::jsonb
)
ON CONFLICT DO NOTHING;
