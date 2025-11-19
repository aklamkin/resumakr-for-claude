import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Undo, GripVertical, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import EditableSection from "../EditableSection";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function SkillsSection({ skills, editMode, onUpdate, aiHelpers, isSubscribed, onSubscriptionRequired }) {
  const { 
    sectionVersions, 
    sectionLoading, 
    requestVersions, 
    acceptVersion, 
    undoVersion,
    isAIContent, 
    canUndo,
    providers 
  } = aiHelpers;

  const [editingCategoryIndex, setEditingCategoryIndex] = React.useState(null);
  const [editingCategoryName, setEditingCategoryName] = React.useState("");

  const handleSkillUpdate = (index, value) => {
    const updated = [...skills];
    updated[index].items = value.split(',').map(s => s.trim());
    onUpdate(updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(skills);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onUpdate(items);
  };

  const removeCategory = (index) => {
    const updated = skills.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const addCategory = () => {
    const updated = [...skills, { category: "New Category", items: [] }];
    onUpdate(updated);
  };

  const startEditingCategory = (index) => {
    setEditingCategoryIndex(index);
    setEditingCategoryName(skills[index].category);
  };

  const saveEditingCategory = () => {
    if (editingCategoryIndex !== null && editingCategoryName.trim()) {
      const updated = [...skills];
      updated[editingCategoryIndex].category = editingCategoryName.trim();
      onUpdate(updated);
      setEditingCategoryIndex(null);
      setEditingCategoryName("");
    }
  };

  const cancelEditingCategory = () => {
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
  };

  const updateCategoryName = (index, newName) => {
    const updated = [...skills];
    updated[index].category = newName;
    onUpdate(updated);
  };

  if (!skills || skills.length === 0) return null;

  if (editMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Skills</h3>
          <Button
            onClick={addCategory}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="skills-list">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {skills.map((category, index) => (
                  <Draggable key={`skill-${index}`} draggableId={`skill-${index}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          snapshot.isDragging
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {/* Top Row - Drag Handle, Title, Delete Button */}
                        <div className="flex items-center gap-3 mb-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Category Title - Editable */}
                          {editingCategoryIndex === index ? (
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
                                className="text-green-600 dark:text-green-400 p-1 h-auto"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditingCategory}
                                className="text-slate-600 dark:text-slate-400 p-1 h-auto"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {category.category}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingCategory(index)}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 p-1 h-auto"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategory(index)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 p-1 h-auto flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Input Field */}
                        <Input
                          value={category.items?.join(", ") || ""}
                          onChange={(e) => handleSkillUpdate(index, e.target.value)}
                          className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-500"
                          placeholder="Enter skills separated by commas"
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Skills</h3>
      <div className="space-y-3">
        {skills.map((category, index) => (
          <div key={index}>
            {isAIContent(`skills.${index}.items`) && (
              <div className="relative group/ai-badge-skill inline-block mb-2">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs cursor-pointer">
                  <Bot className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
                {canUndo(`skills.${index}.items`) && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 group-hover/ai-badge-skill:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/ai-badge-skill:pointer-events-auto z-20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => undoVersion(`skills.${index}.items`)}
                      className="bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-lg whitespace-nowrap"
                    >
                      <Undo className="w-3 h-3 mr-1" />
                      Undo AI Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{category.category}</h4>
            <EditableSection
              content={category.items?.join(", ")}
              providers={providers}
              loading={sectionLoading[`skills-${index}`]}
              versions={sectionVersions[`skills-${index}`]?.map(v => v.replace(/\|/g, ',')) || []}
              onRequestVersions={(providerId) => {
                if (!isSubscribed) {
                  onSubscriptionRequired();
                  return;
                }
                requestVersions(`skills-${index}`, category.items?.join(" | "), providerId);
              }}
              onAcceptVersion={(version, keepOriginal) => {
                if (keepOriginal) {
                  // Keep original - just clear AI versions
                  acceptVersion(`skills-${index}`, category.items, `skills.${index}.items`);
                } else {
                  // Accept AI version - parse from comma-separated display
                  const newItems = version.split(',').map(s => s.trim()).filter(s => s.length > 0);
                  acceptVersion(`skills-${index}`, newItems, `skills.${index}.items`);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}