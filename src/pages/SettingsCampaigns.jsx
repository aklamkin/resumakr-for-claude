import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, CheckCircle, Loader2, TrendingUp, AlertCircle, Edit2, ArrowUpDown, Power } from "lucide-react";
import { NotificationPopup, ConfirmDialog } from "../components/ui/notification";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "../components/utils/dateUtils";

export default function SettingsCampaigns() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [generatingPricingPage, setGeneratingPricingPage] = useState(false);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(currentUser => {
      setUser(currentUser);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date'),
    enabled: !loading,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => base44.entities.SubscriptionPlan.list('order'),
    enabled: !loading,
  });

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "created_date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [campaigns, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCampaign) {
        return base44.entities.MarketingCampaign.update(editingCampaign.id, data);
      } else {
        return base44.entities.MarketingCampaign.create(data);
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
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
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
        const activeCampaigns = campaigns.filter(c => c.is_active && c.id !== campaign.id);
        for (const activeCampaign of activeCampaigns) {
          await base44.entities.MarketingCampaign.update(activeCampaign.id, { is_active: false });
        }
      }
      return base44.entities.MarketingCampaign.update(campaign.id, { is_active: newState });
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
          message: `"${activeCampaign.campaign_name}" is currently active. Enabling "${campaign.campaign_name}" will deactivate it. Continue?`,
          onConfirm: () => {
            toggleActiveMutation.mutate({ campaign, newState });
          }
        });
        return;
      }
    }
    
    toggleActiveMutation.mutate({ campaign, newState });
  };

  const handleGeneratePricingPage = async () => {
    setGeneratingPricingPage(true);
    try {
      const activePlans = plans.filter(p => p.is_active);
      const activeCampaign = campaigns.find(c => c.is_active);

      const prompt = `You are an elite copywriter crafting pricing content for Resumakr—an AI-powered resume builder transforming how professionals land their dream jobs.

════════════════════════════════════════════
📊 SUBSCRIPTION PLANS TO SHOWCASE:
════════════════════════════════════════════
${activePlans.map(p => `
┌─ ${p.name.toUpperCase()} (ID: ${p.plan_id})
├─ PRICE: $${p.price} ${p.period}
├─ ACCESS: ${p.duration} days
├─ STATUS: ${p.is_popular ? '⭐ POPULAR CHOICE' : p.badge_text ? `🏷️ ${p.badge_text}` : 'Standard'}
└─ Current Features: ${p.features?.length > 0 ? p.features.join(' • ') : '⚠️ Not configured yet'}
`).join('\n')}

${activeCampaign ? `
════════════════════════════════════════════
🎯 ACTIVE MARKETING CAMPAIGN:
════════════════════════════════════════════
Campaign: ${activeCampaign.campaign_name}
Target: ${activeCampaign.target_plan.toUpperCase()} Plan
Type: ${activeCampaign.campaign_type.toUpperCase()}
${activeCampaign.free_trial_duration ? `🎁 SPECIAL OFFER: +${activeCampaign.free_trial_duration} BONUS DAYS (total ${plans.find(p => p.plan_id === activeCampaign.target_plan)?.duration + activeCampaign.free_trial_duration} days!)` : ''}
${activeCampaign.discount_percentage ? `💰 DISCOUNT: ${activeCampaign.discount_percentage}% OFF the regular price` : ''}
${activeCampaign.discount_amount ? `💰 DISCOUNT: Save $${activeCampaign.discount_amount}` : ''}
${activeCampaign.start_date && activeCampaign.end_date ? `⏰ LIMITED TIME: ${activeCampaign.start_date} → ${activeCampaign.end_date}` : ''}
` : `
════════════════════════════════════════════
ℹ️ No active campaign running currently
════════════════════════════════════════════
`}

Write magnetic, conversion-focused copy that makes professionals EXCITED to subscribe—while maintaining 100% honesty and accuracy.`;

      const schema = {
        type: "object",
        properties: {
          page_headline: { type: "string" },
          page_subheadline: { type: "string" },
          campaign_banner_text: { type: "string" },
          unified_features_list: { type: "array", items: { type: "string" } },
          disclaimer_text: { type: "string" },
          plans_content: { type: "array", items: { type: "object", properties: { plan_id: { type: "string" }, enhanced_headline: { type: "string" }, cta_text: { type: "string" } } } }
        },
        required: ["page_headline", "page_subheadline", "unified_features_list", "disclaimer_text", "plans_content"]
      };

      const response = await base44.functions.invoke('invokeAI', { prompt, response_json_schema: schema });
      const result = response.data;

      for (const planContent of result.plans_content) {
        const plan = activePlans.find(p => p.plan_id === planContent.plan_id);
        if (plan) {
          await base44.entities.SubscriptionPlan.update(plan.id, {
            ai_generated_content: { headline: planContent.enhanced_headline, cta_text: planContent.cta_text },
            features: result.unified_features_list
          });
        }
      }

      if (activeCampaign) {
        await base44.entities.MarketingCampaign.update(activeCampaign.id, {
          ai_generated_pricing_content_json: {
            campaign_banner_text: result.campaign_banner_text || result.page_headline,
            page_headline: result.page_headline,
            page_subheadline: result.page_subheadline,
            feature_highlights: result.unified_features_list,
            disclaimer_text: result.disclaimer_text
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      
      showNotification("Pricing page content generated successfully!", "Success");
    } catch (error) {
      showNotification(`Failed to generate: ${error.message}`, "Error", "error");
    } finally {
      setGeneratingPricingPage(false);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  const CampaignForm = ({ campaign, onSubmit, onCancel }) => {
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
      
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === "" || cleanedData[key] === null) {
          delete cleanedData[key];
        } else if (key === "free_trial_duration" || key === "discount_percentage" || key === "discount_amount") {
          cleanedData[key] = Number(cleanedData[key]);
        }
      });

      onSubmit(cleanedData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label className="text-slate-900 dark:text-slate-100">Campaign Name *</Label>
          <Input
            value={formData.campaign_name}
            onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
            required
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-900 dark:text-slate-100">Campaign Type *</Label>
            <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                <SelectItem value="free_trial">Free Trial</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-slate-100">Target Plan *</Label>
            <Select value={formData.target_plan} onValueChange={(value) => setFormData({ ...formData, target_plan: value })}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.campaign_type === "free_trial" && (
          <div>
            <Label className="text-slate-900 dark:text-slate-100">Free Trial Duration (days)</Label>
            <Input
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
              <Label className="text-slate-900 dark:text-slate-100">Discount Percentage (%)</Label>
              <Input
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-900 dark:text-slate-100">Discount Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-900 dark:text-slate-100">Start Date</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-900 dark:text-slate-100">End Date</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-300 dark:border-slate-600">
            Cancel
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            {campaign ? "Update Campaign" : "Create Campaign"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Marketing Campaigns</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage pricing campaigns and promotions</p>
        </motion.div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex-1" />
            <div className="flex gap-3">
              <Button
                onClick={handleGeneratePricingPage}
                disabled={generatingPricingPage || plans.filter(p => p.is_active).length === 0}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 min-w-[200px]"
              >
                {generatingPricingPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>Generate Pricing Page</span>
                  </>
                )}
              </Button>
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
          </div>

          {activeCampaign && (
            <Card className="p-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-300 dark:border-indigo-700">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                    Active Campaign: {activeCampaign.campaign_name}
                  </p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    {activeCampaign.campaign_type} • {activeCampaign.target_plan}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <AnimatePresence>
            {showForm && !editingCampaign && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">New Campaign</h2>
                  <CampaignForm
                    campaign={null}
                    onSubmit={(data) => createOrUpdateMutation.mutate(data)}
                    onCancel={() => setShowForm(false)}
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <TrendingUp className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No campaigns yet</h3>
                <p className="text-slate-600 dark:text-slate-400">Create your first marketing campaign</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left w-[28%]">
                        <button onClick={() => handleSort("campaign_name")} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                          Campaign <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left w-[14%] text-xs font-medium text-slate-700 dark:text-slate-300">Type</th>
                      <th className="px-4 py-3 text-left w-[14%] text-xs font-medium text-slate-700 dark:text-slate-300">Target Plan</th>
                      <th className="px-4 py-3 text-left w-[16%] text-xs font-medium text-slate-700 dark:text-slate-300">Offer</th>
                      <th className="px-4 py-3 text-left w-[18%] text-xs font-medium text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-4 py-3 text-right w-[10%] text-xs font-medium text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedCampaigns.map((campaign) => {
                      const isEditing = editingCampaign?.id === campaign.id;
                      
                      return (
                        <React.Fragment key={campaign.id}>
                          {!isEditing ? (
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="px-4 py-4 align-middle">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{campaign.campaign_name}</div>
                                {campaign.start_date && campaign.end_date && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <Badge variant="secondary" className="capitalize">{campaign.campaign_type}</Badge>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <span className="text-sm text-slate-900 dark:text-slate-100 capitalize">{campaign.target_plan}</span>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <div className="text-sm text-slate-900 dark:text-slate-100">
                                  {campaign.free_trial_duration && `+${campaign.free_trial_duration} days`}
                                  {campaign.discount_percentage && `${campaign.discount_percentage}% off`}
                                  {campaign.discount_amount && `$${campaign.discount_amount} off`}
                                  {!campaign.free_trial_duration && !campaign.discount_percentage && !campaign.discount_amount && '-'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <div className="flex flex-wrap gap-1">
                                  {campaign.is_active ? (
                                    <Badge className="bg-indigo-600 text-white dark:bg-indigo-500">Active</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                                  )}
                                  {campaign.ai_generated_pricing_content_json && (
                                    <Badge variant="outline" className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleActive(campaign)}
                                    className="text-slate-600 dark:text-slate-400"
                                    title={campaign.is_active ? "Deactivate" : "Activate"}
                                  >
                                    <Power className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(campaign)}
                                    className="text-indigo-600 dark:text-indigo-400"
                                  >
                                    <Edit2 className="w-4 h-4" />
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
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-6 bg-indigo-50 dark:bg-indigo-950/30">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Edit Campaign</h2>
                                <CampaignForm
                                  campaign={campaign}
                                  onSubmit={(data) => createOrUpdateMutation.mutate(data)}
                                  onCancel={() => setEditingCampaign(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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