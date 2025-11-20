import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Loader2, FileText, Edit2, Save, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/api/apiClient";
import CoverLetterTemplate, { COVER_LETTER_TEMPLATES } from "./CoverLetterTemplate";

export default function CoverLetterModal({ 
  open, 
  onClose, 
  resumeData,
  jobDescription,
  onCoverLetterSaved
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [customColors, setCustomColors] = useState({});
  const [customFonts, setCustomFonts] = useState({});
  const [shortVersion, setShortVersion] = useState("");
  const [longVersion, setLongVersion] = useState("");
  const [activeVersion, setActiveVersion] = useState("short");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  // Initialize template based on resume's template
  useEffect(() => {
    if (open && resumeData?.template_id) {
      const templateIndex = COVER_LETTER_TEMPLATES.findIndex(t => t.id === resumeData.template_id);
      if (templateIndex !== -1) {
        setCurrentIndex(templateIndex);
      }
    }
  }, [open, resumeData?.template_id]);

  // Load existing cover letter or generate new one
  useEffect(() => {
    if (open) {
      if (resumeData?.cover_letter_short || resumeData?.cover_letter_long) {
        // Load existing cover letter
        setShortVersion(resumeData.cover_letter_short || "");
        setLongVersion(resumeData.cover_letter_long || "");
        if (resumeData.cover_letter_custom_colors) {
          setCustomColors(resumeData.cover_letter_custom_colors);
        }
        if (resumeData.cover_letter_custom_fonts) {
          setCustomFonts(resumeData.cover_letter_custom_fonts);
        }
      } else if (!shortVersion && !longVersion) {
        // Generate new cover letter
        generateCoverLetter();
      }
    }
  }, [open]);

  const generateCoverLetter = async () => {
    setLoading(true);
    try {
      const personalInfo = resumeData?.personal_info || {};
      
      const resumeSummary = `
Name: ${personalInfo.full_name || 'N/A'}
Professional Summary: ${resumeData?.professional_summary || 'N/A'}

Work Experience:
${(resumeData?.work_experience || []).map(exp => 
  `- ${exp.position} at ${exp.company} (${exp.start_date} - ${exp.current ? 'Present' : exp.end_date})`
).join('\n')}

Skills:
${(resumeData?.skills || []).map(cat => `${cat.category}: ${cat.items?.join(', ')}`).join('\n')}

Education:
${(resumeData?.education || []).map(edu => 
  `${edu.degree} in ${edu.field_of_study || 'N/A'} from ${edu.institution}`
).join('\n')}
      `.trim();

      const basePrompt = `You are a professional cover letter writer. Create a compelling cover letter based on the candidate's resume and the job description provided.

CRITICAL INSTRUCTIONS:
1. NEVER make up information or hallucinate details
2. Only use information explicitly provided in the resume
3. Be professional, enthusiastic, and concise
4. Address how the candidate's actual experience matches the job requirements
5. Do NOT include salutation, date, or closing - ONLY the body paragraphs
6. Start directly with the first paragraph

Resume Information:
${resumeSummary}

${jobDescription ? `Job Description:\n${jobDescription}\n\n` : ''}

Write a {VERSION_TYPE} cover letter that:
- Highlights the candidate's relevant experience and skills
- Shows enthusiasm for the position
- Explains why they're a good fit
- Maintains a professional tone
- {VERSION_INSTRUCTIONS}

Return ONLY the body paragraphs, no salutation, no date, no closing signature.`;

      // Generate short version
      const shortPrompt = basePrompt
        .replace('{VERSION_TYPE}', 'concise, impactful')
        .replace('{VERSION_INSTRUCTIONS}', 'Keep it to 3-4 short paragraphs (250-300 words maximum)');

      const shortResponse = await api.integrations.Core.InvokeLLM({
        prompt: shortPrompt,
      });

      // Generate long version
      const longPrompt = basePrompt
        .replace('{VERSION_TYPE}', 'detailed, comprehensive')
        .replace('{VERSION_INSTRUCTIONS}', 'Provide more detail about experiences and skills, 4-5 paragraphs (400-500 words)');

      const longResponse = await api.integrations.Core.InvokeLLM({
        prompt: longPrompt,
      });

      setShortVersion(shortResponse.trim());
      setLongVersion(longResponse.trim());

      // Save to database
      if (resumeData?.id) {
        await api.entities.ResumeData.update(resumeData.id, {
          cover_letter_short: shortResponse.trim(),
          cover_letter_long: longResponse.trim(),
          cover_letter_template_id: currentTemplate.id
        });
        
        // Update parent state
        if (onCoverLetterSaved) {
          onCoverLetterSaved({
            cover_letter_short: shortResponse.trim(),
            cover_letter_long: longResponse.trim(),
            cover_letter_template_id: currentTemplate.id
          });
        }
      }
    } catch (err) {
      console.error("Failed to generate cover letter:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = COVER_LETTER_TEMPLATES[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? COVER_LETTER_TEMPLATES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === COVER_LETTER_TEMPLATES.length - 1 ? 0 : prev + 1));
  };

  const handleColorChange = async (colorKey, value) => {
    const newColors = {
      ...customColors,
      [currentTemplate.id]: {
        ...customColors[currentTemplate.id],
        [colorKey]: value
      }
    };
    setCustomColors(newColors);

    // Save to database
    if (resumeData?.id) {
      await api.entities.ResumeData.update(resumeData.id, {
        cover_letter_custom_colors: newColors
      });
    }
  };

  const handleFontChange = async (value) => {
    const newFonts = {
      ...customFonts,
      [currentTemplate.id]: {
        fontFamily: value
      }
    };
    setCustomFonts(newFonts);

    // Save to database
    if (resumeData?.id) {
      await api.entities.ResumeData.update(resumeData.id, {
        cover_letter_custom_fonts: newFonts
      });
    }
  };

  const getColorOptions = (templateId) => {
    const defaults = {
      'classic-professional': '#000',
      'modern-minimalist': '#2563eb',
      'creative-bold': '#4f46e5',
      'executive-elegant': '#1e293b',
      'tech-sleek': '#06b6d4',
      'professional-columns': '#334155',
      'professional-compact': '#1e293b',
      'modern-professional': '#4f46e5',
      'clean-formal': '#1e293b',
      'artistic-modern': '#ea580c',
      'contemporary-clean': '#4f46e5'
    };
    return [
      { key: 'accentColor', label: 'Accent Color', default: defaults[templateId] || '#000' }
    ];
  };

  const FONT_OPTIONS = [
    { value: "'Arial', sans-serif", label: 'Arial (Classic)' },
    { value: "'Georgia', serif", label: 'Georgia (Serif)' },
    { value: "'Helvetica Neue', 'Arial', sans-serif", label: 'Helvetica (Modern)' },
    { value: "'Times New Roman', 'Georgia', serif", label: 'Times New Roman (Traditional)' },
    { value: "'Verdana', sans-serif", label: 'Verdana (Clean)' }
  ];

  const getCurrentContent = () => {
    return editMode ? editedContent : (activeVersion === 'short' ? shortVersion : longVersion);
  };

  const handleDownload = async () => {
    const content = getCurrentContent();
    if (downloading || !content) return;
    
    setDownloading(true);
    try {
      const personalInfo = resumeData?.personal_info || {};
      const userName = (personalInfo.full_name || 'User').replace(/[^a-z0-9]/gi, '_');
      const fileName = `${userName}_Cover_Letter`;
      
      const templateColors = customColors[currentTemplate.id] || {};
      const templateFonts = customFonts[currentTemplate.id] || {};
      
      const colorOptions = getColorOptions(currentTemplate.id);
      const accentColor = templateColors.accentColor || colorOptions[0].default;
      
      const templateStyles = {
        'classic-professional': {
          fontFamily: templateFonts.fontFamily || "'Times New Roman', 'Georgia', serif",
          fontSize: '12pt',
          lineHeight: '1.6',
          headerFontSize: '14pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '11pt'
        },
        'modern-minimalist': {
          fontFamily: templateFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          headerFontSize: '16pt',
          headerFontWeight: '600',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'creative-bold': {
          fontFamily: templateFonts.fontFamily || "'Poppins', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          headerFontSize: '18pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'executive-elegant': {
          fontFamily: templateFonts.fontFamily || "'Garamond', 'Georgia', serif",
          fontSize: '12pt',
          lineHeight: '1.7',
          headerFontSize: '15pt',
          headerFontWeight: '600',
          accentColor: accentColor,
          contactFontSize: '11pt'
        },
        'tech-sleek': {
          fontFamily: templateFonts.fontFamily || "'Inter', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          headerFontSize: '16pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'professional-columns': {
          fontFamily: templateFonts.fontFamily || "'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          headerFontSize: '14pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'professional-compact': {
          fontFamily: templateFonts.fontFamily || "'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          headerFontSize: '14pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'modern-professional': {
          fontFamily: templateFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          headerFontSize: '16pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'clean-formal': {
          fontFamily: templateFonts.fontFamily || "'Times New Roman', 'Georgia', serif",
          fontSize: '12pt',
          lineHeight: '1.6',
          headerFontSize: '14pt',
          headerFontWeight: 'bold',
          accentColor: accentColor,
          contactFontSize: '11pt'
        },
        'artistic-modern': {
          fontFamily: templateFonts.fontFamily || "'Poppins', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          headerFontSize: '18pt',
          headerFontWeight: 'black',
          accentColor: accentColor,
          contactFontSize: '10pt'
        },
        'contemporary-clean': {
          fontFamily: templateFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          headerFontSize: '16pt',
          headerFontWeight: 'black',
          accentColor: accentColor,
          contactFontSize: '10pt'
        }
      };

      const styleConfig = templateStyles[currentTemplate.id] || templateStyles['classic-professional'];
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin: 0.75in;
    }
    
    body {
      font-family: ${styleConfig.fontFamily};
      line-height: ${styleConfig.lineHeight};
      color: #000;
      font-size: ${styleConfig.fontSize};
      background: white;
    }
    
    .header {
      margin-bottom: 36pt;
      padding-bottom: 12pt;
      ${currentTemplate.id === 'modern-minimalist' || currentTemplate.id === 'tech-sleek' || currentTemplate.id === 'contemporary-clean' ? `border-bottom: 2px solid ${styleConfig.accentColor};` : ''}
      ${currentTemplate.id === 'classic-professional' || currentTemplate.id === 'executive-elegant' || currentTemplate.id === 'professional-columns' || currentTemplate.id === 'professional-compact' || currentTemplate.id === 'clean-formal' ? 'border-bottom: 2px solid #cbd5e1;' : ''}
      ${currentTemplate.id === 'modern-professional' ? `background-color: ${styleConfig.accentColor}; color: #fff; margin: -54pt -54pt 36pt -54pt; padding: 36pt 54pt;` : ''}
    }
    
    .sender-info {
      margin-bottom: 24pt;
    }
    
    .name {
      font-size: ${styleConfig.headerFontSize};
      font-weight: ${styleConfig.headerFontWeight};
      margin-bottom: 8pt;
      color: ${currentTemplate.id === 'modern-professional' ? '#fff' : styleConfig.accentColor};
      ${currentTemplate.id === 'creative-bold' || currentTemplate.id === 'artistic-modern' ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
    }
    
    .contact-line {
      font-size: ${styleConfig.contactFontSize};
      line-height: 1.5;
      margin-bottom: 3pt;
      color: ${currentTemplate.id === 'modern-professional' ? 'rgba(255,255,255,0.9)' : currentTemplate.id === 'modern-minimalist' || currentTemplate.id === 'tech-sleek' || currentTemplate.id === 'contemporary-clean' ? '#64748b' : '#333'};
    }
    
    .contact-separator {
      ${currentTemplate.id === 'modern-professional' ? 'margin: 0 8px; color: rgba(255,255,255,0.6);' : currentTemplate.id === 'modern-minimalist' || currentTemplate.id === 'tech-sleek' || currentTemplate.id === 'contemporary-clean' ? 'margin: 0 8px; color: #cbd5e1;' : 'margin: 0 6px;'}
    }
    
    .date {
      margin-bottom: 24pt;
      font-size: ${styleConfig.fontSize};
      ${currentTemplate.id === 'modern-minimalist' || currentTemplate.id === 'tech-sleek' || currentTemplate.id === 'contemporary-clean' ? 'color: #64748b;' : ''}
    }
    
    .salutation {
      margin-bottom: 16pt;
      font-size: ${styleConfig.fontSize};
      ${currentTemplate.id === 'creative-bold' || currentTemplate.id === 'artistic-modern' ? 'font-weight: 600;' : ''}
    }
    
    .body-text {
      white-space: pre-wrap;
      font-size: ${styleConfig.fontSize};
      line-height: ${styleConfig.lineHeight};
      text-align: justify;
      margin-bottom: 16pt;
    }
    
    .body-text p {
      margin-bottom: 16pt;
    }
    
    .closing {
      margin-top: 24pt;
      font-size: ${styleConfig.fontSize};
    }
    
    .signature-space {
      margin-top: 48pt;
      margin-bottom: 6pt;
      ${currentTemplate.id === 'creative-bold' || currentTemplate.id === 'artistic-modern' ? 'border-top: 3px solid ' + styleConfig.accentColor + '; padding-top: 12pt;' : ''}
    }
    
    .signature-name {
      ${currentTemplate.id === 'modern-minimalist' || currentTemplate.id === 'tech-sleek' || currentTemplate.id === 'contemporary-clean' ? 'font-weight: 600; color: ' + styleConfig.accentColor + ';' : ''}
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="sender-info">
      <div class="name">${personalInfo.full_name || ''}</div>
      <div class="contact-line">
        ${personalInfo.email || ''}${personalInfo.phone ? `<span class="contact-separator">•</span>${personalInfo.phone}` : ''}${personalInfo.location ? `<span class="contact-separator">•</span>${personalInfo.location}` : ''}
      </div>
      ${personalInfo.linkedin || personalInfo.website ? `
        <div class="contact-line">
          ${personalInfo.linkedin ? personalInfo.linkedin : ''}${personalInfo.website && personalInfo.linkedin ? `<span class="contact-separator">•</span>` : ''}${personalInfo.website ? personalInfo.website : ''}
        </div>
      ` : ''}
    </div>
  </div>
  
  <div class="date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  
  <div class="salutation">Dear Hiring Manager,</div>
  
  <div class="body-text">${content.split('\n\n').map(para => `<p>${para}</p>`).join('')}</div>
  
  <div class="closing">
    <div>Sincerely,</div>
    <div class="signature-space"></div>
    <div class="signature-name">${personalInfo.full_name || ''}</div>
  </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to generate PDF');
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    } catch (err) {
      console.error("Failed to download cover letter:", err);
    } finally {
      setDownloading(false);
    }
  };

  const colorOptions = getColorOptions(currentTemplate.id);
  const templateColors = customColors[currentTemplate.id] || {};
  const templateFonts = customFonts[currentTemplate.id] || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold dark:text-slate-100">Generate Cover Letter</DialogTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">AI-generated and professionally formatted</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Generating your cover letter...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-[calc(95vh-100px)]">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-4 overflow-auto relative">
              {editMode ? (
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Cover Letter</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditMode(false);
                          setEditedContent("");
                        }}
                        className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditMode(false)}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Apply Changes
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[600px] text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                    placeholder="Edit your cover letter content..."
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-center min-h-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${currentTemplate.id}-${activeVersion}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full relative"
                        style={{ maxWidth: '850px' }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditedContent(getCurrentContent());
                            setEditMode(true);
                          }}
                          className="absolute top-6 right-6 z-20 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-lg text-slate-900 dark:text-slate-100"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Content
                        </Button>
                        <CoverLetterTemplate 
                          personalInfo={resumeData?.personal_info || {}}
                          content={getCurrentContent()}
                          template={currentTemplate.id}
                          customColors={templateColors}
                          customFonts={templateFonts}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-700 p-3 rounded-full shadow-lg transition-all z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-slate-100" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-700 p-3 rounded-full shadow-lg transition-all z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-slate-700 dark:text-slate-100" />
                  </button>
                </>
              )}
            </div>

            <div className="lg:w-80 bg-slate-900 p-6 flex flex-col border-l border-slate-800 overflow-y-auto">
              <div className="flex-1">
                {!editMode && (
                  <>
                    <div className="mb-6">
                      <Tabs value={activeVersion} onValueChange={setActiveVersion} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                          <TabsTrigger value="short" className="text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">
                            Short
                          </TabsTrigger>
                          <TabsTrigger value="long" className="text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">
                            Detailed
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </>
                )}

                <div className="space-y-2 mb-6">
                  {COVER_LETTER_TEMPLATES.map((template, idx) => (
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
                      value={templateFonts.fontFamily || FONT_OPTIONS[0].value}
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
                {!editMode ? (
                  <>
                    <Button
                      onClick={handleDownload}
                      disabled={downloading || !getCurrentContent()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 mb-2"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-slate-400">
                      Opens print dialog to save as PDF
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-center text-slate-400">
                    Make your edits, then click "Apply Changes" to update the preview
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}