-- Update cover letter prompts to be more differentiated (short vs long)
-- and to explicitly require complete sentences

UPDATE custom_prompts
SET
  description = 'Generates a concise cover letter (2-3 paragraphs, 150-200 words). Used in the cover letter modal.',
  system_prompt = 'You are a professional cover letter writer. You write concise, complete cover letters. You ALWAYS finish every sentence you start.',
  prompt_text = E'Write a SHORT cover letter body based on the candidate''s resume and job description.\n\nCRITICAL RULES:\n1. NEVER make up information - only use what''s in the resume\n2. Do NOT include salutation ("Dear..."), date, or closing ("Sincerely") - ONLY body paragraphs\n3. MUST complete every sentence fully - never end mid-sentence\n4. Keep it SHORT: exactly 2-3 paragraphs, 150-200 words total\n5. Each paragraph should be 2-3 sentences maximum\n\nResume Information:\n{resume_summary}\n\n{job_description_section}\n\nWrite 2-3 brief paragraphs (150-200 words) highlighting relevant experience and fit for the role. Be direct and concise. Complete all sentences.',
  updated_at = NOW()
WHERE prompt_type = 'cover_letter_short' AND is_system = true;

UPDATE custom_prompts
SET
  description = 'Generates a detailed cover letter (5-6 paragraphs, 450-600 words). Used in the cover letter modal.',
  system_prompt = 'You are a professional cover letter writer. You write thorough, detailed cover letters. You ALWAYS finish every sentence you start.',
  prompt_text = E'Write a DETAILED cover letter body based on the candidate''s resume and job description.\n\nCRITICAL RULES:\n1. NEVER make up information - only use what''s in the resume\n2. Do NOT include salutation ("Dear..."), date, or closing ("Sincerely") - ONLY body paragraphs\n3. MUST complete every sentence fully - never end mid-sentence\n4. Make it DETAILED: exactly 5-6 paragraphs, 450-600 words total\n5. Each paragraph should be 4-6 sentences\n\nResume Information:\n{resume_summary}\n\n{job_description_section}\n\nStructure your 5-6 paragraphs as follows:\n- Paragraph 1: Strong opening connecting candidate to the specific role\n- Paragraph 2: Most relevant professional experience with specific accomplishments\n- Paragraph 3: Technical skills and expertise that match the job requirements\n- Paragraph 4: Leadership, collaboration, or other soft skills demonstrated through experience\n- Paragraph 5: Additional qualifications, certifications, or education relevance\n- Paragraph 6: Closing paragraph expressing enthusiasm and fit\n\nWrite 450-600 words total. Be specific about experience and achievements. Complete all sentences.',
  updated_at = NOW()
WHERE prompt_type = 'cover_letter_long' AND is_system = true;
