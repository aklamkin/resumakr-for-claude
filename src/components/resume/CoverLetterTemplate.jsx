import React from "react";
import { formatDate } from "../utils/dateUtils";

export const COVER_LETTER_TEMPLATES = [
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Traditional single-column layout. Perfect for conservative industries.'
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean two-column design with blue accents. Great for tech roles.'
  },
  {
    id: 'creative-bold',
    name: 'Color Accents',
    description: 'Professional layout with indigo accents. Modern yet refined.'
  },
  {
    id: 'executive-elegant',
    name: 'Executive Elegant',
    description: 'Sophisticated layout. Perfect for senior-level positions.'
  },
  {
    id: 'tech-sleek',
    name: 'Tech Sleek',
    description: 'Modern grid design. Great for developers and tech professionals.'
  },
  {
    id: 'professional-columns',
    name: 'Professional Columns',
    description: 'Three-column layout. Ideal for experienced professionals.'
  },
  {
    id: 'professional-compact',
    name: 'Professional Compact',
    description: 'Space-efficient design. Perfect for early career professionals.'
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Contemporary design with bold header. Great for business.'
  },
  {
    id: 'clean-formal',
    name: 'Clean Formal',
    description: 'Traditional formal design. Suitable for academic roles.'
  },
  {
    id: 'artistic-modern',
    name: 'Artistic Modern',
    description: 'Creative design with warm gradients. Perfect for designers.'
  },
  {
    id: 'contemporary-clean',
    name: 'Contemporary Clean',
    description: 'Modern minimalist with accents. Great for versatile use.'
  }
];

