
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Save, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog, NotificationPopup } from "../components/ui/notification";

import PersonalInfoStep from "../components/wizard/PersonalInfoStep";
import WorkExperienceStep from "../components/wizard/WorkExperienceStep";
import EducationStep from "../components/wizard/EducationStep";
import SkillsStep from "../components/wizard/SkillsStep";
import CertificationsStep from "../components/wizard/CertificationsStep";

const steps = [
  { id: "personal", title: "Personal Info", component: PersonalInfoStep },
  { id: "experience", title: "Work Experience", component: WorkExperienceStep },
  { id: "education", title: "Education", component: EducationStep },
  { id: "skills", title: "Skills", component: SkillsStep },
  { id: "certifications", title: "Certifications & More", component: CertificationsStep },
];

// Helper to check if resume data has any meaningful content
const hasResumeData = (data) => {
  if (!data) return false;

  // Check personal_info has any non-empty values
  const hasPersonalInfo = data.personal_info &&
    Object.values(data.personal_info).some(v => v && String(v).trim() !== '');

  // Check if professional summary exists
  const hasSummary = data.professional_summary && data.professional_summary.trim() !== '';

  // Check if any arrays have content
  const hasExperience = data.work_experience && data.work_experience.length > 0;
  const hasEducation = data.education && data.education.length > 0;
  const hasSkills = data.skills && data.skills.length > 0;
  const hasCertifications = data.certifications && data.certifications.length > 0;
  const hasProjects = data.projects && data.projects.length > 0;
  const hasLanguages = data.languages && data.languages.length > 0;

  return hasPersonalInfo || hasSummary || hasExperience || hasEducation ||
         hasSkills || hasCertifications || hasProjects || hasLanguages;
};

