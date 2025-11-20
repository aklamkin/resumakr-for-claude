import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Undo, Sparkles, Loader2, CheckCircle, GripVertical, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import EditableSection from "../EditableSection";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function WorkExperienceSection({ 
  workExperience, 
  editMode, 
  onUpdate,
  aiHelpers,
  isSubscribed,
  onSubscriptionRequired,
  atsResults 
}) {
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

  const foundKeywords = atsResults?.keywords_found_resume || [];
  const missingKeywords = atsResults?.missing_keywords || [];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + '-01');
      return format(date, 'MMM yyyy');
    } catch (err) {
      return dateString;
    }
  };

  const handleExpUpdate = (index, field, value) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const handleResponsibilityUpdate = (expIndex, respIndex, value) => {
    const updated = [...workExperience];
    updated[expIndex].responsibilities[respIndex] = value;
    onUpdate(updated);
  };

  const addResponsibility = (expIndex) => {
    const updated = [...workExperience];
    updated[expIndex].responsibilities = [...(updated[expIndex].responsibilities || []), ""];
    onUpdate(updated);
  };

  const removeResponsibility = (expIndex, respIndex) => {
    const updated = [...workExperience];
    updated[expIndex].responsibilities = updated[expIndex].responsibilities.filter((_, i) => i !== respIndex);
    onUpdate(updated);
  };

  const handleDragEnd = (expIndex) => (result) => {
    if (!result.destination) return;

    const updated = [...workExperience];
    const responsibilities = Array.from(updated[expIndex].responsibilities || []);
    const [reorderedItem] = responsibilities.splice(result.source.index, 1);
    responsibilities.splice(result.destination.index, 0, reorderedItem);
    updated[expIndex].responsibilities = responsibilities;
    onUpdate(updated);
  };

  if (!workExperience || workExperience.length === 0) return null;

  if (editMode) {
    return (
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Work Experience</h3>
        <div className="space-y-6">
          {workExperience.map((exp, expIndex) => (
            <div key={expIndex} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Position</Label>
                  <Input
                    value={exp.position || ""}
                    onChange={(e) => handleExpUpdate(expIndex, "position", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Company</Label>
                  <Input
                    value={exp.company || ""}
                    onChange={(e) => handleExpUpdate(expIndex, "company", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Location</Label>
                  <Input
                    value={exp.location || ""}
                    onChange={(e) => handleExpUpdate(expIndex, "location", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Start Date</Label>
                  <Input
                    value={exp.start_date || ""}
                    onChange={(e) => handleExpUpdate(expIndex, "start_date", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">End Date</Label>
                  <Input
                    value={exp.end_date || ""}
                    onChange={(e) => handleExpUpdate(expIndex, "end_date", e.target.value)}
                    className="text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-slate-900 dark:text-slate-200 font-semibold">Responsibilities</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addResponsibility(expIndex)}
                    className="dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                <DragDropContext onDragEnd={handleDragEnd(expIndex)}>
                  <Droppable droppableId={`responsibilities-${expIndex}`}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {exp.responsibilities?.map((resp, respIndex) => (
                          <Draggable 
                            key={`resp-${expIndex}-${respIndex}`} 
                            draggableId={`resp-${expIndex}-${respIndex}`} 
                            index={respIndex}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-2 transition-all ${
                                  snapshot.isDragging
                                    ? 'opacity-75'
                                    : ''
                                }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                
                                <Input
                                  value={resp || ""}
                                  onChange={(e) => handleResponsibilityUpdate(expIndex, respIndex, e.target.value)}
                                  className="flex-1 text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-500"
                                  placeholder="Describe your responsibility..."
                                />
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeResponsibility(expIndex, respIndex)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 p-1 h-auto flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Work Experience</h3>
      <div className="space-y-6">
        {workExperience.map((exp, expIndex) => (
          <div key={expIndex} className="space-y-3 relative">
            {isAIContent(`work_experience.${expIndex}.responsibilities`) && (
              <div className="relative group/ai-badge inline-block mb-2">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs cursor-pointer">
                  <Bot className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
                {canUndo(`work_experience.${expIndex}.responsibilities`) && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 group-hover/ai-badge:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/ai-badge:pointer-events-auto z-20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => undoVersion(`work_experience.${expIndex}.responsibilities`)}
                      className="bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-lg whitespace-nowrap"
                    >
                      <Undo className="w-3 h-3 mr-1" />
                      Undo All Bullets
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div
              className="relative group/header"
              onMouseEnter={() => {
                document.getElementById(`job-section-${expIndex}`)?.classList.add('job-highlighted');
              }}
              onMouseLeave={() => {
                document.getElementById(`job-section-${expIndex}`)?.classList.remove('job-highlighted');
              }}
            >
              <div className="flex justify-between items-start mb-2 cursor-pointer transition-all duration-200 rounded-lg p-4 -m-4 group-hover/header:bg-indigo-50 dark:group-hover/header:bg-indigo-950 group-hover/header:border-2 group-hover/header:border-indigo-200 dark:group-hover/header:border-indigo-800">
                <div className="flex-1 min-w-0">
                  <h4 className="font-normal text-slate-900 dark:text-slate-100">{exp.position}</h4>
                  <p className="text-slate-800 dark:text-slate-300 font-bold">{exp.company}</p>
                </div>
                <div className="text-right text-slate-700 dark:text-slate-400 flex-shrink-0 ml-4">
                  {exp.location && <p className="whitespace-nowrap">{exp.location}</p>}
                  <p className="text-sm whitespace-nowrap">
                    {formatDate(exp.start_date)} - {exp.current ? "Present" : formatDate(exp.end_date)}
                  </p>
                </div>
              </div>

              {!sectionLoading[`exp-all-${expIndex}`] && !sectionVersions[`exp-all-${expIndex}`] && (
                <div className="absolute top-2 right-2 opacity-0 group-hover/header:opacity-100 transition-opacity z-10">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white shadow-lg"
                    onClick={() => {
                      if (!isSubscribed) {
                        onSubscriptionRequired();
                        return;
                      }
                      const allBullets = exp.responsibilities.filter(r => r).join('\n\n');
                      requestVersions(`exp-all-${expIndex}`, allBullets, null);
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Improve All Bullets
                  </Button>
                </div>
              )}
            </div>

            <div
              id={`job-section-${expIndex}`}
              className="transition-all duration-200 rounded-lg p-4 -m-4 dark:bg-transparent"
              style={{ backgroundColor: 'transparent', border: '2px solid transparent' }}
            >
              <style>{`
                #job-section-${expIndex}.job-highlighted {
                  background-color: rgb(238 242 255) !important;
                  border-color: rgb(199 210 254) !important;
                }
                .dark #job-section-${expIndex}.job-highlighted {
                  background-color: rgb(49 46 129 / 0.3) !important;
                  border-color: rgb(99 102 241 / 0.5) !important;
                }
              `}</style>

              {(sectionLoading[`exp-all-${expIndex}`] || sectionVersions[`exp-all-${expIndex}`]) ? (
                <div className="relative">
                  {sectionLoading[`exp-all-${expIndex}`] ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        {sectionVersions[`exp-all-${expIndex}`]?.[0]
                          ?.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0)
                          .map(line => line.replace(/^[•\-\*]\s*/, ''))
                          .map((bullet, idx) => (
                            <li key={idx} className="text-slate-800 dark:text-slate-300">{bullet}</li>
                          ))
                        }
                      </ul>
                      <div className="flex items-center justify-end pt-3 border-t border-indigo-200 dark:border-indigo-800">
                        <Button
                          size="sm"
                          onClick={() => {
                            const version = sectionVersions[`exp-all-${expIndex}`][0];
                            const bullets = version
                              .split('\n')
                              .map(line => line.trim())
                              .filter(line => line.length > 0)
                              .map(line => line.replace(/^[•\-\*]\s*/, ''));

                            acceptVersion(
                              `exp-all-${expIndex}`,
                              bullets,
                              `work_experience.${expIndex}.responsibilities`
                            );
                          }}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Use This Version
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    {exp.responsibilities.map((resp, respIndex) => (
                      resp && (
                        <li key={respIndex} className="text-slate-800 dark:text-slate-300 flex items-start gap-2">
                          {isAIContent(`work_experience.${expIndex}.responsibilities.${respIndex}`) && (
                            <div className="relative group/ai-badge-bullet">
                              <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs mt-0.5 cursor-pointer">
                                <Bot className="w-2.5 h-2.5" />
                              </Badge>
                              {canUndo(`work_experience.${expIndex}.responsibilities.${respIndex}`) && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 group-hover/ai-badge-bullet:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/ai-badge-bullet:pointer-events-auto z-20">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => undoVersion(`work_experience.${expIndex}.responsibilities.${respIndex}`)}
                                    className="bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-lg whitespace-nowrap"
                                  >
                                    <Undo className="w-3 h-3 mr-1" />
                                    Undo This Bullet
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          <EditableSection
                            content={resp}
                            providers={providers}
                            loading={sectionLoading[`exp-${expIndex}-${respIndex}`]}
                            versions={sectionVersions[`exp-${expIndex}-${respIndex}`]}
                            onRequestVersions={(providerId) => {
                              if (!isSubscribed) {
                                onSubscriptionRequired();
                                return;
                              }
                              requestVersions(`exp-${expIndex}-${respIndex}`, resp, providerId);
                            }}
                            onAcceptVersion={(version, keepOriginal) =>
                              acceptVersion(
                                `exp-${expIndex}-${respIndex}`,
                                version,
                                `work_experience.${expIndex}.responsibilities.${respIndex}`
                              )
                            }
                            foundKeywords={foundKeywords}
                            newKeywords={missingKeywords}
                          />
                        </li>
                      )
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}