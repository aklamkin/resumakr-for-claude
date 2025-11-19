import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Award, FolderKanban, Languages } from "lucide-react";

export default function CertificationsStep({ data, onChange }) {
  const certifications = data.certifications || [];
  const projects = data.projects || [];
  const languages = data.languages || [];

  const addCertification = () => {
    onChange({
      certifications: [...certifications, { name: "", issuer: "", date_obtained: "", expiry_date: "", credential_id: "" }]
    });
  };

  const updateCertification = (index, field, value) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ certifications: updated });
  };

  const removeCertification = (index) => {
    onChange({ certifications: certifications.filter((_, i) => i !== index) });
  };

  const addProject = () => {
    onChange({
      projects: [...projects, { name: "", description: "", technologies: [], url: "" }]
    });
  };

  const updateProject = (index, field, value) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ projects: updated });
  };

  const removeProject = (index) => {
    onChange({ projects: projects.filter((_, i) => i !== index) });
  };

  const addLanguage = () => {
    onChange({
      languages: [...languages, { language: "", proficiency: "" }]
    });
  };

  const updateLanguage = (index, field, value) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ languages: updated });
  };

  const removeLanguage = (index) => {
    onChange({ languages: languages.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Additional Information</h2>
        <p className="text-slate-600 dark:text-slate-400">Add certifications, projects, and languages (all optional)</p>
      </div>

      <Tabs defaultValue="certifications" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="certifications" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
            <Award className="w-4 h-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
            <FolderKanban className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
            <Languages className="w-4 h-4" />
            Languages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certifications" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Professional certifications you've earned</p>
            <Button onClick={addCertification} variant="outline" size="sm" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          </div>

          {certifications.map((cert, index) => (
            <Card key={index} className="p-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Certification {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCertification(index)}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Certification Name</Label>
                  <Input
                    placeholder="AWS Certified Solutions Architect"
                    value={cert.name || ""}
                    onChange={(e) => updateCertification(index, "name", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Issuing Organization</Label>
                  <Input
                    placeholder="Amazon Web Services"
                    value={cert.issuer || ""}
                    onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Date Obtained</Label>
                  <Input
                    type="month"
                    value={cert.date_obtained || ""}
                    onChange={(e) => updateCertification(index, "date_obtained", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Expiry Date (if applicable)</Label>
                  <Input
                    type="month"
                    value={cert.expiry_date || ""}
                    onChange={(e) => updateCertification(index, "expiry_date", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-900 dark:text-slate-200">Credential ID</Label>
                  <Input
                    placeholder="ABC123XYZ"
                    value={cert.credential_id || ""}
                    onChange={(e) => updateCertification(index, "credential_id", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Notable projects you've worked on</p>
            <Button onClick={addProject} variant="outline" size="sm" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>

          {projects.map((project, index) => (
            <Card key={index} className="p-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Project {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject(index)}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Project Name</Label>
                  <Input
                    placeholder="E-commerce Platform"
                    value={project.name || ""}
                    onChange={(e) => updateProject(index, "name", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Description</Label>
                  <Textarea
                    placeholder="Brief description of the project..."
                    value={project.description || ""}
                    onChange={(e) => updateProject(index, "description", e.target.value)}
                    className="h-20 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Technologies Used (comma-separated)</Label>
                  <Input
                    placeholder="React, Node.js, MongoDB"
                    value={project.technologies?.join(", ") || ""}
                    onChange={(e) => updateProject(index, "technologies", e.target.value.split(",").map(t => t.trim()))}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200">Project URL (if applicable)</Label>
                  <Input
                    placeholder="https://github.com/username/project"
                    value={project.url || ""}
                    onChange={(e) => updateProject(index, "url", e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="languages" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Languages you speak and your proficiency level</p>
            <Button onClick={addLanguage} variant="outline" size="sm" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Language
            </Button>
          </div>

          {languages.map((lang, index) => (
            <Card key={index} className="p-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex gap-4 items-start">
                <div className="flex-1 grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">Language</Label>
                    <Input
                      placeholder="Spanish"
                      value={lang.language || ""}
                      onChange={(e) => updateLanguage(index, "language", e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">Proficiency Level</Label>
                    <Input
                      placeholder="Native, Fluent, Professional, Basic"
                      value={lang.proficiency || ""}
                      onChange={(e) => updateLanguage(index, "proficiency", e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLanguage(index)}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 mt-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}