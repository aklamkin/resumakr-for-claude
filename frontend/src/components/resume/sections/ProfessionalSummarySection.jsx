import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Undo } from "lucide-react";
import EditableSection from "../EditableSection";
import { HighlightedText } from "../KeywordHighlight";

export default function ProfessionalSummarySection({ 
  summary, 
  editMode, 
  onUpdate,
  aiHelpers,
  isSubscribed,
  onSubscriptionRequired,
  atsResults 
}) {
  const { 
    sectionVersions, 
    sectionLoading, 
    requestVersions, 
    acceptVersion, 
    undoVersion,
    isAIContent, 
    canUndo,
    providers 
  } = aiHelpers;

  const foundKeywords = atsResults?.keywords_found_resume || [];
  const missingKeywords = atsResults?.missing_keywords || [];

  if (editMode) {
    return (
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Professional Summary</h3>
        <Textarea
          value={summary || ''}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Write a brief professional summary (2-4 sentences)"
          className="h-32 text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-500"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Professional Summary</h3>
        {isAIContent('professional_summary') && (
          <div className="relative group/ai-badge">
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 cursor-pointer">
              <Bot className="w-3 h-3 mr-1" />
              AI Enhanced
            </Badge>
            {canUndo('professional_summary') && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 group-hover/ai-badge:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/ai-badge:pointer-events-auto z-10">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => undoVersion('professional_summary')}
                  className="bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-lg whitespace-nowrap"
                >
                  <Undo className="w-3 h-3 mr-1" />
                  Undo AI Changes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <EditableSection
        content={summary || 'No professional summary yet. Click "Improve" to generate one with AI.'}
        providers={providers}
        loading={sectionLoading['summary']}
        versions={sectionVersions['summary']}
        onRequestVersions={(providerId) => {
          if (!isSubscribed) {
            onSubscriptionRequired();
            return;
          }
          requestVersions('summary', summary || '', providerId);
        }}
        onAcceptVersion={(version, keepOriginal) => acceptVersion('summary', version, 'professional_summary')}
        foundKeywords={foundKeywords}
        newKeywords={missingKeywords}
      />
    </div>
  );
}