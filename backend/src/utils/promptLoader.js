import { query } from '../config/database.js';

// In-memory cache: { promptType: { data, timestamp } }
const cache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Factory defaults for all 9 system prompt types.
 * Used by the "Reset to Default" feature and as fallback if DB has no entry.
 */
export const FACTORY_DEFAULTS = {
  resume_parsing: {
    name: 'Resume Parsing',
    description: 'Extracts structured resume data from uploaded PDF/DOCX files. Used during resume upload.',
    system_prompt: 'You are a JSON-only output system. Return ONLY valid, parseable JSON with no markdown, no code blocks, no explanations. Every field must be filled with either extracted data or an empty string/array.',
    prompt_text: `You are a professional resume parser. Your task is to extract ALL information from this resume with extreme accuracy and attention to detail.

===== RESUME TEXT =====
{resume_text}
=======================

EXTRACTION INSTRUCTIONS:

1. PERSONAL INFORMATION:
   - Extract: full_name, email, phone, location, linkedin, website, github
   - For LinkedIn/website/github: extract full URLs if present, or just usernames
   - Location: City, State format preferred

2. PROFESSIONAL SUMMARY:
   - Extract the complete professional summary/objective section
   - If multiple paragraphs, combine them with proper spacing
   - Do NOT summarize - extract verbatim

3. WORK EXPERIENCE (CRITICAL - BE THOROUGH):
   - Extract EVERY job position, even if briefly mentioned
   - For EACH position extract:
     * company: Company name exactly as written
     * position: Job title exactly as written
     * location: City, State if available
     * start_date: Convert to "Month Year" format (e.g., "January 2020", "Jan 2020")
     * end_date: Convert to "Month Year" format, or leave empty if current
     * current: true if currently working there, false otherwise
     * responsibilities: Extract EVERY bullet point as separate array item
   - For responsibilities:
     * Each bullet point is a separate string in the array
     * Remove bullet characters (\u2022, -, *) but keep the full text
     * Preserve exact wording - do NOT paraphrase or shorten
     * Include metrics, percentages, numbers exactly as shown

4. EDUCATION:
   - Extract EVERY degree/certification program
   - For EACH education entry extract:
     * institution: School/University name exactly as written
     * degree: Full degree name (e.g., "Bachelor of Science")
     * field_of_study: Major/field (e.g., "Computer Science")
     * location: City, State if available
     * graduation_date: Month and Year if available
     * gpa: If mentioned
     * honors: Dean's List, Summa Cum Laude, etc. if mentioned

5. SKILLS:
   - Group skills by category (e.g., "Technical Skills", "Languages", "Tools")
   - For EACH category extract:
     * category: The category name
     * items: Array of individual skills
   - Split comma-separated skills into array items
   - Extract ALL skills mentioned, don't skip any

6. CERTIFICATIONS:
   - Extract EVERY certification with name, issuer, dates if available

7. PROJECTS:
   - Extract personal/professional projects with descriptions and technologies

8. LANGUAGES:
   - Extract spoken languages and proficiency levels

CRITICAL FORMAT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Use double quotes for all strings
- Use empty strings "" for missing data, NEVER null
- Dates: Use "Month Year" format (e.g., "January 2020", "Jan 2020")
- Arrays: Each item properly separated by commas
- Ensure all brackets and braces are properly closed
- Escape special characters in strings

JSON STRUCTURE TO RETURN:
{
  "personal_info": {
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": "",
    "github": ""
  },
  "professional_summary": "",
  "work_experience": [
    {
      "company": "",
      "position": "",
      "location": "",
      "start_date": "Month Year",
      "end_date": "Month Year",
      "current": false,
      "responsibilities": ["responsibility 1", "responsibility 2"]
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field_of_study": "",
      "location": "",
      "graduation_date": "Month Year",
      "gpa": "",
      "honors": ""
    }
  ],
  "skills": [
    {
      "category": "Category Name",
      "items": ["skill1", "skill2", "skill3"]
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date_obtained": "",
      "expiry_date": "",
      "credential_id": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": ["tech1", "tech2"],
      "url": ""
    }
  ],
  "languages": [
    {
      "language": "",
      "proficiency": ""
    }
  ]
}

BE EXTREMELY THOROUGH. Extract EVERYTHING. Do NOT skip or summarize ANY information.`,
    temperature: 0.0,
    max_tokens: 8000,
    available_variables: [
      { name: 'resume_text', description: 'The raw text extracted from the uploaded PDF/DOCX file' }
    ]
  },

  ats_analysis_free: {
    name: 'ATS Analysis (Free)',
    description: 'Simplified ATS compatibility analysis for free-tier users. Returns score only.',
    system_prompt: 'You are an expert ATS system analyst.',
    prompt_text: `Analyze this resume against the job description for ATS compatibility. Provide ONLY a compatibility score.

Job Description:
{job_description}

Resume:
{resume_text}

Respond with JSON: {"score": <0-100>}
Only the score, nothing else.`,
    temperature: 0.3,
    max_tokens: 200,
    available_variables: [
      { name: 'job_description', description: 'The target job description to analyze against' },
      { name: 'resume_text', description: 'The resume content formatted as text' }
    ]
  },

  ats_analysis_paid: {
    name: 'ATS Analysis (Paid)',
    description: 'Full ATS compatibility analysis for paid users. Returns score, keywords, and recommendations.',
    system_prompt: 'You are an expert ATS system analyst.',
    prompt_text: `Analyze this resume against the job description for ATS compatibility.

Job Description:
{job_description}

Resume:
{resume_text}

Instructions:
1. Extract up to 20 important keywords/phrases from the job description (keywords_extracted_jd)
2. For each keyword in keywords_extracted_jd, check if it appears (or a close equivalent) in the resume
3. keywords_found_resume = keywords from keywords_extracted_jd that ARE in the resume
4. missing_keywords = keywords from keywords_extracted_jd that are NOT in the resume
5. IMPORTANT: keywords_found_resume + missing_keywords must equal keywords_extracted_jd (no overlap, no extras)
6. score = percentage of keywords_extracted_jd found in resume

Respond with ONLY valid JSON (no markdown):
{
  "score": <0-100>,
  "keywords_extracted_jd": ["keyword1", ...],
  "keywords_found_resume": ["subset of above found in resume"],
  "missing_keywords": ["subset of above NOT in resume"],
  "recommendations": ["one sentence each, max 5"]
}`,
    temperature: 0.3,
    max_tokens: 8000,
    available_variables: [
      { name: 'job_description', description: 'The target job description to analyze against' },
      { name: 'resume_text', description: 'The resume content formatted as text' }
    ]
  },

  improve_bullets: {
    name: 'Improve Bullets',
    description: 'Improves work experience bullet points. Used when clicking the improve button on individual responsibilities.',
    system_prompt: 'Professional resume writer. Improve text: same length (±20%), keep facts exact, use action verbs, return improved text only.',
    prompt_text: `Improve the following resume section. Keep it roughly the same length.

{ats_instructions}

Content:
{section_content}`,
    temperature: 0.3,
    max_tokens: 500,
    available_variables: [
      { name: 'section_content', description: 'The bullet point(s) to improve' },
      { name: 'missing_keywords', description: 'Comma-separated missing ATS keywords to try to incorporate' },
      { name: 'ats_instructions', description: 'Auto-generated ATS optimization instructions (built from missing_keywords)' }
    ]
  },

  improve_summary: {
    name: 'Improve Summary',
    description: 'Improves the professional summary section. Used when clicking improve on the summary from the review page.',
    system_prompt: 'Professional resume writer. Improve text: same length (±20%), keep facts exact, use action verbs, return improved text only.',
    prompt_text: `Improve the following resume section. Keep it roughly the same length.

{ats_instructions}

Content:
{section_content}`,
    temperature: 0.3,
    max_tokens: 500,
    available_variables: [
      { name: 'section_content', description: 'The professional summary text to improve' },
      { name: 'missing_keywords', description: 'Comma-separated missing ATS keywords to try to incorporate' },
      { name: 'ats_instructions', description: 'Auto-generated ATS optimization instructions (built from missing_keywords)' }
    ]
  },

  improve_skills: {
    name: 'Improve Skills',
    description: 'Refines skill names within a category. Used when clicking improve on a skills section.',
    system_prompt: 'Professional resume writer. Refine skills: keep same length (±20%), no new skills, no duplicates, pipe-separated output only. Make professional/industry-standard.',
    prompt_text: `Refine ONLY the wording/naming of these skills for THIS SPECIFIC category. Output must be roughly the same size as input. Do NOT add new skills. Do NOT create duplicates. Keep each skill specific and technical. Return the refined list separated by pipe character (|).

{ats_instructions}

Content:
{section_content}`,
    temperature: 0.3,
    max_tokens: 500,
    available_variables: [
      { name: 'section_content', description: 'Pipe-separated list of skills in this category' },
      { name: 'missing_keywords', description: 'Comma-separated missing ATS keywords to try to incorporate' },
      { name: 'ats_instructions', description: 'Auto-generated ATS optimization instructions (built from missing_keywords)' }
    ]
  },

  cover_letter_short: {
    name: 'Cover Letter (Short)',
    description: 'Generates a concise cover letter (2-3 paragraphs, 150-200 words). Used in the cover letter modal.',
    system_prompt: 'You are a professional cover letter writer. You write concise, complete cover letters. You ALWAYS finish every sentence you start.',
    prompt_text: `Write a SHORT cover letter body based on the candidate's resume and job description.

CRITICAL RULES:
1. NEVER make up information - only use what's in the resume
2. Do NOT include salutation ("Dear..."), date, or closing ("Sincerely") - ONLY body paragraphs
3. MUST complete every sentence fully - never end mid-sentence
4. Keep it SHORT: exactly 2-3 paragraphs, 150-200 words total
5. Each paragraph should be 2-3 sentences maximum

Resume Information:
{resume_summary}

{job_description_section}

Write 2-3 brief paragraphs (150-200 words) highlighting relevant experience and fit for the role. Be direct and concise. Complete all sentences.`,
    temperature: 0.7,
    max_tokens: 2000,
    available_variables: [
      { name: 'resume_summary', description: 'Formatted resume summary with name, experience, skills, education' },
      { name: 'job_description', description: 'The target job description' },
      { name: 'job_description_section', description: 'Auto-formatted job description section (includes header if provided)' }
    ]
  },

  cover_letter_long: {
    name: 'Cover Letter (Long)',
    description: 'Generates a detailed cover letter (5-6 paragraphs, 450-600 words). Used in the cover letter modal.',
    system_prompt: 'You are a professional cover letter writer. You write thorough, detailed cover letters. You ALWAYS finish every sentence you start.',
    prompt_text: `Write a DETAILED cover letter body based on the candidate's resume and job description.

CRITICAL RULES:
1. NEVER make up information - only use what's in the resume
2. Do NOT include salutation ("Dear..."), date, or closing ("Sincerely") - ONLY body paragraphs
3. MUST complete every sentence fully - never end mid-sentence
4. Make it DETAILED: exactly 5-6 paragraphs, 450-600 words total
5. Each paragraph should be 4-6 sentences

Resume Information:
{resume_summary}

{job_description_section}

Structure your 5-6 paragraphs as follows:
- Paragraph 1: Strong opening connecting candidate to the specific role
- Paragraph 2: Most relevant professional experience with specific accomplishments
- Paragraph 3: Technical skills and expertise that match the job requirements
- Paragraph 4: Leadership, collaboration, or other soft skills demonstrated through experience
- Paragraph 5: Additional qualifications, certifications, or education relevance
- Paragraph 6: Closing paragraph expressing enthusiasm and fit

Write 450-600 words total. Be specific about experience and achievements. Complete all sentences.`,
    temperature: 0.7,
    max_tokens: 2000,
    available_variables: [
      { name: 'resume_summary', description: 'Formatted resume summary with name, experience, skills, education' },
      { name: 'job_description', description: 'The target job description' },
      { name: 'job_description_section', description: 'Auto-formatted job description section (includes header if provided)' }
    ]
  },

  improve_summary_dedicated: {
    name: 'Improve Summary (Dedicated)',
    description: 'Dedicated endpoint for improving professional summary with job description context. Used by the /improve-summary API endpoint.',
    system_prompt: 'You are an expert resume writer.',
    prompt_text: `You are an expert resume writer. Improve the following professional summary to be more impactful and ATS-friendly.

Current Summary:
{current_summary}

Job Description: {job_description}

Requirements: Keep 3-4 sentences, use action verbs, include keywords. Return ONLY the improved summary.`,
    temperature: 0.7,
    max_tokens: 500,
    available_variables: [
      { name: 'current_summary', description: 'The current professional summary text' },
      { name: 'job_description', description: "The target job description (may be 'Not provided')" }
    ]
  }
};

