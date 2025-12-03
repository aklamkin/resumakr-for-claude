import React, { useState } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Trash2, CheckCircle, AlertCircle, Loader2, Edit2, Power, X, Star } from "lucide-react";
import { NotificationPopup, ConfirmDialog } from "../components/ui/notification";
import { motion } from "framer-motion";

const PROVIDER_PRESETS = {
  openai: {
    name: "OpenAI (ChatGPT)",
    api_url: "https://api.openai.com/v1/chat/completions",
    placeholder_key: "sk-..."
  },
  anthropic: {
    name: "Anthropic (Claude)",
    api_url: "https://api.anthropic.com/v1/messages",
    placeholder_key: "sk-ant-..."
  },
  grok: {
    name: "Grok (xAI)",
    api_url: "https://api.x.ai/v1/chat/completions",
    placeholder_key: "xai-..."
  },
  perplexity: {
    name: "Perplexity",
    api_url: "https://api.perplexity.ai/chat/completions",
    placeholder_key: "pplx-..."
  },
  gemini: {
    name: "Google Gemini",
    api_url: "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
    placeholder_key: "AIza..."
  },
  deepseek: {
    name: "DeepSeek",
    api_url: "https://api.deepseek.com/v1/chat/completions",
    placeholder_key: "sk-..."
  },
  openrouter: {
    name: "OpenRouter",
    api_url: "https://openrouter.ai/api/v1/chat/completions",
    placeholder_key: "sk-or-..."
  },
  groq: {
    name: "Groq",
    api_url: "https://api.groq.com/openai/v1/chat/completions",
    placeholder_key: "gsk_..."
  },
  mistral: {
    name: "Mistral AI",
    api_url: "https://api.mistral.ai/v1/chat/completions",
    placeholder_key: "..."
  },
  cohere: {
    name: "Cohere",
    api_url: "https://api.cohere.ai/v1/generate",
    placeholder_key: "..."
  }
};

