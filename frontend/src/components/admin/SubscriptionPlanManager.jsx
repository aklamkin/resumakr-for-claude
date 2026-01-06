import React, { useState, useMemo } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Sparkles, CheckCircle, ArrowUpDown, Zap, Crown, Rocket, Star, Loader2, DollarSign, Power, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_OPTIONS = {
  Zap: Zap,
  Sparkles: Sparkles,
  Crown: Crown,
  Rocket: Rocket,
  Star: Star
};

const COLOR_PRESETS = [
  { label: "Blue", from: "blue-600", to: "blue-700" },
  { label: "Indigo", from: "indigo-600", to: "indigo-700" },
  { label: "Purple", from: "purple-600", to: "purple-700" },
  { label: "Emerald", from: "emerald-600", to: "emerald-700" },
  { label: "Rose", from: "rose-600", to: "rose-700" },
  { label: "Amber", from: "amber-600", to: "amber-700" }
];

const PlanForm = ({ onSubmit, formData, setFormData, editingPlan, handleGenerateFeatures, addFeature, updateFeature, removeFeature }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Plan ID *</Label>
        <Input
          value={formData.plan_id}
          onChange={(e) => setFormData({ ...formData, plan_id: e.target.value.toLowerCase() })}
          placeholder="weekly"
          className="font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
          required
          disabled={editingPlan}
        />
      </div>
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Plan Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Weekly Plan"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
          required
        />
      </div>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Price (USD) *</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="6.49"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
          required
        />
      </div>
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Period *</Label>
        <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
          <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
            <SelectItem value="per day">per day</SelectItem>
            <SelectItem value="per week">per week</SelectItem>
            <SelectItem value="per month">per month</SelectItem>
            <SelectItem value="per year">per year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Duration (days) *</Label>
        <Input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          placeholder="7"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
          required
        />
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Icon</Label>
        <Select value={formData.icon_name} onValueChange={(value) => setFormData({ ...formData, icon_name: value })}>
          <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
            {Object.keys(ICON_OPTIONS).map(iconName => (
              <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Color Theme</Label>
        <Select 
          value={`${formData.color_from},${formData.color_to}`}
          onValueChange={(value) => {
            const [from, to] = value.split(',');
            setFormData({ ...formData, color_from: from, color_to: to });
          }}
        >
          <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
            {COLOR_PRESETS.map(preset => (
              <SelectItem key={preset.label} value={`${preset.from},${preset.to}`}>{preset.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Badge Text</Label>
        <Input
          value={formData.badge_text}
          onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
          placeholder="Best Value"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
        />
      </div>
      <div>
        <Label className="text-slate-900 dark:text-slate-100">Display Order</Label>
        <Input
          type="number"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: e.target.value })}
          placeholder="1"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
        />
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Checkbox
        checked={formData.is_popular}
        onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
        className="border-slate-300 dark:border-slate-600"
      />
      <Label className="text-slate-900 dark:text-slate-100 cursor-pointer">Mark as Popular</Label>
    </div>

    <div className="flex items-center gap-2">
      <Checkbox
        checked={formData.is_active}
        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        className="border-slate-300 dark:border-slate-600"
      />
      <Label className="text-slate-900 dark:text-slate-100 cursor-pointer">Active</Label>
    </div>

    {editingPlan && (
      <div className="p-4 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stripe Integration</h4>
        {editingPlan.stripe_product_id ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600 dark:text-slate-400">Product ID</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border font-mono text-slate-900 dark:text-slate-100">
                  {editingPlan.stripe_product_id}
                </code>
                <a
                  href={`https://dashboard.stripe.com/products/${editingPlan.stripe_product_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs flex items-center gap-1"
                >
                  View in Stripe <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600 dark:text-slate-400">Price ID</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border font-mono text-slate-900 dark:text-slate-100">
                  {editingPlan.stripe_price_id}
                </code>
                <a
                  href={`https://dashboard.stripe.com/prices/${editingPlan.stripe_price_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs flex items-center gap-1"
                >
                  View in Stripe <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded border border-amber-200 dark:border-amber-800">
            ⚠️ Not synced with Stripe yet. Users cannot purchase this plan.
          </div>
        )}
      </div>
    )}

    <div>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-slate-900 dark:text-slate-100">Plan Features</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleGenerateFeatures(formData.plan_id)}
            disabled={!formData.plan_id || !formData.price || !formData.name}
            className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Generate with AI
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={addFeature}
            className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Feature
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {formData.features.map((feature, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(index, e.target.value)}
              placeholder="Feature description"
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeFeature(index)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      <Button type="button" variant="outline" onClick={() => window.location.reload()} className="border-slate-300 dark:border-slate-600">
        Cancel
      </Button>
      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
        {editingPlan ? "Update" : "Create"} Plan
      </Button>
    </div>
  </form>
);

export default function SubscriptionPlanManager({ showNotification }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [generatingPricingPage, setGeneratingPricingPage] = useState(false);
  const [sortField, setSortField] = useState("order");
  const [sortDirection, setSortDirection] = useState("asc");

  const [formData, setFormData] = useState({
    plan_id: "",
    name: "",
    price: "",
    period: "per week",
    duration: "",
    icon_name: "Sparkles",
    color_from: "indigo-600",
    color_to: "indigo-700",
    is_popular: false,
    badge_text: "",
    features: [],
    is_active: true,
    order: 1
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => api.entities.SubscriptionPlan.list("order"),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: () => api.entities.MarketingCampaign.list("-created_date"),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "price" || sortField === "duration" || sortField === "order") {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [plans, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.SubscriptionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      resetForm();
      showNotification("Plan created successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to create plan: ${error.message}`, "Error", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SubscriptionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      resetForm();
      showNotification("Plan updated successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to update plan: ${error.message}`, "Error", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      showNotification("Plan deleted successfully!", "Success");
    },
    onError: (error) => {
      showNotification(`Failed to delete plan: ${error.message}`, "Error", "error");
    }
  });

  const resetForm = () => {
    setFormData({
      plan_id: "",
      name: "",
      price: "",
      period: "per week",
      duration: "",
      icon_name: "Sparkles",
      color_from: "indigo-600",
      color_to: "indigo-700",
      is_popular: false,
      badge_text: "",
      features: [],
      is_active: true,
      order: plans.length + 1
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_id: plan.plan_id || "",
      name: plan.name || "",
      price: plan.price?.toString() || "",
      period: plan.period || "per week",
      duration: plan.duration?.toString() || "",
      icon_name: plan.icon_name || "Sparkles",
      color_from: plan.color_from || "indigo-600",
      color_to: plan.color_to || "indigo-700",
      is_popular: plan.is_popular || false,
      badge_text: plan.badge_text || "",
      features: plan.features || [],
      is_active: plan.is_active !== false,
      order: plan.order || 1
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.plan_id.trim() || !formData.name.trim() || !formData.price || !formData.duration) {
      showNotification("Please fill in all required fields", "Missing Information", "error");
      return;
    }

    const cleanedData = {
      ...formData,
      plan_id: formData.plan_id.toLowerCase().trim(),
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      order: parseInt(formData.order) || plans.length + 1,
      badge_text: formData.badge_text.trim() || null
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
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

════════════════════════════════════════════
🎯 YOUR MISSION AS WORLD-CLASS COPYWRITER:
════════════════════════════════════════════

Write magnetic, conversion-focused copy that makes professionals EXCITED to subscribe—while maintaining 100% honesty and accuracy.

✨ **COPYWRITING PHILOSOPHY:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Think: Premium SaaS brands like Notion, Linear, Vercel
Avoid: Generic corporate speak, boring feature lists
Channel: The excitement of unlocking potential + the trust of transparency

🎨 **CREATIVE REQUIREMENTS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Transform features into BENEFITS and OUTCOMES
   ❌ "Unlimited resumes"
   ✅ "Build unlimited resumes until you land your dream role"
   
✓ Use power words that inspire action
   - Transform, Elevate, Unlock, Accelerate, Standout, Craft, Perfect, Professional
   
✓ Paint the picture of SUCCESS
   - Focus on career transformations, not just software features
   - "Get the interview" not "pass ATS scans"
   
✓ Be MEMORABLE yet PROFESSIONAL
   - Creative but never gimmicky
   - Confident but never arrogant
   - Exciting but never misleading

✓ Integrate campaign offers NATURALLY
   - Don't just append "bonus days"—weave it into the value story
   - Make limited-time offers create genuine urgency without pressure

⚠️ **NON-NEGOTIABLE RULES:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 NEVER say "no credit card required"—payment IS required
🚫 NEVER misrepresent prices, discounts, or durations
🚫 NEVER promise instant results—be realistic
✅ ALWAYS be accurate with every number
✅ ALWAYS reflect campaign bonuses correctly
✅ ALWAYS maintain professional credibility

📝 **TONE GUIDANCE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Confident | Aspirational | Trustworthy | Modern
Like if Apple designed LinkedIn's pricing page.

════════════════════════════════════════════
🚀 GENERATE COHESIVE PRICING PAGE CONTENT
════════════════════════════════════════════

Create content that flows beautifully across headlines, features, CTAs, and disclaimers. Make every word count. Make users feel like subscribing is investing in their future success.`;

      const schema = {
        type: "object",
        properties: {
          page_headline: { type: "string" },
          page_subheadline: { type: "string" },
          campaign_banner_text: { type: "string" },
          unified_features_list: { type: "array", items: { type: "string" } },
          disclaimer_text: { type: "string" },
          plans_content: {
            type: "array",
            items: {
              type: "object",
              properties: {
                plan_id: { type: "string" },
                enhanced_headline: { type: "string" },
                cta_text: { type: "string" }
              }
            }
          }
        },
        required: ["page_headline", "page_subheadline", "unified_features_list", "disclaimer_text", "plans_content"]
      };

      const response = await api.functions.invoke('invokeAI', { prompt, response_json_schema: schema });
      const result = response.data;

      for (const planContent of result.plans_content) {
        const plan = activePlans.find(p => p.plan_id === planContent.plan_id);
        if (plan) {
          await api.entities.SubscriptionPlan.update(plan.id, {
            ai_generated_content: {
              headline: planContent.enhanced_headline,
              cta_text: planContent.cta_text
            },
            features: result.unified_features_list
          });
        }
      }

      if (activeCampaign) {
        await api.entities.MarketingCampaign.update(activeCampaign.id, {
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
      showNotification(`Failed to generate pricing page: ${error.message}`, "Error", "error");
    } finally {
      setGeneratingPricingPage(false);
    }
  };

  const handleGenerateFeatures = async (planId) => {
    const plan = plans.find(p => p.plan_id === planId) || (editingPlan?.plan_id === planId ? formData : null);
    if (!plan) return;

    try {
      const prompt = `Generate 6-8 compelling features for a ${plan.name} subscription plan priced at $${plan.price} ${plan.period}. Be benefit-focused, professional, and engaging. Return as a JSON array of strings.`;
      const schema = { type: "object", properties: { features: { type: "array", items: { type: "string" } } }, required: ["features"] };
      const response = await api.functions.invoke('invokeAI', { prompt, response_json_schema: schema });
      setFormData({ ...formData, features: response.data.features });
      showNotification("Features generated successfully!", "Success");
    } catch (error) {
      showNotification(`Failed to generate features: ${error.message}`, "Error", "error");
    }
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const activePlans = plans.filter(p => p.is_active);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Subscription Plans</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage pricing plans that appear on your pricing page</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleGeneratePricingPage}
            disabled={generatingPricingPage || activePlans.length === 0}
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
              resetForm();
              setShowForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {activePlans.length > 0 && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-indigo-900 dark:text-indigo-100">
              <strong>{activePlans.length}</strong> active plan{activePlans.length !== 1 ? 's' : ''} will appear on the pricing page
            </p>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showForm && !editingPlan && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Create New Plan</h3>
              <PlanForm 
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                editingPlan={editingPlan}
                handleGenerateFeatures={handleGenerateFeatures}
                addFeature={addFeature}
                updateFeature={updateFeature}
                removeFeature={removeFeature}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No plans yet</h3>
            <p className="text-slate-600 dark:text-slate-400">Create your first subscription plan to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left w-[30%]">
                    <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                      Plan <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-[15%]">
                    <button onClick={() => handleSort("price")} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                      Price <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-[13%]">
                    <button onClick={() => handleSort("duration")} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                      Duration <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-[12%] text-xs font-medium text-slate-700 dark:text-slate-300">Features</th>
                  <th className="px-4 py-3 text-left w-[15%] text-xs font-medium text-slate-700 dark:text-slate-300">Stripe</th>
                  <th className="px-4 py-3 text-left w-[15%] text-xs font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-right w-[10%] text-xs font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedPlans.map((plan) => {
                  const IconComponent = ICON_OPTIONS[plan.icon_name] || Sparkles;
                  const hasCampaign = campaigns.find(c => c.is_active && c.target_plan === plan.plan_id);
                  const isEditing = editingPlan?.id === plan.id;
                  
                  return (
                    <React.Fragment key={plan.id}>
                      {!isEditing ? (
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 bg-gradient-to-br from-${plan.color_from} to-${plan.color_to} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{plan.plan_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">${plan.price}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <span className="text-sm text-slate-900 dark:text-slate-100">{plan.duration} days</span>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {plan.features?.length || 0} feature{(plan.features?.length || 0) !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            {plan.stripe_price_id ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  Synced
                                </Badge>
                                <a
                                  href={`https://dashboard.stripe.com/prices/${plan.stripe_price_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                  title="View in Stripe Dashboard"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            ) : (
                              <Badge variant="outline" className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300">
                                Not Synced
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {plan.is_active ? (
                                <Badge className="bg-indigo-600 text-white dark:bg-indigo-500">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                              )}
                              {plan.is_popular && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Popular</Badge>}
                              {plan.badge_text && <Badge variant="secondary">{plan.badge_text}</Badge>}
                              {hasCampaign && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Campaign</Badge>}
                              {plan.ai_generated_content && (
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
                                onClick={() => updateMutation.mutate({ 
                                  id: plan.id, 
                                  data: { ...plan, is_active: !plan.is_active } 
                                })}
                                className={`${plan.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
                                title={plan.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(plan)}
                                className="text-indigo-600 dark:text-indigo-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(plan.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 bg-indigo-50 dark:bg-indigo-950/30">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Edit Plan</h3>
                            <PlanForm 
                              onSubmit={handleSubmit}
                              formData={formData}
                              setFormData={setFormData}
                              editingPlan={editingPlan}
                              handleGenerateFeatures={handleGenerateFeatures}
                              addFeature={addFeature}
                              updateFeature={updateFeature}
                              removeFeature={removeFeature}
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
  );
}