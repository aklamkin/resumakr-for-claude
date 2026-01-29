import React from "react";
import { Button } from "@/components/ui/button";
import { History, Save, Loader2, FileText, Sparkles, Download, Lock, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActionButtonsBar({
  editMode,
  versionCount,
  savingVersion,
  jobDescription,
  hasCoverLetter,
  onVersionsClick,
  onSaveVersion,
  onCoverLetterClick,
  onDesignClick,
  onDownloadPdf,
  downloadingPdf = false,
  pdfStatus,
  isPaid = false,
  canAccessVersionHistory = false,
  canAccessCoverLetters = false
}) {
  const canDownloadPdf = isPaid || (pdfStatus?.remaining > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-8 relative"
    >
      {/* Frost overlay when in edit mode */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute z-10 pointer-events-auto"
            style={{
              cursor: "default",
              inset: "-16px -48px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              maskImage: "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent), linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent), linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "destination-in",
            }}
          >
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                background: "rgba(255,255,255,0.25)",
              }}
            />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                background: "rgba(15,23,42,0.25)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex justify-between items-center gap-3 flex-wrap transition-all duration-400 ${
          editMode ? "select-none pointer-events-none" : ""
        }`}
      >
        <div className="flex gap-3 flex-wrap">
          {/* PDF Download - Available to all with limits */}
          <Button
            onClick={onDownloadPdf}
            disabled={downloadingPdf || !canDownloadPdf}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white shadow-md"
            title={
              !canDownloadPdf
                ? "Monthly PDF limit reached"
                : pdfStatus?.watermark
                ? "Download PDF (with watermark)"
                : "Download PDF"
            }
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
                {!isPaid && pdfStatus && (
                  <span className="ml-1 text-xs opacity-75">({pdfStatus.remaining}/{pdfStatus.limit})</span>
                )}
              </>
            )}
          </Button>

          {/* Version History - Premium Feature */}
          <Button
            onClick={onVersionsClick}
            className={`shadow-md ${
              canAccessVersionHistory
                ? "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white"
                : "bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
            }`}
            title={!canAccessVersionHistory ? "Premium feature - Upgrade to access" : "View document versions"}
          >
            {!canAccessVersionHistory && <Lock className="w-3 h-3 mr-1.5" />}
            <History className="w-4 h-4 mr-2" />
            Versions ({versionCount})
            {!canAccessVersionHistory && <Crown className="w-3 h-3 ml-1.5 text-amber-400" />}
          </Button>

          {/* Save Version - Premium Feature */}
          {canAccessVersionHistory && (
            <Button
              onClick={onSaveVersion}
              disabled={savingVersion}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-md"
              title={savingVersion ? "Saving..." : "Save your current work as a version"}
            >
              {savingVersion ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Version
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Cover Letter - Premium Feature */}
          <Button
            onClick={onCoverLetterClick}
            className={`shadow-md ${
              canAccessCoverLetters
                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                : "bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
            }`}
            disabled={canAccessCoverLetters && (!jobDescription || !jobDescription.trim())}
            title={
              !canAccessCoverLetters
                ? "Premium feature - Upgrade to access"
                : !jobDescription || !jobDescription.trim()
                ? "Add a job description first"
                : hasCoverLetter
                ? "View and edit your cover letter"
                : "Generate cover letter"
            }
          >
            {!canAccessCoverLetters && <Lock className="w-3 h-3 mr-1.5" />}
            <FileText className="w-4 h-4 mr-2" />
            {hasCoverLetter ? 'Show Cover Letter' : 'Cover Letter'}
            {!canAccessCoverLetters && <Crown className="w-3 h-3 ml-1.5 text-amber-400" />}
          </Button>

          {/* Design With AI - Available to all (templates shown inside with locks) */}
          <Button
            onClick={onDesignClick}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white shadow-md"
            title="Choose a template for your resume"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Choose Template
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
