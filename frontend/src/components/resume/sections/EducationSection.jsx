import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function EducationSection({ education, editMode, onUpdate }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + '-01');
      return format(date, 'MMM yyyy');
    } catch (err) {
      return dateString;
    }
  };

  const handleEduUpdate = (index, field, value) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  if (!education || education.length === 0) return null;

  if (editMode) {
    return (
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Education</h3>
        <div className="space-y-4">
          {education.map((edu, index) => (
            <div key={index} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Degree</Label>
                  <Input
                    value={edu.degree || ""}
                    onChange={(e) => handleEduUpdate(index, "degree", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Institution</Label>
                  <Input
                    value={edu.institution || ""}
                    onChange={(e) => handleEduUpdate(index, "institution", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Field of Study</Label>
                  <Input
                    value={edu.field_of_study || ""}
                    onChange={(e) => handleEduUpdate(index, "field_of_study", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Location</Label>
                  <Input
                    value={edu.location || ""}
                    onChange={(e) => handleEduUpdate(index, "location", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Graduation Date</Label>
                  <Input
                    type="month"
                    value={edu.graduation_date || ""}
                    onChange={(e) => handleEduUpdate(index, "graduation_date", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Education</h3>
      <div className="space-y-4">
        {education.map((edu, index) => (
          <div key={index} className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{edu.degree}</h4>
              <p className="text-slate-800 dark:text-slate-300">{edu.institution}</p>
              {edu.field_of_study && (
                <p className="text-slate-700 dark:text-slate-400">{edu.field_of_study}</p>
              )}
            </div>
            <div className="text-right text-slate-700 dark:text-slate-400 text-sm">
              {edu.location && <p>{edu.location}</p>}
              {edu.graduation_date && <p>{formatDate(edu.graduation_date)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}