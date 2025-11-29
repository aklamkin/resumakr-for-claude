import { useState, useEffect } from "react";
import api from "@/api/apiClient";

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
      // Fetch resume by ID
      const fetchedResume = await api.entities.Resume.get(resumeId);

      if (!fetchedResume) {
        setError("Resume not found");
        setLoading(false);
        return;
      }

      setResume(fetchedResume);

      // Fetch resume data using the correct method
      try {
        const fetchedData = await api.entities.ResumeData.getByResumeId(resumeId);
        setResumeData(fetchedData || {});
      } catch (dataErr) {
        // If no resume data exists yet, that's okay - initialize with empty object
        console.log("No resume data found, initializing with empty object");
        setResumeData({});
      }
    } catch (err) {
      setError("Failed to load resume");
      console.error("Error loading resume:", err);
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
      await api.entities.ResumeData.update(resumeData.id, updates);
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
      await api.entities.Resume.update(resume.id, { title: newTitle.trim() });
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
