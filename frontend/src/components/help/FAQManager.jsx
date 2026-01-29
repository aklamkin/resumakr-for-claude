import React, { useState } from "react";
import api from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, HelpCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/notification";
import { motion } from "framer-motion";

export default function FAQManager({ showNotification }) {
  const [editingFaq, setEditingFaq] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, faqId: null });
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: () => api.entities.FAQItem.list("-order"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.FAQItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setIsAdding(false);
      setEditingFaq(null);
      showNotification("FAQ created successfully", "Success");
    },
    onError: () => showNotification("Failed to create FAQ", "Error", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FAQItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setEditingFaq(null);
      showNotification("FAQ updated successfully", "Success");
    },
    onError: () => showNotification("Failed to update FAQ", "Error", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.FAQItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      showNotification("FAQ deleted successfully", "Success");
    },
    onError: () => showNotification("Failed to delete FAQ", "Error", "error"),
  });

  const handleSave = (faq) => {
    if (!faq.question?.trim() || !faq.answer?.trim()) {
      showNotification("Question and answer are required", "Validation Error", "error");
      return;
    }

    if (faq.id) {
      updateMutation.mutate({ id: faq.id, data: faq });
    } else {
      createMutation.mutate(faq);
    }
  };

  const handleTogglePublish = (faq) => {
    updateMutation.mutate({
      id: faq.id,
      data: { ...faq, is_published: !faq.is_published }
    });
  };

  const handleReorder = (faq, direction) => {
    const newOrder = direction === 'up' ? faq.order - 1.5 : faq.order + 1.5;
    updateMutation.mutate({
      id: faq.id,
      data: { ...faq, order: newOrder }
    });
  };

  const publishedCount = faqs.filter(f => f.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">FAQ Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage frequently asked questions for your help page</p>
        </div>
        <Button
          onClick={() => {
            setIsAdding(true);
            setEditingFaq({ question: "", answer: "", category: "General", order: 0, is_published: true });
          }}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {publishedCount > 0 && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-indigo-900 dark:text-indigo-100">
              <strong>{publishedCount}</strong> FAQ{publishedCount !== 1 ? 's' : ''} published and visible to users
            </p>
          </div>
        </Card>
      )}

      {(isAdding || editingFaq) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              {editingFaq?.id ? "Edit FAQ" : "Add New FAQ"}
            </h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 dark:text-slate-100">Category</Label>
                  <Input
                    value={editingFaq?.category || ""}
                    onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                    placeholder="e.g., General, Billing, Account"
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-slate-100">Display Order</Label>
                  <Input
                    type="number"
                    value={editingFaq?.order || 0}
                    onChange={(e) => setEditingFaq({ ...editingFaq, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-900 dark:text-slate-100">Question *</Label>
                <Input
                  value={editingFaq?.question || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  placeholder="Enter the question"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <Label className="text-slate-900 dark:text-slate-100">Answer *</Label>
                <Textarea
                  value={editingFaq?.answer || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  placeholder="Enter the answer"
                  className="min-h-32 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFaq?.is_published || false}
                    onChange={(e) => setEditingFaq({ ...editingFaq, is_published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Published (visible to users)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingFaq(null);
                  }}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSave(editingFaq)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {editingFaq?.id ? "Update" : "Create"} FAQ
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading FAQs...</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No FAQs yet</h3>
            <p className="text-slate-600 dark:text-slate-400">Create your first FAQ to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {faq.category || "General"}
                      </Badge>
                      {faq.is_published ? (
                        <Badge className="bg-indigo-600 text-white dark:bg-indigo-500 text-xs">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-xs">Unpublished</Badge>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400">Order: {faq.order}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{faq.question}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{faq.answer}</p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(faq)}
                      title={faq.is_published ? "Unpublish" : "Publish"}
                      className="text-slate-600 dark:text-slate-400"
                    >
                      {faq.is_published ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(faq, 'up')}
                      title="Move up"
                      className="text-slate-600 dark:text-slate-400"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(faq, 'down')}
                      title="Move down"
                      className="text-slate-600 dark:text-slate-400"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingFaq(faq)}
                      className="text-indigo-600 dark:text-indigo-400"
                      title="Edit FAQ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm({ open: true, faqId: faq.id })}
                      className="text-red-600 dark:text-red-400"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, faqId: null })}
        onConfirm={() => {
          if (deleteConfirm.faqId) {
            deleteMutation.mutate(deleteConfirm.faqId);
          }
        }}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}