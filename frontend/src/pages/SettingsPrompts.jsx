import React, { useState } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Star, AlertCircle, Loader2, Edit2, Plus } from "lucide-react";
import { NotificationPopup } from "../components/ui/notification";
import { motion } from "framer-motion";

export default function SettingsPrompts() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: "", prompt_text: "", is_default: false });
  const [editingPrompt, setEditingPrompt] = useState(null);

  React.useEffect(() => {
    api.auth.me().then(currentUser => {
      setUser(currentUser);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  const { data: prompts = [] } = useQuery({
    queryKey: ["custom-prompts"],
    queryFn: async () => {
      const currentUser = await api.auth.me();
      return api.entities.CustomPrompt.filter({ created_by: currentUser.email });
    },
    enabled: !loading,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: async () => {
      const currentUser = await api.auth.me();
      return api.entities.AIProvider.filter({ created_by: currentUser.email }, "order");
    },
    enabled: !loading,
  });

  const createPromptMutation = useMutation({
    mutationFn: (data) => api.entities.CustomPrompt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      resetForm();
      showNotification("Prompt created successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to create prompt.", "Error", "error");
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.CustomPrompt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      resetForm();
      showNotification("Prompt updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to update prompt.", "Error", "error");
    }
  });

  const deletePromptMutation = useMutation({
    mutationFn: (id) => api.entities.CustomPrompt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      showNotification("Prompt deleted successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to delete prompt.", "Error", "error");
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.AIProvider.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
      showNotification("Provider assignments updated!", "Success");
    },
  });

  const resetForm = () => {
    setNewPrompt({ name: "", prompt_text: "", is_default: false });
    setEditingPrompt(null);
    setShowForm(false);
  };

  const handleSavePrompt = () => {
    if (!newPrompt.name?.trim() || !newPrompt.prompt_text?.trim()) {
      showNotification("Please fill in prompt name and text.", "Missing Information", "error");
      return;
    }

    if (editingPrompt) {
      updatePromptMutation.mutate({ id: editingPrompt.id, data: newPrompt });
    } else {
      createPromptMutation.mutate({ ...newPrompt, created_by: user.email });
    }
  };

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt);
    setNewPrompt({
      name: prompt.name || "",
      prompt_text: prompt.prompt_text || "",
      is_default: prompt.is_default || false
    });
    setShowForm(true);
  };

  const handleToggleDefaultPrompt = async (promptId) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      if (prompt.is_default) {
        await updatePromptMutation.mutateAsync({
          id: promptId,
          data: { name: prompt.name, prompt_text: prompt.prompt_text, is_default: false }
        });
      } else {
        for (const p of prompts) {
          if (p.is_default && p.id !== promptId) {
            await updatePromptMutation.mutateAsync({
              id: p.id,
              data: { name: p.name, prompt_text: p.prompt_text, is_default: false }
            });
          }
        }
        await updatePromptMutation.mutateAsync({
          id: promptId,
          data: { name: prompt.name, prompt_text: prompt.prompt_text, is_default: true }
        });
      }
    } catch (error) {
      showNotification("Error updating prompt.", "Error", "error");
    }
  };

  const handleAssignProvidersToPrompt = async (promptId, selectedProviderIds) => {
    const mutations = [];

    providers.forEach(provider => {
      const shouldHavePrompt = selectedProviderIds.includes(provider.id);
      const currentlyHasPrompt = provider.custom_prompt_id === promptId;

      if (shouldHavePrompt && !currentlyHasPrompt) {
        mutations.push({ id: provider.id, data: { ...provider, custom_prompt_id: promptId } });
      } else if (!shouldHavePrompt && currentlyHasPrompt) {
        mutations.push({ id: provider.id, data: { ...provider, custom_prompt_id: null } });
      }
    });

    try {
      for (const mutation of mutations) {
        await updateProviderMutation.mutateAsync(mutation);
      }
      showNotification("Provider assignments updated successfully!", "Success");
    } catch (error) {
      showNotification("Failed to update provider assignments.", "Error", "error");
    }
  };

  const defaultPrompt = prompts.find(p => p.is_default);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="p-12 border-2 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Access Denied</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Settings are only available to administrators.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Custom Prompts</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage AI prompts for resume improvements</p>
        </motion.div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div />
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </div>

          {defaultPrompt && (
            <Card className="p-4 border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Default Prompt</h3>
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                This prompt will be used for any provider without a specific prompt assigned: <strong>{defaultPrompt.name}</strong>
              </p>
            </Card>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">Prompt Name</Label>
                    <Input
                      value={newPrompt.name || ""}
                      onChange={(e) => setNewPrompt({...newPrompt, name: e.target.value})}
                      placeholder="e.g., Professional & Concise, ATS-Optimized"
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">Prompt Text</Label>
                    <Textarea
                      value={newPrompt.prompt_text || ""}
                      onChange={(e) => setNewPrompt({...newPrompt, prompt_text: e.target.value})}
                      placeholder="Improve the following resume section to be more professional and impactful: {section_content}"
                      className="h-48 font-mono text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use {'{section_content}'} as a placeholder for the resume section content
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePrompt}
                      disabled={!newPrompt.name?.trim() || !newPrompt.prompt_text?.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      {editingPrompt ? "Update" : "Create"} Prompt
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Custom Prompts</h3>

            {prompts.length === 0 ? (
              <Card className="p-12 border-2 border-dashed border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600">
                <div className="text-center text-slate-600 dark:text-slate-400">
                  <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No prompts yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Create a custom prompt to get started</p>
                </div>
              </Card>
            ) : (
              <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {prompts.map((prompt) => {
                    const assignedProviders = providers.filter(p => p.custom_prompt_id === prompt.id);
                    const assignedProviderIds = assignedProviders.map(p => p.id);

                    return (
                      <div key={prompt.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-4">
                            <div>
                              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{prompt.name}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-3">
                                {prompt.prompt_text}
                              </p>
                            </div>

                            {providers.length > 0 && (
                              <div className="pt-2">
                                <Label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-200">
                                  Assign to providers:
                                </Label>
                                <Select
                                  value={assignedProviderIds.length > 0 ? assignedProviderIds[0] : "none"}
                                  onValueChange={(value) => {
                                    if (value === "none") {
                                      handleAssignProvidersToPrompt(prompt.id, []);
                                    } else if (value === "all") {
                                      handleAssignProvidersToPrompt(prompt.id, providers.map(p => p.id));
                                    } else {
                                      const newSelection = assignedProviderIds.includes(value)
                                        ? assignedProviderIds.filter(id => id !== value)
                                        : [...assignedProviderIds, value];
                                      handleAssignProvidersToPrompt(prompt.id, newSelection);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                                    <SelectValue>
                                      {assignedProviders.length === 0
                                        ? "Not assigned to any provider"
                                        : assignedProviders.length === providers.length
                                        ? "All providers"
                                        : `${assignedProviders.length} provider${assignedProviders.length > 1 ? 's' : ''}`
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                                    <SelectItem value="none" className="dark:hover:bg-slate-700">
                                      <span className="text-slate-600 dark:text-slate-400">No providers</span>
                                    </SelectItem>
                                    <SelectItem value="all" className="dark:hover:bg-slate-700">
                                      <span className="font-medium text-slate-900 dark:text-slate-100">All providers</span>
                                    </SelectItem>
                                    {providers.map(provider => (
                                      <SelectItem key={provider.id} value={provider.id} className="dark:hover:bg-slate-700">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-3 h-3 rounded border-2 ${
                                            assignedProviderIds.includes(provider.id)
                                              ? 'bg-indigo-600 border-indigo-600'
                                              : 'border-slate-300'
                                          }`} />
                                          <span className="text-slate-900 dark:text-slate-100">{provider.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {assignedProviders.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {assignedProviders.map(p => (
                                      <Badge key={p.id} variant="secondary" className="text-xs">
                                        {p.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDefaultPrompt(prompt.id)}
                              className={prompt.is_default ? "text-yellow-600 dark:text-yellow-400" : "text-slate-400 dark:text-slate-500"}
                              title={prompt.is_default ? "Remove as default" : "Set as default"}
                            >
                              <Star className={`w-4 h-4 ${prompt.is_default ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPrompt(prompt)}
                              className="text-indigo-600 dark:text-indigo-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePromptMutation.mutate(prompt.id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          <Card className="p-6 border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Example Prompts</h4>
            <div className="space-y-3 text-sm">
              <p className="p-3 bg-white rounded border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800 text-slate-900 dark:text-slate-100">
                "Rewrite the following resume section to be more concise and achievement-focused, using strong action verbs: {'{section_content}'}"
              </p>
              <p className="p-3 bg-white rounded border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800 text-slate-900 dark:text-slate-100">
                "Enhance this resume section with quantifiable metrics and specific achievements: {'{section_content}'}"
              </p>
              <p className="p-3 bg-white rounded border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800 text-slate-900 dark:text-slate-100">
                "Improve the following to better align with ATS systems: {'{section_content}'}"
              </p>
            </div>
          </Card>
        </div>
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}