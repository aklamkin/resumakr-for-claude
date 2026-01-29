import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Edit2, Save, X, Lock, Download, Crown, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { formatResumeDate } from "../components/utils/dateUtils";

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

  // Auth context for tier-based feature access
  const { canAccessFeature, isPaid, aiCredits, loading: authLoading } = useAuth();

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
  const [pdfStatus, setPdfStatus] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  // AI Improvement hook (must come after showNotification is declared)
  const aiHelpers = useAIImprovement(resumeData, setResumeData, providers, prompts, showNotification);

  useEffect(() => {
    loadProviders();
    loadPrompts();
    loadPdfStatus();
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

  const loadPdfStatus = async () => {
    try {
      const status = await api.exports.getPdfStatus();
      setPdfStatus(status);
    } catch (err) {
      console.error("Failed to load PDF status:", err);
    }
  };

  const handleUpgradeClick = () => {
    navigate(createPageUrl(`Pricing?returnUrl=ResumeReview?id=${resumeId}`));
  };

  // Preserve scroll position across edit mode transitions
  const withScrollPreserve = (fn) => {
    const container = document.getElementById('main-scroll-container');
    const scrollTop = container?.scrollTop || 0;
    fn();
    requestAnimationFrame(() => {
      if (container) container.scrollTop = scrollTop;
    });
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;

    // Check if user can download
    if (pdfStatus && pdfStatus.remaining <= 0 && !isPaid) {
      showNotification(
        "You've used your free PDF download this month. Upgrade for unlimited downloads!",
        "Download Limit Reached",
        "error"
      );
      return;
    }

    if (!resumeData) {
      showNotification("Resume data not loaded.", "Error", "error");
      return;
    }

    setDownloadingPdf(true);
    try {
      // Record the download with the API
      await api.exports.recordPdfDownload();

      // Generate and open print dialog
      const personalInfo = resumeData.personal_info || {};
      const htmlContent = generatePrintableHTML(resumeData, personalInfo, pdfStatus?.watermark);

      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);

      // Refresh PDF status
      await loadPdfStatus();

      const message = pdfStatus?.watermark
        ? "Print dialog opened. Save as PDF. Note: Free tier PDFs include a watermark."
        : "Print dialog opened. Save as PDF from the print options.";
      showNotification(message, "Export to PDF");
    } catch (err) {
      console.error("PDF download error:", err);
      if (err.response?.status === 403) {
        showNotification(
          "Download limit exceeded. Upgrade for unlimited downloads!",
          "Limit Reached",
          "error"
        );
      } else {
        showNotification("Failed to generate PDF.", "Download Failed", "error");
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Generate printable HTML for PDF export
  const generatePrintableHTML = (data, personalInfo, showWatermark) => {
    const workExperience = data.work_experience || [];
    const education = data.education || [];
    const skills = data.skills || [];
    const summary = data.professional_summary || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${personalInfo.full_name || 'Resume'}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .watermark { position: fixed; bottom: 20px; right: 20px; opacity: 0.3; font-size: 12px; color: #666; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
          h1 { color: #1e40af; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px; margin-top: 25px; font-size: 18px; }
          .contact { color: #666; margin-bottom: 20px; font-size: 14px; }
          .contact a { color: #1e40af; text-decoration: none; }
          .job, .edu { margin-bottom: 15px; }
          .job-header, .edu-header { display: flex; justify-content: space-between; align-items: baseline; }
          .job-title, .edu-degree { font-weight: bold; color: #1e3a5f; }
          .company, .school { color: #4a5568; font-style: italic; }
          .dates { color: #718096; font-size: 14px; }
          .description { margin-top: 8px; }
          ul { margin: 8px 0; padding-left: 20px; }
          li { margin-bottom: 4px; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill { background: #e2e8f0; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
          .watermark { position: fixed; bottom: 20px; right: 20px; opacity: 0.4; font-size: 11px; color: #888; }
        </style>
      </head>
      <body>
        ${showWatermark ? '<div class="watermark">Created with Resumakr.us - Free Tier</div>' : ''}

        <h1>${personalInfo.full_name || 'Your Name'}</h1>
        <div class="contact">
          ${personalInfo.email ? `<a href="mailto:${personalInfo.email}">${personalInfo.email}</a>` : ''}
          ${personalInfo.phone ? ` | ${personalInfo.phone}` : ''}
          ${personalInfo.location ? ` | ${personalInfo.location}` : ''}
          ${personalInfo.linkedin ? ` | <a href="${personalInfo.linkedin}" target="_blank">LinkedIn</a>` : ''}
        </div>

        ${summary ? `<h2>Professional Summary</h2><p>${summary}</p>` : ''}

        ${workExperience.length > 0 ? `
          <h2>Work Experience</h2>
          ${workExperience.map(job => `
            <div class="job">
              <div class="job-header">
                <span class="job-title">${job.position || job.title || ''}</span>
                <span class="dates">${formatResumeDate(job.start_date)} - ${job.current ? 'Present' : formatResumeDate(job.end_date) || 'Present'}</span>
              </div>
              <div class="company">${job.company || ''}</div>
              ${job.description ? `<div class="description">${job.description}</div>` : ''}
              ${job.achievements && job.achievements.length > 0 ? `
                <ul>
                  ${job.achievements.map(a => `<li>${a}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        ` : ''}

        ${education.length > 0 ? `
          <h2>Education</h2>
          ${education.map(edu => `
            <div class="edu">
              <div class="edu-header">
                <span class="edu-degree">${edu.degree || ''}</span>
                <span class="dates">${formatResumeDate(edu.graduation_date) || formatResumeDate(edu.end_date) || ''}</span>
              </div>
              <div class="school">${edu.institution || edu.school || ''}</div>
              ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}

        ${skills.length > 0 ? `
          <h2>Skills</h2>
          ${skills.map(skill => {
            if (typeof skill === 'string') {
              return `<div class="skills"><span class="skill">${skill}</span></div>`;
            }
            if (skill.category && skill.items?.length > 0) {
              return `<div style="margin-bottom: 8px;">
                <strong style="color: #1e3a5f;">${skill.category}:</strong>
                <span style="margin-left: 6px;">${skill.items.join(', ')}</span>
              </div>`;
            }
            if (skill.name) {
              return `<div class="skills"><span class="skill">${skill.name}</span></div>`;
            }
            return '';
          }).join('')}
        ` : ''}
      </body>
      </html>
    `;
  };

  const loadProviders = async () => {
    try {
      const user = await api.auth.me();
      const providersList = await api.entities.AIProvider.filter({ created_by: user.email }, "order");
      setProviders(providersList);
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  const loadPrompts = async () => {
    try {
      const promptsList = await api.entities.CustomPrompt.list();
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
        const newData = await api.entities.ResumeData.create({
          resume_id: resumeId,
          job_description: currentJD
        });
        dataId = newData.id;
        setResumeData(newData);
      } else {
        await api.entities.ResumeData.update(dataId, { job_description: currentJD });
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

    // Check if user has AI credits remaining (free users get 5 total)
    if (!isPaid && aiCredits && aiCredits.remaining <= 0) {
      showNotification(
        "You've used all your free AI credits. Upgrade for unlimited AI features!",
        "AI Credits Exhausted",
        "error"
      );
      return;
    }

    setAnalyzingATS(true);
    setShowAtsResults(true);

    try {
      let dataId = resumeData?.id;

      if (!dataId) {
        const newData = await api.entities.ResumeData.create({
          resume_id: resumeId,
          job_description: currentJD
        });
        dataId = newData.id;
        setResumeData(newData);
      } else if (currentJD !== (resumeData.job_description || "").trim()) {
        await api.entities.ResumeData.update(dataId, { job_description: currentJD });
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

      // Use the dedicated ATS analysis endpoint
      const analysisResults = await api.integrations.Core.analyzeATS(currentJD, resumeContent);

      await api.entities.ResumeData.update(dataId, { ats_analysis_results: analysisResults });
      setResumeData((prev) => ({ ...prev, ats_analysis_results: analysisResults }));

      showNotification(
        `ATS Score: ${analysisResults.score}/100. Found ${analysisResults.keywords_found_resume?.length || 0} matching keywords.`,
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

      await api.entities.ResumeData.update(resumeData.id, updatedData);
      setResumeData(updatedData);

      // Only create version if user has access to version history (paid feature)
      if (canAccessFeature('versionHistory')) {
        const newVersion = await saveVersion(
          `${templateName} Template`,
          `Resume styled with ${templateName} template`,
          updatedData
        );

        if (newVersion) {
          showNotification(`Template saved as Version ${newVersion.version_number}!`, "Template Applied");
        } else {
          // Version creation failed but template was saved
          showNotification(`${templateName} template applied!`, "Template Applied");
        }
      } else {
        // Free user - template saved without version
        showNotification(`${templateName} template applied to your resume!`, "Template Applied");
      }

      setShowDesignModal(false);
      await reloadResume();
    } catch (err) {
      showNotification("Failed to save template.", "Error", "error");
      console.error("Template save error:", err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading your resume...</p>
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

          {/* Free tier info banner - shows what free users can do */}
          {!isPaid && (
            <Card className="p-4 mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-200">Free Plan</p>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
                      <p>✓ View resume &nbsp; ✓ PDF credits: {pdfStatus?.remaining ?? 5}/{pdfStatus?.limit ?? 5}{pdfStatus?.watermark ? ' (with watermark)' : ''}</p>
                      <p className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> AI Credits: {aiCredits?.remaining ?? 5}/{aiCredits?.total ?? 5} remaining
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleUpgradeClick}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade for More
                </Button>
              </div>
            </Card>
          )}

          <ResumeHeader
            title={resume.title}
            onSave={async (newTitle) => {
              const success = await updateResumeTitle(newTitle);
              if (success) {
                showNotification("Title updated successfully!", "Title Saved");
              } else {
                showNotification("Failed to save title.", "Error", "error");
              }
              return success;
            }}
            editMode={editMode} />


          <ATSAnalysisCard
            jobDescription={jobDescription}
            onJobDescriptionChange={handleJobDescriptionChange}
            onJobDescriptionBlur={handleJobDescriptionBlur}
            onAnalyze={analyzeATS}
            analyzing={analyzingATS}
            saving={saving}
            atsResults={atsResults}
            showResults={showAtsResults}
            onToggleResults={() => setShowAtsResults(!showAtsResults)}
            isSubscribed={true}
            aiCredits={aiCredits}
            isPaid={isPaid}
          />
        </motion.div>

        <ActionButtonsBar
          editMode={editMode}
          versionCount={versionCount}
          savingVersion={savingVersion}
          jobDescription={jobDescription}
          hasCoverLetter={!!(resumeData?.cover_letter_short || resumeData?.cover_letter_long)}
          onVersionsClick={canAccessFeature('versionHistory') ? () => setShowVersionModal(true) : handleUpgradeClick}
          onSaveVersion={canAccessFeature('versionHistory') ? handleSaveVersion : handleUpgradeClick}
          onCoverLetterClick={canAccessFeature('coverLetters') ? () => setShowCoverLetterModal(true) : handleUpgradeClick}
          onDesignClick={() => setShowDesignModal(true)}
          onDownloadPdf={handleDownloadPdf}
          downloadingPdf={downloadingPdf}
          pdfStatus={pdfStatus}
          isPaid={isPaid}
          canAccessVersionHistory={canAccessFeature('versionHistory')}
          canAccessCoverLetters={canAccessFeature('coverLetters')} />


        {/* Fixed Edit/Save buttons when scrolled */}
        {isEditButtonFixed && (
          <div
            className="fixed z-40 transition-all duration-200"
            style={{
              top: '80px',
              right: `${editButtonRightOffset + 24}px`
            }}
          >
            {!editMode ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (!isPaid) {
                    handleUpgradeClick();
                    return;
                  }
                  withScrollPreserve(() => {
                    setEditedData(JSON.parse(JSON.stringify(resumeData)));
                    setEditMode(true);
                  });
                }}
                className={`shadow-lg ${
                  isPaid
                    ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                    : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                }`}
                title={!isPaid ? "Premium feature - Upgrade to edit data" : "Edit resume data"}
              >
                {!isPaid && <Lock className="w-3 h-3 mr-1.5" />}
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Data
                {!isPaid && <Crown className="w-3 h-3 ml-1.5 text-amber-500" />}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    withScrollPreserve(() => {
                      setEditMode(false);
                      setEditedData(null);
                    });
                  }}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await api.entities.ResumeData.update(resumeData.id, editedData);
                      withScrollPreserve(() => {
                        setResumeData(editedData);
                        setEditMode(false);
                      });
                      showNotification("Changes saved successfully!", "Saved");
                    } catch (err) {
                      showNotification("Failed to save changes.", "Error", "error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative">

          <Card id="resume-card" className="p-12 border-2 shadow-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {/* Edit Data / Save & Cancel buttons */}
            <div
              id="edit-button-container"
              className="absolute top-6 right-6"
              style={{ visibility: isEditButtonFixed ? 'hidden' : 'visible' }}
            >
              {!editMode ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!isPaid) {
                      handleUpgradeClick();
                      return;
                    }
                    withScrollPreserve(() => {
                      setEditedData(JSON.parse(JSON.stringify(resumeData)));
                      setEditMode(true);
                    });
                  }}
                  className={`shadow-lg ${
                    isPaid
                      ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                      : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                  }`}
                  title={!isPaid ? "Premium feature - Upgrade to edit data" : "Edit resume data"}
                >
                  {!isPaid && <Lock className="w-3 h-3 mr-1.5" />}
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Data
                  {!isPaid && <Crown className="w-3 h-3 ml-1.5 text-amber-500" />}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      withScrollPreserve(() => {
                        setEditMode(false);
                        setEditedData(null);
                      });
                    }}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await api.entities.ResumeData.update(resumeData.id, editedData);
                        withScrollPreserve(() => {
                          setResumeData(editedData);
                          setEditMode(false);
                        });
                        showNotification("Changes saved successfully!", "Saved");
                      } catch (err) {
                        showNotification("Failed to save changes.", "Error", "error");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
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
                isSubscribed={isPaid || (aiCredits?.remaining > 0)}
                onSubscriptionRequired={handleUpgradeClick}
                atsResults={atsResults}
                aiCredits={aiCredits}
                isPaid={isPaid} />


              <WorkExperienceSection
                workExperience={displayData?.work_experience || []}
                editMode={editMode}
                onUpdate={(updated) => {
                  if (editMode) {
                    setEditedData({ ...editedData, work_experience: updated });
                  }
                }}
                aiHelpers={{ ...aiHelpers, providers }}
                isSubscribed={isPaid || (aiCredits?.remaining > 0)}
                onSubscriptionRequired={handleUpgradeClick}
                atsResults={atsResults}
                aiCredits={aiCredits}
                isPaid={isPaid} />


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
                isSubscribed={isPaid || (aiCredits?.remaining > 0)}
                onSubscriptionRequired={handleUpgradeClick}
                atsResults={atsResults}
                aiCredits={aiCredits}
                isPaid={isPaid} />

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
        onSaveTemplate={handleSaveTemplate}
        isPremiumUser={isPaid} />


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