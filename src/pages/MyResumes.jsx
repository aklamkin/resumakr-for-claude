import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Eye, Trash2, Upload, Sparkles, Edit2, Check, X, Copy, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmDialog, NotificationPopup } from "../components/ui/notification";
import ExportDropdown from "../components/resume/ExportDropdown";

export default function MyResumes() {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [sortBy, setSortBy] = useState("updated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "default",
    showCancel: true
  });
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });

  React.useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user.is_subscribed && user.subscription_end_date) {
        const endDate = new Date(user.subscription_end_date);
        const now = new Date();
        const active = endDate > now;
        setIsSubscribed(active);
        
        // Only update is_subscribed to false if truly expired
        if (!active) {
          await base44.auth.updateMe({ is_subscribed: false });
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      setIsSubscribed(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscriptionRequired = () => {
    navigate(createPageUrl("Pricing?returnUrl=MyResumes"));
  };

  const showConfirm = ({ title, message, onConfirm, confirmText = "Confirm", cancelText = "Cancel", type = "default", showCancel = true }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type,
      showCancel,
    });
  };

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  const { data: resumes = [], isLoading, refetch } = useQuery({
    queryKey: ['my-resumes'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Resume.filter({ created_by: user.email }, "-updated_date");
    },
  });

  const { data: allVersions = [] } = useQuery({
    queryKey: ['all-resume-versions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ResumeVersion.filter({ created_by: user.email }); 
    },
  });

  const versionCounts = React.useMemo(() => {
    const counts = {};
    allVersions.forEach(version => {
      counts[version.resume_id] = (counts[version.resume_id] || 0) + 1;
    });
    return counts;
  }, [allVersions]);

  const updateResumeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resume.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resumes'] });
      setEditingId(null);
      setEditingTitle("");
      showNotification("Resume title updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to update title: ${error.message}`, "Error", "error");
    }
  });

  const duplicateResumeMutation = useMutation({
    mutationFn: async (resumeId) => {
      setDuplicatingId(resumeId);
      const originalResume = resumes.find(r => r.id === resumeId);
      const dataRecords = await base44.entities.ResumeData.filter({ resume_id: resumeId });
      
      const newResume = await base44.entities.Resume.create({
        title: `Copy of ${originalResume.title}`,
        status: originalResume.status,
        source_type: originalResume.source_type,
        file_url: originalResume.file_url,
        last_edited_step: originalResume.last_edited_step
      });

      // Always create a ResumeData record, even if original has none
      if (dataRecords.length > 0) {
        const originalData = dataRecords[0];
        const { 
          id, created_date, updated_date, created_by, resume_id, 
          job_description, ats_analysis_results,
          cover_letter_short, cover_letter_long, cover_letter_template_id, 
          cover_letter_custom_colors, cover_letter_custom_fonts,
          ...dataToCopy 
        } = originalData;
        await base44.entities.ResumeData.create({
          resume_id: newResume.id,
          job_description: "",
          ats_analysis_results: null,
          cover_letter_short: null,
          cover_letter_long: null,
          cover_letter_template_id: null,
          cover_letter_custom_colors: null,
          cover_letter_custom_fonts: null,
          ...dataToCopy
        });
      } else {
        // Create empty ResumeData record
        await base44.entities.ResumeData.create({
          resume_id: newResume.id,
          job_description: "",
          ats_analysis_results: null,
          cover_letter_short: null,
          cover_letter_long: null
        });
      }

      const versionRecords = await base44.entities.ResumeVersion.filter({ resume_id: resumeId });
      for (const version of versionRecords) {
        const { id, created_date, updated_date, created_by, resume_id, ...versionToCopy } = version;
        await base44.entities.ResumeVersion.create({
          resume_id: newResume.id,
          version_name: version.version_name || `Version ${version.version_number}`,
          ...versionToCopy
        });
      }

      return newResume;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resumes'] });
      queryClient.invalidateQueries({ queryKey: ['all-resume-versions'] });
      setDuplicatingId(null);
      showNotification("Resume duplicated successfully!", "Success");
    },
    onError: (error) => {
      setDuplicatingId(null);
      showNotification(`Failed to duplicate resume: ${error.message}`, "Error", "error");
    }
  });

  const deleteResumeMutation = useMutation({
    mutationFn: async (resumeId) => {
      setDeletingId(resumeId);
      await base44.entities.Resume.delete(resumeId);
      
      const dataRecords = await base44.entities.ResumeData.filter({ resume_id: resumeId });
      for (const record of dataRecords) {
        await base44.entities.ResumeData.delete(record.id);
      }
      
      const versionRecords = await base44.entities.ResumeVersion.filter({ resume_id: resumeId });
      for (const record of versionRecords) {
        await base44.entities.ResumeVersion.delete(record.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resumes'] });
      queryClient.invalidateQueries({ queryKey: ['all-resume-versions'] });
      setDeletingId(null);
      showNotification("Resume deleted successfully!", "Success");
    },
    onError: (error) => {
      setDeletingId(null);
      showNotification(`Failed to delete resume: ${error.message}`, "Error", "error");
    }
  });

  const sortedResumes = [...resumes].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === "name") {
      comparison = b.title.localeCompare(a.title); 
    } else if (sortBy === "created") {
      comparison = new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    } else {
      comparison = new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime();
    }
    
    return sortDirection === "asc" ? -comparison : comparison;
  });

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortBy(newSortBy);
      setSortDirection(newSortBy === "name" ? "asc" : "desc");
    }
  };

  const handleDelete = (resumeId) => {
    showConfirm({
      title: "Delete Resume",
      message: "Are you sure you want to delete this resume? This action cannot be undone and will also delete all associated data and versions.",
      onConfirm: () => {
        deleteResumeMutation.mutate(resumeId);
      },
      confirmText: "Delete",
      type: "destructive",
    });
  };

  const handleDuplicate = (resumeId) => {
    duplicateResumeMutation.mutate(resumeId);
  };

  const startEditing = (resume) => {
    setEditingId(resume.id);
    setEditingTitle(resume.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const saveTitle = (resumeId) => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }
    updateResumeMutation.mutate({
      id: resumeId,
      data: { title: editingTitle.trim() }
    });
  };

  const generateResumeHTML = (resumeData, personalInfo) => {
    // Check if template info exists and use template for export
    const templateId = resumeData.template_id || 'classic-professional';
    const templateName = resumeData.template_name || 'Classic Professional';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${personalInfo.full_name || 'Resume'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin: 0.75in;
      
      @bottom-center {
        content: counter(page);
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 10pt;
        color: #666;
      }
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      font-size: 11pt;
    }
    
    h1 {
      font-size: 24pt;
      margin-bottom: 8px;
      color: #1a1a1a;
      font-weight: 700;
    }
    
    h2 {
      font-size: 14pt;
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid #333;
      color: #1a1a1a;
      font-weight: 600;
    }
    
    h3 {
      font-size: 12pt;
      margin-bottom: 4px;
      color: #1a1a1a;
      font-weight: 600;
    }
    
    .contact-info {
      font-size: 10pt;
      margin-bottom: 18px;
      color: #555;
      line-height: 1.4;
    }
    
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    
    .job-header, .edu-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      page-break-inside: avoid;
    }
    
    .company {
      font-weight: 600;
      font-size: 10pt;
    }
    
    .date {
      font-style: italic;
      color: #555;
      font-size: 10pt;
      text-align: right;
    }
    
    ul {
      margin: 6px 0 12px 0;
      padding-left: 24px;
    }
    
    li {
      margin-bottom: 4px;
      font-size: 10pt;
      line-height: 1.5;
    }
    
    .skills {
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    
    .skill-category {
      font-weight: 600;
      margin-right: 6px;
      font-size: 10pt;
    }
    
    p {
      font-size: 10pt;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      h2 {
        page-break-after: avoid;
      }
      
      .job-header, .edu-header {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>${personalInfo.full_name || 'Resume'}</h1>
  <div class="contact-info">
    ${personalInfo.email || ''} ${personalInfo.phone ? '• ' + personalInfo.phone : ''} ${personalInfo.location ? '• ' + personalInfo.location : ''}
    ${personalInfo.linkedin ? '<br>' + personalInfo.linkedin : ''}
    ${personalInfo.website ? ' • ' + personalInfo.website : ''}
    ${personalInfo.github ? ' • ' + personalInfo.github : ''}
  </div>

  ${resumeData.professional_summary ? `
  <div class="section">
    <h2>Professional Summary</h2>
    <p>${resumeData.professional_summary}</p>
  </div>
  ` : ''}

  ${resumeData.work_experience && resumeData.work_experience.length > 0 ? `
  <div class="section">
    <h2>Work Experience</h2>
    ${resumeData.work_experience.map(exp => `
      <div style="margin-bottom: 14px;">
        <div class="job-header">
          <div>
            <h3 style="margin: 0;">${exp.position || ''}</h3>
            <div class="company">${exp.company || ''}</div>
          </div>
          <div class="date">
            ${exp.location || ''}<br>
            ${exp.start_date || ''} - ${exp.current ? 'Present' : (exp.end_date || '')}
          </div>
        </div>
        ${exp.responsibilities && exp.responsibilities.length > 0 ? `
          <ul>
            ${exp.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${resumeData.education && resumeData.education.length > 0 ? `
  <div class="section">
    <h2>Education</h2>
    ${resumeData.education.map(edu => `
      <div class="edu-header" style="margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0;">${edu.degree || ''}</h3>
          <div style="font-size: 10pt;">${edu.institution || ''}</div>
          ${edu.field_of_study ? `<div style="font-size: 10pt;">${edu.field_of_study}</div>` : ''}
          ${edu.gpa ? `<div style="font-size: 10pt;">GPA: ${edu.gpa}</div>` : ''}
          ${edu.honors ? `<div style="font-size: 10pt; font-style: italic;">${edu.honors}</div>` : ''}
        </div>
        <div class="date">
          ${edu.location || ''}<br>
          ${edu.graduation_date || ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${resumeData.skills && resumeData.skills.length > 0 ? `
  <div class="section">
    <h2>Skills</h2>
    ${resumeData.skills.map(skill => `
      <div class="skills">
        <span class="skill-category">${skill.category}:</span>
        <span style="font-size: 10pt;">${skill.items ? skill.items.join(', ') : ''}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${resumeData.certifications && resumeData.certifications.length > 0 ? `
  <div class="section">
    <h2>Certifications</h2>
    <ul>
      ${resumeData.certifications.map(cert => `
        <li>
          <strong>${cert.name || ''}</strong>${cert.issuer ? ' - ' + cert.issuer : ''}
          ${cert.date_obtained ? ' (' + cert.date_obtained + ')' : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${resumeData.projects && resumeData.projects.length > 0 ? `
  <div class="section">
    <h2>Projects</h2>
    ${resumeData.projects.map(project => `
      <div style="margin-bottom: 12px; page-break-inside: avoid;">
        <h3 style="margin: 0;">${project.name || ''}</h3>
        <p style="margin: 4px 0;">${project.description || ''}</p>
        ${project.technologies && project.technologies.length > 0 ? `
          <div style="font-size: 10pt;"><strong>Technologies:</strong> ${project.technologies.join(', ')}</div>
        ` : ''}
        ${project.url ? `<div style="font-size: 10pt;"><strong>URL:</strong> ${project.url}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${resumeData.languages && resumeData.languages.length > 0 ? `
  <div class="section">
    <h2>Languages</h2>
    <ul>
      ${resumeData.languages.map(lang => `
        <li><strong>${lang.language || ''}</strong>: ${lang.proficiency || ''}</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}
</body>
</html>
    `;
  };

  const generateMarkdown = (resumeData, personalInfo) => {
    let markdown = `# ${personalInfo.full_name || 'Resume'}\n\n`;
    
    const contactParts = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.location) contactParts.push(personalInfo.location);
    if (contactParts.length > 0) {
      markdown += contactParts.join(' • ') + '\n\n';
    }
    
    if (personalInfo.linkedin) markdown += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.website) markdown += `Website: ${personalInfo.website}\n`;
    if (personalInfo.github) markdown += `GitHub: ${personalInfo.github}\n`;
    if (personalInfo.linkedin || personalInfo.website || personalInfo.github) markdown += '\n';
    
    if (resumeData.professional_summary) {
      markdown += `## Professional Summary\n\n${resumeData.professional_summary}\n\n`;
    }
    
    if (resumeData.work_experience && resumeData.work_experience.length > 0) {
      markdown += `## Work Experience\n\n`;
      resumeData.work_experience.forEach(exp => {
        markdown += `### ${exp.position || ''}\n`;
        markdown += `**${exp.company || ''}**`;
        if (exp.location) markdown += ` • ${exp.location}`;
        markdown += '\n';
        const startDate = exp.start_date || '';
        const endDate = exp.current ? 'Present' : (exp.end_date || '');
        if (startDate || endDate) {
          markdown += `*${startDate} - ${endDate}*\n`;
        }
        markdown += '\n';
        if (exp.responsibilities && exp.responsibilities.length > 0) {
          exp.responsibilities.forEach(resp => {
            markdown += `- ${resp}\n`;
          });
          markdown += '\n';
        }
      });
    }
    
    if (resumeData.education && resumeData.education.length > 0) {
      markdown += `## Education\n\n`;
      resumeData.education.forEach(edu => {
        markdown += `### ${edu.degree || ''}\n`;
        markdown += `**${edu.institution || ''}**`;
        if (edu.location) markdown += ` • ${edu.location}`;
        markdown += '\n';
        if (edu.field_of_study) markdown += `${edu.field_of_study}\n`;
        if (edu.graduation_date) markdown += `*${edu.graduation_date}*\n`;
        if (edu.gpa) markdown += `GPA: ${edu.gpa}\n`;
        if (edu.honors) markdown += `*${edu.honors}*\n`;
        markdown += '\n';
      });
    }
    
    if (resumeData.skills && resumeData.skills.length > 0) {
      markdown += `## Skills\n\n`;
      resumeData.skills.forEach(skill => {
        markdown += `**${skill.category}:** ${skill.items ? skill.items.join(', ') : ''}\n\n`;
      });
    }
    
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      markdown += `## Certifications\n\n`;
      resumeData.certifications.forEach(cert => {
        markdown += `- **${cert.name || ''}**`;
        if (cert.issuer) markdown += ` - ${cert.issuer}`;
        if (cert.date_obtained) markdown += ` (${cert.date_obtained})`;
        markdown += '\n';
      });
      markdown += '\n';
    }
    
    if (resumeData.projects && resumeData.projects.length > 0) {
      markdown += `## Projects\n\n`;
      resumeData.projects.forEach(project => {
        markdown += `### ${project.name || ''}\n`;
        if (project.description) markdown += `${project.description}\n\n`;
        if (project.technologies && project.technologies.length > 0) {
          markdown += `**Technologies:** ${project.technologies.join(', ')}\n`;
        }
        if (project.url) markdown += `**URL:** ${project.url}\n`;
        markdown += '\n';
      });
    }
    
    if (resumeData.languages && resumeData.languages.length > 0) {
      markdown += `## Languages\n\n`;
      resumeData.languages.forEach(lang => {
        markdown += `- **${lang.language || ''}**: ${lang.proficiency || ''}\n`;
      });
    }
    
    return markdown;
  };

  const generatePlainText = (resumeData, personalInfo) => {
    let text = `${personalInfo.full_name || 'Resume'}\n`;
    text += '='.repeat((personalInfo.full_name || 'Resume').length) + '\n\n';
    
    const contactParts = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.location) contactParts.push(personalInfo.location);
    if (contactParts.length > 0) {
      text += contactParts.join(' • ') + '\n';
    }
    
    if (personalInfo.linkedin) text += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.website) text += `Website: ${personalInfo.website}\n`;
    if (personalInfo.github) text += `GitHub: ${personalInfo.github}\n`;
    text += '\n';
    
    if (resumeData.professional_summary) {
      text += `PROFESSIONAL SUMMARY\n${'─'.repeat(50)}\n${resumeData.professional_summary}\n\n`;
    }
    
    if (resumeData.work_experience && resumeData.work_experience.length > 0) {
      text += `WORK EXPERIENCE\n${'─'.repeat(50)}\n`;
      resumeData.work_experience.forEach(exp => {
        text += `\n${exp.position || ''}\n`;
        text += `${exp.company || ''}`;
        if (exp.location) text += ` | ${exp.location}`;
        text += '\n';
        const startDate = exp.start_date || '';
        const endDate = exp.current ? 'Present' : (exp.end_date || '');
        if (startDate || endDate) {
          text += `${startDate} - ${endDate}\n`;
        }
        if (exp.responsibilities && exp.responsibilities.length > 0) {
          exp.responsibilities.forEach(resp => {
            text += `  • ${resp}\n`;
          });
        }
        text += '\n';
      });
    }
    
    if (resumeData.education && resumeData.education.length > 0) {
      text += `EDUCATION\n${'─'.repeat(50)}\n`;
      resumeData.education.forEach(edu => {
        text += `\n${edu.degree || ''}\n`;
        text += `${edu.institution || ''}`;
        if (edu.location) text += ` | ${edu.location}`;
        text += '\n';
        if (edu.field_of_study) text += `${edu.field_of_study}\n`;
        if (edu.graduation_date) text += `${edu.graduation_date}\n`;
        if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
        if (edu.honors) text += `${edu.honors}\n`;
        text += '\n';
      });
    }
    
    if (resumeData.skills && resumeData.skills.length > 0) {
      text += `SKILLS\n${'─'.repeat(50)}\n`;
      resumeData.skills.forEach(skill => {
        text += `${skill.category}: ${skill.items ? skill.items.join(', ') : ''}\n`;
      });
      text += '\n';
    }
    
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      text += `CERTIFICATIONS\n${'─'.repeat(50)}\n`;
      resumeData.certifications.forEach(cert => {
        text += `  • ${cert.name || ''}`;
        if (cert.issuer) text += ` - ${cert.issuer}`;
        if (cert.date_obtained) text += ` (${cert.date_obtained})`;
        text += '\n';
      });
      text += '\n';
    }
    
    if (resumeData.projects && resumeData.projects.length > 0) {
      text += `PROJECTS\n${'─'.repeat(50)}\n`;
      resumeData.projects.forEach(project => {
        text += `\n${project.name || ''}\n`;
        if (project.description) text += `${project.description}\n`;
        if (project.technologies && project.technologies.length > 0) {
          text += `Technologies: ${project.technologies.join(', ')}\n`;
        }
        if (project.url) text += `URL: ${project.url}\n`;
        text += '\n';
      });
    }
    
    if (resumeData.languages && resumeData.languages.length > 0) {
      text += `LANGUAGES\n${'─'.repeat(50)}\n`;
      resumeData.languages.forEach(lang => {
        text += `  • ${lang.language || ''}: ${lang.proficiency || ''}\n`;
      });
    }
    
    return text;
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFormat = async (resumeId, formatId) => {
    setExportingId(resumeId);
    
    try {
      const resume = resumes.find(r => r.id === resumeId);
      const dataRecords = await base44.entities.ResumeData.filter({ resume_id: resumeId });
      
      if (dataRecords.length === 0) {
        showNotification("No resume data found to export", "Error", "error");
        setExportingId(null);
        return;
      }

      const resumeData = dataRecords[0];
      const personalInfo = resumeData.personal_info || {};
      
      // Create file name using pattern: {UserName}_Resume
      const userName = (personalInfo.full_name || 'User').replace(/[^a-z0-9\s]/gi, '_').trim().replace(/\s+/g, '_');
      const baseFileName = `${userName}_Resume`;

      if (formatId === 'html') {
        const htmlContent = generateResumeHTML(resumeData, personalInfo);
        downloadFile(htmlContent, `${baseFileName}.html`, 'text/html');
        showNotification("Resume exported as HTML successfully!", "Export Complete");
      } else if (formatId === 'pdf') {
        const htmlContent = generateResumeHTML(resumeData, personalInfo);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        showNotification("Print dialog opened. Save as PDF from the print options.", "Export to PDF");
      } else if (formatId === 'markdown') {
        const markdownContent = generateMarkdown(resumeData, personalInfo);
        downloadFile(markdownContent, `${baseFileName}.md`, 'text/markdown');
        showNotification("Resume exported as Markdown successfully!", "Export Complete");
      } else if (formatId === 'docx') {
        const htmlContent = generateResumeHTML(resumeData, personalInfo);
        downloadFile(htmlContent, `${baseFileName}.html`, 'text/html');
        showNotification("HTML file downloaded. Open it in Microsoft Word and save as .docx to convert.", "Export Complete");
      } else if (formatId === 'text') {
        const textContent = generatePlainText(resumeData, personalInfo);
        downloadFile(textContent, `${baseFileName}.txt`, 'text/plain');
        showNotification("Resume exported as plain text successfully!", "Export Complete");
      }
    } catch (error) {
      console.error("Error exporting resume:", error);
      showNotification(`Failed to export resume: ${error.message}`, "Error", "error");
    } finally {
      setExportingId(null);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Resumes</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage and track all your resumes in one place</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex gap-2">
              <Button
                onClick={() => isSubscribed ? navigate(createPageUrl("UploadResume")) : handleSubscriptionRequired()}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                disabled={!isSubscribed}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
              <Button
                onClick={() => isSubscribed ? navigate(createPageUrl("BuildWizard")) : handleSubscriptionRequired()}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                disabled={!isSubscribed}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Resume
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Sort:</span>
                <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSortChange("updated")}
                    className={`rounded-none border-r border-slate-300 dark:border-slate-600 ${
                      sortBy === "updated" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Updated
                    {sortBy === "updated" && (
                      <span className="ml-1">
                        {sortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSortChange("created")}
                    className={`rounded-none border-r border-slate-300 dark:border-slate-600 ${
                      sortBy === "created" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Created
                    {sortBy === "created" && (
                      <span className="ml-1">
                        {sortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSortChange("name")}
                    className={`rounded-none ${
                      sortBy === "name" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Name
                    {sortBy === "name" && (
                      <span className="ml-1">
                        {sortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">View:</span>
                <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-none border-r border-slate-300 dark:border-slate-600 ${
                      viewMode === "grid" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Grid
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewMode("list")}
                    className={`rounded-none ${
                      viewMode === "list" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {!isSubscribed && sortedResumes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100">Subscription Required</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">Your resumes are locked. Subscribe to regain access.</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSubscriptionRequired}
                    className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white"
                  >
                    Subscribe Now
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {isLoading ? (
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
              {[1, 2, 3].map((i) => (
                <Card key={i} className={`${viewMode === "grid" ? "p-6 animate-pulse" : "p-4 animate-pulse"} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`}>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          ) : sortedResumes.length === 0 ? (
            <Card className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isSubscribed ? "No resumes yet" : "Get Started with a Subscription"}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {isSubscribed 
                    ? "Create your first resume or upload an existing one to get started"
                    : "Subscribe to create and manage unlimited resumes with AI-powered features"
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  {isSubscribed ? (
                    <>
                      <Button
                        onClick={() => navigate(createPageUrl("BuildWizard"))}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Build From Scratch
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl("UploadResume"))}
                        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Existing
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleSubscriptionRequired}
                      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Subscribe to Get Started
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedResumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`group relative hover:shadow-xl transition-all duration-300 border-2 overflow-hidden ${
                    !isSubscribed 
                      ? "opacity-50 grayscale cursor-not-allowed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" 
                      : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800"
                  }`}>
                    {!isSubscribed && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <button
                          onClick={handleSubscriptionRequired}
                          className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg text-center hover:shadow-xl transition-shadow border border-slate-200 dark:border-slate-700"
                        >
                          <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Unlock</p>
                        </button>
                      </div>
                    )}
                    
                    <div className="p-4">
                      {editingId === resume.id ? (
                        <div className="mb-3">
                          <div className="flex gap-2">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveTitle(resume.id);
                                if (e.key === "Escape") cancelEditing();
                              }}
                              className="text-base font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              autoFocus
                              disabled={!isSubscribed}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveTitle(resume.id)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-500"
                              disabled={!isSubscribed}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <div className="group/title flex items-center gap-2 mb-2">
                            <h3 
                              className={`text-base font-bold text-slate-900 dark:text-slate-100 ${isSubscribed ? "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" : ""} transition-colors flex-1 min-w-0 truncate`}
                              onClick={() => isSubscribed && startEditing(resume)}
                              title={resume.title}
                            >
                              {resume.title}
                            </h3>
                            {isSubscribed && (
                              <button
                                onClick={() => startEditing(resume)}
                                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0"
                                title="Edit title"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Versions saved: {versionCounts[resume.id] || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                                <span>Last saved: {new Date(resume.updated_date).toLocaleDateString('en-US', { 
                                  year: 'numeric',
                                  month: 'short', 
                                  day: 'numeric'
                                })}</span>
                              </div>
                            </div>
                          </div>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => isSubscribed ? navigate(createPageUrl(`ResumeReview?id=${resume.id}`)) : handleSubscriptionRequired()}
                          className="flex-1 text-sm h-8 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          disabled={!isSubscribed}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => isSubscribed ? handleDuplicate(resume.id) : handleSubscriptionRequired()}
                          disabled={!isSubscribed || duplicatingId === resume.id}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-2 h-8"
                          title="Duplicate resume"
                        >
                          {duplicatingId === resume.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <ExportDropdown
                          onSelectFormat={(formatId) => handleExportFormat(resume.id, formatId)}
                          disabled={!isSubscribed}
                          isExporting={exportingId === resume.id}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => isSubscribed ? handleDelete(resume.id) : handleSubscriptionRequired()}
                          disabled={!isSubscribed || deletingId === resume.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 px-2 h-8"
                          title="Delete resume"
                        >
                          {deletingId === resume.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className={`h-1 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 transform transition-transform duration-300 origin-left ${
                      !isSubscribed ? "scale-x-0" : "scale-x-0 group-hover:scale-x-100"
                    }`}></div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`group relative hover:shadow-lg transition-all duration-300 border-2 overflow-hidden ${
                    !isSubscribed 
                      ? "opacity-50 grayscale cursor-not-allowed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" 
                      : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800"
                  }`}>
                    {!isSubscribed && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <button
                          onClick={handleSubscriptionRequired}
                          className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg text-center hover:shadow-xl transition-shadow border border-slate-200 dark:border-slate-700"
                        >
                          <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Unlock</p>
                        </button>
                      </div>
                    )}
                    
                    <div className="p-4">
                      {editingId === resume.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTitle(resume.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            className="text-base font-bold flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            autoFocus
                            disabled={!isSubscribed}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveTitle(resume.id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-500"
                            disabled={!isSubscribed}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="group/title flex items-center gap-2">
                              <h3 
                                className={`text-base font-bold text-slate-900 dark:text-slate-100 ${isSubscribed ? "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" : ""} transition-colors truncate`}
                                onClick={() => isSubscribed && startEditing(resume)}
                                title={resume.title}
                              >
                                {resume.title}
                              </h3>
                              {isSubscribed && (
                                <button
                                  onClick={() => startEditing(resume)}
                                  className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0"
                                  title="Edit title"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Versions saved: {versionCounts[resume.id] || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Last saved: {new Date(resume.updated_date).toLocaleString('en-US', { 
                                  year: 'numeric',
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => isSubscribed ? navigate(createPageUrl(`ResumeReview?id=${resume.id}`)) : handleSubscriptionRequired()}
                              className="text-sm h-8 px-3 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              disabled={!isSubscribed}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isSubscribed ? handleDuplicate(resume.id) : handleSubscriptionRequired()}
                              disabled={!isSubscribed || duplicatingId === resume.id}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-2 h-8"
                              title="Duplicate resume"
                            >
                              {duplicatingId === resume.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <ExportDropdown
                              onSelectFormat={(formatId) => handleExportFormat(resume.id, formatId)}
                              disabled={!isSubscribed}
                              isExporting={exportingId === resume.id}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isSubscribed ? handleDelete(resume.id) : handleSubscriptionRequired()}
                              disabled={!isSubscribed || deletingId === resume.id}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 px-2 h-8"
                              title="Delete resume"
                            >
                              {deletingId === resume.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className={`h-1 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 transform transition-transform duration-300 origin-left ${
                      !isSubscribed ? "scale-x-0" : "scale-x-0 group-hover:scale-x-100"
                    }`}></div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        showCancel={confirmDialog.showCancel !== false}
      />
    </div>
  );
}