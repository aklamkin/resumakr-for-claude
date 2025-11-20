import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PersonalInfoStep({ data, onChange }) {
  const personal = data.personal_info || {};
  const summary = data.professional_summary || "";

  const updatePersonalInfo = (field, value) => {
    onChange({
      personal_info: {
        ...personal,
        [field]: value
      }
    });
  };

  const updateSummary = (value) => {
    onChange({ professional_summary: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Personal Information</h2>
        <p className="text-slate-600 dark:text-slate-400">Let's start with your contact details</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">Full Name *</Label>
          <Input
            placeholder="John Doe"
            value={personal.full_name || ""}
            onChange={(e) => updatePersonalInfo("full_name", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">Email *</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={personal.email || ""}
            onChange={(e) => updatePersonalInfo("email", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">Phone</Label>
          <Input
            placeholder="+1 (555) 123-4567"
            value={personal.phone || ""}
            onChange={(e) => updatePersonalInfo("phone", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">Location</Label>
          <Input
            placeholder="San Francisco, CA"
            value={personal.location || ""}
            onChange={(e) => updatePersonalInfo("location", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">LinkedIn</Label>
          <Input
            placeholder="linkedin.com/in/johndoe"
            value={personal.linkedin || ""}
            onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">Website</Label>
          <Input
            placeholder="johndoe.com"
            value={personal.website || ""}
            onChange={(e) => updatePersonalInfo("website", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-slate-200">GitHub</Label>
          <Input
            placeholder="github.com/johndoe"
            value={personal.github || ""}
            onChange={(e) => updatePersonalInfo("github", e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-900 dark:text-slate-200">Professional Summary</Label>
        <Textarea
          placeholder="Write a brief summary of your professional background and career objectives..."
          value={summary}
          onChange={(e) => updateSummary(e.target.value)}
          className="h-32 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
      </div>
    </div>
  );
}