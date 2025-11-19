import React from "react";
import { Button } from "@/components/ui/button";
import { History, Save, Loader2, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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
  isSubscribed = true
}) {
  // Don't render anything in edit mode
  if (editMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-8"
    >
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex gap-3">
          <Button
            onClick={onVersionsClick}
            className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white shadow-md"
            disabled={!isSubscribed}
            title={!isSubscribed ? "Subscription required" : "View document versions"}
          >
            <History className="w-4 h-4 mr-2" />
            Versions ({versionCount})
          </Button>
          <Button
            onClick={onSaveVersion}
            disabled={savingVersion || !isSubscribed}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-md"
            title={!isSubscribed ? "Subscription required" : (savingVersion ? "Saving..." : "Save your current work")}
          >
            {savingVersion ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save My Work
              </>
            )}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onCoverLetterClick}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md"
            disabled={!jobDescription || !jobDescription.trim() || !isSubscribed}
            title={
              !isSubscribed
                ? "Subscription required"
                : !jobDescription || !jobDescription.trim()
                ? "Add a job description first"
                : hasCoverLetter
                ? "View and edit your cover letter"
                : "Generate cover letter"
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            {hasCoverLetter ? 'Show Cover Letter' : 'Generate Cover Letter'}
          </Button>
          <Button
            onClick={onDesignClick}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white shadow-md"
            disabled={!isSubscribed}
            title={!isSubscribed ? "Subscription required" : "Design with AI"}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Design With AI
          </Button>
        </div>
      </div>
    </motion.div>
  );
}