import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles, List, GripVertical, Pencil, Check } from "lucide-react";

export default function SkillsStep({ data, onChange }) {
  const skills = data.skills || [];
  const [newCategory, setNewCategory] = React.useState("");
  const [newSkill, setNewSkill] = React.useState({});
  const [bulkSkills, setBulkSkills] = React.useState({});
  const [editingCategoryIndex, setEditingCategoryIndex] = React.useState(null);
  const [editingCategoryName, setEditingCategoryName] = React.useState("");
  
  // Quick add state
  const [quickCategory, setQuickCategory] = React.useState("");
  const [quickBulkSkills, setQuickBulkSkills] = React.useState("");

  const addCategory = () => {
    if (!newCategory.trim()) return;
    
    onChange({
      skills: [
        ...skills,
        {
          category: newCategory,
          items: []
        }
      ]
    });
    setNewCategory("");
  };

  const addQuickCategoryWithSkills = () => {
    if (!quickBulkSkills.trim()) return;

    // Parse comma-separated values
    const parsedSkills = quickBulkSkills
      .split(",")
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    if (parsedSkills.length === 0) return;

    // Use provided category name or default to "Skills"
    const categoryName = quickCategory.trim() || "Skills";

    onChange({
      skills: [
        ...skills,
        {
          category: categoryName,
          items: parsedSkills
        }
      ]
    });

    // Reset quick add form
    setQuickCategory("");
    setQuickBulkSkills("");
  };

  const removeCategory = (index) => {
    onChange({ skills: skills.filter((_, i) => i !== index) });
  };

  const startEditingCategory = (index) => {
    setEditingCategoryIndex(index);
    setEditingCategoryName(skills[index].category);
  };

  const saveEditingCategory = () => {
    if (editingCategoryIndex !== null && editingCategoryName.trim()) {
      const updated = [...skills];
      updated[editingCategoryIndex].category = editingCategoryName.trim();
      onChange({ skills: updated });
      setEditingCategoryIndex(null);
      setEditingCategoryName("");
    }
  };

  const cancelEditingCategory = () => {
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
  };

  const addSkillToCategory = (categoryIndex) => {
    const skillValue = newSkill[categoryIndex];
    if (!skillValue?.trim()) return;

    const updated = [...skills];
    updated[categoryIndex].items = [...updated[categoryIndex].items, skillValue];
    onChange({ skills: updated });
    
    setNewSkill({ ...newSkill, [categoryIndex]: "" });
  };

  const addBulkSkillsToCategory = (categoryIndex) => {
    const bulkValue = bulkSkills[categoryIndex];
    if (!bulkValue?.trim()) return;

    // Parse comma-separated values, trim whitespace, and filter out empty strings
    const parsedSkills = bulkValue
      .split(",")
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    if (parsedSkills.length === 0) return;

    const updated = [...skills];
    // Add new skills, avoiding duplicates
    const existingSkills = updated[categoryIndex].items || [];
    const newSkills = parsedSkills.filter(skill => !existingSkills.includes(skill));
    updated[categoryIndex].items = [...existingSkills, ...newSkills];
    
    onChange({ skills: updated });
    setBulkSkills({ ...bulkSkills, [categoryIndex]: "" });
  };

  const removeSkillFromCategory = (categoryIndex, skillIndex) => {
    const updated = [...skills];
    updated[categoryIndex].items = updated[categoryIndex].items.filter((_, i) => i !== skillIndex);
    onChange({ skills: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Skills & Expertise</h2>
        <p className="text-slate-600 dark:text-slate-400">Organize your skills into categories (e.g., Technical, Languages, Soft Skills)</p>
      </div>

      <Card className="p-4 border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-indigo-900 dark:text-indigo-200">
            <p className="font-medium mb-1">Pro Tip</p>
            <p>Categorize skills by type (e.g., "Programming Languages", "Tools & Frameworks", "Soft Skills") for better organization. You can add skills one at a time or paste a comma-separated list!</p>
          </div>
        </div>
      </Card>

      {/* Quick Add: Category with Bulk Skills */}
      <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/50 dark:to-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <List className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Quick Add: Paste Skills</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-category" className="flex items-center gap-2 text-slate-900 dark:text-slate-200">
              Category Name 
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">(optional - defaults to "Skills")</span>
            </Label>
            <Input
              id="quick-category"
              placeholder="e.g., Programming Languages, Design Tools (leave empty for general)"
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quick-skills" className="text-slate-900 dark:text-slate-200">Comma-Separated Skills *</Label>
            <Textarea
              id="quick-skills"
              placeholder="React, Node.js, Python, JavaScript, Docker, AWS, MongoDB..."
              value={quickBulkSkills}
              onChange={(e) => setQuickBulkSkills(e.target.value)}
              className="h-24 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          
          <Button
            onClick={addQuickCategoryWithSkills}
            disabled={!quickBulkSkills.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Skills
          </Button>
        </div>
      </Card>

      {/* Add Empty Category */}
      <Card className="p-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Label className="mb-2 block text-slate-900 dark:text-slate-200">Or Add Empty Category First</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Category name..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCategory()}
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <Button onClick={addCategory} variant="outline" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Empty
          </Button>
        </div>
      </Card>

      {/* Skill Categories */}
      {skills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Skill Categories</h3>
            <Button 
              onClick={addCategory}
              variant="outline"
              size="sm"
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          {skills.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="p-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  {editingCategoryIndex === categoryIndex ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingCategory();
                          if (e.key === 'Escape') cancelEditingCategory();
                        }}
                        className="font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveEditingCategory}
                        className="text-green-600 dark:text-green-400"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditingCategory}
                        className="text-slate-600 dark:text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{category.category}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditingCategory(categoryIndex)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCategory(categoryIndex)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Add Single Skill */}
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill[categoryIndex] || ""}
                  onChange={(e) => setNewSkill({ ...newSkill, [categoryIndex]: e.target.value })}
                  onKeyPress={(e) => e.key === "Enter" && addSkillToCategory(categoryIndex)}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <Button
                  variant="outline"
                  onClick={() => addSkillToCategory(categoryIndex)}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Add Multiple Skills (Bulk) */}
              <div className="space-y-2 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-sm flex items-center gap-2 text-slate-900 dark:text-slate-200">
                  <List className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  Or paste comma-separated skills
                </Label>
                <Textarea
                  placeholder="React, Node.js, Python, JavaScript, Docker, AWS..."
                  value={bulkSkills[categoryIndex] || ""}
                  onChange={(e) => setBulkSkills({ ...bulkSkills, [categoryIndex]: e.target.value })}
                  className="h-20 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addBulkSkillsToCategory(categoryIndex)}
                  disabled={!bulkSkills[categoryIndex]?.trim()}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add All Skills
                </Button>
              </div>

              {/* Skills List */}
              <div className="flex flex-wrap gap-2">
                {category.items?.map((skill, skillIndex) => (
                  <Badge
                    key={skillIndex}
                    variant="secondary"
                    className="pl-3 pr-2 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkillFromCategory(categoryIndex, skillIndex)}
                      className="ml-2 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {(!category.items || category.items.length === 0) && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">No skills added yet</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {skills.length === 0 && (
        <Card className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50">
          <div className="text-center text-slate-600 dark:text-slate-400">
            <p>Use the "Quick Add" section above to get started by pasting your skills</p>
          </div>
        </Card>
      )}
    </div>
  );
}