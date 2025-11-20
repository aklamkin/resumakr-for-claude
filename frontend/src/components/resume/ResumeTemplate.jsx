import React from "react";
import { format } from "date-fns";
import { Mail, Phone, MapPin } from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + '-01');
    return format(date, 'MMM yyyy');
  } catch (err) {
    return dateString;
  }
};

// Font mapping - simplified to 5 reliable web-safe fonts
const getFontFamily = (fontValue) => {
  const fontMap = {
    'arial': 'Arial, sans-serif',
    'georgia': 'Georgia, serif',
    'helvetica': 'Helvetica, Arial, sans-serif',
    'times': '"Times New Roman", Times, serif',
    'verdana': 'Verdana, Geneva, sans-serif'
  };
  return fontMap[fontValue] || fontMap['arial'];
};

// Page wrapper component
const ResumePage = ({ children, pageNumber, showPageNumber = false }) => (
  <div 
    className="bg-white shadow-lg mx-auto mb-6" 
    style={{ 
      width: '8.5in', 
      minHeight: '11in',
      pageBreakAfter: 'always',
      position: 'relative'
    }}
    data-page={pageNumber}
  >
    {children}
    {showPageNumber && (
      <div className="absolute bottom-4 right-4 text-xs text-slate-400">
        Page {pageNumber}
      </div>
    )}
  </div>
);

