import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lock,
  Crown,
  Zap
} from "lucide-react";
import { formatDateTime } from "../utils/dateUtils";

export default function ATSAnalysisCard({
  jobDescription,
  onJobDescriptionChange,
  onJobDescriptionBlur,
  onAnalyze,
  analyzing,
  saving,
  atsResults,
  showResults,
  onToggleResults,
  isSubscribed = true,
  aiCredits,
  isPaid = false
}) {
  const navigate = useNavigate();
  const hasResults = atsResults && atsResults.score !== undefined;
  const score = hasResults ? atsResults.score : 0;
  const isFreeUser = atsResults?.tier === 'free' || !isPaid;
  const hasDetailedInsights = atsResults?.keywords_found_resume !== null;

  // Button is disabled only if analysis has results for the CURRENT job description
  const isAnalysisComplete = hasResults &&
    jobDescription &&
    jobDescription.trim() &&
    atsResults.analyzed_job_description === jobDescription.trim();

  // Lock the job description if analysis is complete
  const isLocked = isAnalysisComplete;

  // Blurred premium section component
  const BlurredPremiumSection = ({ title, icon: Icon, children, placeholderCount = 5 }) => (
    <div className="relative">
      {/* Blurred placeholder content */}
      <div className="filter blur-sm pointer-events-none select-none">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          {title}
        </h4>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: placeholderCount }).map((_, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="bg-slate-200 dark:bg-slate-700 text-slate-500"
            >
              Premium keyword {idx + 1}
            </Badge>
          ))}
        </div>
      </div>
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 rounded-lg">
        <Button
          onClick={() => navigate('/Pricing')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
        >
          <Crown className="w-4 h-4 mr-2" />
          Unlock Detailed Insights
        </Button>
      </div>
    </div>
  );

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 dark:text-green-500";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return "Excellent ATS compatibility!";
    if (score >= 60) return "Good, but room for improvement";
    return "Needs significant optimization";
  };

  return (
    <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1" />
          <div className="flex-1">
            <Label className="text-indigo-900 dark:text-indigo-200 font-semibold mb-2 block">
              Job Description (Optional)
            </Label>
            <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-3">
              Paste the job description here to tailor your resume content for this specific role
            </p>
          </div>
        </div>

        {hasResults && !analyzing && jobDescription && jobDescription.trim() && (
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onToggleResults();
            }}
            className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-900"
          >
            {showResults ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        )}
      </div>

      <div className="relative">
        <Textarea
          value={jobDescription}
          onChange={onJobDescriptionChange}
          onBlur={onJobDescriptionBlur}
          readOnly={isLocked}
          placeholder="Paste job description here..."
          className={`min-h-32 bg-white dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-500 mb-4 ${
            isLocked ? 'cursor-not-allowed opacity-90' : ''
          }`}
        />
        {isLocked && (
          <div className="absolute top-2 right-2">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!saving && !analyzing && jobDescription && jobDescription.trim() && isSubscribed && !isAnalysisComplete) {
                onAnalyze();
              }
            }}
            disabled={saving || analyzing || !jobDescription || !jobDescription.trim() || !isSubscribed || isAnalysisComplete}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : isAnalysisComplete ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Analysis Complete
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze ATS Compatibility
              </>
            )}
          </Button>

          {/* AI Credits indicator for free users */}
          {!isPaid && aiCredits && (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              aiCredits.remaining <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              aiCredits.remaining <= 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              <Zap className="w-3 h-3" />
              <span>{aiCredits.remaining}/{aiCredits.total} AI credits</span>
            </div>
          )}
        </div>

        {/* Free tier note */}
        {!isPaid && !isAnalysisComplete && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Free tier: Score only. Upgrade for detailed insights.
          </p>
        )}
      </div>

      {/* ATS Results */}
      {(analyzing || (hasResults && showResults)) && (
        <div className="mt-6 pt-6 border-t-2 border-purple-200 dark:border-purple-700">
          {analyzing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Analyzing your resume...</p>
              </div>
            </div>
          ) : hasResults && showResults ? (
            <div className="space-y-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              {/* ATS Score */}
              <div className={`p-4 rounded-lg ${getScoreBgColor(score)} border border-transparent dark:border-slate-700`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ATS Compatibility Score</span>
                  <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                    {score}
                    <span className="text-lg">/100</span>
                  </span>
                </div>
                <Progress value={score} className="h-2 mb-2" />
                <p className={`text-sm font-medium ${getScoreColor(score)}`}>
                  {getScoreMessage(score)}
                </p>
              </div>

              {/* Keywords Overview - Show blurred for free users */}
              {hasDetailedInsights ? (
                <>
                  {/* Full insights for paid users */}
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-900 dark:text-blue-200">Found</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {atsResults.keywords_found_resume?.length || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium text-red-900 dark:text-red-200">Missing</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {atsResults.missing_keywords?.length || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-900 dark:text-green-200">Total Keywords</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {atsResults.keywords_extracted_jd?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  {atsResults.missing_keywords && atsResults.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        Missing Keywords (Consider Adding)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {atsResults.missing_keywords.map((keyword, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Found Keywords */}
                  {atsResults.keywords_found_resume && atsResults.keywords_found_resume.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Keywords Already in Your Resume
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {atsResults.keywords_found_resume.map((keyword, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {atsResults.recommendations && atsResults.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {atsResults.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Blurred sections for free users */}
                  <div className="space-y-4">
                    {/* Blurred Keywords Overview */}
                    <div className="relative">
                      <div className="filter blur-sm pointer-events-none select-none">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-medium text-blue-900 dark:text-blue-200">Found</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</p>
                          </div>
                          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-xs font-medium text-red-900 dark:text-red-200">Missing</span>
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">8</p>
                          </div>
                          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-medium text-green-900 dark:text-green-200">Total</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">20</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Blurred Missing Keywords */}
                    <BlurredPremiumSection
                      title="Missing Keywords (Consider Adding)"
                      icon={AlertTriangle}
                      placeholderCount={6}
                    />

                    {/* Blurred Found Keywords */}
                    <BlurredPremiumSection
                      title="Keywords Already in Your Resume"
                      icon={CheckCircle}
                      placeholderCount={8}
                    />

                    {/* Blurred Recommendations */}
                    <div className="relative">
                      <div className="filter blur-sm pointer-events-none select-none">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {['Add more quantifiable achievements', 'Include industry-specific keywords', 'Optimize summary section', 'Add relevant certifications'].map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 rounded-lg">
                        <Button
                          onClick={() => navigate('/Pricing')}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Unlock Recommendations
                        </Button>
                      </div>
                    </div>

                    {/* Free tier message */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <Crown className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Upgrade to see detailed keywords, missing terms, and AI-powered recommendations
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {atsResults.analyzed_at && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  Last analyzed: {formatDateTime(atsResults.analyzed_at)}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}