export default function SettingsProviders() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, providerId: null, providerName: "" });
  const [editData, setEditData] = useState({});

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
  const { data: providers = [], isLoading: loadingProviders } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => api.entities.AIProvider.list()
  });

  const createProviderMutation = useMutation({
    mutationFn: (data) => api.entities.AIProvider.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
      resetForm();
      showNotification("Provider added successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to add provider.", "Error", "error");
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.AIProvider.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
      setEditingProviderId(null);
      setEditData({});
      showNotification("Provider updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to update provider.", "Error", "error");
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (id) => api.entities.AIProvider.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
      showNotification("Provider deleted successfully!", "Success");
    },
    onError: (error) => {
      showNotification("Failed to delete provider.", "Error", "error");
    }
  });

  const [newProvider, setNewProvider] = useState({
    provider_type: "openai",
    name: PROVIDER_PRESETS.openai.name,
    api_url: PROVIDER_PRESETS.openai.api_url,
    api_key: "",
    is_default: false,
    order: 0
  });

  React.useEffect(() => {
    setNewProvider(prev => ({ ...prev, order: providers.length + 1 }));
  }, [providers.length]);

  const handleProviderTypeChange = (type) => {
    const preset = PROVIDER_PRESETS[type];
    setNewProvider({
      ...newProvider,
      provider_type: type,
      name: preset?.name || "",
      api_url: preset?.api_url || "",
      api_key: "",
    });
  };

  const resetForm = () => {
    setNewProvider({
      provider_type: "openai",
      name: PROVIDER_PRESETS.openai.name,
      api_url: PROVIDER_PRESETS.openai.api_url,
      api_key: "",
      is_default: false,
      order: providers.length + 1
    });
    setShowForm(false);
  };

  const handleEdit = (provider) => {
    setEditingProviderId(provider.id);
    setEditData({
      provider_type: provider.provider_type || "openai",
      name: provider.name || "",
      api_url: provider.api_url || "",
      api_key: "", // Leave empty, will only update if user enters new value
      is_default: provider.is_default || false,
      order: provider.order || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setEditData({});
  };

  const handleSaveEdit = (provider) => {
    if (!editData.name?.trim()) {
      showNotification("Please fill in provider name.", "Missing Information", "error");
      return;
    }

    // Only include api_key if it was changed (not empty)
    const updateData = {
      ...editData,
      created_by: user.email
    };

    // If api_key is empty, remove it from the update (keep existing key)
    if (!updateData.api_key?.trim()) {
      delete updateData.api_key;
    }

    updateProviderMutation.mutate({
      id: provider.id,
      data: updateData
    });
  };

  const handleAddProvider = () => {
    if (!newProvider.name?.trim() || !newProvider.api_key?.trim()) {
      showNotification("Please fill in provider name and API key.", "Missing Information", "error");
      return;
    }

    createProviderMutation.mutate({ ...newProvider, order: providers.length + 1, created_by: user.email });
  };

  const handleSetDefault = async (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    // Backend now handles unsetting other providers atomically
    await updateProviderMutation.mutateAsync({
      id: providerId,
      data: { ...provider, is_default: true }
    });
  };

  const handleDeleteClick = (provider) => {
    setDeleteConfirmation({
      open: true,
      providerId: provider.id,
      providerName: provider.name
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.providerId) {
      deleteProviderMutation.mutate(deleteConfirmation.providerId);
      setDeleteConfirmation({ open: false, providerId: null, providerName: "" });
    }
  };

  const defaultProviders = providers.filter(p => p.is_default).slice(0, 3);

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
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">AI Providers</h1>
          <p className="text-slate-600 dark:text-slate-400">Configure AI providers for resume improvements</p>
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
              New Provider
            </Button>
          </div>

          {defaultProviders.length > 0 && (
            <Card className="p-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3">Active Default Providers</h3>
              <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-3">
                These providers will be used when requesting resume improvements (up to 3):
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultProviders.map((provider, index) => (
                  <Badge key={provider.id} className="bg-indigo-600 text-white dark:bg-indigo-700 dark:text-indigo-100">
                    {index + 1}. {provider.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  Add New AI Provider
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">Provider Type</Label>
                    <Select value={newProvider.provider_type} onValueChange={handleProviderTypeChange}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                        {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key} className="dark:hover:bg-slate-700">{preset.name}</SelectItem>
                        ))}
                        <SelectItem value="custom" className="dark:hover:bg-slate-700">Custom Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-slate-200">Provider Name</Label>
                      <Input
                        value={newProvider.name}
                        onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                        placeholder="My AI Provider"
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-slate-200">API URL</Label>
                      <Input
                        value={newProvider.api_url}
                        onChange={(e) => setNewProvider({...newProvider, api_url: e.target.value})}
                        placeholder="https://api.example.com/v1/..."
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-slate-200">API Key</Label>
                    <Input
                      type="password"
                      value={newProvider.api_key}
                      onChange={(e) => setNewProvider({...newProvider, api_key: e.target.value})}
                      placeholder={PROVIDER_PRESETS[newProvider.provider_type]?.placeholder_key || "Enter API key"}
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="outline" onClick={resetForm} className="border-slate-300 dark:border-slate-600">
                      Cancel
                    </Button>
                    <Button onClick={handleAddProvider} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                      Add Provider
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your AI Providers</h3>

            {loadingProviders ? (
              <Card className="p-12 text-center border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading providers...</p>
              </Card>
            ) : providers.length === 0 ? (
              <Card className="p-12 border-2 border-dashed border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600">
                <div className="text-center text-slate-600 dark:text-slate-400">
                  <Brain className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No providers yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Add an AI provider to get started</p>
                </div>
              </Card>
            ) : (
              <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {providers.map((provider) => (
                    <div key={provider.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      {editingProviderId === provider.id ? (
                        // EDIT MODE - Inline editing form
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Provider</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-slate-600 dark:text-slate-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-900 dark:text-slate-200">Provider Type</Label>
                            <Select
                              value={editData.provider_type}
                              onValueChange={(type) => {
                                const preset = PROVIDER_PRESETS[type];
                                setEditData({
                                  ...editData,
                                  provider_type: type,
                                  name: preset?.name || editData.name,
                                  api_url: preset?.api_url || editData.api_url,
                                });
                              }}
                            >
                              <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                                {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                                  <SelectItem key={key} value={key} className="dark:hover:bg-slate-700">{preset.name}</SelectItem>
                                ))}
                                <SelectItem value="custom" className="dark:hover:bg-slate-700">Custom Provider</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-slate-900 dark:text-slate-200">Provider Name</Label>
                              <Input
                                value={editData.name}
                                onChange={(e) => setEditData({...editData, name: e.target.value})}
                                placeholder="My AI Provider"
                                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-slate-900 dark:text-slate-200">API URL</Label>
                              <Input
                                value={editData.api_url}
                                onChange={(e) => setEditData({...editData, api_url: e.target.value})}
                                placeholder="https://api.example.com/v1/..."
                                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-900 dark:text-slate-200">API Key (optional - leave empty to keep existing)</Label>
                            <Input
                              type="password"
                              value={editData.api_key}
                              onChange={(e) => setEditData({...editData, api_key: e.target.value})}
                              placeholder="•••••••••••••• (existing key will be kept if empty)"
                              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="border-slate-300 dark:border-slate-600"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleSaveEdit(provider)}
                              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                              disabled={updateProviderMutation.isPending}
                            >
                              {updateProviderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Update Provider
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE - Normal card display
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Brain className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{provider.name}</h4>
                              {provider.is_default && (
                                <Badge className="bg-green-600 text-white dark:bg-green-500">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{provider.api_url}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              API Key: ••••••••••••••••
                            </p>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(provider.id)}
                              className={`${provider.is_default ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
                              title={provider.is_default ? 'Remove as default' : 'Set as default'}
                              disabled={updateProviderMutation.isPending}
                            >
                              <Star className={`w-4 h-4 ${provider.is_default ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateProviderMutation.mutate({
                                id: provider.id,
                                data: { ...provider, is_active: !provider.is_active }
                              })}
                              className={`${provider.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
                              title={provider.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(provider)}
                              className="text-indigo-600 dark:text-indigo-400"
                              title="Edit provider"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(provider)}
                              className="text-red-600 dark:text-red-400"
                              title="Delete provider"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, providerId: null, providerName: "" })}
        onConfirm={confirmDelete}
        title="Delete AI Provider"
        message={`Are you sure you want to delete "${deleteConfirmation.providerName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