// Classic Professional Template
const ClassicProfessionalTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];
  
  const bgColor = customColors.backgroundColor || '#ffffff';
  const textColor = customColors.textColor || '#1e293b';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="p-8" style={{ backgroundColor: bgColor, color: textColor, fontFamily }}>
        <div className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: textColor }}>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="flex flex-wrap justify-center gap-3 text-sm" style={{ opacity: 0.7, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
          </div>
        </div>

        {data?.professional_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 uppercase tracking-wide" style={{ fontFamily }}>Professional Summary</h2>
            <p className="text-sm leading-relaxed" style={{ opacity: 0.85, fontFamily }}>{data.professional_summary}</p>
          </div>
        )}

        {workExperience.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase tracking-wide" style={{ fontFamily }}>Experience</h2>
            {workExperience.map((exp, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold" style={{ fontFamily }}>{exp.position}</h3>
                    <p className="text-sm italic" style={{ opacity: 0.85, fontFamily }}>{exp.company}</p>
                  </div>
                  <div className="text-right text-sm" style={{ opacity: 0.7, fontFamily }}>
                    <p>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</p>
                    {exp.location && <p>{exp.location}</p>}
                  </div>
                </div>
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc list-inside text-sm space-y-1 ml-2" style={{ opacity: 0.85, fontFamily }}>
                    {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {education.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase tracking-wide" style={{ fontFamily }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold" style={{ fontFamily }}>{edu.degree}</h3>
                    <p className="text-sm italic" style={{ opacity: 0.85, fontFamily }}>{edu.institution}</p>
                    {edu.field_of_study && <p className="text-sm" style={{ opacity: 0.85, fontFamily }}>{edu.field_of_study}</p>}
                  </div>
                  <div className="text-right text-sm" style={{ opacity: 0.7, fontFamily }}>
                    {edu.graduation_date && <p>{formatDate(edu.graduation_date)}</p>}
                    {edu.location && <p>{edu.location}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-3 uppercase tracking-wide" style={{ fontFamily }}>Skills</h2>
            {skills.map((category, idx) => (
              <div key={idx} className="mb-2">
                <span className="font-bold text-sm" style={{ fontFamily }}>{category.category}: </span>
                <span className="text-sm" style={{ opacity: 0.85, fontFamily }}>{category.items?.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResumePage>
  );
};

// Modern Minimalist Template
const ModernMinimalistTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];
  
  const accentColor = customColors.accentColor || '#2563eb';
  const textColor = customColors.textColor || '#1e293b';
  const sidebarBg = customColors.sidebarBackgroundColor || '#f1f5f9';
  const defaultText = customColors.defaultTextColor || '#475569';
  const tagBgColor = customColors.skillTagBackgroundColor || '#ffffff';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="text-slate-900 grid grid-cols-3 gap-0 h-full" style={{ fontFamily }}>
        <div className="col-span-1 p-6" style={{ backgroundColor: sidebarBg }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: textColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: defaultText, fontFamily }}>Contact</h3>
            <div className="space-y-2 text-xs" style={{ color: textColor, fontFamily }}>
              {personalInfo.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                  <span className="break-all">{personalInfo.email}</span>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                  <span>{personalInfo.phone}</span>
                </div>
              )}
              {personalInfo.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                  <span>{personalInfo.location}</span>
                </div>
              )}
            </div>
          </div>

          {skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: defaultText, fontFamily }}>Skills</h3>
              {skills.map((category, idx) => (
                <div key={idx} className="mb-4">
                  <h4 className="text-xs font-semibold mb-2" style={{ color: accentColor, fontFamily }}>{category.category}</h4>
                  <div className="flex flex-wrap gap-1">
                    {category.items?.map((skill, sidx) => (
                      <span key={sidx} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: tagBgColor, color: defaultText, fontFamily }}>{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 p-8" style={{ backgroundColor: customColors.backgroundColor || '#ffffff' }}>
          {data?.professional_summary && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b-2 pb-1" style={{ color: accentColor, borderColor: accentColor, fontFamily }}>Profile</h2>
              <p className="text-sm leading-relaxed" style={{ color: textColor, fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 border-b-2 pb-1" style={{ color: accentColor, borderColor: accentColor, fontFamily }}>Experience</h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="mb-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor, fontFamily }}>{exp.position}</h3>
                    <div className="flex justify-between items-center text-xs" style={{ color: defaultText, fontFamily }}>
                      <span className="font-semibold">{exp.company}</span>
                      <span>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</span>
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside text-xs space-y-1" style={{ color: defaultText, fontFamily }}>
                      {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {education.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 border-b-2 pb-1" style={{ color: accentColor, borderColor: accentColor, fontFamily }}>Education</h2>
              {education.map((edu, idx) => (
                <div key={idx} className="mb-3">
                  <h3 className="text-sm font-bold" style={{ color: textColor, fontFamily }}>{edu.degree}</h3>
                  <div className="flex justify-between items-center text-xs" style={{ color: defaultText, fontFamily }}>
                    <span className="font-semibold">{edu.institution}</span>
                    {edu.graduation_date && <span>{formatDate(edu.graduation_date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResumePage>
  );
};

// Creative Bold Template
const CreativeBoldTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];
  
  const accentColor = customColors.accentColor || '#4f46e5';
  const primaryTextColor = customColors.primaryTextColor || '#1e293b';
  const secondaryTextColor = customColors.secondaryTextColor || '#475569';
  const dividerColor = customColors.dividerColor || '#e2e8f0';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white h-full" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="px-8 pt-8 pb-6 mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: primaryTextColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: secondaryTextColor, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
          </div>
          <div className="w-12 h-0.5 mt-4" style={{ backgroundColor: accentColor }}></div>
        </div>

        <div className="px-8 pb-8">
          {data?.professional_summary && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-1 h-4" style={{ backgroundColor: accentColor }}></div>
                Professional Summary
              </h2>
              <p className="text-sm leading-relaxed ml-3" style={{ color: secondaryTextColor, fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-1 h-4" style={{ backgroundColor: accentColor }}></div>
                Experience
              </h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-4 ml-3 pb-4 border-b last:border-b-0" style={{ borderColor: dividerColor }}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: primaryTextColor, fontFamily }}>{exp.position}</h3>
                      <p className="text-xs font-semibold" style={{ color: secondaryTextColor, fontFamily }}>{exp.company}</p>
                    </div>
                    <div className="text-xs text-right" style={{ color: secondaryTextColor, opacity: 0.8, fontFamily }}>
                      <p>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</p>
                      {exp.location && <p style={{ opacity: 0.7 }}>{exp.location}</p>}
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="space-y-1 text-xs mt-2" style={{ color: secondaryTextColor, fontFamily }}>
                      {exp.responsibilities.map((resp, ridx) => resp && (
                        <li key={ridx} className="flex items-start gap-2">
                          <span className="mt-0.5" style={{ color: accentColor }}>•</span>
                          <span className="flex-1">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-1 h-4" style={{ backgroundColor: accentColor }}></div>
                Education
              </h2>
              {education.map((edu, idx) => (
                <div key={idx} className="mb-3 ml-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: primaryTextColor, fontFamily }}>{edu.degree}</h3>
                      <p className="text-xs" style={{ color: secondaryTextColor, fontFamily }}>{edu.institution}</p>
                      {edu.field_of_study && <p className="text-xs" style={{ color: secondaryTextColor, opacity: 0.8, fontFamily }}>{edu.field_of_study}</p>}
                    </div>
                    <div className="text-xs text-right" style={{ color: secondaryTextColor, opacity: 0.8, fontFamily }}>
                      {edu.graduation_date && <p>{formatDate(edu.graduation_date)}</p>}
                      {edu.location && <p style={{ opacity: 0.7 }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-1 h-4" style={{ backgroundColor: accentColor }}></div>
                Skills
              </h2>
              <div className="ml-3 space-y-2">
                {skills.map((category, idx) => (
                  <div key={idx} className="text-xs" style={{ fontFamily }}>
                    <span className="font-bold" style={{ color: primaryTextColor }}>{category.category}: </span>
                    <span style={{ color: secondaryTextColor }}>{category.items?.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ResumePage>
  );
};

// Executive Elegant Template
const ExecutiveElegantTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const primaryColor = customColors.primaryColor || '#1e293b';
  const textColor = customColors.textColor || '#475569';
  const sectionTitleColor = customColors.sectionTitleColor || '#475569';
  const borderColor = customColors.borderColor || '#cbd5e1';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-slate-50 p-8" style={{ backgroundColor: customColors.backgroundColor || '#f8fafc', color: textColor, fontFamily }}>
        <div className="text-center mb-8 pb-6 border-b" style={{ borderColor }}>
          <h1 className="text-4xl font-light tracking-wide mb-3" style={{ color: primaryColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm" style={{ fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>|</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>|</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
          </div>
        </div>

        {data?.professional_summary && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-3 border-b pb-2" style={{ color: sectionTitleColor, borderColor, fontFamily }}>Executive Summary</h2>
            <p className="text-sm leading-relaxed text-justify" style={{ opacity: 0.9, fontFamily }}>{data.professional_summary}</p>
          </div>
        )}

        {workExperience.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b pb-2" style={{ color: sectionTitleColor, borderColor, fontFamily }}>Professional Experience</h2>
            {workExperience.map((exp, idx) => (
              <div key={idx} className="mb-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                    <p className="text-sm" style={{ fontFamily }}>{exp.company}{exp.location && ` • ${exp.location}`}</p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap ml-4" style={{ fontFamily }}>
                    {formatDate(exp.start_date)} – {exp.current ? "Present" : formatDate(exp.end_date)}
                  </div>
                </div>
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="space-y-1 text-sm" style={{ fontFamily }}>
                    {exp.responsibilities.map((resp, ridx) => resp && (
                      <li key={ridx} className="flex items-start gap-2">
                        <span className="mt-1.5" style={{ color: borderColor }}>•</span>
                        <span className="flex-1" style={{ opacity: 0.9 }}>{resp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {education.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b pb-2" style={{ color: sectionTitleColor, borderColor, fontFamily }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-sm" style={{ fontFamily }}>{edu.institution}</p>
                    {edu.field_of_study && <p className="text-sm" style={{ fontFamily }}>{edu.field_of_study}</p>}
                  </div>
                  <div className="text-right text-sm whitespace-nowrap ml-4" style={{ fontFamily }}>
                    {edu.graduation_date && formatDate(edu.graduation_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b pb-2" style={{ color: sectionTitleColor, borderColor, fontFamily }}>Core Competencies</h2>
            <div className="space-y-2">
              {skills.map((category, idx) => (
                <div key={idx} style={{ fontFamily }}>
                  <span className="text-sm font-semibold" style={{ color: primaryColor }}>{category.category}: </span>
                  <span className="text-sm" style={{ opacity: 0.9 }}>{category.items?.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResumePage>
  );
};

// Tech Sleek Template
const TechSleekTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const accentColor = customColors.accentColor || '#06b6d4';
  const bgColor = customColors.backgroundColor || '#0f172a';
  const sectionTitleColor = accentColor;
  const itemTitleColor = accentColor;
  const itemTextColor = customColors.itemTextColor || '#d1d5db';
  const itemBgColor = customColors.itemBackgroundColor || '#1e293b';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="h-full" style={{ backgroundColor: bgColor, color: itemTextColor, fontFamily }}>
        <div className="p-8" style={{ 
          backgroundImage: `linear-gradient(to right, ${accentColor}, ${accentColor}DD)`,
          backgroundColor: accentColor 
        }}>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-white" style={{ fontFamily }}>{personalInfo.full_name || 'YOUR_NAME'}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-white" style={{ fontFamily }}>
            {personalInfo.email && <span className="px-2 py-1 rounded" style={{ backgroundColor: `${bgColor}B0` }}>{personalInfo.email}</span>}
            {personalInfo.phone && <span className="px-2 py-1 rounded" style={{ backgroundColor: `${bgColor}B0` }}>{personalInfo.phone}</span>}
            {personalInfo.location && <span className="px-2 py-1 rounded" style={{ backgroundColor: `${bgColor}B0` }}>{personalInfo.location}</span>}
          </div>
        </div>

        <div className="p-8">
          {data?.professional_summary && (
            <div className="mb-6 border-l-4 pl-4" style={{ borderColor: accentColor }}>
              <h2 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: sectionTitleColor, fontFamily }}>&gt; PROFILE</h2>
              <p className="text-sm leading-relaxed" style={{ fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: sectionTitleColor, fontFamily }}>&gt; EXPERIENCE</h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-4 rounded p-3" style={{ border: `1px solid ${accentColor}40`, backgroundColor: `${itemBgColor}80` }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: itemTitleColor, fontFamily }}>{exp.position}</h3>
                      <p className="text-xs" style={{ color: itemTextColor, fontFamily }}>{exp.company}</p>
                    </div>
                    <div className="text-right text-xs" style={{ color: itemTextColor, opacity: 0.7, fontFamily }}>
                      <p>{formatDate(exp.start_date)} → {exp.current ? "Now" : formatDate(exp.end_date)}</p>
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="space-y-1 text-xs" style={{ fontFamily }}>
                      {exp.responsibilities.map((resp, ridx) => resp && (
                        <li key={ridx} className="flex items-start gap-2">
                          <span style={{ color: sectionTitleColor }}>$</span>
                          <span style={{ color: itemTextColor }}>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {education.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: sectionTitleColor, fontFamily }}>&gt; EDUCATION</h2>
                {education.map((edu, idx) => (
                  <div key={idx} className="mb-3 rounded p-2" style={{ border: `1px solid ${accentColor}40`, backgroundColor: `${itemBgColor}80` }}>
                    <h3 className="text-xs font-bold" style={{ color: itemTitleColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-xs" style={{ color: itemTextColor, fontFamily }}>{edu.institution}</p>
                    {edu.graduation_date && <p className="text-xs" style={{ color: itemTextColor, opacity: 0.7, fontFamily }}>{formatDate(edu.graduation_date)}</p>}
                  </div>
                ))}
              </div>
            )}

            {skills.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: sectionTitleColor, fontFamily }}>&gt; SKILLS</h2>
                {skills.map((category, idx) => (
                  <div key={idx} className="mb-3">
                    <h4 className="text-xs font-bold mb-1" style={{ color: itemTitleColor, fontFamily }}>{category.category}</h4>
                    <div className="flex flex-wrap gap-1">
                      {category.items?.map((skill, sidx) => (
                        <span key={sidx} className="text-xs px-2 py-0.5 rounded border" style={{ backgroundColor: itemBgColor, borderColor: accentColor, color: itemTextColor, fontFamily }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ResumePage>
  );
};

// Professional Columns Template
const ProfessionalColumnsTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const primaryColor = customColors.primaryColor || '#1e293b';
  const textColor = customColors.textColor || '#475569';
  const accentColor = customColors.accentColor || '#334155';
  const borderColor = customColors.borderColor || '#cbd5e1';
  const skillBgColor = customColors.skillBackgroundColor || '#f1f5f9';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white p-8" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="mb-6 pb-4 border-b-2" style={{ borderColor }}>
          <h1 className="text-3xl font-bold mb-1" style={{ color: primaryColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: textColor, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
          </div>
        </div>

        {data?.professional_summary && (
          <div className="mb-6">
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-l-4 pl-3" style={{ color: accentColor, borderColor: accentColor, fontFamily }}>Summary</h2>
            <p className="text-sm leading-relaxed" style={{ color: textColor, fontFamily }}>{data.professional_summary}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            {workExperience.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-bold mb-3 uppercase tracking-wide border-l-4 pl-3" style={{ color: accentColor, borderColor: accentColor, fontFamily }}>Experience</h2>
                {workExperience.map((exp, idx) => (
                  <div key={idx} className="mb-4 pb-4 border-b last:border-b-0" style={{ borderColor }}>
                    <div className="mb-1">
                      <h3 className="text-sm font-bold" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                      <div className="flex justify-between items-center text-xs" style={{ fontFamily }}>
                        <span className="font-semibold" style={{ color: textColor }}>{exp.company}</span>
                        <span style={{ color: textColor, opacity: 0.7 }}>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</span>
                      </div>
                    </div>
                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <ul className="list-disc list-inside text-xs space-y-1 mt-2" style={{ color: textColor, opacity: 0.85, fontFamily }}>
                        {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-1">
            {education.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-bold mb-3 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>Education</h2>
                {education.map((edu, idx) => (
                  <div key={idx} className="mb-4">
                    <h3 className="text-xs font-bold" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-xs" style={{ color: textColor, fontFamily }}>{edu.institution}</p>
                    {edu.graduation_date && <p className="text-xs" style={{ color: textColor, opacity: 0.7, fontFamily }}>{formatDate(edu.graduation_date)}</p>}
                  </div>
                ))}
              </div>
            )}

            {skills.length > 0 && (
              <div>
                <h2 className="text-base font-bold mb-3 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>Skills</h2>
                {skills.map((category, idx) => (
                  <div key={idx} className="mb-3">
                    <h4 className="text-xs font-bold mb-1" style={{ color: primaryColor, fontFamily }}>{category.category}</h4>
                    <div className="flex flex-wrap gap-1">
                      {category.items?.map((skill, sidx) => (
                        <span key={sidx} className="text-xs px-2 py-1 rounded border" style={{ backgroundColor: skillBgColor, borderColor, color: textColor, fontFamily }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ResumePage>
  );
};

// Professional Compact Template
const ProfessionalCompactTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const primaryColor = customColors.primaryColor || '#1e293b';
  const textColor = customColors.textColor || '#475569';
  const borderColor = customColors.borderColor || '#94a3b8';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white p-8" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="text-center mb-6 pb-4 border-b" style={{ borderColor }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="text-sm" style={{ color: textColor, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span> | {personalInfo.phone}</span>}
            {personalInfo.location && <span> | {personalInfo.location}</span>}
          </div>
        </div>

        {data?.professional_summary && (
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: primaryColor, fontFamily }}>Professional Profile</h2>
            <p className="text-xs leading-relaxed" style={{ color: textColor, fontFamily }}>{data.professional_summary}</p>
          </div>
        )}

        {workExperience.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: primaryColor, fontFamily }}>Work Experience</h2>
            {workExperience.map((exp, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                    <p className="text-xs" style={{ color: textColor, fontFamily }}>{exp.company}</p>
                  </div>
                  <div className="text-right text-xs" style={{ color: textColor, fontFamily }}>
                    <p>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</p>
                  </div>
                </div>
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-0.5 ml-2" style={{ color: textColor, fontFamily }}>
                    {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {education.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: primaryColor, fontFamily }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-xs" style={{ color: textColor, fontFamily }}>{edu.institution}</p>
                  </div>
                  <div className="text-xs" style={{ color: textColor, fontFamily }}>
                    {edu.graduation_date && formatDate(edu.graduation_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: primaryColor, fontFamily }}>Skills</h2>
            <div className="space-y-1">
              {skills.map((category, idx) => (
                <div key={idx} className="text-xs" style={{ fontFamily }}>
                  <span className="font-bold" style={{ color: primaryColor }}>{category.category}: </span>
                  <span style={{ color: textColor }}>{category.items?.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResumePage>
  );
};

// Modern Professional Template
const ModernProfessionalTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const accentColor = customColors.accentColor || '#4f46e5';
  const headerBg = customColors.headerBackgroundColor || accentColor;
  const headerTextColor = customColors.headerTextColor || '#ffffff';
  const primaryColor = accentColor;
  const textColor = customColors.textColor || '#475569';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="p-8" style={{ backgroundColor: headerBg, color: headerTextColor }}>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="flex flex-wrap gap-3 text-sm" style={{ opacity: 0.9, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
          </div>
        </div>

        <div className="p-8">
          {data?.professional_summary && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-2 uppercase tracking-wider pb-1 border-b-2" style={{ color: primaryColor, borderColor: primaryColor, fontFamily }}>Professional Summary</h2>
              <p className="text-sm leading-relaxed" style={{ color: textColor, fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wider pb-1 border-b-2" style={{ color: primaryColor, borderColor: primaryColor, fontFamily }}>Experience</h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                      <p className="text-xs font-semibold" style={{ color: textColor, fontFamily }}>{exp.company}</p>
                    </div>
                    <div className="text-right text-xs" style={{ color: textColor, opacity: 0.8, fontFamily }}>
                      <p>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</p>
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside text-xs space-y-1" style={{ color: textColor, fontFamily }}>
                      {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wider pb-1 border-b-2" style={{ color: primaryColor, borderColor: primaryColor, fontFamily }}>Education</h2>
              {education.map((edu, idx) => (
                <div key={idx} className="mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                      <p className="text-xs" style={{ color: textColor, fontFamily }}>{edu.institution}</p>
                    </div>
                    <div className="text-xs" style={{ color: textColor, opacity: 0.8, fontFamily }}>
                      {edu.graduation_date && formatDate(edu.graduation_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 uppercase tracking-wider pb-1 border-b-2" style={{ color: primaryColor, borderColor: primaryColor, fontFamily }}>Skills</h2>
              <div className="space-y-2">
                {skills.map((category, idx) => (
                  <div key={idx} className="text-xs" style={{ fontFamily }}>
                    <span className="font-bold" style={{ color: primaryColor }}>{category.category}: </span>
                    <span style={{ color: textColor }}>{category.items?.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ResumePage>
  );
};

// Clean Formal Template
const CleanFormalTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const primaryColor = customColors.primaryColor || '#1e293b';
  const textColor = customColors.textColor || '#475569';
  const borderColor = customColors.borderColor || '#94a3b8';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white p-8" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 tracking-wide" style={{ color: primaryColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
          <div className="text-sm space-x-2" style={{ color: textColor, fontFamily }}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>•</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>•</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
          </div>
        </div>

        <hr className="mb-6" style={{ borderColor }} />

        {data?.professional_summary && (
          <div className="mb-6">
            <h2 className="text-base font-bold mb-2 uppercase" style={{ color: primaryColor, fontFamily }}>Summary</h2>
            <p className="text-sm leading-relaxed" style={{ color: textColor, fontFamily }}>{data.professional_summary}</p>
          </div>
        )}

        {workExperience.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-bold mb-3 uppercase" style={{ color: primaryColor, fontFamily }}>Work Experience</h2>
            {workExperience.map((exp, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                    <p className="text-sm italic" style={{ color: textColor, fontFamily }}>{exp.company}</p>
                  </div>
                  <div className="text-right text-sm" style={{ color: textColor, fontFamily }}>
                    {formatDate(exp.start_date)} – {exp.current ? "Present" : formatDate(exp.end_date)}
                  </div>
                </div>
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc list-inside text-sm space-y-1 ml-2" style={{ color: textColor, fontFamily }}>
                    {exp.responsibilities.map((resp, ridx) => resp && <li key={ridx}>{resp}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {education.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-bold mb-3 uppercase" style={{ color: primaryColor, fontFamily }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-sm italic" style={{ color: textColor, fontFamily }}>{edu.institution}</p>
                  </div>
                  <div className="text-sm" style={{ color: textColor, fontFamily }}>
                    {edu.graduation_date && formatDate(edu.graduation_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-base font-bold mb-3 uppercase" style={{ color: primaryColor, fontFamily }}>Skills</h2>
            <div className="space-y-2">
              {skills.map((category, idx) => (
                <div key={idx} className="text-sm" style={{ fontFamily }}>
                  <span className="font-bold" style={{ color: primaryColor }}>{category.category}: </span>
                  <span style={{ color: textColor }}>{category.items?.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResumePage>
  );
};

// Artistic Modern Template
const ArtisticModernTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const bgColor = customColors.backgroundColor || '#fff7ed';
  const headerGradientFrom = customColors.headerGradientFrom || '#fbbf24';
  const headerGradientVia = customColors.headerGradientVia || '#f97316';
  const headerGradientTo = customColors.headerGradientTo || '#f43f5e';
  const primaryTextColor = customColors.primaryTextColor || '#1e293b';
  const secondaryTextColor = customColors.secondaryTextColor || '#475569';
  const accentColor = customColors.accentColor || '#ea580c';
  const shadowBgOpacity = 'B3';
  const contactBgOpacity = '99';
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="h-full" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="relative p-8 pb-6">
          <div className="absolute top-0 left-0 w-full h-32 opacity-20" style={{ backgroundImage: `linear-gradient(to right, ${headerGradientFrom}, ${headerGradientVia}, ${headerGradientTo})` }}></div>
          <div className="relative">
            <h1 className="text-4xl font-black mb-1" style={{ color: primaryTextColor, fontFamily }}>{personalInfo.full_name || 'Your Name'}</h1>
            <div className="flex flex-wrap gap-2 text-sm" style={{ color: secondaryTextColor, fontFamily }}>
              {personalInfo.email && <span className="px-2 py-1 rounded" style={{ backgroundColor: `#ffffff${contactBgOpacity}` }}>{personalInfo.email}</span>}
              {personalInfo.phone && <span className="px-2 py-1 rounded" style={{ backgroundColor: `#ffffff${contactBgOpacity}` }}>{personalInfo.phone}</span>}
              {personalInfo.location && <span className="px-2 py-1 rounded" style={{ backgroundColor: `#ffffff${contactBgOpacity}` }}>{personalInfo.location}</span>}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8">
          {data?.professional_summary && (
            <div className="mb-6 rounded-2xl p-4 shadow-md border-l-4" style={{ backgroundColor: `#ffffff${shadowBgOpacity}`, borderColor: accentColor }}>
              <h2 className="text-base font-black mb-2 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>About</h2>
              <p className="text-sm leading-relaxed" style={{ color: primaryTextColor, fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-black mb-3 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>Experience</h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-4 rounded-2xl p-4 shadow-md relative overflow-hidden" style={{ backgroundColor: `#ffffff${shadowBgOpacity}` }}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-200 to-orange-200 rounded-bl-full opacity-40"></div>
                  <div className="relative">
                    <div className="mb-2">
                      <h3 className="text-sm font-bold" style={{ color: primaryTextColor, fontFamily }}>{exp.position}</h3>
                      <div className="flex justify-between items-center text-xs" style={{ fontFamily }}>
                        <span className="font-semibold" style={{ color: accentColor }}>{exp.company}</span>
                        <span style={{ color: secondaryTextColor }}>{formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}</span>
                      </div>
                    </div>
                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <ul className="space-y-1 text-xs" style={{ color: secondaryTextColor, fontFamily }}>
                        {exp.responsibilities.map((resp, ridx) => resp && (
                          <li key={ridx} className="flex items-start gap-2">
                            <span className="mt-0.5" style={{ color: accentColor }}>→</span>
                            <span className="flex-1">{resp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {education.length > 0 && (
              <div>
                <h2 className="text-base font-black mb-3 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>Education</h2>
                {education.map((edu, idx) => (
                  <div key={idx} className="mb-3 rounded-xl p-3 shadow-md" style={{ backgroundColor: `#ffffff${shadowBgOpacity}` }}>
                    <h3 className="text-sm font-bold" style={{ color: primaryTextColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-xs font-semibold" style={{ color: accentColor, fontFamily }}>{edu.institution}</p>
                    {edu.graduation_date && <p className="text-xs" style={{ color: secondaryTextColor, fontFamily }}>{formatDate(edu.graduation_date)}</p>}
                  </div>
                ))}
              </div>
            )}

            {skills.length > 0 && (
              <div>
                <h2 className="text-base font-black mb-3 uppercase tracking-wide" style={{ color: accentColor, fontFamily }}>Skills</h2>
                <div className="rounded-xl p-3 shadow-md" style={{ backgroundColor: `#ffffff${shadowBgOpacity}` }}>
                  {skills.map((category, idx) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      <h4 className="text-xs font-bold mb-1" style={{ color: accentColor, fontFamily }}>{category.category}</h4>
                      <div className="flex flex-wrap gap-1">
                        {category.items?.map((skill, sidx) => (
                          <span key={sidx} className="text-xs px-2 py-1 rounded-full border" style={{ backgroundColor: '#ffedd5', borderColor: '#fdbf74', color: primaryTextColor, fontFamily }}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResumePage>
  );
};

// Contemporary Clean Template
const ContemporaryCleanTemplate = ({ data, customColors = {}, customFonts = {} }) => {
  const personalInfo = data?.personal_info || {};
  const workExperience = data?.work_experience || [];
  const education = data?.education || [];
  const skills = data?.skills || [];

  const accentColor = customColors.accentColor || '#4f46e5';
  const primaryColor = customColors.primaryColor || '#1e293b';
  const textColor = customColors.textColor || '#475569';
  const lightAccent = `${accentColor}15`;
  const fontFamily = getFontFamily(customFonts.fontFamily);

  return (
    <ResumePage pageNumber={1}>
      <div className="bg-white" style={{ backgroundColor: customColors.backgroundColor || '#ffffff', fontFamily }}>
        <div className="relative px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-3 tracking-tight" style={{ color: primaryColor, fontFamily }}>
                {personalInfo.full_name || 'Your Name'}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm" style={{ color: textColor, fontFamily }}>
                {personalInfo.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>{personalInfo.email}</span>
                  </div>
                )}
                {personalInfo.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>{personalInfo.phone}</span>
                  </div>
                )}
                {personalInfo.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>{personalInfo.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-20 h-20 rounded-full opacity-10" style={{ backgroundColor: accentColor }}></div>
          </div>
          <div className="h-1 w-24" style={{ backgroundColor: accentColor }}></div>
        </div>

        <div className="px-8 pb-8">
          {data?.professional_summary && (
            <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: lightAccent, borderLeft: `4px solid ${accentColor}` }}>
              <h2 className="text-xs font-bold mb-3 uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-6 h-0.5" style={{ backgroundColor: accentColor }}></div>
                Professional Profile
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: primaryColor, fontFamily }}>{data.professional_summary}</p>
            </div>
          )}

          {workExperience.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold mb-5 uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                <div className="w-6 h-0.5" style={{ backgroundColor: accentColor }}></div>
                Professional Experience
              </h2>
              {workExperience.map((exp, idx) => (
                <div key={idx} className="mb-6 relative pl-6">
                  <div className="absolute left-0 top-2 w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                  <div className="absolute left-0.5 top-4 w-0.5 h-full opacity-20" style={{ backgroundColor: accentColor }}></div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-base font-bold mb-1" style={{ color: primaryColor, fontFamily }}>{exp.position}</h3>
                      <p className="text-sm font-semibold" style={{ color: accentColor, fontFamily }}>{exp.company}</p>
                    </div>
                    <div className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: lightAccent, color: textColor, fontFamily }}>
                      {formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="space-y-2 text-sm mt-3" style={{ color: textColor, fontFamily }}>
                      {exp.responsibilities.map((resp, ridx) => resp && (
                        <li key={ridx} className="flex items-start gap-3">
                          <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: accentColor }}></div>
                          <span className="flex-1">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-5 gap-6">
            {education.length > 0 && (
              <div className="col-span-3">
                <h2 className="text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                  <div className="w-6 h-0.5" style={{ backgroundColor: accentColor }}></div>
                  Education
                </h2>
                {education.map((edu, idx) => (
                  <div key={idx} className="mb-4 p-4 rounded-lg border" style={{ borderColor: `${accentColor}20`, backgroundColor: `${accentColor}05` }}>
                    <h3 className="text-sm font-bold mb-1" style={{ color: primaryColor, fontFamily }}>{edu.degree}</h3>
                    <p className="text-xs font-semibold mb-1" style={{ color: accentColor, fontFamily }}>{edu.institution}</p>
                    {edu.graduation_date && (
                      <p className="text-xs" style={{ color: textColor, fontFamily }}>{formatDate(edu.graduation_date)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {skills.length > 0 && (
              <div className="col-span-2">
                <h2 className="text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor, fontFamily }}>
                  <div className="w-6 h-0.5" style={{ backgroundColor: accentColor }}></div>
                  Skills
                </h2>
                <div className="space-y-4">
                  {skills.map((category, idx) => (
                    <div key={idx}>
                      <h4 className="text-xs font-bold mb-2" style={{ color: primaryColor, fontFamily }}>{category.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {category.items?.map((skill, sidx) => (
                          <span 
                            key={sidx} 
                            className="text-xs px-3 py-1.5 rounded-full font-medium" 
                            style={{ 
                              backgroundColor: lightAccent, 
                              color: accentColor,
                              border: `1px solid ${accentColor}30`,
                              fontFamily
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResumePage>
  );
};

// Main component
export default function ResumeTemplate({ data, template, scale = 1, showFirstPageOnly = false, customColors = {}, customFonts = {} }) {
  const templates = {
    'classic-professional': ClassicProfessionalTemplate,
    'modern-minimalist': ModernMinimalistTemplate,
    'creative-bold': CreativeBoldTemplate,
    'executive-elegant': ExecutiveElegantTemplate,
    'tech-sleek': TechSleekTemplate,
    'professional-columns': ProfessionalColumnsTemplate,
    'professional-compact': ProfessionalCompactTemplate,
    'modern-professional': ModernProfessionalTemplate,
    'clean-formal': CleanFormalTemplate,
    'artistic-modern': ArtisticModernTemplate,
    'contemporary-clean': ContemporaryCleanTemplate,
  };

  const TemplateComponent = templates[template] || ClassicProfessionalTemplate;

  return (
    <div 
      style={{ 
        transform: `scale(${scale})`, 
        transformOrigin: 'top left',
        width: showFirstPageOnly ? '8.5in' : 'auto'
      }}
    >
      {showFirstPageOnly ? (
        <div style={{ height: '11in', overflow: 'hidden' }}>
          <TemplateComponent data={data} customColors={customColors} customFonts={customFonts} />
        </div>
      ) : (
        <TemplateComponent data={data} customColors={customColors} customFonts={customFonts} />
      )}
    </div>
  );
}

export const TEMPLATE_OPTIONS = [
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Traditional single-column layout. Perfect for conservative industries.',
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean two-column design with blue accents. Great for tech roles.',
  },
  {
    id: 'creative-bold',
    name: 'Color Accents',
    description: 'Professional layout with indigo accents. Modern yet refined.',
  },
  {
    id: 'executive-elegant',
    name: 'Executive Elegant',
    description: 'Sophisticated layout. Perfect for senior-level positions.',
  },
  {
    id: 'tech-sleek',
    name: 'Tech Sleek',
    description: 'Modern grid design. Great for developers and tech professionals.',
  },
  {
    id: 'professional-columns',
    name: 'Professional Columns',
    description: 'Three-column layout. Ideal for experienced professionals.',
  },
  {
    id: 'professional-compact',
    name: 'Professional Compact',
    description: 'Space-efficient design. Perfect for early career professionals.',
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Contemporary design with bold header. Great for business.',
  },
  {
    id: 'clean-formal',
    name: 'Clean Formal',
    description: 'Traditional formal design. Suitable for academic roles.',
  },
  {
    id: 'artistic-modern',
    name: 'Artistic Modern',
    description: 'Creative design with warm gradients. Perfect for designers.',
  },
  {
    id: 'contemporary-clean',
    name: 'Contemporary Clean',
    description: 'Modern minimalist with accents. Great for versatile use.',
  },
];