/**
 * Load a system prompt from DB by prompt_type.
 * Falls back to FACTORY_DEFAULTS if not found in DB.
 */
export async function getPrompt(promptType) {
  // Check cache
  const cached = cache[promptType];
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const result = await query(
      'SELECT * FROM custom_prompts WHERE prompt_type = $1 AND is_system = true AND is_active = true LIMIT 1',
      [promptType]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        system_prompt: row.system_prompt,
        prompt_text: row.prompt_text,
        temperature: row.temperature != null ? parseFloat(row.temperature) : undefined,
        max_tokens: row.max_tokens != null ? parseInt(row.max_tokens) : undefined,
        available_variables: row.available_variables || []
      };
      cache[promptType] = { data, timestamp: Date.now() };
      return data;
    }
  } catch (err) {
    console.error(`[PromptLoader] DB error loading prompt '${promptType}':`, err.message);
  }

  // Fallback to factory defaults
  const factory = FACTORY_DEFAULTS[promptType];
  if (factory) {
    const data = {
      system_prompt: factory.system_prompt,
      prompt_text: factory.prompt_text,
      temperature: factory.temperature,
      max_tokens: factory.max_tokens,
      available_variables: factory.available_variables
    };
    cache[promptType] = { data, timestamp: Date.now() };
    return data;
  }

  throw new Error(`Unknown prompt type: ${promptType}`);
}

