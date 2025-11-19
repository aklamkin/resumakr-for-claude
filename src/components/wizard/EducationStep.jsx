import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GraduationCap } from "lucide-react";

export default function EducationStep({ data, onChange }) {
  const education = data.education || [];

  const addEducation = () => {
    onChange({
      education: [
        ...education,
        {
          institution: "",
          degree: "",
          field_of_study: "",
          location: "",
          graduation_date: "",
          gpa: "",
          honors: ""
        }
      ]
    });
  };

  const updateEducation = (index, field, value) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ education: updated });
  };

  const removeEducation = (index) => {
    onChange({ education: education.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Education</h2>
          <p className="text-slate-600 dark:text-slate-400">Add your educational background</p>
        </div>
        <Button onClick={addEducation} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Education
        </Button>
      </div>

      {education.length === 0 ? (
        <Card className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50">
          <div className="text-center">
            <GraduationCap className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No education added yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Click "Add Education" to start</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {education.map((edu, index) => (
            <Card key={index} className="p-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Education {index + 1}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEducation(index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Institution Name *</Label>
                  <Input
                    placeholder="University of California"
                    value={edu.institution || ""}
                    onChange={(e) => updateEducation(index, "institution", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Degree *</Label>
                  <Input
                    placeholder="Bachelor of Science"
                    value={edu.degree || ""}
                    onChange={(e) => updateEducation(index, "degree", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Field of Study</Label>
                  <Input
                    placeholder="Computer Science"
                    value={edu.field_of_study || ""}
                    onChange={(e) => updateEducation(index, "field_of_study", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Location</Label>
                  <Input
                    placeholder="Berkeley, CA"
                    value={edu.location || ""}
                    onChange={(e) => updateEducation(index, "location", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Graduation Date</Label>
                  <Input
                    type="month"
                    value={edu.graduation_date || ""}
                    onChange={(e) => updateEducation(index, "graduation_date", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">GPA (Optional)</Label>
                  <Input
                    placeholder="3.8"
                    value={edu.gpa || ""}
                    onChange={(e) => updateEducation(index, "gpa", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-900 dark:text-slate-200">Honors & Awards (Optional)</Label>
                  <Input
                    placeholder="Summa Cum Laude, Dean's List"
                    value={edu.honors || ""}
                    onChange={(e) => updateEducation(index, "honors", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}