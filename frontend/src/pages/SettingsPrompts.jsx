import React, { useState } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Loader2, Edit2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { NotificationPopup } from "../components/ui/notification";
import { motion } from "framer-motion";

const PROMPT_TYPES = [
  { value: "edit_bullet", label: "Edit Single Resume Bullet" },
  { value: "edit_job", label: "Edit Entire Job" },
  { value: "edit_resume", label: "Edit Entire Resume" },
  { value: "generate_resume", label: "Generate Resume from Scratch" },
  { value: "generate_pricing", label: "Generate Pricing Page" }
];

export default function SettingsPrompts() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("edit_bullet");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [formData, setFormData] = useState({ name: "", prompt_text: "", provider_id: null });
  const [expandedRow, setExpandedRow] = useState(null);

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

  const { data: allPrompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ["custom-prompts"],
    queryFn: () => api.entities.CustomPrompt.list(),
    enabled: !loading,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => api.entities.AIProvider.list(),
    enabled: !loading,
  });

  const filteredPrompts = allPrompts.filter(p => p.prompt_type === selectedType);

  const createPromptMutation = useMutation({
    mutationFn: (data) => api.entities.CustomPrompt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      resetForm();
      showNotification("Prompt created successfully!", "Success");
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to create prompt.";
      showNotification(message, "Error", "error");
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
      const message = error.response?.data?.error || "Failed to update prompt.";
      showNotification(message, "Error", "error");
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

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.entities.CustomPrompt.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      showNotification("Prompt status updated!", "Success");
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to update prompt status.";
      showNotification(message, "Error", "error");
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, provider_id }) => api.entities.CustomPrompt.update(id, { provider_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-prompts"] });
      showNotification("Provider updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to update provider.", "Error", "error");
    }
  });

  const resetForm = () => {
    setFormData({ name: "", prompt_text: "", provider_id: null });
    setEditingPrompt(null);
    setShowDialog(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name || "",
      prompt_text: prompt.prompt_text || "",
      provider_id: prompt.provider_id || null
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name?.trim() || !formData.prompt_text?.trim()) {
      showNotification("Please fill in prompt name and text.", "Missing Information", "error");
      return;
    }

    const data = {
      ...formData,
      prompt_type: selectedType,
      is_active: false
    };

    if (editingPrompt) {
      updatePromptMutation.mutate({ id: editingPrompt.id, data });
    } else {
      createPromptMutation.mutate(data);
    }
  };

  const handleToggleActive = (prompt) => {
    // If activating this prompt, backend will automatically deactivate others of same type
    toggleActiveMutation.mutate({ id: prompt.id, is_active: !prompt.is_active });
  };

  const handleProviderChange = (promptId, providerId) => {
    updateProviderMutation.mutate({
      id: promptId,
      provider_id: providerId === "none" ? null : parseInt(providerId)
    });
  };

  const truncateText = (text, lines = 2) => {
    const lineHeight = 20;
    const maxHeight = lines * lineHeight;
    return text;
  };

  if (loading || promptsLoading) {
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

  const activePrompt = filteredPrompts.find(p => p.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">AI Prompts</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage AI prompts by type and assign providers</p>
        </motion.div>

        <Card className="p-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <Label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-200">
                Select Prompt Type
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                  {PROMPT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="dark:hover:bg-slate-700">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Prompt
              </Button>
            </div>
          </div>

          {activePrompt && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-900 dark:text-green-200">
                <strong>Active prompt for this type:</strong> {activePrompt.name}
              </p>
            </div>
          )}
        </Card>

        <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {filteredPrompts.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No prompts yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Create a prompt for this type to get started
              </p>
              <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Prompt
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="text-slate-900 dark:text-slate-100">Name</TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100">Prompt Preview</TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100">Provider</TableHead>
                  <TableHead className="text-center text-slate-900 dark:text-slate-100">Active</TableHead>
                  <TableHead className="text-right text-slate-900 dark:text-slate-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrompts.map((prompt) => {
                  const isExpanded = expandedRow === prompt.id;
                  const provider = providers.find(p => p.id === prompt.provider_id);

                  return (
                    <TableRow key={prompt.id} className="dark:border-slate-700">
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100 max-w-[200px]">
                        {prompt.name}
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="space-y-2">
                          <p className={`text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {prompt.prompt_text}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(isExpanded ? null : prompt.id)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-0 h-auto"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show more
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={prompt.provider_id?.toString() || "none"}
                          onValueChange={(value) => handleProviderChange(prompt.id, value)}
                        >
                          <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                            <SelectValue>
                              {provider ? provider.name : "No provider"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                            <SelectItem value="none" className="dark:hover:bg-slate-700">
                              <span className="text-slate-500 dark:text-slate-400">No provider</span>
                            </SelectItem>
                            {providers.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()} className="dark:hover:bg-slate-700">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(prompt)}
                          className={`${
                            prompt.is_active
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}
                          title={prompt.is_active ? "Deactivate (click to disable)" : "Activate (click to enable)"}
                        >
                          {prompt.is_active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(prompt)}
                            className="text-indigo-600 dark:text-indigo-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
                                deletePromptMutation.mutate(prompt.id);
                              }
                            }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-slate-100">
                {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {editingPrompt ? "Update the prompt details below." : `Create a new prompt for "${PROMPT_TYPES.find(t => t.value === selectedType)?.label}".`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200">Prompt Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Professional & Concise"
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200">Prompt Text</Label>
                <Textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({...formData, prompt_text: e.target.value})}
                  placeholder="Enter the full prompt text that will be sent to the AI..."
                  className="h-48 font-mono text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200">AI Provider (Optional)</Label>
                <Select
                  value={formData.provider_id?.toString() || "none"}
                  onValueChange={(value) => setFormData({...formData, provider_id: value === "none" ? null : parseInt(value)})}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                    <SelectValue>
                      {formData.provider_id
                        ? providers.find(p => p.id === formData.provider_id)?.name
                        : "No provider"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                    <SelectItem value="none" className="dark:hover:bg-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">No provider</span>
                    </SelectItem>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()} className="dark:hover:bg-slate-700">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select which AI provider should use this prompt
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={resetForm}
                className="border-slate-300 dark:border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name?.trim() || !formData.prompt_text?.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {editingPrompt ? "Update" : "Create"} Prompt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <NotificationPopup
          open={notification.open}
          onClose={() => setNotification({ ...notification, open: false })}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      </div>
    </div>
  );
}