export default function BuildWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canAccessFeature } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeData, setResumeData] = useState({
    personal_info: {},
    professional_summary: "",
    work_experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: []
  });
  const [resumeId, setResumeId] = useState(null);
  const [isNewResume, setIsNewResume] = useState(false); // Track if this is a new resume (not yet saved to DB)
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Continue",
    cancelText: "Cancel",
    type: "default"
  });

  useEffect(() => {
    // Initialize resume directly - free users can create resumes (rate limited on backend)
    initializeResume();
  }, []);

  const initializeResume = async () => {
    try {
      // Check if resumeId is passed in URL (for continuing existing draft)
      const urlParams = new URLSearchParams(window.location.search);
      const existingResumeId = urlParams.get('resumeId');

      if (existingResumeId) {
        // Load existing draft resume
        console.log("Loading existing resume:", existingResumeId);
        setResumeId(existingResumeId);

        // Try to get existing resume data
        try {
          const existingData = await api.entities.ResumeData.getByResumeId(existingResumeId);
          console.log("Fetched resume data from API:", JSON.stringify(existingData, null, 2));
          if (existingData) {
            // Extract only the data fields we need for the form
            // Ensure arrays are always arrays (handle corrupted data stored as objects)
            const ensureArray = (val) => Array.isArray(val) ? val : [];
            const formData = {
              personal_info: existingData.personal_info || {},
              professional_summary: existingData.professional_summary || "",
              work_experience: ensureArray(existingData.work_experience),
              education: ensureArray(existingData.education),
              skills: ensureArray(existingData.skills),
              certifications: ensureArray(existingData.certifications),
              projects: ensureArray(existingData.projects),
              languages: ensureArray(existingData.languages)
            };
            console.log("Setting form data:", JSON.stringify(formData, null, 2));
            setResumeData(formData);
            console.log("Loaded existing resume data successfully");
          }
        } catch (error) {
          console.log("No existing resume data found, starting fresh. Error:", error.message);
        }

        // Get the resume to check last_edited_step
        try {
          const resume = await api.entities.Resume.get(existingResumeId);
          if (resume.last_edited_step) {
            const stepIndex = steps.findIndex(s => s.id === resume.last_edited_step);
            if (stepIndex >= 0) {
              setCurrentStep(stepIndex);
            }
          }
        } catch (error) {
          console.log("Could not load resume details");
        }
      } else {
        // Don't create a resume yet - only create when user actually saves data
        // This prevents empty "New Resume" entries when user cancels immediately
        setIsNewResume(true);
        setResumeId(null);

        // Initialize with blank data structure
        setResumeData({
          personal_info: {},
          professional_summary: "",
          work_experience: [],
          education: [],
          skills: [],
          certifications: [],
          projects: [],
          languages: []
        });
      }
    } catch (error) {
      console.error("Error initializing resume:", error);
      setNotification({
        open: true,
        title: "Error",
        message: "Failed to load resume. Please try again.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepData = (stepData) => {
    setResumeData(prev => ({ ...prev, ...stepData }));
  };

  const saveProgress = async (showDialog = false) => {
    // Check if there's any data to save
    if (!hasResumeData(resumeData)) {
      console.log("No resume data to save, skipping");
      if (showDialog) {
        setNotification({
          open: true,
          title: "Nothing to Save",
          message: "Please add some information before saving.",
          type: "info"
        });
      }
      return false; // Return false when nothing to save
    }

    setSaving(true);
    try {
      let currentResumeId = resumeId;

      // If this is a new resume, create it first
      if (isNewResume && !currentResumeId) {
        console.log("Creating new resume in database...");
        const personalInfo = resumeData.personal_info || {};
        // Use straight apostrophe, not HTML entity
        const title = personalInfo.full_name
          ? `${personalInfo.full_name}'s Resume`
          : "New Resume";

        const newResume = await api.entities.Resume.create({
          title,
          status: "draft",
          source_type: "manual",
          last_edited_step: steps[currentStep].id
        });
        currentResumeId = newResume.id;
        setResumeId(currentResumeId);
        setIsNewResume(false);
        console.log("Created new resume with ID:", currentResumeId);
      }

      if (!currentResumeId) {
        throw new Error("Resume ID is missing. Please refresh the page and try again.");
      }

      console.log("Saving progress - resumeId:", currentResumeId);
      console.log("Resume data being saved:", JSON.stringify(resumeData, null, 2));

      // Try to get existing resume data
      let existingData = null;
      try {
        existingData = await api.entities.ResumeData.getByResumeId(currentResumeId);
        console.log("Existing resume data:", existingData);
      } catch (error) {
        // No existing data, will create new
        console.log("No existing resume data found, will create new");
      }

      if (existingData && existingData.id) {
        console.log("Updating existing resume data with ID:", existingData.id);
        console.log("Data to update:", JSON.stringify(resumeData, null, 2));
        const updateResult = await api.entities.ResumeData.update(existingData.id, resumeData);
        console.log("Update result:", JSON.stringify(updateResult, null, 2));
      } else {
        console.log("Creating new resume data");
        const createPayload = {
          resume_id: currentResumeId,
          ...resumeData
        };
        console.log("Create payload:", JSON.stringify(createPayload, null, 2));
        const createResult = await api.entities.ResumeData.create(createPayload);
        console.log("Create result:", JSON.stringify(createResult, null, 2));

        // Verify the data was actually saved by reading it back
        try {
          const verifyData = await api.entities.ResumeData.getByResumeId(currentResumeId);
          console.log("Verification read:", JSON.stringify(verifyData?.personal_info, null, 2));
          if (!verifyData?.personal_info || Object.keys(verifyData.personal_info).length === 0) {
            console.warn("WARNING: Data verification shows empty personal_info after save!");
          }
        } catch (verifyErr) {
          console.warn("Could not verify saved data:", verifyErr.message);
        }
      }

      // Update resume metadata (last_edited_step) - non-critical, don't fail if this errors
      try {
        await api.entities.Resume.update(currentResumeId, {
          last_edited_step: steps[currentStep].id
        });
      } catch (updateError) {
        console.warn("Failed to update last_edited_step (non-critical):", updateError.message);
      }

      console.log("Progress saved successfully");

      // Show success feedback
      if (showDialog) {
        setConfirmDialog({
          open: true,
          title: "Progress Saved!",
          message: "Your resume draft has been saved. You can find it on your My Resumes page to continue editing later.\n\nWould you like to return to My Resumes now?",
          onConfirm: () => {
            queryClient.invalidateQueries({ queryKey: ['my-resumes'] });
            navigate(createPageUrl("MyResumes"));
          },
          confirmText: "Go to My Resumes",
          cancelText: "Continue Editing",
          type: "default"
        });
      } else {
        setNotification({
          open: true,
          title: "Saved!",
          message: "Your progress has been saved successfully.",
          type: "success"
        });
      }

      return true; // Return true on success
    } catch (error) {
      console.error("Error saving progress:", error);
      console.error("Error details:", error.response?.data || error.message);

      // Handle rate limit error with a clear message
      if (error.response?.status === 429) {
        const data = error.response.data;
        setNotification({
          open: true,
          title: "Resume Limit Reached",
          message: `You've created ${data.resumesCreated || 3} resumes today (free limit: ${data.limit || 3}/day). ${data.resetIn ? `Try again in ${data.resetIn}.` : ''} Upgrade to Premium for unlimited resumes!`,
          type: "error"
        });
      } else {
        setNotification({
          open: true,
          title: "Save Failed",
          message: error.response?.data?.error || error.message || "Failed to save progress. Please try again.",
          type: "error"
        });
      }
      return false; // Return false on error
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      console.log("handleNext called - currentStep:", currentStep, "resumeId:", resumeId);
      console.log("Current resume data:", JSON.stringify(resumeData, null, 2));

      // Check if there's any data to proceed
      if (!hasResumeData(resumeData)) {
        setNotification({
          open: true,
          title: "No Data",
          message: "Please add some information before proceeding.",
          type: "info"
        });
        return;
      }

      // Save progress and check if it succeeded
      const saveSucceeded = await saveProgress();
      if (!saveSucceeded) {
        console.log("Save failed, not proceeding to next step");
        return; // Don't proceed if save failed
      }
      console.log("Progress saved successfully");

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        console.log("Moving to next step:", currentStep + 1);
      } else {
        // Final step - navigate to review (create version only for paid users)
        console.log("Final step - completing resume");

        // Get the current resumeId (might have been set by saveProgress)
        const currentResumeId = resumeId;

        if (!currentResumeId) {
          throw new Error("Resume ID is missing. Please save your progress first.");
        }

        if (!hasResumeData(resumeData)) {
          throw new Error("Resume data is empty. Please add some information before completing.");
        }

        setSaving(true);

        // Update resume status to 'active' so it shows "Edit" instead of "Continue Wizard"
        try {
          await api.entities.Resume.update(currentResumeId, {
            status: 'active'
          });
          console.log("Resume status updated to 'active'");
        } catch (statusError) {
          console.warn("Failed to update resume status:", statusError.message);
        }

        // Only create version for users with version history access (paid users)
        if (canAccessFeature('versionHistory')) {
          console.log("Creating version with data:", {
            resume_id: currentResumeId,
            data_snapshot: resumeData,
            version_name: "Initial creation",
            notes: ""
          });

          try {
            const version = await api.entities.ResumeVersion.create({
              resume_id: currentResumeId,
              data_snapshot: resumeData,
              version_name: "Initial creation",
              notes: ""
            });
            console.log("Resume version created:", version);
          } catch (versionError) {
            console.log("Version creation skipped (feature not available):", versionError.message);
          }
        } else {
          console.log("Skipping version creation - feature not available for free tier");
        }

        setSaving(false);

        const reviewUrl = createPageUrl(`ResumeReview?id=${currentResumeId}`);
        console.log("Navigating to:", reviewUrl);
        navigate(reviewUrl);
      }
    } catch (error) {
      console.error("Error in handleNext:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      setSaving(false);

      // Show more detailed error message
      const errorMessage = error.response?.data?.error || error.message || "Failed to complete the step. Please try again.";
      setNotification({
        open: true,
        title: "Error",
        message: errorMessage || "Failed to complete the step. Please try again.",
        type: "error"
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // Invalidate my-resumes query to ensure fresh data when returning
      queryClient.invalidateQueries({ queryKey: ['my-resumes'] });
      navigate(createPageUrl("MyResumes"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Back to My Resumes" : "Previous Step"}
          </Button>

          <div className="mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Build Your Resume</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </p>
          </div>

          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => index <= currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                index === currentStep
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                  : index < currentStep
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center text-xs">
                {index + 1}
              </span>
              {step.title}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg bg-white dark:bg-slate-800">
              <CurrentStepComponent
                data={resumeData}
                onChange={handleStepData}
              />
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="px-6 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>

          <Button
            onClick={() => saveProgress(true)}
            disabled={saving}
            className="px-6 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Progress"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={saving}
            className="px-6 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {currentStep === steps.length - 1 ? "Complete & Review" : "Next Step"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
      />
    </div>
  );
}
