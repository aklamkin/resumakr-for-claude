import { useState, useRef } from "react";
import api from "@/api/apiClient";

export function useAIImprovement(resumeData, setResumeData, providers, prompts, onError) {
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
      const isSkillsSection = sectionKey.startsWith('skills-');
      const atsResults = resumeData?.ats_analysis_results;
      const missingKeywords = atsResults?.missing_keywords?.slice(0, 10) || [];

      // Determine section type for the backend
      let sectionType;
      if (isSkillsSection) {
        sectionType = 'skills';
      } else if (sectionKey === 'professional_summary') {
        sectionType = 'summary';
      } else {
        sectionType = 'bullets';
      }

      // Call the backend endpoint which loads prompts from DB
      const response = await api.integrations.Core.ImproveSection({
        section_type: sectionType,
        section_content: content,
        missing_keywords: missingKeywords,
        resumeId: resumeData?.resume_id
      });

      const result = response.result || response;
      if (result) {
        setSectionVersions(prev => ({ ...prev, [sectionKey]: [result] }));
      } else {
        throw new Error("Failed to generate versions. Please try again.");
      }
    } catch (err) {
      console.error("Error generating versions:", err);
      setSectionLoading(prev => ({ ...prev, [sectionKey]: false }));

      // Show user-friendly error message
      const errorMessage = err.message?.includes('rate limit') || err.message?.includes('Rate limit')
        ? "Rate limit exceeded. Please wait 10-15 seconds before trying again."
        : err.message?.includes('credits') || err.message?.includes('Credits')
        ? err.message
        : "Failed to generate suggestions. Please try again in a moment.";

      if (onError) {
        onError(errorMessage, "AI Error", "error");
      }
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