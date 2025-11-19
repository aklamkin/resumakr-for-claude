import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useResumeData(resumeId) {
  const [resume, setResume] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResume = async () => {
    if (!resumeId) {
      setError("No resume ID provided");
      setLoading(false);
      return;
    }

    try {
      const resumeList = await base44.entities.Resume.filter({ id: resumeId });
      const dataList = await base44.entities.ResumeData.filter({ resume_id: resumeId });

      if (resumeList.length === 0) {
        setError("Resume not found");
      } else {
        setResume(resumeList[0]);
        const data = dataList[0] || {};
        setResumeData(data);
      }
    } catch (err) {
      setError("Failed to load resume");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  const updateResumeData = async (updates) => {
    if (!resumeData?.id) return;
    
    try {
      await base44.entities.ResumeData.update(resumeData.id, updates);
      setResumeData(prev => ({ ...prev, ...updates }));
      return true;
    } catch (err) {
      console.error("Failed to update resume data:", err);
      return false;
    }
  };

  const updateResumeTitle = async (newTitle) => {
    if (!resume?.id || !newTitle.trim()) return false;
    
    try {
      await base44.entities.Resume.update(resume.id, { title: newTitle.trim() });
      setResume(prev => ({ ...prev, title: newTitle.trim() }));
      return true;
    } catch (err) {
      console.error("Failed to update title:", err);
      return false;
    }
  };

  return {
    resume,
    resumeData,
    loading,
    error,
    setResumeData,
    updateResumeData,
    updateResumeTitle,
    reloadResume: loadResume
  };
}