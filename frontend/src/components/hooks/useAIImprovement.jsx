import { useState, useEffect, useRef } from "react";
import api from "@/api/apiClient";

export function useAIImprovement(resumeData, setResumeData, providers, prompts) {
  const [sectionVersions, setSectionVersions] = useState({});
  const [sectionLoading, setSectionLoading] = useState({});
  const lastCallTime = useRef({});
  const MIN_CALL_INTERVAL = 2000; // 2 seconds between calls

  const requestVersions = async (sectionKey, content, providerId = null) => {
    // Rate limiting check
    const now = Date.now();
    const lastCall = lastCallTime.current[sectionKey] || 0;
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < MIN_CALL_INTERVAL) {
      const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastCallTime.current[sectionKey] = Date.now();
    setSectionLoading(prev => ({ ...prev, [sectionKey]: true }));

    try {
      const targetProviders = providerId
        ? providers.filter(p => p.id === providerId)
        : providers.filter(p => p.is_default).slice(0, 1); // Reduced to 1 provider to avoid rate limits

      if (targetProviders.length === 0) {
        throw new Error("No AI providers configured");
      }

      const defaultPrompt = prompts.find(p => p.is_default);
      const isSkillsSection = sectionKey.startsWith('skills-');
      const atsResults = resumeData?.ats_analysis_results;
      const hasMissingKeywords = atsResults?.missing_keywords?.length > 0;

      const atsContext = hasMissingKeywords
        ? `\n\nATS OPTIMIZATION CONTEXT:
The following keywords from the job description are missing: ${atsResults.missing_keywords.join(', ')}
IMPORTANT: Try to naturally incorporate these keywords where genuinely applicable. NEVER fabricate experience or skills you don't have.`
        : '';

      const systemPrompt = isSkillsSection
        ? `You are a professional resume writer. Refine resume skills following these STRICT rules:

      CRITICAL REQUIREMENTS:
      1. NEVER add new skills not in the original list
      2. NEVER make up or hallucinate skills
      3. ONLY refine the wording/naming of existing skills to be more professional/industry-standard
      4. NEVER add duplicates - each skill must be unique
      5. Keep skills specific and technical - NO broad/generic terms like "communication" or "teamwork"
      6. OUTPUT MUST BE ROUGHLY THE SAME LENGTH as input (±20%) - no significantly larger or smaller lists
      7. Return skills separated ONLY by pipe character (|)
      8. Return ONLY the pipe-separated list with NO explanations, NO numbering, NO bullets

      CONTEXT AWARENESS:
      - Consider the SPECIFIC skill category you're refining (e.g., "Programming Languages" vs "Cloud Platforms")
      - If ATS keywords are provided, ONLY add those that are DIRECTLY RELEVANT to this specific skill category
      - Do NOT dump all ATS keywords into every category indiscriminately
      - Maintain the technical specificity of the original list

      EXAMPLES OF GOOD REFINEMENT:
      - "react js" → "React.js"
      - "python programming" → "Python"
      - "aws cloud" → "Amazon Web Services (AWS)"

      EXAMPLES OF BAD REFINEMENT (DO NOT DO THIS):
      - Adding "Communication" when it wasn't there
      - Changing "React.js" to "Frontend Development" (too broad)
      - Duplicating skills with different wording
      - Adding 10 new skills when original had 5
      - Adding cloud keywords to "Programming Languages" category

      ${hasMissingKeywords ? '\nATS KEYWORDS (only add if DIRECTLY relevant to THIS category): ' + atsResults.missing_keywords.join(' | ') : ''}

      ${resumeData?.job_description ? `Job Description:\n${resumeData.job_description}\n\n` : ''}${atsContext}`
        : `You are a professional resume writer. Improve resume content while:
        1. NEVER making up information - this is critical
        2. Only improving language and presentation of EXISTING information
        3. Keeping all facts exactly as provided
        4. Using strong action verbs
        5. OUTPUT MUST BE ROUGHLY THE SAME LENGTH as input (±20%) - no significantly longer or shorter
        6. Return ONLY the improved text
        ${hasMissingKeywords ? '\n7. Carefully evaluate if ANY of these keywords genuinely apply to THIS SPECIFIC bullet point: ' + atsResults.missing_keywords.join(', ') + '\n8. Only incorporate keywords that are TRUTHFUL and RELEVANT to this specific responsibility - do NOT force keywords' : ''}

        ${resumeData?.job_description ? `Job Description:\n${resumeData.job_description}\n\n` : ''}${atsContext}`;

      const allVersions = [];

      for (const provider of targetProviders) {
        const customPrompt = provider.custom_prompt_id
          ? prompts.find(p => p.id === provider.custom_prompt_id)
          : defaultPrompt;

        const promptInstruction = customPrompt?.prompt_text || 
            (isSkillsSection
              ? "Refine ONLY the wording/naming of these skills for THIS SPECIFIC category. Output must be roughly the same size as input. Do NOT add new skills. Do NOT create duplicates. Keep each skill specific and technical. Return the refined list separated by pipe character (|)."
              : "Improve the following resume section. Keep it roughly the same length.");

        const userPrompt = promptInstruction.includes('{section_content}')
          ? promptInstruction.replace(/{section_content}/g, content)
          : `${promptInstruction}\n\nContent:\n${content}`;

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        try {
          const numVersions = 1; // Reduced to 1 version to avoid rate limits
          for (let i = 0; i < numVersions; i++) {
            const response = await api.integrations.Core.InvokeLLM({ prompt: fullPrompt });
            allVersions.push(response.result || response);
            
            // Add delay between versions
            if (i < numVersions - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (err) {
          if (err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
            throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
          }
          console.error(`Error from ${provider.name}:`, err);
        }
      }

      if (allVersions.length > 0) {
        setSectionVersions(prev => ({ ...prev, [sectionKey]: allVersions }));
      } else {
        throw new Error("Failed to generate versions. Please try again.");
      }
    } catch (err) {
      console.error("Error generating versions:", err);
      setSectionLoading(prev => ({ ...prev, [sectionKey]: false }));
      
      // Show user-friendly error message
      const errorMessage = err.message?.includes('rate limit') || err.message?.includes('Rate limit')
        ? "Rate limit exceeded. Please wait 10-15 seconds before trying again."
        : "Failed to generate suggestions. Please try again in a moment.";
      
      alert(errorMessage);
      return;
    } finally {
      setSectionLoading(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  const acceptVersion = async (sectionKey, version, updatePath) => {
    const updatedData = { ...resumeData };
    const pathParts = updatePath.split('.');
    let current = updatedData;
    let previousValue;

    // Navigate to the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      current = !isNaN(part) ? current[parseInt(part)] : current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];
    previousValue = !isNaN(lastPart) ? current[parseInt(lastPart)] : current[lastPart];

    // Initialize version_history
    if (!updatedData.version_history) updatedData.version_history = {};
    if (!updatedData.ai_metadata) updatedData.ai_metadata = {};

    // Save previous values and mark as AI
    if (updatePath === 'professional_summary') {
      updatedData.version_history.summary_previous = String(previousValue || '');
      updatedData.ai_metadata.summary_is_ai = true;
    } else if (updatePath.startsWith('work_experience')) {
      const expMatch = updatePath.match(/work_experience\.(\d+)\.responsibilities\.?(\d*)/);
      if (expMatch) {
        const jobIndex = parseInt(expMatch[1]);
        
        if (!Array.isArray(updatedData.version_history.work_experience_previous)) {
          updatedData.version_history.work_experience_previous = [];
        }
        if (!Array.isArray(updatedData.ai_metadata.work_experience_ai)) {
          updatedData.ai_metadata.work_experience_ai = [];
        }

        let jobHistory = updatedData.version_history.work_experience_previous.find(
          item => item.job_index === jobIndex
        );
        if (!jobHistory) {
          jobHistory = { job_index: jobIndex, responsibilities_previous: [] };
          updatedData.version_history.work_experience_previous.push(jobHistory);
        }

        let jobMetadata = updatedData.ai_metadata.work_experience_ai.find(
          item => item.job_index === jobIndex
        );
        if (!jobMetadata) {
          jobMetadata = { job_index: jobIndex, responsibilities_ai: [] };
          updatedData.ai_metadata.work_experience_ai.push(jobMetadata);
        }

        if (expMatch[2] !== '') {
          // Single bullet
          const respIndex = parseInt(expMatch[2]);
          jobHistory.responsibilities_previous[respIndex] = String(previousValue || '');
          
          const actualResp = updatedData.work_experience[jobIndex]?.responsibilities || [];
          const newAiArray = new Array(actualResp.length).fill(false);
          jobMetadata.responsibilities_ai?.forEach((val, idx) => {
            if (idx < newAiArray.length && val === true) newAiArray[idx] = true;
          });
          newAiArray[respIndex] = true;
          jobMetadata.responsibilities_ai = newAiArray;
        } else {
          // All bullets
          const responsibilitiesArray = Array.isArray(previousValue)
            ? previousValue.filter(v => v).map(v => String(v))
            : [];
          
          if (responsibilitiesArray.length > 0) {
            jobHistory.responsibilities_previous = responsibilitiesArray;
          }
          
          const numResp = Array.isArray(version) ? version.length : 0;
          jobMetadata.responsibilities_ai = new Array(numResp).fill(true);
        }
      }
    } else if (updatePath.startsWith('skills')) {
      const skillMatch = updatePath.match(/skills\.(\d+)\.items/);
      if (skillMatch) {
        const skillIndex = parseInt(skillMatch[1]);
        if (!Array.isArray(updatedData.version_history.skills_previous)) {
          updatedData.version_history.skills_previous = [];
        }
        if (!Array.isArray(updatedData.ai_metadata.skills_ai)) {
          updatedData.ai_metadata.skills_ai = [];
        }
        updatedData.version_history.skills_previous[skillIndex] = Array.isArray(previousValue) 
          ? [...previousValue] 
          : previousValue;
        updatedData.ai_metadata.skills_ai[skillIndex] = true;
      }
    }

    // Update the actual content
    current = updatedData;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      current = !isNaN(part) ? current[parseInt(part)] : current[part];
    }
    
    if (!isNaN(lastPart)) {
      current[parseInt(lastPart)] = version;
    } else {
      current[lastPart] = version;
    }

    // Clean up arrays
    if (updatedData.version_history?.work_experience_previous) {
      updatedData.version_history.work_experience_previous = 
        updatedData.version_history.work_experience_previous
          .map(job => {
            if (job?.responsibilities_previous) {
              job.responsibilities_previous = job.responsibilities_previous.filter(
                resp => resp !== null && resp !== undefined && resp !== ''
              );
              return job.responsibilities_previous.length > 0 ? job : null;
            }
            return null;
          })
          .filter(job => job !== null);
    }

    setResumeData(updatedData);
    setSectionVersions(prev => {
      const updated = { ...prev };
      delete updated[sectionKey];
      return updated;
    });

    await api.entities.ResumeData.update(resumeData.id, updatedData);
  };

  const undoVersion = async (updatePath) => {
    const updatedData = { ...resumeData };
    if (!updatedData.version_history) return;

    if (updatePath === 'professional_summary') {
      const previousValue = updatedData.version_history.summary_previous;
      if (previousValue) {
        updatedData.professional_summary = previousValue;
        delete updatedData.version_history.summary_previous;
        if (updatedData.ai_metadata) updatedData.ai_metadata.summary_is_ai = false;
      }
    } else if (updatePath.startsWith('work_experience')) {
      const expMatch = updatePath.match(/work_experience\.(\d+)\.responsibilities\.?(\d*)/);
      if (expMatch) {
        const jobIndex = parseInt(expMatch[1]);
        const prevJob = updatedData.version_history.work_experience_previous?.find(
          item => item.job_index === jobIndex
        );

        if (prevJob?.responsibilities_previous) {
          if (expMatch[2] !== '') {
            const respIndex = parseInt(expMatch[2]);
            const previousValue = prevJob.responsibilities_previous[respIndex];
            if (previousValue && updatedData.work_experience?.[jobIndex]?.responsibilities) {
              updatedData.work_experience[jobIndex].responsibilities[respIndex] = previousValue;
              prevJob.responsibilities_previous[respIndex] = undefined;
              prevJob.responsibilities_previous = prevJob.responsibilities_previous.filter(v => v !== undefined);
              
              if (prevJob.responsibilities_previous.length === 0) {
                updatedData.version_history.work_experience_previous = 
                  updatedData.version_history.work_experience_previous.filter(
                    item => item.job_index !== jobIndex
                  );
              }
              
              if (updatedData.ai_metadata?.work_experience_ai) {
                const jobMetadata = updatedData.ai_metadata.work_experience_ai.find(
                  item => item.job_index === jobIndex
                );
                if (jobMetadata?.responsibilities_ai) {
                  jobMetadata.responsibilities_ai[respIndex] = false;
                }
              }
            }
          } else {
            if (updatedData.work_experience?.[jobIndex]) {
              updatedData.work_experience[jobIndex].responsibilities = [...prevJob.responsibilities_previous];
              updatedData.version_history.work_experience_previous = 
                updatedData.version_history.work_experience_previous.filter(
                  item => item.job_index !== jobIndex
                );
              
              if (updatedData.ai_metadata?.work_experience_ai) {
                updatedData.ai_metadata.work_experience_ai = 
                  updatedData.ai_metadata.work_experience_ai.filter(
                    item => item.job_index !== jobIndex
                  );
              }
            }
          }
        }
      }
    } else if (updatePath.startsWith('skills')) {
      const skillMatch = updatePath.match(/skills\.(\d+)\.items/);
      if (skillMatch) {
        const skillIndex = parseInt(skillMatch[1]);
        const previousValue = updatedData.version_history.skills_previous?.[skillIndex];
        if (previousValue && updatedData.skills?.[skillIndex]) {
          updatedData.skills[skillIndex].items = Array.isArray(previousValue) 
            ? [...previousValue] 
            : previousValue;
          
          if (updatedData.version_history.skills_previous) {
            updatedData.version_history.skills_previous = 
              updatedData.version_history.skills_previous
                .map((val, idx) => idx === skillIndex ? undefined : val)
                .filter(val => val !== undefined);
          }
          
          if (updatedData.ai_metadata?.skills_ai) {
            updatedData.ai_metadata.skills_ai[skillIndex] = false;
          }
        }
      }
    }

    setResumeData(updatedData);
    await api.entities.ResumeData.update(resumeData.id, updatedData);
  };

  const isAIContent = (path) => {
    if (!resumeData?.ai_metadata) return false;

    if (path === 'professional_summary') {
      return resumeData.ai_metadata.summary_is_ai || false;
    } else if (path.startsWith('work_experience')) {
      const expMatch = path.match(/work_experience\.(\d+)\.responsibilities\.?(\d*)/);
      if (expMatch) {
        const jobIndex = parseInt(expMatch[1]);
        const jobMetadata = resumeData.ai_metadata.work_experience_ai?.find(
          item => item.job_index === jobIndex
        );
        if (!jobMetadata) return false;
        
        if (expMatch[2] !== '') {
          const respIndex = parseInt(expMatch[2]);
          return jobMetadata.responsibilities_ai?.[respIndex] || false;
        } else {
          return jobMetadata.responsibilities_ai?.some(ai => ai) || false;
        }
      }
    } else if (path.startsWith('skills')) {
      const skillMatch = path.match(/skills\.(\d+)\.items/);
      if (skillMatch) {
        const skillIndex = parseInt(skillMatch[1]);
        return resumeData.ai_metadata.skills_ai?.[skillIndex] || false;
      }
    }
    return false;
  };

  const canUndo = (path) => {
    if (!resumeData?.version_history) return false;

    if (path === 'professional_summary') {
      return !!resumeData.version_history.summary_previous;
    } else if (path.startsWith('work_experience')) {
      const expMatch = path.match(/work_experience\.(\d+)\.responsibilities\.?(\d*)/);
      if (expMatch) {
        const jobIndex = parseInt(expMatch[1]);
        const prevJob = resumeData.version_history.work_experience_previous?.find(
          item => item.job_index === jobIndex
        );
        if (!prevJob) return false;
        
        if (expMatch[2] !== '') {
          const respIndex = parseInt(expMatch[2]);
          return !!prevJob.responsibilities_previous?.[respIndex];
        } else {
          return Array.isArray(prevJob.responsibilities_previous) && 
                 prevJob.responsibilities_previous.length > 0;
        }
      }
    } else if (path.startsWith('skills')) {
      const skillMatch = path.match(/skills\.(\d+)\.items/);
      if (skillMatch) {
        const skillIndex = parseInt(skillMatch[1]);
        return !!resumeData.version_history.skills_previous?.[skillIndex];
      }
    }
    return false;
  };

  return {
    sectionVersions,
    sectionLoading,
    requestVersions,
    acceptVersion,
    undoVersion,
    isAIContent,
    canUndo
  };
}