import React, { useState } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Sparkles, Power, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmDialog, NotificationPopup } from "../components/ui/notification";

export default function AdminMonetization() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [generatingContent, setGeneratingContent] = useState(null);
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => api.entities.MarketingCampaign.list('-created_date'),
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCampaign) {
        return api.entities.MarketingCampaign.update(editingCampaign.id, data);
      } else {
        return api.entities.MarketingCampaign.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setShowForm(false);
      setEditingCampaign(null);
      showNotification(editingCampaign ? "Campaign updated successfully!" : "Campaign created successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to save campaign: ${error.message}`, "Error", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.MarketingCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      showNotification("Campaign deleted successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to delete campaign: ${error.message}`, "Error", "error");
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ campaign, newState }) => {
      if (newState) {
        // Deactivate all other campaigns first
        const activeCampaigns = campaigns.filter(c => c.is_active && c.id !== campaign.id);
        for (const activeCampaign of activeCampaigns) {
          await api.entities.MarketingCampaign.update(activeCampaign.id, { is_active: false });
        }
      }
      return api.entities.MarketingCampaign.update(campaign.id, { is_active: newState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      showNotification("Campaign status updated!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to update campaign status: ${error.message}`, "Error", "error");
    }
  });

  const handleToggleActive = (campaign) => {
    const newState = !campaign.is_active;
    
    if (newState) {
      const activeCampaign = campaigns.find(c => c.is_active && c.id !== campaign.id);
      if (activeCampaign) {
        setConfirmDialog({
          open: true,
          title: "Replace Active Campaign?",
          message: `The campaign "${activeCampaign.campaign_name}" is currently active. Enabling "${campaign.campaign_name}" will deactivate it. Are you sure you want to proceed?`,
          onConfirm: () => {
            toggleActiveMutation.mutate({ campaign, newState });
          }
        });
        return;
      }
    }
    
    toggleActiveMutation.mutate({ campaign, newState });
  };

  const handleGenerateContent = async (campaign) => {
    setGeneratingContent(campaign.id);
    try {
      const prompt = `Generate engaging pricing page content for a marketing campaign with the following details:

Campaign Name: ${campaign.campaign_name}
Campaign Type: ${campaign.campaign_type}
Target Plan: ${campaign.target_plan}
${campaign.free_trial_duration ? `Free Trial Duration: ${campaign.free_trial_duration} days` : ''}
${campaign.discount_percentage ? `Discount Percentage: ${campaign.discount_percentage}%` : ''}
${campaign.discount_amount ? `Discount Amount: $${campaign.discount_amount}` : ''}
${campaign.bundle_details ? `Bundle Details: ${campaign.bundle_details}` : ''}

Create compelling marketing copy that highlights the value and urgency of this offer. The content should be professional, persuasive, and clear.`;

      const schema = {
        type: "object",
        properties: {
          campaign_banner_text: {
            type: "string",
            description: "Main banner text (40-60 characters)"
          },
          campaign_banner_highlight: {
            type: "string",
            description: "Highlighted word or phrase in banner (5-15 characters)"
          },
          plan_description_override: {
            type: "string",
            description: "Custom plan description for this campaign (100-150 characters)"
          },
          feature_highlights: {
            type: "array",
            items: { type: "string" },
            description: "3-5 key feature highlights specific to this campaign"
          },
          disclaimer_text: {
            type: "string",
            description: "Legal disclaimer or terms (50-100 characters)"
          },
          cta_text: {
            type: "string",
            description: "Call-to-action button text (10-20 characters)"
          }
        },
        required: ["campaign_banner_text", "campaign_banner_highlight", "plan_description_override", "feature_highlights", "disclaimer_text", "cta_text"]
      };

      const result = await api.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      await api.entities.MarketingCampaign.update(campaign.id, {
        ai_generated_pricing_content_json: result
      });

      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      showNotification("Pricing page content generated successfully!", "Success");
    } catch (error) {
      showNotification(`Failed to generate content: ${error.message}`, "Error", "error");
    } finally {
      setGeneratingContent(null);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleDelete = (campaign) => {
    setConfirmDialog({
      open: true,
      title: "Delete Campaign?",
      message: `Are you sure you want to delete "${campaign.campaign_name}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteMutation.mutate(campaign.id);
      }
    });
  };

  const activeCampaign = campaigns.find(c => c.is_active);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Monetization Campaigns</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage subscription pricing campaigns</p>
          </div>
          <Button
            onClick={() => {
              setEditingCampaign(null);
              setShowForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {activeCampaign && (
          <Card className="p-4 mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Active Campaign: {activeCampaign.campaign_name}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {activeCampaign.campaign_type} • {activeCampaign.target_plan}
                </p>
              </div>
            </div>
          </Card>
        )}

        {showForm ? (
          <CampaignForm
            campaign={editingCampaign}
            onSubmit={(data) => createOrUpdateMutation.mutate(data)}
            onCancel={() => {
              setShowForm(false);
              setEditingCampaign(null);
            }}
          />
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`p-6 border-2 ${
                  campaign.is_active
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {campaign.campaign_name}
                        </h3>
                        {campaign.is_active && (
                          <Badge className="bg-green-600 dark:bg-green-500 text-white">Active</Badge>
                        )}
                        {campaign.ai_generated_pricing_content_json && (
                          <Badge variant="outline" className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Content
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">{campaign.campaign_type}</Badge>
                        <Badge variant="secondary">{campaign.target_plan} plan</Badge>
                        {campaign.free_trial_duration && (
                          <Badge variant="secondary">{campaign.free_trial_duration} days free</Badge>
                        )}
                        {campaign.discount_percentage && (
                          <Badge variant="secondary">{campaign.discount_percentage}% off</Badge>
                        )}
                        {campaign.discount_amount && (
                          <Badge variant="secondary">${campaign.discount_amount} off</Badge>
                        )}
                      </div>

                      {campaign.start_date && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {campaign.start_date} {campaign.end_date ? `- ${campaign.end_date}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateContent(campaign)}
                        disabled={generatingContent === campaign.id}
                        className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                      >
                        {generatingContent === campaign.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Content
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(campaign)}
                        className={campaign.is_active ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {campaign.is_active ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                        className="text-slate-600 dark:text-slate-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(campaign)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {campaigns.length === 0 && (
              <Card className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No campaigns yet</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">Create your first marketing campaign to get started</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
}

function CampaignForm({ campaign, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    campaign_name: campaign?.campaign_name || "",
    campaign_type: campaign?.campaign_type || "free_trial",
    target_plan: campaign?.target_plan || "weekly",
    free_trial_duration: campaign?.free_trial_duration || "",
    discount_percentage: campaign?.discount_percentage || "",
    discount_amount: campaign?.discount_amount || "",
    bundle_details: campaign?.bundle_details || "",
    start_date: campaign?.start_date || "",
    end_date: campaign?.end_date || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = { ...formData };
    
    // Remove empty fields
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === "" || cleanedData[key] === null) {
        delete cleanedData[key];
      }
    });

    onSubmit(cleanedData);
  };

  return (
    <Card className="p-6 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        {campaign ? "Edit Campaign" : "New Campaign"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="campaign_name" className="text-slate-900 dark:text-slate-100">Campaign Name *</Label>
          <Input
            id="campaign_name"
            value={formData.campaign_name}
            onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
            required
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="campaign_type" className="text-slate-900 dark:text-slate-100">Campaign Type *</Label>
            <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free_trial">Free Trial</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target_plan" className="text-slate-900 dark:text-slate-100">Target Plan *</Label>
            <Select value={formData.target_plan} onValueChange={(value) => setFormData({ ...formData, target_plan: value })}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.campaign_type === "free_trial" && (
          <div>
            <Label htmlFor="free_trial_duration" className="text-slate-900 dark:text-slate-100">Free Trial Duration (days)</Label>
            <Input
              id="free_trial_duration"
              type="number"
              value={formData.free_trial_duration}
              onChange={(e) => setFormData({ ...formData, free_trial_duration: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {formData.campaign_type === "discount" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_percentage" className="text-slate-900 dark:text-slate-100">Discount Percentage (%)</Label>
              <Input
                id="discount_percentage"
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="discount_amount" className="text-slate-900 dark:text-slate-100">Discount Amount ($)</Label>
              <Input
                id="discount_amount"
                type="number"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {formData.campaign_type === "bundle" && (
          <div>
            <Label htmlFor="bundle_details" className="text-slate-900 dark:text-slate-100">Bundle Details</Label>
            <Textarea
              id="bundle_details"
              value={formData.bundle_details}
              onChange={(e) => setFormData({ ...formData, bundle_details: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date" className="text-slate-900 dark:text-slate-100">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <Label htmlFor="end_date" className="text-slate-900 dark:text-slate-100">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-300 dark:border-slate-600">
            Cancel
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            {campaign ? "Update Campaign" : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Card>
  );
}