import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, Edit2, X, Star, Power, Brain, FlaskConical, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROVIDER_PRESETS = {
  openai: { name: 'OpenAI (ChatGPT)', api_url: 'https://api.openai.com/v1/chat/completions', placeholder_key: 'sk-...' },
  anthropic: { name: 'Anthropic (Claude)', api_url: 'https://api.anthropic.com/v1/messages', placeholder_key: 'sk-ant-...' },
  grok: { name: 'Grok (xAI)', api_url: 'https://api.x.ai/v1/chat/completions', placeholder_key: 'xai-...' },
  perplexity: { name: 'Perplexity', api_url: 'https://api.perplexity.ai/chat/completions', placeholder_key: 'pplx-...' },
  gemini: { name: 'Google Gemini', api_url: 'https://generativelanguage.googleapis.com', placeholder_key: 'AIza...' },
  deepseek: { name: 'DeepSeek', api_url: 'https://api.deepseek.com/v1/chat/completions', placeholder_key: 'sk-...' },
  openrouter: { name: 'OpenRouter', api_url: 'https://openrouter.ai/api/v1/chat/completions', placeholder_key: 'sk-or-...' },
  groq: { name: 'Groq', api_url: 'https://api.groq.com/openai/v1/chat/completions', placeholder_key: 'gsk_...' },
  mistral: { name: 'Mistral AI', api_url: 'https://api.mistral.ai/v1/chat/completions', placeholder_key: '...' },
  cohere: { name: 'Cohere', api_url: 'https://api.cohere.ai/v1/generate', placeholder_key: '...' },
};

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingProvider, setTestingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    provider_type: 'openai',
    name: PROVIDER_PRESETS.openai.name,
    api_url: PROVIDER_PRESETS.openai.api_url,
    api_key: '',
    model_name: '',
    is_default: false,
    order: 0,
  });

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await adminApi.providers.list();
      setProviders(res.data);
    } catch (err) {
      console.error('Failed to load providers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleProviderTypeChange = (type) => {
    const preset = PROVIDER_PRESETS[type];
    setNewProvider({
      ...newProvider,
      provider_type: type,
      name: preset?.name || '',
      api_url: preset?.api_url || '',
      api_key: '',
      model_name: '',
    });
  };

  const resetForm = () => {
    setNewProvider({
      provider_type: 'openai',
      name: PROVIDER_PRESETS.openai.name,
      api_url: PROVIDER_PRESETS.openai.api_url,
      api_key: '',
      model_name: '',
      is_default: false,
      order: providers.length + 1,
    });
    setShowForm(false);
    setTestResult(null);
  };

  const handleAddProvider = async () => {
    if (!newProvider.name?.trim() || !newProvider.api_key?.trim()) {
      alert('Please fill in provider name and API key.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.providers.create({ ...newProvider, order: providers.length + 1 });
      resetForm();
      fetchProviders();
      alert('Provider added successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add provider');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (provider) => {
    setEditingProviderId(provider.id);
    setEditData({
      provider_type: provider.provider_type || 'openai',
      name: provider.name || '',
      api_url: provider.api_url || provider.api_endpoint || '',
      api_key: '',
      model_name: provider.model_name || '',
      is_default: provider.is_default || false,
      order: provider.order || 0,
    });
    setTestResult(null);
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setEditData({});
    setTestResult(null);
  };

  const handleSaveEdit = async (provider) => {
    if (!editData.name?.trim()) {
      alert('Please fill in provider name.');
      return;
    }
    const updateData = { ...editData };
    if (!updateData.api_key?.trim()) {
      delete updateData.api_key;
    }
    setSaving(true);
    try {
      await adminApi.providers.update(provider.id, updateData);
      setEditingProviderId(null);
      setEditData({});
      fetchProviders();
      alert('Provider updated successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (provider) => {
    if (!window.confirm(`Are you sure you want to delete "${provider.name}"?`)) return;
    try {
      await adminApi.providers.remove(provider.id);
      fetchProviders();
      alert('Provider deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete provider');
    }
  };

  const handleSetDefault = async (provider) => {
    try {
      await adminApi.providers.update(provider.id, { ...provider, is_default: true });
      fetchProviders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set default');
    }
  };

  const handleToggleActive = async (provider) => {
    try {
      await adminApi.providers.update(provider.id, { ...provider, is_active: !provider.is_active });
      fetchProviders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle active status');
    }
  };

  const handleTestProvider = async (providerData) => {
    if (!providerData.provider_type) {
      alert('Please select a provider type.');
      return;
    }
    if (!providerData.api_key?.trim()) {
      alert('Please enter an API key to test.');
      return;
    }
    setTestingProvider(true);
    setTestResult(null);
    try {
      const res = await adminApi.providers.test(providerData);
      setTestResult({ success: true, message: res.data.message || 'Test successful!', test_response: res.data.test_response });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Test failed' });
    } finally {
      setTestingProvider(false);
    }
  };

  const defaultProviders = providers.filter((p) => p.is_default).slice(0, 3);

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">AI Providers</h1>
        <p className="text-muted-foreground text-sm">Configure AI providers for resume improvements</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div />
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Provider
          </Button>
        </div>

        {defaultProviders.length > 0 && (
          <Card className="p-4 bg-indigo-50 border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-2">Active Default Providers</h3>
            <div className="flex flex-wrap gap-2">
              {defaultProviders.map((p, i) => (
                <Badge key={p.id} className="bg-indigo-600 text-white">{i + 1}. {p.name}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* New Provider Form */}
        {showForm && (
          <Card className="p-6 border-2 border-indigo-200">
            <h3 className="text-xl font-bold mb-6">Add New AI Provider</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select value={newProvider.provider_type} onValueChange={handleProviderTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider Name</Label>
                  <Input value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="My AI Provider" />
                </div>
                <div className="space-y-2">
                  <Label>API URL</Label>
                  <Input value={newProvider.api_url} onChange={(e) => setNewProvider({ ...newProvider, api_url: e.target.value })} placeholder="https://api.example.com/v1/..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={newProvider.api_key} onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })} placeholder={PROVIDER_PRESETS[newProvider.provider_type]?.placeholder_key || 'Enter API key'} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={newProvider.model_name} onChange={(e) => setNewProvider({ ...newProvider, model_name: e.target.value })} placeholder="e.g., gpt-4o, claude-3-5-sonnet" />
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                    <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>{testResult.message}</p>
                  </div>
                  {testResult.test_response && <p className="text-xs text-green-700 mt-1 ml-7">Response: {testResult.test_response}</p>}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button variant="outline" onClick={() => handleTestProvider(newProvider)} disabled={testingProvider}>
                  {testingProvider ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                  Test
                </Button>
                <Button onClick={handleAddProvider} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Provider
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Provider List */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading providers...</p>
          </Card>
        ) : providers.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No providers yet</h3>
            <p className="text-muted-foreground">Add an AI provider to get started</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {providers.map((provider) => (
                <div key={provider.id} className="p-6 hover:bg-slate-50 transition-colors">
                  {editingProviderId === provider.id ? (
                    /* EDIT MODE */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Edit Provider</h3>
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Provider Type</Label>
                        <Select value={editData.provider_type} onValueChange={(type) => {
                          const preset = PROVIDER_PRESETS[type];
                          setEditData({ ...editData, provider_type: type, name: preset?.name || editData.name, api_url: preset?.api_url || editData.api_url });
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                              <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                            ))}
                            <SelectItem value="custom">Custom Provider</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Provider Name</Label>
                          <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>API URL</Label>
                          <Input value={editData.api_url} onChange={(e) => setEditData({ ...editData, api_url: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>API Key (leave empty to keep existing)</Label>
                        <Input type="password" value={editData.api_key} onChange={(e) => setEditData({ ...editData, api_key: e.target.value })} placeholder="Existing key will be kept if empty" />
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Input value={editData.model_name} onChange={(e) => setEditData({ ...editData, model_name: e.target.value })} placeholder="e.g., gpt-4o, claude-3-5-sonnet" />
                      </div>

                      {testResult && (
                        <div className={`p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            {testResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                            <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>{testResult.message}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        <Button variant="outline" onClick={() => handleTestProvider({ ...editData, api_key: editData.api_key || provider.api_key || provider.config?.api_key })} disabled={testingProvider}>
                          {testingProvider ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                          Test
                        </Button>
                        <Button onClick={() => handleSaveEdit(provider)} disabled={saving}>
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Update Provider
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE */
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-semibold">{provider.name}</h4>
                          {provider.is_default && <Badge className="bg-green-600 text-white">Default</Badge>}
                          {provider.is_active === false && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{provider.api_url}</p>
                        {provider.model_name && <p className="text-sm text-muted-foreground">Model: {provider.model_name}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(provider)} className={provider.is_default ? 'text-green-600' : 'text-slate-400'} title={provider.is_default ? 'Default' : 'Set as default'}>
                          <Star className={`w-4 h-4 ${provider.is_default ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(provider)} className={provider.is_active !== false ? 'text-green-600' : 'text-slate-400'} title={provider.is_active !== false ? 'Deactivate' : 'Activate'}>
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)} title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProvider(provider)} className="text-red-600" title="Delete">
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
  );
}
