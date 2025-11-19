import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, FileCode, FileType } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXPORT_FORMATS = [
  {
    id: "html",
    name: "HTML",
    icon: FileCode,
    color: "text-orange-600 dark:text-orange-400"
  },
  {
    id: "pdf",
    name: "PDF",
    icon: FileText,
    color: "text-red-600 dark:text-red-400"
  },
  {
    id: "markdown",
    name: "Markdown",
    icon: FileType,
    color: "text-blue-600 dark:text-blue-400"
  },
  {
    id: "docx",
    name: "DOCX",
    icon: FileText,
    color: "text-indigo-600 dark:text-indigo-400"
  },
  {
    id: "text",
    name: "Text",
    icon: FileType,
    color: "text-slate-600 dark:text-slate-400"
  }
];

export default function ExportDropdown({ onSelectFormat, disabled, isExporting }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  return (
    <>
      <div 
        className="relative"
        onMouseEnter={() => !disabled && setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        ref={buttonRef}
      >
        <button
          disabled={disabled || isExporting}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 h-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export resume"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && !disabled && !isExporting && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              right: `${position.right}px`
            }}
            className="z-[200] bg-white dark:bg-slate-800 rounded-lg shadow-xl border-2 border-slate-200 dark:border-slate-700 py-1 min-w-[140px]"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.id}
                onClick={() => {
                  onSelectFormat(format.id);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <format.icon className={`w-4 h-4 ${format.color}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {format.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}