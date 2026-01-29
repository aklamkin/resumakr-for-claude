import { useState, useEffect, useRef } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Save, RotateCcw, Edit2, X, FileText, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPromptType, setEditingPromptType] = useState(null);
  const [editedPrompts, setEditedPrompts] = useState({});
  const [savingPrompts, setSavingPrompts] = useState({});
  const [resettingPrompts, setResettingPrompts] = useState({});
  const textareaRefs = useRef({});

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const res = await adminApi.prompts.listSystem();
      setPrompts(res.data);
    } catch (err) {
      console.error('Failed to load prompts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const getEditedValue = (promptType, field) => editedPrompts[promptType]?.[field];

  const setEditedValue = (promptType, field, value) => {
    setEditedPrompts((prev) => ({
      ...prev,
      [promptType]: { ...(prev[promptType] || {}), [field]: value },
    }));
  };

  const getCurrentValue = (prompt, field) => {
    const edited = getEditedValue(prompt.prompt_type, field);
    if (edited !== undefined) return edited;
    return prompt[field];
  };

  const hasChanges = (promptType) => editedPrompts[promptType] && Object.keys(editedPrompts[promptType]).length > 0;

  const handleSave = async (promptType) => {
    const changes = editedPrompts[promptType];
    if (!changes) return;

    setSavingPrompts((prev) => ({ ...prev, [promptType]: true }));
    try {
      await adminApi.prompts.updateSystem(promptType, changes);
      setEditedPrompts((prev) => {
        const updated = { ...prev };
        delete updated[promptType];
        return updated;
      });
      fetchPrompts();
      alert('Prompt saved successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save prompt');
    } finally {
      setSavingPrompts((prev) => ({ ...prev, [promptType]: false }));
    }
  };

  const handleReset = async (promptType) => {
    if (!window.confirm('Reset this prompt to factory default? This will overwrite your current changes.')) return;

    setResettingPrompts((prev) => ({ ...prev, [promptType]: true }));
    try {
      await adminApi.prompts.resetSystem(promptType);
      setEditedPrompts((prev) => {
        const updated = { ...prev };
        delete updated[promptType];
        return updated;
      });
      fetchPrompts();
      alert('Prompt reset to factory default.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset prompt');
    } finally {
      setResettingPrompts((prev) => ({ ...prev, [promptType]: false }));
    }
  };

  const insertVariable = (promptType, field, variableName) => {
    const textareaKey = `${promptType}-${field}`;
    const textarea = textareaRefs.current[textareaKey];
    const insertion = `{${variableName}}`;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prompt = prompts.find((p) => p.prompt_type === promptType);
      const currentVal = getCurrentValue(prompt, field) || '';
      const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);
      setEditedValue(promptType, field, newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        textarea.focus();
      }, 0);
    } else {
      const prompt = prompts.find((p) => p.prompt_type === promptType);
      const currentVal = getCurrentValue(prompt, field) || '';
      setEditedValue(promptType, field, currentVal + insertion);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">AI Prompt Management</h1>
        <p className="text-muted-foreground text-sm">Configure the prompts used for every AI interaction</p>
      </div>

      <div className="p-6 space-y-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How prompts work</p>
              <p>
                Each AI feature has its own <strong>System Prompt</strong> (sets the AI role) and <strong>User Prompt Template</strong> (instructions with variable placeholders).
                Variables like <code className="bg-blue-100 px-1 rounded">{"{variable_name}"}</code> are automatically replaced with real data at runtime.
                Click a variable chip to insert it at the cursor position. Changes take effect immediately after saving.
              </p>
            </div>
          </div>
        </Card>

        {prompts.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No system prompts found</h3>
            <p className="text-muted-foreground">Run database migration to seed prompt types.</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {prompts.map((prompt) => {
                const isEditing = editingPromptType === prompt.prompt_type;
                const variables = prompt.available_variables || [];
                const isSaving = savingPrompts[prompt.prompt_type];
                const isResetting = resettingPrompts[prompt.prompt_type];
                const changed = hasChanges(prompt.prompt_type);

                return (
                  <div key={prompt.prompt_type} className="p-6 hover:bg-slate-50 transition-colors">
                    {isEditing ? (
                      /* EDIT MODE */
                      <div className="space-y-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold">Edit Prompt</h3>
                          <Button variant="ghost" size="sm" onClick={() => setEditingPromptType(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-base font-semibold">{prompt.name}</h4>
                          <Badge variant="outline" className="text-xs font-mono">{prompt.prompt_type}</Badge>
                        </div>
                        {prompt.description && <p className="text-sm text-muted-foreground -mt-3">{prompt.description}</p>}

                        {/* Available Variables */}
                        {variables.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Available Variables</Label>
                            <div className="flex flex-wrap gap-2">
                              {variables.map((v) => (
                                <button
                                  key={v.name}
                                  onClick={() => insertVariable(prompt.prompt_type, 'prompt_text', v.name)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                                  title={v.description}
                                >
                                  {`{${v.name}}`}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">Click to insert at cursor position in User Prompt Template</p>
                          </div>
                        )}

                        {/* System Prompt */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">System Prompt (AI role/persona)</Label>
                          <Textarea
                            ref={(el) => { textareaRefs.current[`${prompt.prompt_type}-system_prompt`] = el; }}
                            value={getCurrentValue(prompt, 'system_prompt') || ''}
                            onChange={(e) => setEditedValue(prompt.prompt_type, 'system_prompt', e.target.value)}
                            className="h-24 font-mono text-sm"
                            placeholder="System prompt that sets the AI's role..."
                          />
                        </div>

                        {/* User Prompt Template */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">User Prompt Template (with {"{variables}"})</Label>
                          <Textarea
                            ref={(el) => { textareaRefs.current[`${prompt.prompt_type}-prompt_text`] = el; }}
                            value={getCurrentValue(prompt, 'prompt_text') || ''}
                            onChange={(e) => setEditedValue(prompt.prompt_type, 'prompt_text', e.target.value)}
                            className="h-64 font-mono text-sm"
                            placeholder="User prompt template with {variable} placeholders..."
                          />
                        </div>

                        {/* Temperature and Max Tokens */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Temperature (0.0 = precise, 1.0 = creative)</Label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={parseFloat(getCurrentValue(prompt, 'temperature') ?? 0.3)}
                                onChange={(e) => setEditedValue(prompt.prompt_type, 'temperature', parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                              <span className="text-sm font-mono w-10 text-right">
                                {parseFloat(getCurrentValue(prompt, 'temperature') ?? 0.3).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Max Tokens (response length limit)</Label>
                            <Input
                              type="number"
                              min="100"
                              max="16000"
                              step="100"
                              value={parseInt(getCurrentValue(prompt, 'max_tokens') ?? 500)}
                              onChange={(e) => setEditedValue(prompt.prompt_type, 'max_tokens', parseInt(e.target.value) || 500)}
                            />
                          </div>
                        </div>

                        {prompt.updated_at && (
                          <p className="text-xs text-muted-foreground">Last updated: {new Date(prompt.updated_at).toLocaleString()}</p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" onClick={() => setEditingPromptType(null)}>Cancel</Button>
                          <Button variant="outline" size="sm" onClick={() => handleReset(prompt.prompt_type)} disabled={isResetting}>
                            {isResetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                            Reset to Default
                          </Button>
                          <Button onClick={() => handleSave(prompt.prompt_type)} disabled={!changed || isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-semibold">{prompt.name}</h4>
                            <Badge variant="outline" className="text-xs font-mono">{prompt.prompt_type}</Badge>
                            {changed && <Badge className="bg-amber-100 text-amber-700">Unsaved</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{prompt.description}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => handleReset(prompt.prompt_type)} disabled={isResetting} className="text-slate-400" title="Reset to default">
                            {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingPromptType(prompt.prompt_type)} title="Edit prompt">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
