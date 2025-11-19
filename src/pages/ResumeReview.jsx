import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Edit2, Save, X, Lock } from "lucide-react";
import { motion } from "framer-motion";

// Custom hooks
import { useScrollPosition } from "../components/hooks/useScrollPosition";
import { useResumeData } from "../components/hooks/useResumeData";
import { useVersionControl } from "../components/hooks/useVersionControl";
import { useAIImprovement } from "../components/hooks/useAIImprovement";

// Components
import ResumeHeader from "../components/resume/ResumeHeader";
import ActionButtonsBar from "../components/resume/ActionButtonsBar";
import ATSAnalysisCard from "../components/resume/ATSAnalysisCard";
import PersonalInfoSection from "../components/resume/sections/PersonalInfoSection";
import ProfessionalSummarySection from "../components/resume/sections/ProfessionalSummarySection";
import WorkExperienceSection from "../components/resume/sections/WorkExperienceSection";
import EducationSection from "../components/resume/sections/EducationSection";
import SkillsSection from "../components/resume/sections/SkillsSection";
import VersionHistoryModal from "../components/resume/VersionHistoryModal";
import DesignWithAIModal from "../components/resume/DesignWithAIModal";
import CoverLetterModal from "../components/resume/CoverLetterModal";
import { NotificationPopup, ConfirmDialog } from "../components/ui/notification";

