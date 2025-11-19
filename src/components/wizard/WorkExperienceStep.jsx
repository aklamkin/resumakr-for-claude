import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Briefcase } from "lucide-react";

export default function WorkExperienceStep({ data, onChange }) {
  const experiences = data.work_experience || [];

  const addExperience = () => {
    onChange({
      work_experience: [
        ...experiences,
        {
          company: "",
          position: "",
          location: "",
          start_date: "",
          end_date: "",
          current: false,
          responsibilities: [""]
        }
      ]
    });
  };

  const updateExperience = (index, field, value) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ work_experience: updated });
  };

  const removeExperience = (index) => {
    onChange({ work_experience: experiences.filter((_, i) => i !== index) });
  };

  const addResponsibility = (expIndex) => {
    const updated = [...experiences];
    updated[expIndex].responsibilities = [...updated[expIndex].responsibilities, ""];
    onChange({ work_experience: updated });
  };

  const updateResponsibility = (expIndex, respIndex, value) => {
    const updated = [...experiences];
    updated[expIndex].responsibilities[respIndex] = value;
    onChange({ work_experience: updated });
  };

  const removeResponsibility = (expIndex, respIndex) => {
    const updated = [...experiences];
    updated[expIndex].responsibilities = updated[expIndex].responsibilities.filter((_, i) => i !== respIndex);
    onChange({ work_experience: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Work Experience</h2>
          <p className="text-slate-600 dark:text-slate-400">Add your employment history</p>
        </div>
        <Button onClick={addExperience} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Position
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Card className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50">
          <div className="text-center">
            <Briefcase className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No work experience added yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Click "Add Position" to start</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {experiences.map((exp, expIndex) => (
            <Card key={expIndex} className="p-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Position {expIndex + 1}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExperience(expIndex)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Company Name *</Label>
                  <Input
                    placeholder="Acme Corporation"
                    value={exp.company || ""}
                    onChange={(e) => updateExperience(expIndex, "company", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Position Title *</Label>
                  <Input
                    placeholder="Senior Software Engineer"
                    value={exp.position || ""}
                    onChange={(e) => updateExperience(expIndex, "position", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Location</Label>
                  <Input
                    placeholder="San Francisco, CA"
                    value={exp.location || ""}
                    onChange={(e) => updateExperience(expIndex, "location", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Start Date</Label>
                  <Input
                    type="month"
                    value={exp.start_date || ""}
                    onChange={(e) => updateExperience(expIndex, "start_date", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">End Date</Label>
                  <Input
                    type="month"
                    value={exp.end_date || ""}
                    onChange={(e) => updateExperience(expIndex, "end_date", e.target.value)}
                    disabled={exp.current}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id={`current-${expIndex}`}
                    checked={exp.current || false}
                    onCheckedChange={(checked) => updateExperience(expIndex, "current", checked)}
                    className="border-slate-400 dark:border-slate-500 data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white dark:data-[state=checked]:text-white"
                  />
                  <label
                    htmlFor={`current-${expIndex}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    I currently work here
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-900 dark:text-slate-200">Key Responsibilities & Achievements</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addResponsibility(expIndex)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {exp.responsibilities?.map((resp, respIndex) => (
                  <div key={respIndex} className="flex gap-2">
                    <Input
                      placeholder="Describe your responsibility or achievement..."
                      value={resp || ""}
                      onChange={(e) => updateResponsibility(expIndex, respIndex, e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResponsibility(expIndex, respIndex)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}