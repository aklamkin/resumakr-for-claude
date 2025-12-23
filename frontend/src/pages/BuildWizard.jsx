
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function BuildWizard() {
  const navigate = useNavigate();
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
  const [saving, setSaving] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const user = await api.auth.me();
      
      // Check if subscription is active and not expired
      if (user.is_subscribed && user.subscription_end_date) {
        const endDate = new Date(user.subscription_end_date);
        const now = new Date();
        const subscribed = endDate > now;
        setIsSubscribed(subscribed);
        
        // If subscribed, initialize resume
        if (subscribed) {
          await initializeResume();
        } else {
          navigate(createPageUrl("Pricing?returnUrl=BuildWizard"));
        }
      } else {
        navigate(createPageUrl("Pricing?returnUrl=BuildWizard"));
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      navigate(createPageUrl("Pricing?returnUrl=BuildWizard"));
    } finally {
      setCheckingSubscription(false);
    }
  };

  const initializeResume = async () => {
    try {
      // Always create a new blank resume for the wizard
      // This ensures "+ Create Resume" starts fresh every time
      const newResume = await api.entities.Resume.create({
        title: "New Resume",
        status: "draft",
        source_type: "manual",
        last_edited_step: "personal"
      });
      setResumeId(newResume.id);

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
    } catch (error) {
      console.error("Error initializing resume:", error);
      // Optionally, navigate to an error page or show a message
    }
  };

  const handleStepData = (stepData) => {
    setResumeData(prev => ({ ...prev, ...stepData }));
  };

  const saveProgress = async () => {
    if (!resumeId) {
      console.error("Cannot save progress: resumeId is missing");
      throw new Error("Resume ID is missing. Please refresh the page and try again.");
    }

    console.log("Saving progress - resumeId:", resumeId);
    console.log("Resume data being saved:", JSON.stringify(resumeData, null, 2));

    setSaving(true);
    try {
      // Try to get existing resume data
      let existingData = null;
      try {
        existingData = await api.entities.ResumeData.getByResumeId(resumeId);
        console.log("Existing resume data:", existingData);
      } catch (error) {
        // No existing data, will create new
        console.log("No existing resume data found, will create new");
      }

      if (existingData && existingData.id) {
        console.log("Updating existing resume data with ID:", existingData.id);
        await api.entities.ResumeData.update(existingData.id, resumeData);
      } else {
        console.log("Creating new resume data");
        await api.entities.ResumeData.create({
          resume_id: resumeId,
          ...resumeData
        });
      }

      await api.entities.Resume.update(resumeId, {
        last_edited_step: steps[currentStep].id
      });

      console.log("Progress saved successfully");
    } catch (error) {
      console.error("Error saving progress:", error);
      console.error("Error details:", error.response?.data || error.message);
      throw error; // Re-throw so handleNext can catch it
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      console.log("handleNext called - currentStep:", currentStep, "resumeId:", resumeId);
      console.log("Current resume data:", JSON.stringify(resumeData, null, 2));

      await saveProgress();
      console.log("Progress saved successfully");

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        console.log("Moving to next step:", currentStep + 1);
      } else {
        // Final step - create version and navigate to review
        console.log("Final step - creating resume version");

        if (!resumeId) {
          throw new Error("Resume ID is missing. Please refresh the page and try again.");
        }

        if (!resumeData || Object.keys(resumeData).length === 0) {
          throw new Error("Resume data is empty. Please add some information before completing.");
        }

        setSaving(true);

        console.log("Creating version with data:", {
          resume_id: resumeId,
          data_snapshot: resumeData,
          version_name: "Initial creation",
          notes: ""
        });

        const version = await api.entities.ResumeVersion.create({
          resume_id: resumeId,
          data_snapshot: resumeData,
          version_name: "Initial creation",
          notes: ""
        });

        console.log("Resume version created:", version);
        setSaving(false);

        const reviewUrl = createPageUrl(`ResumeReview?id=${resumeId}`);
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
      alert(`Error: ${errorMessage}\n\nCheck the browser console for more details.`);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(createPageUrl("Home"));
    }
  };

  if (checkingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return null; // Will redirect in useEffect if not subscribed
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
            {currentStep === 0 ? "Back to Home" : "Previous Step"}
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
            onClick={saveProgress}
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
    </div>
  );
}
