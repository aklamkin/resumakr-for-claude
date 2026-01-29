import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, Edit2, Eye, EyeOff, ArrowUp, ArrowDown, HelpCircle, Mail, Save, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Help() {
  // FAQ state
  const [faqs, setFaqs] = useState([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqSaving, setFaqSaving] = useState(false);

  // Config state
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // FAQ operations
  const fetchFaqs = async () => {
    try {
      setFaqLoading(true);
      const res = await adminApi.faq.list();
      setFaqs(res.data);
    } catch (err) {
      console.error('Failed to load FAQs', err);
    } finally {
      setFaqLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await adminApi.faq.getConfig();
      setConfig(res.data || {
        intro_text: 'Welcome to our Help Center! Browse our FAQs below or contact us directly.',
        recipient_emails: [],
        sender_name: 'Resumakr Support',
        contact_form_enabled: true,
      });
    } catch (err) {
      // If no config exists, set defaults
      setConfig({
        intro_text: 'Welcome to our Help Center! Browse our FAQs below or contact us directly.',
        recipient_emails: [],
        sender_name: 'Resumakr Support',
        contact_form_enabled: true,
      });
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
    fetchConfig();
  }, []);

  const handleSaveFaq = async () => {
    if (!editingFaq?.question?.trim() || !editingFaq?.answer?.trim()) {
      alert('Question and answer are required.');
      return;
    }
    setFaqSaving(true);
    try {
      if (editingFaq.id) {
        await adminApi.faq.update(editingFaq.id, editingFaq);
        alert('FAQ updated successfully.');
      } else {
        await adminApi.faq.create(editingFaq);
        alert('FAQ created successfully.');
      }
      setEditingFaq(null);
      fetchFaqs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save FAQ');
    } finally {
      setFaqSaving(false);
    }
  };

  const handleDeleteFaq = async (faq) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await adminApi.faq.remove(faq.id);
      fetchFaqs();
      alert('FAQ deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete FAQ');
    }
  };

  const handleTogglePublish = async (faq) => {
    try {
      await adminApi.faq.update(faq.id, { ...faq, is_published: !faq.is_published });
      fetchFaqs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle publish status');
    }
  };

  const handleReorder = async (faq, direction) => {
    const newOrder = direction === 'up' ? faq.order - 1.5 : faq.order + 1.5;
    try {
      await adminApi.faq.update(faq.id, { ...faq, order: newOrder });
      fetchFaqs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reorder FAQ');
    }
  };

  // Config operations
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await adminApi.faq.updateConfig(config);
      alert('Help configuration saved successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (config.recipient_emails?.includes(newEmail)) {
      alert('This email is already in the list.');
      return;
    }
    setConfig({
      ...config,
      recipient_emails: [...(config.recipient_emails || []), newEmail],
    });
    setNewEmail('');
  };

  const handleRemoveEmail = (email) => {
    setConfig({
      ...config,
      recipient_emails: config.recipient_emails.filter((e) => e !== email),
    });
  };

  const publishedCount = faqs.filter((f) => f.is_published).length;

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Help Center Management</h1>
        <p className="text-muted-foreground text-sm">Manage FAQs and help page configuration</p>
      </div>

      <div className="p-6">
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">Help Page Config</TabsTrigger>
            <TabsTrigger value="faqs">FAQs ({faqs.length})</TabsTrigger>
          </TabsList>

          {/* CONFIG TAB */}
          <TabsContent value="config" className="space-y-6">
            {configLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading configuration...</p>
              </Card>
            ) : config && (
              <Card className="p-6 space-y-6">
                <div>
                  <Label>Introduction Text</Label>
                  <Textarea
                    value={config.intro_text || ''}
                    onChange={(e) => setConfig({ ...config, intro_text: e.target.value })}
                    placeholder="Enter the introduction text for the Help page"
                    className="mt-2 min-h-24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This text appears at the top of the Help page</p>
                </div>

                <div>
                  <Label>Sender Name</Label>
                  <Input
                    value={config.sender_name || ''}
                    onChange={(e) => setConfig({ ...config, sender_name: e.target.value })}
                    placeholder="e.g., Resumakr Support"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This name appears as the sender in contact form emails</p>
                </div>

                <div>
                  <Label>Recipient Email Addresses</Label>
                  <p className="text-xs text-muted-foreground mb-2">Add email addresses to receive contact form submissions</p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                      placeholder="email@example.com"
                      className="flex-1"
                    />
                    <Button onClick={handleAddEmail}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(!config.recipient_emails || config.recipient_emails.length === 0) ? (
                      <Card className="p-6 border-2 border-dashed text-center">
                        <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No recipient emails configured.</p>
                      </Card>
                    ) : (
                      config.recipient_emails.map((email, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <span className="text-sm">{email}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveEmail(email)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contact Form</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable the contact form on the help page</p>
                  </div>
                  <Switch
                    checked={config.contact_form_enabled || false}
                    onCheckedChange={(checked) => setConfig({ ...config, contact_form_enabled: checked })}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveConfig} disabled={configSaving}>
                    {configSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Configuration
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* FAQS TAB */}
          <TabsContent value="faqs" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                {publishedCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <strong>{publishedCount}</strong> FAQ{publishedCount !== 1 ? 's' : ''} published
                  </p>
                )}
              </div>
              <Button onClick={() => setEditingFaq({ question: '', answer: '', category: 'General', order: 0, is_published: true })}>
                <Plus className="w-4 h-4 mr-2" />
                Add FAQ
              </Button>
            </div>

            {/* FAQ Form */}
            {editingFaq && (
              <Card className="p-6 border-2 border-indigo-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">{editingFaq.id ? 'Edit FAQ' : 'Add New FAQ'}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingFaq(null)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input value={editingFaq.category || ''} onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })} placeholder="e.g., General, Billing, Account" />
                    </div>
                    <div>
                      <Label>Display Order</Label>
                      <Input type="number" value={editingFaq.order || 0} onChange={(e) => setEditingFaq({ ...editingFaq, order: parseInt(e.target.value) || 0 })} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <Label>Question *</Label>
                    <Input value={editingFaq.question || ''} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} placeholder="Enter the question" />
                  </div>
                  <div>
                    <Label>Answer *</Label>
                    <Textarea value={editingFaq.answer || ''} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} placeholder="Enter the answer" className="min-h-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingFaq.is_published || false} onCheckedChange={(checked) => setEditingFaq({ ...editingFaq, is_published: checked })} />
                    <Label className="cursor-pointer">Published (visible to users)</Label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditingFaq(null)}>Cancel</Button>
                    <Button onClick={handleSaveFaq} disabled={faqSaving}>
                      {faqSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingFaq.id ? 'Update' : 'Create'} FAQ
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* FAQ List */}
            {faqLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading FAQs...</p>
              </Card>
            ) : faqs.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2">
                <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No FAQs yet</h3>
                <p className="text-muted-foreground">Create your first FAQ to get started</p>
              </Card>
            ) : (
              <Card>
                <div className="divide-y">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">{faq.category || 'General'}</Badge>
                            {faq.is_published ? (
                              <Badge className="bg-indigo-600 text-white text-xs">Published</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Unpublished</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">Order: {faq.order}</span>
                          </div>
                          <h4 className="font-semibold mb-1">{faq.question}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(faq)} title={faq.is_published ? 'Unpublish' : 'Publish'} className="text-slate-600">
                            {faq.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReorder(faq, 'up')} title="Move up" className="text-slate-600">
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReorder(faq, 'down')} title="Move down" className="text-slate-600">
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingFaq(faq)} title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq)} className="text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
