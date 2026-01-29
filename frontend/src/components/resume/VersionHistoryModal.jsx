import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Edit2, Trash2, RotateCcw, Check, X, Download } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ResumeTemplate from "./ResumeTemplate";
import { formatDateTime } from "../utils/dateUtils";
import { NotificationPopup } from "@/components/ui/notification";

import ReactDOM from "react-dom/client";

export default function VersionHistoryModal({
  open,
  onClose,
  versions = [],
  onRestore,
  onRename,
  onDelete
}) {
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });

  const startEditing = (version) => {
    setEditingVersionId(version.id);
    setEditingName(version.version_name || version.change_description || `Version ${version.version_number}`);
    setEditingNotes(version.notes || "");
  };

  const cancelEditing = () => {
    setEditingVersionId(null);
    setEditingName("");
    setEditingNotes("");
  };

  const saveEdit = (versionId) => {
    onRename(versionId, editingName, editingNotes);
    cancelEditing();
  };

  const handleRestore = (version) => {
    setRestoreConfirm(version);
  };

  const confirmRestore = (saveCurrentFirst) => {
    if (restoreConfirm) {
      onRestore(restoreConfirm, saveCurrentFirst);
      setRestoreConfirm(null);
    }
  };

  const handleDelete = (version) => {
    setDeleteConfirm(version);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleOpenPDF = (version) => {
    // Get user name for file naming
    const personalInfo = version.data_snapshot?.personal_info || {};
    const userName = (personalInfo.full_name || 'User').replace(/[^a-z0-9]/gi, '_');
    const fileName = `${userName}_Resume`;

    // Open a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setNotification({ open: true, title: "Popup Blocked", message: "Please allow popups to generate PDF.", type: "error" });
      return;
    }

    // Write the HTML structure
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: letter;
              margin: 0.75in;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: white;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>
          <div id="resume-root"></div>
        </body>
      </html>
    `);

    // Wait for the document to be ready
    printWindow.document.close();

    // Render the React component
    const container = printWindow.document.getElementById('resume-root');
    const root = ReactDOM.createRoot(container);

    // Import and render the template
    import('./ResumeTemplate').then((module) => {
      const ResumeTemplateComponent = module.default;

      root.render(
        React.createElement(ResumeTemplateComponent, {
          data: version.data_snapshot,
          template: version.data_snapshot.template_id || 'classic-professional',
          customColors: version.data_snapshot.template_custom_colors || {},
          customFonts: version.data_snapshot.template_custom_fonts || {},
          scale: 1
        })
      );

      // Wait a bit for rendering, then trigger print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    });
  };

  return (
    <>
      <Dialog open={open && !restoreConfirm && !deleteConfirm} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-950 text-2xl font-bold tracking-tight dark:text-slate-100">Version History</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-400" />
                <p>No versions saved yet</p>
              </div>
            ) : (
              versions.map((version) => {
                const isTemplateVersion = version.data_snapshot?.template_id;

                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-white dark:bg-slate-800"
                  >
                    {editingVersionId === version.id ? (
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                            Version Name
                          </label>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder={`Version ${version.version_number}`}
                            className="mb-2 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(version.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                            Notes (Optional)
                          </label>
                          <Textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            placeholder="Add notes about this version..."
                            className="h-20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(version.id)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex">
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="group/title flex items-center gap-2 mb-1">
                                <h3
                                  className="font-semibold text-slate-900 dark:text-slate-100 text-lg cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                                  onClick={() => startEditing(version)}
                                  title={version.version_name || version.change_description || `Version ${version.version_number}`}
                                >
                                  {version.version_name || version.change_description || `Version ${version.version_number}`}
                                </h3>
                                <button
                                  onClick={() => startEditing(version)}
                                  className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0"
                                  title="Edit Name and/or Comments"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {isTemplateVersion && (
                                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium border border-purple-200 dark:border-purple-700">
                                    Template
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDateTime(version.created_date)}</span>
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 min-h-[1.25rem]">
                                {version.notes || version.change_description ? (
                                  version.notes || (version.version_name ? "" : version.change_description)
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 italic">...</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleRestore(version)}
                              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(version)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Always show preview for all versions */}
                        <div className="flex-shrink-0 border-l border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center">
                          <button
                            onClick={() => handleOpenPDF(version)}
                            className="relative bg-white dark:bg-slate-800 rounded shadow-md overflow-hidden hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 transition-all cursor-pointer"
                            style={{ width: '140px', height: '140px' }}
                            title="Click to generate PDF"
                          >
                            <div className="absolute inset-0">
                              <ResumeTemplate
                                data={version.data_snapshot}
                                template={version.data_snapshot?.template_id || 'classic-professional'}
                                customColors={version.data_snapshot?.template_custom_colors || {}}
                                customFonts={version.data_snapshot?.template_custom_fonts || {}}
                                scale={0.12}
                                showFirstPageOnly={true}
                              />
                            </div>
                            <div className="absolute bottom-1 right-1 bg-indigo-600 dark:bg-indigo-500 text-white p-1 rounded-full shadow-lg z-10">
                              <Download className="w-3 h-3" />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose} className="bg-background text-gray-600 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-full dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AnimatePresence>
        {restoreConfirm &&
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRestoreConfirm(null);
            }
          }}>

            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700">

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Confirm Restore
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                You are about to restore to <strong>"{restoreConfirm.version_name || restoreConfirm.change_description || `Version ${restoreConfirm.version_number}`}"</strong>.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                This will overwrite your current work. Would you like to save your current work as a new version before restoring?
              </p>

              <div className="flex flex-col gap-3">
                <Button
                onClick={() => confirmRestore(true)}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 w-full">

                  Yes, Save & Restore
                </Button>
                <Button
                onClick={() => confirmRestore(false)}
                variant="outline"
                className="w-full border-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">

                  No, Just Restore
                </Button>
                <Button
                onClick={() => setRestoreConfirm(null)}
                variant="ghost"
                className="w-full dark:text-slate-300 dark:hover:bg-slate-700">

                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm &&
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirm(null);
            }
          }}>

            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700">

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Delete Version
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong>"{deleteConfirm.version_name || deleteConfirm.change_description || `Version ${deleteConfirm.version_number}`}"</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">

                  Cancel
                </Button>
                <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600">

                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </>
  );
}