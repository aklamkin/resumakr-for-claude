import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileCode, FileType, Download } from "lucide-react";
import { motion } from "framer-motion";

const EXPORT_FORMATS = [
  {
    id: "html",
    name: "HTML",
    description: "Web format, can be opened in browsers and converted to PDF",
    icon: FileCode,
    color: "from-orange-600 to-orange-700 dark:from-orange-500 dark:to-orange-600"
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Print-ready format, opens browser print dialog",
    icon: FileText,
    color: "from-red-600 to-red-700 dark:from-red-500 dark:to-red-600"
  },
  {
    id: "markdown",
    name: "Markdown",
    description: "Plain text format with simple formatting",
    icon: FileType,
    color: "from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600"
  },
  {
    id: "docx",
    name: "DOCX",
    description: "Microsoft Word format (exported as HTML, open in Word to save as DOCX)",
    icon: FileText,
    color: "from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600"
  },
  {
    id: "text",
    name: "Plain Text",
    description: "Simple text format without styling",
    icon: FileType,
    color: "from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600"
  }
];

export default function ExportFormatDialog({ open, onClose, onSelectFormat, resumeTitle }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold dark:text-slate-100">
            <Download className="w-6 h-6 inline-block mr-2 text-indigo-600 dark:text-indigo-400" />
            Export Resume
          </DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Choose a format to export "{resumeTitle}"
          </p>
        </DialogHeader>

        <div className="grid gap-3 mt-4">
          {EXPORT_FORMATS.map((format, index) => (
            <motion.div
              key={format.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => {
                  onSelectFormat(format.id);
                  onClose();
                }}
                className="w-full p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 hover:shadow-lg bg-white dark:bg-slate-800 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${format.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                    <format.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-1">
                      {format.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {format.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                      <Download className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}