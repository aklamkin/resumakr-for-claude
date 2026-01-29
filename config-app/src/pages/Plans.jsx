import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, Edit2, Power, DollarSign, RefreshCw, ExternalLink, X, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [formData, setFormData] = useState({
    plan_id: '', name: '', price: '', period: 'per week', duration: '',
    icon_name: 'Sparkles', color_from: 'indigo-600', color_to: 'indigo-700',
    is_popular: false, badge_text: '', features: [], is_active: true, order: 1,
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await adminApi.plans.list();
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const resetForm = () => {
    setFormData({
      plan_id: '', name: '', price: '', period: 'per week', duration: '',
      icon_name: 'Sparkles', color_from: 'indigo-600', color_to: 'indigo-700',
      is_popular: false, badge_text: '', features: [], is_active: true, order: plans.length + 1,
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_id: plan.plan_id || '', name: plan.name || '', price: plan.price?.toString() || '',
      period: plan.period || 'per week', duration: plan.duration?.toString() || '',
      icon_name: plan.icon_name || 'Sparkles', color_from: plan.color_from || 'indigo-600',
      color_to: plan.color_to || 'indigo-700', is_popular: plan.is_popular || false,
      badge_text: plan.badge_text || '', features: plan.features || [],
      is_active: plan.is_active !== false, order: plan.order || 1,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.plan_id.trim() || !formData.name.trim() || !formData.price || !formData.duration) {
      alert('Please fill in all required fields.');
      return;
    }

    const cleanedData = {
      ...formData,
      plan_id: formData.plan_id.toLowerCase().trim(),
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      order: parseInt(formData.order) || plans.length + 1,
      badge_text: formData.badge_text.trim() || null,
    };

    setSaving(true);
    try {
      if (editingPlan) {
        await adminApi.plans.update(editingPlan.id, cleanedData);
        alert('Plan updated successfully.');
      } else {
        await adminApi.plans.create(cleanedData);
        alert('Plan created successfully.');
      }
      resetForm();
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.name}"?`)) return;
    try {
      await adminApi.plans.remove(plan.id);
      fetchPlans();
      alert('Plan deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await adminApi.plans.update(plan.id, { ...plan, is_active: !plan.is_active });
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle active status');
    }
  };

  const handleSyncStripe = async (plan) => {
    setSyncing(plan.id);
    try {
      await adminApi.plans.syncStripe(plan.id);
      fetchPlans();
      alert('Plan synced with Stripe successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to sync with Stripe');
    } finally {
      setSyncing(null);
    }
  };

  const addFeature = () => setFormData({ ...formData, features: [...formData.features, ''] });
  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };
  const removeFeature = (index) => setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });

  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground text-sm">Manage pricing plans for your application</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            {activePlans.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <strong>{activePlans.length}</strong> active plan{activePlans.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Plan ID *</Label>
                  <Input value={formData.plan_id} onChange={(e) => setFormData({ ...formData, plan_id: e.target.value.toLowerCase() })} placeholder="weekly" className="font-mono" required disabled={!!editingPlan} />
                </div>
                <div>
                  <Label>Plan Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Weekly Plan" required />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Price (USD) *</Label>
                  <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="6.49" required />
                </div>
                <div>
                  <Label>Period *</Label>
                  <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per day">per day</SelectItem>
                      <SelectItem value="per week">per week</SelectItem>
                      <SelectItem value="per month">per month</SelectItem>
                      <SelectItem value="per year">per year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (days) *</Label>
                  <Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="7" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Badge Text</Label>
                  <Input value={formData.badge_text} onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })} placeholder="Best Value" />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value })} placeholder="1" />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox checked={formData.is_popular} onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })} />
                  <Label className="cursor-pointer">Mark as Popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label className="cursor-pointer">Active</Label>
                </div>
              </div>

              {/* Stripe Integration (edit mode only) */}
              {editingPlan && (
                <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
                  <h4 className="text-sm font-semibold">Stripe Integration</h4>
                  {editingPlan.stripe_product_id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Product ID:</Label>
                        <code className="text-xs bg-white px-2 py-1 rounded border font-mono">{editingPlan.stripe_product_id}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Price ID:</Label>
                        <code className="text-xs bg-white px-2 py-1 rounded border font-mono">{editingPlan.stripe_price_id}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">Not synced with Stripe yet. Users cannot purchase this plan.</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleSyncStripe(editingPlan)} disabled={syncing === editingPlan.id}>
                        {syncing === editingPlan.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                        Create in Stripe
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Plan Features</Label>
                  <Button type="button" size="sm" onClick={addFeature} variant="outline">
                    <Plus className="w-4 h-4 mr-1" /> Add Feature
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input value={feature} onChange={(e) => updateFeature(index, e.target.value)} placeholder="Feature description" />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeFeature(index)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPlan ? 'Update' : 'Create'} Plan
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Plans Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading plans...</p>
          </Card>
        ) : plans.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No plans yet</h3>
            <p className="text-muted-foreground">Create your first subscription plan to get started</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Features</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Stripe</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold">{plan.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{plan.plan_id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold">${plan.price}</div>
                        <div className="text-xs text-muted-foreground">{plan.period}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">{plan.duration} days</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{plan.features?.length || 0} feature{(plan.features?.length || 0) !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-4">
                        {plan.stripe_price_id ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">Synced</Badge>
                            <a href={`https://dashboard.stripe.com/prices/${plan.stripe_price_id}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600" title="View in Stripe">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-red-300 text-red-700">Not Synced</Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleSyncStripe(plan)} disabled={syncing === plan.id} title="Sync to Stripe">
                              {syncing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {plan.is_active ? <Badge className="bg-indigo-600 text-white">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                          {plan.is_popular && <Badge className="bg-emerald-100 text-emerald-700">Popular</Badge>}
                          {plan.badge_text && <Badge variant="secondary">{plan.badge_text}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(plan)} className={plan.is_active ? 'text-green-600' : 'text-slate-400'} title={plan.is_active ? 'Deactivate' : 'Activate'}>
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)} title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(plan)} className="text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