export default function CoverLetterTemplate({ 
  personalInfo = {}, 
  content = "", 
  template = 'classic-professional',
  customColors = {},
  customFonts = {}
}) {
  const templateStyles = {
    'classic-professional': {
      fontFamily: customFonts.fontFamily || "'Times New Roman', 'Georgia', serif",
      fontSize: '11pt',
      lineHeight: '1.6',
      headerFontSize: '14pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#000',
      contactFontSize: '10pt',
      borderStyle: 'border-bottom'
    },
    'modern-minimalist': {
      fontFamily: customFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.5',
      headerFontSize: '15pt',
      headerFontWeight: '600',
      accentColor: customColors.accentColor || '#2563eb',
      contactFontSize: '9pt',
      borderStyle: 'border-bottom-accent'
    },
    'creative-bold': {
      fontFamily: customFonts.fontFamily || "'Poppins', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.6',
      headerFontSize: '16pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#4f46e5',
      contactFontSize: '9pt',
      borderStyle: 'none',
      nameTransform: 'uppercase'
    },
    'executive-elegant': {
      fontFamily: customFonts.fontFamily || "'Garamond', 'Georgia', serif",
      fontSize: '11pt',
      lineHeight: '1.7',
      headerFontSize: '14pt',
      headerFontWeight: '600',
      accentColor: customColors.accentColor || '#1e293b',
      contactFontSize: '10pt',
      borderStyle: 'border-bottom'
    },
    'tech-sleek': {
      fontFamily: customFonts.fontFamily || "'Inter', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.6',
      headerFontSize: '15pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#06b6d4',
      contactFontSize: '9pt',
      borderStyle: 'none',
      darkBackground: true
    },
    'professional-columns': {
      fontFamily: customFonts.fontFamily || "'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.5',
      headerFontSize: '14pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#334155',
      contactFontSize: '9pt',
      borderStyle: 'border-bottom'
    },
    'professional-compact': {
      fontFamily: customFonts.fontFamily || "'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.5',
      headerFontSize: '14pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#1e293b',
      contactFontSize: '9pt',
      borderStyle: 'border-bottom'
    },
    'modern-professional': {
      fontFamily: customFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.5',
      headerFontSize: '15pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#4f46e5',
      contactFontSize: '9pt',
      borderStyle: 'border-bottom-accent',
      headerBg: true
    },
    'clean-formal': {
      fontFamily: customFonts.fontFamily || "'Times New Roman', 'Georgia', serif",
      fontSize: '11pt',
      lineHeight: '1.6',
      headerFontSize: '14pt',
      headerFontWeight: 'bold',
      accentColor: customColors.accentColor || '#1e293b',
      contactFontSize: '10pt',
      borderStyle: 'border-bottom'
    },
    'artistic-modern': {
      fontFamily: customFonts.fontFamily || "'Poppins', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.6',
      headerFontSize: '16pt',
      headerFontWeight: 'black',
      accentColor: customColors.accentColor || '#ea580c',
      contactFontSize: '9pt',
      borderStyle: 'none',
      gradientHeader: true
    },
    'contemporary-clean': {
      fontFamily: customFonts.fontFamily || "'Helvetica Neue', 'Arial', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.5',
      headerFontSize: '16pt',
      headerFontWeight: 'black',
      accentColor: customColors.accentColor || '#4f46e5',
      contactFontSize: '9pt',
      borderStyle: 'none'
    }
  };

  const style = templateStyles[template] || templateStyles['classic-professional'];

  return (
    <div
      className="bg-white shadow-lg"
      style={{
        width: '816px', // 8.5in at 96 DPI
        minHeight: '1056px', // 11in at 96 DPI
        padding: '72px', // 0.75in
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        color: '#000'
      }}
    >
      {/* Header with Contact Info */}
      <div
        style={{
          marginBottom: '36pt',
          paddingBottom: '12pt',
          ...(style.borderStyle === 'border-bottom' && {
            borderBottom: '2px solid #cbd5e1'
          }),
          ...(style.borderStyle === 'border-bottom-accent' && {
            borderBottom: `2px solid ${style.accentColor}`
          }),
          ...(style.headerBg && {
            backgroundColor: style.accentColor,
            color: '#fff',
            margin: '-72px -72px 36pt -72px',
            padding: '36pt 72px'
          })
        }}
      >
        <div style={{ marginBottom: '8pt' }}>
          <div
            style={{
              fontSize: style.headerFontSize,
              fontWeight: style.headerFontWeight,
              marginBottom: '8pt',
              color: style.headerBg ? '#fff' : style.accentColor,
              ...(style.nameTransform && {
                textTransform: 'uppercase',
                letterSpacing: '1px'
              })
            }}
          >
            {personalInfo.full_name || 'Your Name'}
          </div>
          <div
            style={{
              fontSize: style.contactFontSize,
              lineHeight: '1.5',
              marginBottom: '3pt',
              color: style.headerBg ? 'rgba(255,255,255,0.9)' : style.borderStyle === 'border-bottom-accent' ? '#64748b' : '#333'
            }}
          >
            {personalInfo.email || 'your.email@example.com'}
            {personalInfo.phone && <span style={{ margin: '0 8px', color: style.headerBg ? 'rgba(255,255,255,0.6)' : '#cbd5e1' }}>•</span>}
            {personalInfo.phone}
            {personalInfo.location && <span style={{ margin: '0 8px', color: style.headerBg ? 'rgba(255,255,255,0.6)' : '#cbd5e1' }}>•</span>}
            {personalInfo.location}
          </div>
          {(personalInfo.linkedin || personalInfo.website) && (
            <div
              style={{
                fontSize: style.contactFontSize,
                lineHeight: '1.5',
                color: style.headerBg ? 'rgba(255,255,255,0.9)' : style.borderStyle === 'border-bottom-accent' ? '#64748b' : '#333'
              }}
            >
              {personalInfo.linkedin}
              {personalInfo.linkedin && personalInfo.website && <span style={{ margin: '0 8px', color: style.headerBg ? 'rgba(255,255,255,0.6)' : '#cbd5e1' }}>•</span>}
              {personalInfo.website}
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div
        style={{
          marginBottom: '24pt',
          fontSize: style.fontSize,
          color: style.borderStyle === 'border-bottom-accent' ? '#64748b' : '#000'
        }}
      >
        {formatDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>

      {/* Salutation */}
      <div
        style={{
          marginBottom: '16pt',
          fontSize: style.fontSize,
          fontWeight: (template === 'creative-bold' || template === 'artistic-modern') ? '600' : 'normal'
        }}
      >
        Dear Hiring Manager,
      </div>

      {/* Body Content */}
      <div
        style={{
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          textAlign: 'justify',
          marginBottom: '16pt',
          whiteSpace: 'pre-wrap'
        }}
      >
        {content.split('\n\n').map((para, idx) => (
          <p key={idx} style={{ marginBottom: '16pt' }}>
            {para}
          </p>
        ))}
      </div>

      {/* Closing */}
      <div style={{ marginTop: '24pt', fontSize: style.fontSize }}>
        <div>Sincerely,</div>
        <div
          style={{
            marginTop: '48pt',
            marginBottom: '6pt',
            ...((template === 'creative-bold' || template === 'artistic-modern') && {
              borderTop: `3px solid ${style.accentColor}`,
              paddingTop: '12pt'
            })
          }}
        ></div>
        <div
          style={{
            fontWeight: style.borderStyle === 'border-bottom-accent' ? '600' : 'normal',
            color: style.borderStyle === 'border-bottom-accent' ? style.accentColor : '#000'
          }}
        >
          {personalInfo.full_name || 'Your Name'}
        </div>
      </div>
    </div>
  );
}