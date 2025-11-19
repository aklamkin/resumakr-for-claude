import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PersonalInfoSection({ personalInfo, editMode, onUpdate }) {
  const handleChange = (field, value) => {
    onUpdate({ ...personalInfo, [field]: value });
  };

  if (editMode) {
    return (
      <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="space-y-4">
          <div>
            <Label className="text-slate-900 dark:text-slate-200 font-semibold">Full Name</Label>
            <Input
              value={personalInfo.full_name || ""}
              onChange={(e) => handleChange("full_name", e.target.value)}
              className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Email</Label>
              <Input
                value={personalInfo.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
              />
            </div>
            <div>
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Phone</Label>
              <Input
                value={personalInfo.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
              />
            </div>
            <div>
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Location</Label>
              <Input
                value={personalInfo.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        {personalInfo.full_name || 'Your Name'}
      </h2>
      <div className="flex flex-wrap gap-3 text-slate-700 dark:text-slate-400">
        {personalInfo.email && <span>• {personalInfo.email}</span>}
        {personalInfo.phone && <span>• {personalInfo.phone}</span>}
        {personalInfo.location && <span>• {personalInfo.location}</span>}
      </div>
    </div>
  );
}