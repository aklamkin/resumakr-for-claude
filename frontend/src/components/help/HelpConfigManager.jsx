import React, { useState, useEffect } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Mail, Loader2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function HelpConfigManager({ showNotification }) {
  const [config, setConfig] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: helpConfig, isLoading } = useQuery({
    queryKey: ['admin-help-config'],
    queryFn: async () => {
      const configs = await api.entities.HelpConfig.list();
      return configs.length > 0 ? configs[0] : null;
    },
  });

  useEffect(() => {
    if (helpConfig) {
      setConfig(helpConfig);
    } else {
      setConfig({
        intro_text: "Welcome to our Help Center! Browse our FAQs below or contact us directly.",
        recipient_emails: [],
        sender_name: "Resumakr Support",
        contact_form_enabled: true
      });
    }
  }, [helpConfig]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.HelpConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-config'] });
      queryClient.invalidateQueries({ queryKey: ['help-config'] });
      showNotification("Help configuration created successfully", "Success");
    },
    onError: () => showNotification("Failed to create configuration", "Error", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.HelpConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-config'] });
      queryClient.invalidateQueries({ queryKey: ['help-config'] });
      showNotification("Help configuration updated successfully", "Success");
    },
    onError: () => showNotification("Failed to update configuration", "Error", "error"),
  });

  const handleSave = () => {
    if (!config) return;

    if (config.id) {
      updateMutation.mutate({ id: config.id, data: config });
    } else {
      createMutation.mutate(config);
    }
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      showNotification("Please enter an email address", "Validation Error", "error");
      return;
    }

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(newEmail)) {
      showNotification("Please enter a valid email address", "Validation Error", "error");
      return;
    }

    if (config.recipient_emails?.includes(newEmail)) {
      showNotification("This email is already in the list", "Validation Error", "error");
      return;
    }

    setConfig({
      ...config,
      recipient_emails: [...(config.recipient_emails || []), newEmail]
    });
    setNewEmail("");
  };

  const handleRemoveEmail = (email) => {
    setConfig({
      ...config,
      recipient_emails: config.recipient_emails.filter(e => e !== email)
    });
  };

  if (isLoading || !config) {
    return (
      <Card className="p-12 text-center border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading configuration...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Help Page Configuration</h2>
        <p className="text-slate-600 dark:text-slate-400">Configure settings for your help center</p>
      </div>

      <Card className="p-6 space-y-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div>
          <Label className="text-slate-900 dark:text-slate-100">Introduction Text</Label>
          <Textarea
            value={config.intro_text || ""}
            onChange={(e) => setConfig({ ...config, intro_text: e.target.value })}
            placeholder="Enter the introduction text for the Help page"
            className="mt-2 min-h-24 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            This text appears at the top of the Help page
          </p>
        </div>

        <div>
          <Label className="text-slate-900 dark:text-slate-100">Sender Name</Label>
          <Input
            value={config.sender_name || ""}
            onChange={(e) => setConfig({ ...config, sender_name: e.target.value })}
            placeholder="e.g., Resumakr Support"
            className="mt-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            This name appears as the sender in contact form emails
          </p>
        </div>

        <div>
          <Label className="text-slate-900 dark:text-slate-100">Recipient Email Addresses</Label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Add one or more email addresses to receive contact form submissions
          </p>
          
          <div className="flex gap-2 mb-3">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
              placeholder="email@example.com"
              className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
            <Button
              onClick={handleAddEmail}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {(!config.recipient_emails || config.recipient_emails.length === 0) ? (
              <Card className="p-6 border-2 border-dashed text-center bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                <Mail className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No recipient emails configured. Add at least one email address.
                </p>
              </Card>
            ) : (
              config.recipient_emails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.contact_form_enabled || false}
              onChange={(e) => setConfig({ ...config, contact_form_enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Enable contact form</span>
          </label>
          {!config.contact_form_enabled && (
            <Badge variant="outline" className="text-slate-500 text-xs">
              Contact form is disabled
            </Badge>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </Card>
    </div>
  );
}