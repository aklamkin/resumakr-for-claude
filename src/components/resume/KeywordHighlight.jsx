import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Highlights keywords in text with tooltips explaining the highlighting
 * @param {string} text - The text to highlight
 * @param {string[]} foundKeywords - Keywords found by ATS analysis (light green)
 * @param {string[]} newKeywords - Keywords newly added by AI (darker green)
 * @returns {JSX.Element}
 */
export function HighlightedText({ text, foundKeywords = [], newKeywords = [] }) {
  if (!text || (!foundKeywords.length && !newKeywords.length)) {
    return <span>{text}</span>;
  }

  // Combine all keywords and create a case-insensitive regex
  const allKeywords = [...foundKeywords, ...newKeywords];
  
  if (allKeywords.length === 0) {
    return <span>{text}</span>;
  }

  // Escape special regex characters and create pattern
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\b(${allKeywords.map(escapeRegex).join('|')})\\b`,
    'gi'
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  // Split text into highlighted and non-highlighted parts
  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Determine if this is a found keyword or new keyword
    const matchedText = match[0];
    const isNewKeyword = newKeywords.some(
      kw => kw.toLowerCase() === matchedText.toLowerCase()
    );
    const isFoundKeyword = foundKeywords.some(
      kw => kw.toLowerCase() === matchedText.toLowerCase()
    );

    parts.push({
      type: 'keyword',
      content: matchedText,
      isNew: isNewKeyword,
      isFound: isFoundKeyword,
    });

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <span>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }

          // Highlighted keyword with tooltip
          const tooltipText = part.isNew
            ? "This keyword was added by AI to improve ATS compatibility"
            : "This keyword was found in your resume and matches the job description";

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  className={`${
                    part.isNew
                      ? 'text-green-700 dark:text-green-400 font-medium'
                      : 'text-green-600 dark:text-green-400'
                  } cursor-help`}
                >
                  {part.content}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 border-slate-700 dark:border-slate-600 max-w-xs"
              >
                <p className="text-sm">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}

/**
 * Wraps text nodes in a component tree with keyword highlighting
 * Preserves the original structure and styling
 */
export function wrapTextWithHighlights(content, foundKeywords = [], newKeywords = []) {
  if (!content) return content;
  
  if (typeof content === 'string') {
    return <HighlightedText text={content} foundKeywords={foundKeywords} newKeywords={newKeywords} />;
  }

  return content;
}