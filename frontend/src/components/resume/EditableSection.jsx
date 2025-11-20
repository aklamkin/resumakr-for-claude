import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Check, Loader2, X, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "./KeywordHighlight";

export default function EditableSection({ 
  content, 
  onRequestVersions, 
  providers = [],
  loading = false,
  versions = [],
  onAcceptVersion,
  foundKeywords = [],
  newKeywords = []
}) {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [maxHeight, setMaxHeight] = useState(null);
  const contentRef = useRef(null);
  const measureRefs = useRef([]);

  // Combine versions with original content (original goes at the end)
  const allVersions = versions && versions.length > 0 
    ? [...versions, content] 
    : [];

  const isOriginalVersion = allVersions.length > 0 && currentVersionIndex === allVersions.length - 1;

  // Measure all versions and set max height
  useEffect(() => {
    if (allVersions.length > 0 && measureRefs.current.length === allVersions.length) {
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        const heights = measureRefs.current.map(ref => ref?.offsetHeight || 0);
        const max = Math.max(...heights);
        setMaxHeight(max);
      });
    }
  }, [allVersions.length]);

  // Reset max height when versions are cleared
  useEffect(() => {
    if (allVersions.length === 0) {
      setMaxHeight(null);
    }
  }, [allVersions.length]);

  const handlePrevVersion = () => {
    setCurrentVersionIndex((prev) => (prev > 0 ? prev - 1 : allVersions.length - 1));
  };

  const handleNextVersion = () => {
    setCurrentVersionIndex((prev) => (prev < allVersions.length - 1 ? prev + 1 : 0));
  };

  const handleAccept = (e) => {
    // Prevent any event bubbling
    e?.stopPropagation();
    e?.preventDefault();
    
    if (isOriginalVersion) {
      // User selected original - keep the original content
      // Pass the original content to ensure it's saved properly
      onAcceptVersion(content, true); // Second parameter indicates "keep original"
      setCurrentVersionIndex(0);
      setMaxHeight(null);
      return;
    }

    // For non-original versions, proceed with accepting the version
    onAcceptVersion(allVersions[currentVersionIndex], false);
    setCurrentVersionIndex(0);
    setMaxHeight(null);
  };

  const currentContent = allVersions && allVersions.length > 0 
    ? allVersions[currentVersionIndex] 
    : content;

  const hasVersions = allVersions && allVersions.length > 0;

  return (
    <div className="relative group/section w-full">
      <div className={`transition-all duration-200 rounded-lg p-3 relative w-full ${
        hasVersions || loading 
          ? isOriginalVersion 
            ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-700' 
            : 'bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-700'
          : 'bg-transparent border-2 border-transparent group-hover/section:bg-indigo-50 dark:group-hover/section:bg-indigo-950/30 group-hover/section:border-indigo-200 dark:group-hover/section:border-indigo-700'
      }`}>

        {/* Hidden measurement divs for all versions */}
        {hasVersions && (
          <div className="absolute opacity-0 pointer-events-none" style={{ top: -9999, left: 0, right: 0 }}>
            {allVersions.map((version, idx) => (
              <div
                key={idx}
                ref={el => measureRefs.current[idx] = el}
                className="p-3 w-full"
              >
                <p className="text-slate-700 leading-relaxed w-full">{version}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actual content with consistent height and full width */}
        <div 
          ref={contentRef}
          style={maxHeight ? { minHeight: `${maxHeight}px` } : {}}
          className="flex items-start w-full"
        >
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed w-full">
            <HighlightedText text={currentContent} foundKeywords={foundKeywords} newKeywords={newKeywords} />
          </p>
        </div>

        {/* Request Versions Button - Always uses default settings */}
        {!loading && !hasVersions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover/section:opacity-100 transition-opacity z-10">
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-lg"
              onClick={() => onRequestVersions(null)}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Improve
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Generating versions...</p>
            </div>
          </div>
        )}

        {/* Version Navigation */}
        {hasVersions && !loading && (
          <div className={`flex items-center justify-between mt-3 pt-3 border-t w-full ${
            isOriginalVersion ? 'border-green-300 dark:border-green-700' : 'border-indigo-200 dark:border-indigo-700'
          }`}>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevVersion}
                className="h-8 w-8 p-0 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                disabled={allVersions.length <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {isOriginalVersion 
                  ? `Original (${allVersions.length} of ${allVersions.length})`
                  : `Version ${currentVersionIndex + 1} of ${allVersions.length}`
                }
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextVersion}
                className="h-8 w-8 p-0 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                disabled={allVersions.length <= 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handleAccept}
              className={isOriginalVersion 
                ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
              }
            >
              <Check className="w-4 h-4 mr-1" />
              {isOriginalVersion ? "Keep Original" : "Use This Version"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}