export default function ResumeReview() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const resumeId = urlParams.get("id");

  // Custom hooks
  const {
    resume,
    resumeData,
    loading,
    error,
    setResumeData,
    updateResumeData,
    updateResumeTitle,
    reloadResume
  } = useResumeData(resumeId);

  const {
    versions,
    versionCount,
    savingVersion,
    saveVersion,
    restoreVersion,
    renameVersion,
    deleteVersion
  } = useVersionControl(resumeId, resumeData);

  const { editButtonRightOffset, isEditButtonFixed } = useScrollPosition();

  // Local state
  const [jobDescription, setJobDescription] = useState("");
  const [providers, setProviders] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // AI Improvement hook
  const aiHelpers = useAIImprovement(resumeData, setResumeData, providers, prompts);

  // Modals
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);

  // Notifications
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  // ATS Analysis
  const [analyzingATS, setAnalyzingATS] = useState(false);
  const [showAtsResults, setShowAtsResults] = useState(false);

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  useEffect(() => {
    checkSubscription();
    loadProviders();
    loadPrompts();
  }, []);

  useEffect(() => {
    if (resumeData) {
      setJobDescription(resumeData.job_description || "");
      if (resumeData.ats_analysis_results?.score !== undefined &&
      resumeData.job_description?.trim()) {
        setShowAtsResults(true);
      }
    }
  }, [resumeData]);

  const checkSubscription = async () => {
    try {
      const user = await base44.auth.me();

      // Check if subscription is active and not expired
      if (user.is_subscribed && user.subscription_end_date) {
        const endDate = new Date(user.subscription_end_date);
        const now = new Date();
        setIsSubscribed(endDate > now);

        // If expired, update the user status
        if (endDate <= now) {
          await base44.auth.updateMe({ is_subscribed: false });
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error("Failed to check subscription:", err);
      setIsSubscribed(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscriptionRequired = () => {
    navigate(createPageUrl(`Pricing?returnUrl=ResumeReview?id=${resumeId}`));
  };

  const loadProviders = async () => {
    try {
      const user = await base44.auth.me();
      const providersList = await base44.entities.AIProvider.filter({ created_by: user.email }, "order");
      setProviders(providersList);
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  const loadPrompts = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;
      const promptsList = await base44.entities.CustomPrompt.filter({ created_by: user.email });
      setPrompts(promptsList);
    } catch (err) {
      console.error("Failed to load prompts:", err);
    }
  };

  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value);
  };

  const handleJobDescriptionBlur = async () => {
    if (!resumeId) {
      console.warn("Resume ID is missing, cannot save job description.");
      return;
    }

    const currentJD = jobDescription.trim();

    if (resumeData && currentJD === (resumeData.job_description || "").trim() && resumeData.id) {
      return;
    }

    setSaving(true);
    try {
      let dataId = resumeData?.id;

      if (!dataId) {
        const newData = await base44.entities.ResumeData.create({
          resume_id: resumeId,
          job_description: currentJD
        });
        dataId = newData.id;
        setResumeData(newData);
      } else {
        await base44.entities.ResumeData.update(dataId, { job_description: currentJD });
        setResumeData((prev) => ({ ...prev, job_description: currentJD }));
      }
    } catch (err) {
      showNotification("Failed to save job description.", "Save Failed", "error");
      console.error("Error saving job description:", err);
    } finally {
      setSaving(false);
    }
  };


  const analyzeATS = async () => {
    if (analyzingATS) return;

    const currentJD = jobDescription.trim();

    if (!currentJD) {
      showNotification("Please add a job description first.", "Job Description Required", "error");
      return;
    }

    if (!isSubscribed) {
      handleSubscriptionRequired();
      return;
    }

    setAnalyzingATS(true);
    setShowAtsResults(true);

    try {
      let dataId = resumeData?.id;

      if (!dataId) {
        const newData = await base44.entities.ResumeData.create({
          resume_id: resumeId,
          job_description: currentJD
        });
        dataId = newData.id;
        setResumeData(newData);
      } else if (currentJD !== (resumeData.job_description || "").trim()) {
        await base44.entities.ResumeData.update(dataId, { job_description: currentJD });
        setResumeData((prev) => ({ ...prev, job_description: currentJD }));
      }

      const existingResults = resumeData?.ats_analysis_results;
      if (existingResults && existingResults.analyzed_job_description === currentJD) {
        const currentResumeContent = {
          personal_info: resumeData.personal_info || {},
          professional_summary: resumeData.professional_summary || "",
          work_experience: resumeData.work_experience || [],
          skills: resumeData.skills || [],
          education: resumeData.education || []
        };

        const resumeUnchanged =
        JSON.stringify(existingResults.analyzed_resume_snapshot) === JSON.stringify(currentResumeContent);

        if (resumeUnchanged) {
          showNotification(
            "Showing cached ATS analysis. The resume and job description haven't changed since the last analysis.",
            "Using Cached Results"
          );
          setAnalyzingATS(false);
          return;
        }
      }

      const resumeContent = {
        personal_info: resumeData.personal_info || {},
        professional_summary: resumeData.professional_summary || "",
        work_experience: resumeData.work_experience || [],
        skills: resumeData.skills || [],
        education: resumeData.education || []
      };

      const resumeText = `
Professional Summary: ${resumeContent.professional_summary}

Work Experience:
${resumeContent.work_experience.map((exp) => `
- ${exp.position} at ${exp.company}
  ${exp.responsibilities?.join('\n  ') || ''}
`).join('\n')}

Skills:
${resumeContent.skills.map((cat) => `${cat.category}: ${cat.items?.join(', ') || ''}`).join('\n')}

Education:
${resumeContent.education.map((edu) => `${edu.degree} in ${edu.field_of_study || 'N/A'} from ${edu.institution}`).join('\n')}
      `.trim();

      const prompt = `You are an expert ATS analyzer. Analyze this resume against the job description.

Job Description:
${currentJD}

Resume Content:
${resumeText}

Return analysis in JSON format with: score (0-100), keywords_extracted_jd, keywords_found_resume, missing_keywords, and recommendations.`;

      const atsSchema = {
        type: "object",
        properties: {
          score: { type: "number" },
          keywords_extracted_jd: { type: "array", items: { type: "string" } },
          keywords_found_resume: { type: "array", items: { type: "string" } },
          missing_keywords: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["score", "keywords_extracted_jd", "keywords_found_resume", "missing_keywords", "recommendations"]
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: atsSchema
      });

      const analysisResults = {
        ...response,
        analyzed_at: new Date().toISOString(),
        analyzed_job_description: currentJD,
        analyzed_resume_snapshot: resumeContent
      };

      await base44.entities.ResumeData.update(dataId, { ats_analysis_results: analysisResults });
      setResumeData((prev) => ({ ...prev, ats_analysis_results: analysisResults }));

      showNotification(
        `ATS Score: ${response.score}/100. Found ${response.keywords_found_resume?.length || 0} matching keywords.`,
        "ATS Analysis Complete"
      );
    } catch (err) {
      showNotification("Failed to analyze ATS compatibility.", "Analysis Failed", "error");
      console.error("ATS Analysis error:", err);
    } finally {
      setAnalyzingATS(false);
    }
  };

  const handleSaveVersion = async () => {
    const version = await saveVersion();
    if (version) {
      showNotification(`Saved as Version ${version.version_number}!`, "Version Saved");
    } else {
      showNotification("Failed to save version.", "Error", "error");
    }
  };

  const handleRestoreVersion = async (version, saveCurrentFirst) => {
    try {
      if (saveCurrentFirst) {
        await saveVersion(`Saved before restoring to Version ${version.version_number}`);
      }
      const restoredData = await restoreVersion(version);
      if (restoredData) {
        setResumeData(restoredData);
        setShowVersionModal(false);
        await reloadResume();
        showNotification(`Successfully restored to ${version.version_name || `Version ${version.version_number}`}`, "Version Restored");
      } else {
        showNotification("Failed to restore version.", "Error", "error");
      }
    } catch (err) {
      showNotification("Failed to restore version.", "Error", "error");
    }
  };

  const handleRenameVersion = async (versionId, newName, newNotes) => {
    const success = await renameVersion(versionId, newName, newNotes);
    if (!success) {
      showNotification("Failed to rename version.", "Error", "error");
    }
  };

  const handleDeleteVersion = async (versionId) => {
    const success = await deleteVersion(versionId);
    if (success) {
      showNotification("Version deleted successfully.", "Version Deleted");
    } else {
      showNotification("Failed to delete version.", "Error", "error");
    }
  };

  const handleSaveTemplate = async (templateId, templateName, customColors, customFonts) => {
    if (!resumeData?.id) {
      showNotification("Resume data not loaded.", "Error", "error");
      return;
    }

    try {
      // Update the resumeData with template info
      const updatedData = {
        ...resumeData,
        template_id: templateId,
        template_name: templateName,
        template_custom_colors: customColors || null,
        template_custom_fonts: customFonts || null
      };

      await base44.entities.ResumeData.update(resumeData.id, updatedData);
      setResumeData(updatedData);

      // Pass updatedData directly to saveVersion to avoid stale state
      const newVersion = await saveVersion(
        `${templateName} Template`, 
        `Resume styled with ${templateName} template`,
        updatedData
      );

      if (newVersion) {
        showNotification(`Template version saved as Version ${newVersion.version_number}!`, "Version Saved");
      } else {
        showNotification("Failed to save template version.", "Error", "error");
      }

      setShowDesignModal(false);
      await reloadResume();
    } catch (err) {
      showNotification("Failed to save template.", "Error", "error");
      console.error("Template save error:", err);
    }
  };

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">{checkingSubscription ? "Checking subscription..." : "Loading your resume..."}</p>
        </div>
      </div>);

  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || "Resume not found"}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(createPageUrl("MyResumes"))} className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>);

  }

  const displayData = editMode ? editedData : resumeData;
  const atsResults = resumeData?.ats_analysis_results;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("MyResumes"))} className="text-gray-500 mb-6 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-9 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300">


            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Resumes
          </Button>

          {/* Subscription Warning Banner */}
          {!isSubscribed &&
          <Card className="p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-200">Subscription Required</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">Subscribe to edit and use AI features.</p>
                  </div>
                </div>
                <Button
                onClick={handleSubscriptionRequired}
                className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white">

                  Subscribe Now
                </Button>
              </div>
            </Card>
          }

          <ResumeHeader
            title={resume.title}
            onSave={async (newTitle) => {
              if (!isSubscribed) {
                handleSubscriptionRequired();
                return false;
              }
              const success = await updateResumeTitle(newTitle);
              if (success) {
                showNotification("Title updated successfully!", "Title Saved");
              } else {
                showNotification("Failed to save title.", "Error", "error");
              }
              return success;
            }}
            editMode={editMode} />


          {!editMode &&
          <ATSAnalysisCard
            jobDescription={jobDescription}
            onJobDescriptionChange={handleJobDescriptionChange}
            onJobDescriptionBlur={handleJobDescriptionBlur}
            onAnalyze={isSubscribed ? analyzeATS : handleSubscriptionRequired}
            analyzing={analyzingATS}
            saving={saving}
            atsResults={atsResults}
            showResults={showAtsResults}
            onToggleResults={() => setShowAtsResults(!showAtsResults)}
            isSubscribed={isSubscribed} />

          }
        </motion.div>

        <ActionButtonsBar
          editMode={editMode}
          versionCount={versionCount}
          savingVersion={savingVersion}
          jobDescription={jobDescription}
          hasCoverLetter={!!(resumeData?.cover_letter_short || resumeData?.cover_letter_long)}
          onVersionsClick={isSubscribed ? () => setShowVersionModal(true) : handleSubscriptionRequired}
          onSaveVersion={isSubscribed ? handleSaveVersion : handleSubscriptionRequired}
          onCoverLetterClick={isSubscribed ? () => setShowCoverLetterModal(true) : handleSubscriptionRequired}
          onDesignClick={isSubscribed ? () => setShowDesignModal(true) : handleSubscriptionRequired}
          isSubscribed={isSubscribed} />


        {/* Fixed Edit/Save buttons when scrolled */}
        {isEditButtonFixed &&
        <div
          className="fixed z-40 transition-all duration-200"
          style={{
            top: '80px',
            right: `${editButtonRightOffset + 24}px`
          }}>

            {!editMode ?
          <Button
            variant="outline"
            onClick={() => {
              if (!isSubscribed) {
                handleSubscriptionRequired();
                return;
              }
              setEditedData(JSON.parse(JSON.stringify(resumeData)));
              setEditMode(true);
            }}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100"
            disabled={!isSubscribed}>

                <Edit2 className="w-4 h-4 mr-2" />
                Edit Data
              </Button> :

          <div className="flex gap-2">
                <Button
              variant="outline"
              onClick={() => {
                setEditMode(false);
                setEditedData(null);
              }}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100">

                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
              onClick={async () => {
                setSaving(true);
                try {
                  await base44.entities.ResumeData.update(resumeData.id, editedData);
                  setResumeData(editedData);
                  setEditMode(false);
                  showNotification("Changes saved successfully!", "Saved");
                } catch (err) {
                  showNotification("Failed to save changes.", "Error", "error");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-lg">

                  {saving ?
              <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </> :

              <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
              }
                </Button>
              </div>
          }
          </div>
        }

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative">

          <Card id="resume-card" className={`p-12 border-2 shadow-lg bg-white dark:bg-slate-800 ${
          !isSubscribed ? "opacity-75 border-yellow-300 dark:border-yellow-700" : "border-slate-200 dark:border-slate-700"}`
          }>
            {/* Edit Data / Save & Cancel buttons */}
            <div
              id="edit-button-container"
              className="absolute top-6 right-6"
              style={{ visibility: isEditButtonFixed ? 'hidden' : 'visible' }}>

              {!editMode ?
              <Button
                variant="outline"
                onClick={() => {
                  if (!isSubscribed) {
                    handleSubscriptionRequired();
                    return;
                  }
                  setEditedData(JSON.parse(JSON.stringify(resumeData)));
                  setEditMode(true);
                }}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100"
                disabled={!isSubscribed}>

                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Data
                </Button> :

              <div className="flex gap-2">
                  <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false);
                    setEditedData(null);
                  }}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100">

                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await base44.entities.ResumeData.update(resumeData.id, editedData);
                      setResumeData(editedData);
                      setEditMode(false);
                      showNotification("Changes saved successfully!", "Saved");
                    } catch (err) {
                      showNotification("Failed to save changes.", "Error", "error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-lg">

                    {saving ?
                  <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </> :

                  <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                  }
                  </Button>
                </div>
              }
            </div>

            <div className="space-y-8">
              <PersonalInfoSection
                personalInfo={displayData?.personal_info || {}}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, personal_info: updated });
                  }
                }} />


              <ProfessionalSummarySection
                summary={displayData?.professional_summary}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, professional_summary: updated });
                  }
                }}
                aiHelpers={{ ...aiHelpers, providers }}
                isSubscribed={isSubscribed}
                onSubscriptionRequired={handleSubscriptionRequired}
                atsResults={atsResults} />


              <WorkExperienceSection
                workExperience={displayData?.work_experience || []}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, work_experience: updated });
                  }
                }}
                aiHelpers={{ ...aiHelpers, providers }}
                isSubscribed={isSubscribed}
                onSubscriptionRequired={handleSubscriptionRequired}
                atsResults={atsResults} />


              <EducationSection
                education={displayData?.education || []}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, education: updated });
                  }
                }} />


              <SkillsSection
                skills={displayData?.skills || []}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, skills: updated });
                  }
                }}
                aiHelpers={{ ...aiHelpers, providers }}
                isSubscribed={isSubscribed}
                onSubscriptionRequired={handleSubscriptionRequired}
                atsResults={atsResults} />

            </div>
          </Card>
        </motion.div>
      </div>

      {/* Modals */}
      <VersionHistoryModal
        open={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        versions={versions}
        onRestore={handleRestoreVersion}
        onRename={handleRenameVersion}
        onDelete={handleDeleteVersion} />


      <DesignWithAIModal
        open={showDesignModal}
        onClose={() => setShowDesignModal(false)}
        resumeData={resumeData}
        onSaveTemplate={handleSaveTemplate} />


      <CoverLetterModal
        open={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
        resumeData={resumeData}
        jobDescription={jobDescription}
        onCoverLetterSaved={(coverLetterData) => {
          setResumeData(prev => ({ ...prev, ...coverLetterData }));
        }} />


      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type} />


      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message} />

    </div>);

}