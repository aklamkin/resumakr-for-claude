import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ResumeTemplate, { TEMPLATE_OPTIONS } from "./ResumeTemplate";

export default function DesignWithAIModal({ 
  open, 
  onClose, 
  resumeData,
  onSaveTemplate 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [customColors, setCustomColors] = useState({});
  const [customFonts, setCustomFonts] = useState({});

  if (!resumeData) {
    return null;
  }

  const currentTemplate = TEMPLATE_OPTIONS[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? TEMPLATE_OPTIONS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === TEMPLATE_OPTIONS.length - 1 ? 0 : prev + 1));
  };

  const handleSave = async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      const templateColors = customColors[currentTemplate.id] || {};
      const templateFonts = customFonts[currentTemplate.id] || {};
      await onSaveTemplate(currentTemplate.id, currentTemplate.name, templateColors, templateFonts);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (colorKey, value) => {
    setCustomColors(prev => ({
      ...prev,
      [currentTemplate.id]: {
        ...prev[currentTemplate.id],
        [colorKey]: value
      }
    }));
  };

  const handleFontChange = (value) => {
    setCustomFonts(prev => ({
      ...prev,
      [currentTemplate.id]: {
        fontFamily: value
      }
    }));
  };

  const getColorOptions = (templateId) => {
    const accentTemplates = ['modern-minimalist', 'creative-bold', 'tech-sleek', 'modern-professional', 'contemporary-clean'];
    
    if (accentTemplates.includes(templateId)) {
      return [
        { key: 'accentColor', label: 'Accent Color', default: '#4f46e5' }
      ];
    }
    
    return [
      { key: 'backgroundColor', label: 'Background', default: '#ffffff' },
      { key: 'textColor', label: 'Text Color', default: '#1e293b' }
    ];
  };

  const FONT_OPTIONS = [
    { value: 'arial', label: 'Arial (Classic)' },
    { value: 'georgia', label: 'Georgia (Serif)' },
    { value: 'helvetica', label: 'Helvetica (Modern)' },
    { value: 'times', label: 'Times New Roman (Traditional)' },
    { value: 'verdana', label: 'Verdana (Clean)' }
  ];

  const colorOptions = getColorOptions(currentTemplate.id);
  const templateColors = customColors[currentTemplate.id] || {};
  const templateFonts = customFonts[currentTemplate.id] || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="text-2xl font-bold dark:text-slate-100">Design With AI</DialogTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Choose a template for your resume</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-100px)]">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-4 overflow-auto relative">
            <div className="flex items-start justify-center min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTemplate.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                  style={{ maxWidth: '850px' }}
                >
                  <ResumeTemplate 
                    data={resumeData} 
                    template={currentTemplate.id}
                    scale={1}
                    customColors={templateColors}
                    customFonts={templateFonts}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all z-10"
            >
              <ChevronLeft className="w-6 h-6 text-slate-700" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all z-10"
            >
              <ChevronRight className="w-6 h-6 text-slate-700" />
            </button>
          </div>

          <div className="lg:w-80 bg-slate-900 p-6 flex flex-col border-l border-slate-800 overflow-y-auto">
            <div className="flex-1">
              <div className="space-y-2 mb-6">
                {TEMPLATE_OPTIONS.map((template, idx) => (
                  <button
                    key={template.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      currentIndex === idx
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-6">
                <p className="text-xs text-blue-200 leading-relaxed">
                  <strong className="text-blue-100">Note:</strong> Cover letter generated from your resume and job description. 
                  No information is fabricated.
                </p>
              </div>

              {/* Color Customization */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Customize Colors
                </p>
                <div className="space-y-3">
                  {colorOptions.map(option => (
                    <div key={option.key}>
                      <Label className="text-xs text-slate-300 mb-2 block">
                        {option.label}
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={templateColors[option.key] || option.default}
                          onChange={(e) => handleColorChange(option.key, e.target.value)}
                          className="w-10 h-10 rounded border-2 border-slate-700 cursor-pointer bg-slate-800"
                        />
                        <input
                          type="text"
                          value={templateColors[option.key] || option.default}
                          onChange={(e) => handleColorChange(option.key, e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-slate-700 rounded bg-slate-800 text-slate-100"
                          placeholder={option.default}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Customization */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Customize Font
                </p>
                <div>
                  <Label className="text-xs text-slate-300 mb-2 block">
                    Font Family
                  </Label>
                  <Select
                    value={templateFonts.fontFamily || 'arial'}
                    onValueChange={handleFontChange}
                  >
                    <SelectTrigger className="w-full text-sm bg-slate-800 text-slate-100 border-slate-700">
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {FONT_OPTIONS.map(font => (
                        <SelectItem key={font.value} value={font.value} className="text-sm text-slate-100 hover:bg-slate-700">
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 mb-2"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save This Version
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-400">
                Creates a new version with this template
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}