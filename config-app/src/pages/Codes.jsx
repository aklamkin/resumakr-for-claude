import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, Edit2, Power, Ticket, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Codes() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '', description: '', discount_type: 'percentage', discount_value: '',
    applicable_plans: ['all'], valid_from: '', valid_until: '', max_uses: '', is_active: true,
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await adminApi.coupons.list();
      setCoupons(res.data);
    } catch (err) {
      console.error('Failed to load coupons', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setFormData({
      code: '', description: '', discount_type: 'percentage', discount_value: '',
      applicable_plans: ['all'], valid_from: '', valid_until: '', max_uses: '', is_active: true,
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value?.toString() || '',
      applicable_plans: coupon.applicable_plans || ['all'],
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      max_uses: coupon.max_uses?.toString() || '',
      is_active: coupon.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.discount_value) {
      alert('Please fill in code and discount value.');
      return;
    }

    const cleanedData = {
      ...formData,
      code: formData.code.toUpperCase().trim(),
      discount_value: parseFloat(formData.discount_value),
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      current_uses: editingCoupon ? editingCoupon.current_uses : 0,
    };

    setSaving(true);
    try {
      if (editingCoupon) {
        await adminApi.coupons.update(editingCoupon.id, cleanedData);
        alert('Coupon updated successfully.');
      } else {
        await adminApi.coupons.create(cleanedData);
        alert('Coupon created successfully.');
      }
      resetForm();
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    try {
      await adminApi.coupons.remove(coupon.id);
      fetchCoupons();
      alert('Coupon deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await adminApi.coupons.update(coupon.id, { ...coupon, is_active: !coupon.is_active });
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handlePlanToggle = (plan) => {
    if (plan === 'all') {
      setFormData({ ...formData, applicable_plans: ['all'] });
    } else {
      const currentPlans = formData.applicable_plans.filter((p) => p !== 'all');
      const hasAll = formData.applicable_plans.includes('all');
      if (currentPlans.includes(plan)) {
        const newPlans = currentPlans.filter((p) => p !== plan);
        setFormData({ ...formData, applicable_plans: newPlans.length === 0 ? ['all'] : newPlans });
      } else {
        setFormData({ ...formData, applicable_plans: hasAll ? [plan] : [...currentPlans, plan] });
      }
    }
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.is_active) return { text: 'Inactive', className: 'bg-slate-400 text-white' };
    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) return { text: 'Scheduled', className: 'bg-blue-500 text-white' };
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return { text: 'Expired', className: 'bg-red-500 text-white' };
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return { text: 'Limit Reached', className: 'bg-orange-500 text-white' };
    return { text: 'Active', className: 'bg-indigo-600 text-white' };
  };

  const activeCoupons = coupons.filter((c) => {
    if (!c.is_active) return false;
    if (c.valid_until && new Date(c.valid_until) < new Date()) return false;
    if (c.max_uses && c.current_uses >= c.max_uses) return false;
    return true;
  });

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Coupon Codes</h1>
        <p className="text-muted-foreground text-sm">Manage discount codes for subscriptions</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            {activeCoupons.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <strong>{activeCoupons.length}</strong> active coupon{activeCoupons.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Coupon
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Coupon Code *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SUMMER2025" className="font-mono uppercase" required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Summer promotion" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type *</Label>
                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}</Label>
                  <Input type="number" step="0.01" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder={formData.discount_type === 'percentage' ? '20' : '10.00'} required />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Applicable Plans</Label>
                <div className="flex flex-wrap gap-3">
                  {['all', 'daily', 'weekly', 'monthly', 'annual'].map((plan) => (
                    <label key={plan} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.applicable_plans.includes(plan)} onCheckedChange={() => handlePlanToggle(plan)} />
                      <span className="text-sm capitalize">{plan}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Valid From</Label>
                  <Input type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
                </div>
                <div>
                  <Label>Max Uses</Label>
                  <Input type="number" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })} placeholder="Unlimited" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                <Label className="cursor-pointer">Active</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCoupon ? 'Update' : 'Create'} Coupon
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Coupons Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading coupons...</p>
          </Card>
        ) : coupons.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Ticket className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No coupons yet</h3>
            <p className="text-muted-foreground">Create your first coupon code to get started</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Plans</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Valid Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-mono font-semibold">{coupon.code}</div>
                          {coupon.description && <div className="text-xs text-muted-foreground mt-1">{coupon.description}</div>}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicable_plans?.includes('all') ? (
                              <Badge variant="secondary" className="text-xs">All Plans</Badge>
                            ) : (
                              coupon.applicable_plans?.map((plan) => (
                                <Badge key={plan} variant="secondary" className="text-xs capitalize">{plan}</Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-muted-foreground">
                            {coupon.valid_from && <div>From: {new Date(coupon.valid_from).toLocaleDateString()}</div>}
                            {coupon.valid_until && <div>Until: {new Date(coupon.valid_until).toLocaleDateString()}</div>}
                            {!coupon.valid_from && !coupon.valid_until && <div>No limit</div>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={status.className}>{status.text}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(coupon)} className={coupon.is_active ? 'text-green-600' : 'text-slate-400'} title={coupon.is_active ? 'Deactivate' : 'Activate'}>
                              <Power className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)} title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon)} className="text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
