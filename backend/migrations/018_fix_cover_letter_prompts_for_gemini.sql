-- Fix cover letter prompts for Gemini 2.5 Flash compatibility
-- - Explicit plain text / no markdown instructions
-- - No structured outlines that Gemini interprets literally
-- - Stronger length differentiation between short and long

UPDATE custom_prompts
SET
  system_prompt = 'You are a professional cover letter writer. You output ONLY plain text prose paragraphs. Never use markdown, asterisks, bold, bullet points, or any formatting. Never include salutations or closings.',
  prompt_text = E'Write a SHORT cover letter body (ONLY the body paragraphs) for this candidate.\n\nOUTPUT FORMAT: Plain text only. No markdown. No bold. No asterisks. No bullet points. No "Dear..." or "Sincerely". Just 2-3 plain prose paragraphs separated by blank lines.\n\nLENGTH: 150-200 words total. 2-3 paragraphs. Each paragraph 2-3 sentences.\n\nRULES: Only use facts from the resume below. Complete every sentence. No fabricated information.\n\nResume:\n{resume_summary}\n\n{job_description_section}\n\nNow write 2-3 concise plain text paragraphs (150-200 words) connecting this candidate''s experience to the role:',
  updated_at = NOW()
WHERE prompt_type = 'cover_letter_short' AND is_system = true;

UPDATE custom_prompts
SET
  system_prompt = 'You are a professional cover letter writer. You output ONLY plain text prose paragraphs. Never use markdown, asterisks, bold, bullet points, or any formatting. Never include salutations or closings. Never output outlines or plans.',
  prompt_text = E'Write a DETAILED cover letter body (ONLY the body paragraphs) for this candidate.\n\nOUTPUT FORMAT: Plain text only. No markdown. No bold. No asterisks. No bullet points. No headings. No labels like "Paragraph 1:". No outlines or plans. No "Dear..." or "Sincerely". Just 5-6 plain prose paragraphs separated by blank lines.\n\nLENGTH: 450-600 words total. 5-6 paragraphs. Each paragraph 4-6 sentences. This must be MUCH longer than a short cover letter.\n\nRULES: Only use facts from the resume below. Complete every sentence. No fabricated information.\n\nResume:\n{resume_summary}\n\n{job_description_section}\n\nNow write 5-6 detailed plain text paragraphs (450-600 words). Cover: why this candidate fits the role, their key professional achievements, relevant technical skills, leadership qualities, and enthusiasm for the opportunity:',
  updated_at = NOW()
WHERE prompt_type = 'cover_letter_long' AND is_system = true;
