import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, Edit2, Power, CreditCard, Zap, Shield, TestTube2, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Stripe() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', environment: 'test',
    secret_key: '', publishable_key: '', webhook_secret: '',
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await adminApi.stripeProfiles.list();
      setProfiles(res.data);
    } catch (err) {
      console.error('Failed to load Stripe profiles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '', environment: 'test', secret_key: '', publishable_key: '', webhook_secret: '' });
    setEditingProfile(null);
    setShowForm(false);
    setShowSecrets(false);
  };

  const handleEdit = async (profile) => {
    try {
      const res = await adminApi.stripeProfiles.get(profile.id);
      const fullProfile = res.data;
      setEditingProfile(fullProfile);
      setFormData({
        name: fullProfile.name || '',
        description: fullProfile.description || '',
        environment: fullProfile.environment || 'test',
        secret_key: fullProfile.secret_key || '',
        publishable_key: fullProfile.publishable_key || '',
        webhook_secret: fullProfile.webhook_secret || '',
      });
      setShowForm(true);
    } catch (err) {
      alert('Failed to load profile details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.secret_key.trim() || !formData.publishable_key.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    const expectedPrefix = formData.environment === 'test' ? 'sk_test_' : 'sk_live_';
    if (!formData.secret_key.startsWith(expectedPrefix)) {
      alert(`Secret key must start with ${expectedPrefix}`);
      return;
    }

    setSaving(true);
    try {
      if (editingProfile) {
        await adminApi.stripeProfiles.update(editingProfile.id, formData);
        alert('Profile updated successfully.');
      } else {
        await adminApi.stripeProfiles.create(formData);
        alert('Profile created successfully.');
      }
      resetForm();
      fetchProfiles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile) => {
    if (!window.confirm(`Are you sure you want to delete "${profile.name}"?`)) return;
    try {
      await adminApi.stripeProfiles.remove(profile.id);
      fetchProfiles();
      alert('Profile deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete profile');
    }
  };

  const handleActivate = async (profile) => {
    try {
      const res = await adminApi.stripeProfiles.activate(profile.id);
      fetchProfiles();
      alert(res.data.message || 'Profile activated.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate profile');
    }
  };

  const handleTest = async (profile) => {
    setTestingId(profile.id);
    try {
      const res = await adminApi.stripeProfiles.test(profile.id);
      alert(`Connection successful! Account: ${res.data.account?.id || 'OK'}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Connection failed');
    } finally {
      setTestingId(null);
    }
  };

  const activeProfile = profiles.find((p) => p.is_active);

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Stripe Configuration</h1>
        <p className="text-muted-foreground text-sm">Manage Stripe API keys and switch between test/production environments</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Profile Status */}
        {activeProfile && (
          <Card className={`p-4 border-2 ${activeProfile.environment === 'live' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeProfile.environment === 'live' ? <Shield className="w-6 h-6 text-green-600" /> : <TestTube2 className="w-6 h-6 text-blue-600" />}
                <div>
                  <p className={`font-medium ${activeProfile.environment === 'live' ? 'text-green-900' : 'text-blue-900'}`}>
                    Active: <strong>{activeProfile.name}</strong>
                  </p>
                  <p className={`text-sm ${activeProfile.environment === 'live' ? 'text-green-700' : 'text-blue-700'}`}>
                    {activeProfile.environment === 'live' ? 'Production mode - Real payments enabled' : 'Test mode - Use test cards only'}
                  </p>
                </div>
              </div>
              <Badge className={activeProfile.environment === 'live' ? 'bg-green-600' : 'bg-blue-600'}>{activeProfile.environment.toUpperCase()}</Badge>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div />
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Profile
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{editingProfile ? 'Edit Profile' : 'Create New Profile'}</h3>
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Profile Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Test Environment" required />
                </div>
                <div>
                  <Label>Environment *</Label>
                  <Select value={formData.environment} onValueChange={(value) => setFormData({ ...formData, environment: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Development and testing environment" />
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold">API Keys</h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)}>
                    {showSecrets ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showSecrets ? 'Hide' : 'Show'} Keys
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Secret Key *</Label>
                    <Input type={showSecrets ? 'text' : 'password'} value={formData.secret_key} onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })} placeholder={formData.environment === 'test' ? 'sk_test_...' : 'sk_live_...'} className="font-mono" required />
                    <p className="text-xs text-muted-foreground mt-1">Must start with {formData.environment === 'test' ? 'sk_test_' : 'sk_live_'}</p>
                  </div>
                  <div>
                    <Label>Publishable Key *</Label>
                    <Input type={showSecrets ? 'text' : 'password'} value={formData.publishable_key} onChange={(e) => setFormData({ ...formData, publishable_key: e.target.value })} placeholder={formData.environment === 'test' ? 'pk_test_...' : 'pk_live_...'} className="font-mono" required />
                  </div>
                  <div>
                    <Label>Webhook Secret</Label>
                    <Input type={showSecrets ? 'text' : 'password'} value={formData.webhook_secret} onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })} placeholder="whsec_..." className="font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">Required for webhook signature verification</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProfile ? 'Update' : 'Create'} Profile
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Profiles Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading profiles...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Stripe profiles</h3>
              <p className="text-muted-foreground">Create your first Stripe profile to enable payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">Profile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Environment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Keys</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className={`hover:bg-slate-50 ${profile.is_active ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${profile.environment === 'live' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            {profile.environment === 'live' ? <Shield className="w-5 h-5 text-green-600" /> : <TestTube2 className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div>
                            <div className="font-semibold">{profile.name}</div>
                            {profile.description && <div className="text-xs text-muted-foreground">{profile.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={profile.environment === 'live' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{profile.environment}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs space-y-1 font-mono text-muted-foreground">
                          <div>SK: {profile.secret_key_masked}</div>
                          <div>PK: {profile.publishable_key_masked}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {profile.is_active ? <Badge className="bg-indigo-600 text-white">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleTest(profile)} disabled={testingId === profile.id} className="text-blue-600" title="Test Connection">
                            {testingId === profile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          </Button>
                          {!profile.is_active && (
                            <Button variant="ghost" size="sm" onClick={() => handleActivate(profile)} className="text-green-600" title="Activate">
                              <Power className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(profile)} title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {!profile.is_active && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(profile)} className="text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Only one profile can be active at a time</li>
                <li>Switching profiles takes effect immediately</li>
                <li>Test mode uses Stripe test cards, live mode processes real payments</li>
                <li>Webhook secrets must match the endpoint configured in Stripe Dashboard</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
