-- Fix cover letter long prompt: remove structured outline that causes AI to output
-- planning notes instead of prose. Replace with natural guidance.

UPDATE custom_prompts
SET
  prompt_text = E'Write a DETAILED cover letter body based on the candidate''s resume and job description.\n\nCRITICAL RULES:\n1. NEVER make up information - only use what''s in the resume\n2. Do NOT include salutation ("Dear..."), date, or closing ("Sincerely") - ONLY body paragraphs\n3. MUST complete every sentence fully - never end mid-sentence\n4. Make it DETAILED: exactly 5-6 paragraphs, 450-600 words total\n5. Each paragraph should be 4-6 sentences\n6. Output ONLY the final cover letter text as plain prose paragraphs - NO outlines, NO bullet points, NO markdown formatting, NO paragraph labels, NO planning notes\n\nResume Information:\n{resume_summary}\n\n{job_description_section}\n\nWrite 5-6 polished prose paragraphs (450-600 words total). Open with a strong connection to the role, then cover relevant experience with specific accomplishments, technical skills matching the job, leadership and collaboration strengths, and close with enthusiasm for the opportunity. Every paragraph must be fully written prose - never output headings, labels, or outline formatting.',
  updated_at = NOW()
WHERE prompt_type = 'cover_letter_long' AND is_system = true;