/**
 * Replace {variable_name} placeholders in a template string.
 */
export function interpolateVariables(template, variables) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, varName) => {
    if (variables.hasOwnProperty(varName)) {
      return variables[varName] ?? '';
    }
    return match; // Leave unmatched placeholders as-is
  });
}

/**
 * Load a prompt from DB and interpolate variables.
 * Returns { systemPrompt, userPrompt, temperature, max_tokens }.
 */
export async function buildPrompt(promptType, variables = {}) {
  const promptData = await getPrompt(promptType);
  return {
    systemPrompt: interpolateVariables(promptData.system_prompt, variables),
    userPrompt: interpolateVariables(promptData.prompt_text, variables),
    temperature: promptData.temperature,
    max_tokens: promptData.max_tokens
  };
}

/**
 * Clear the entire cache. Called when admin saves a prompt.
 */
export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}

/**
 * Clear cache for a specific prompt type.
 */
export function clearCacheFor(promptType) {
  delete cache[promptType];
}

/**
 * Build ATS instructions string from missing keywords.
 * Used by improve_bullets, improve_summary, improve_skills.
 */
export function buildAtsInstructions(missingKeywords) {
  if (!missingKeywords || missingKeywords.length === 0) return '';
  const keywordsList = Array.isArray(missingKeywords) ? missingKeywords.slice(0, 10).join(', ') : missingKeywords;
  return `ATS OPTIMIZATION - Missing keywords from job description: ${keywordsList}
INSTRUCTIONS: Where genuinely applicable, try to incorporate these keywords by:
- Using industry-standard terminology (e.g., "managed" → "led cross-functional teams")
- Adding relevant context words that are truthful
- Rephrasing with ATS-friendly synonyms
CRITICAL: NEVER add skills or experiences that don't exist. Only rephrase what's already there.`;
}

/**
 * Build a resume summary string from resume data.
 * Used by cover letter generation.
 */
export function buildResumeSummary(resumeData) {
  const personalInfo = resumeData?.personal_info || {};
  return `Name: ${personalInfo.full_name || 'N/A'}
Professional Summary: ${resumeData?.professional_summary || 'N/A'}

Work Experience:
${(resumeData?.work_experience || []).map(exp =>
    `- ${exp.position} at ${exp.company} (${exp.start_date} - ${exp.current ? 'Present' : exp.end_date})`
  ).join('\n')}

Skills:
${(resumeData?.skills || []).map(cat => `${cat.category}: ${cat.items?.join(', ')}`).join('\n')}

Education:
${(resumeData?.education || []).map(edu =>
    `${edu.degree} in ${edu.field_of_study || 'N/A'} from ${edu.institution}`
  ).join('\n')}`.trim();
}
