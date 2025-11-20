import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, CheckCircle, X } from "lucide-react";

export default function ResumeHeader({ title, onSave, editMode }) {
  const [editing, setEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const startEditing = () => {
    setTempTitle(title);
    setEditing(true);
  };

  const saveTitle = async () => {
    if (!tempTitle.trim()) {
      setEditing(false);
      return;
    }
    const success = await onSave(tempTitle);
    if (success) {
      setEditing(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setTempTitle("");
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") cancelEditing();
              }}
              className="text-2xl font-bold max-w-md dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveTitle}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-500"
            >
              <CheckCircle className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEditing}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="group/title flex items-center gap-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <button
              onClick={startEditing}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        )}
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {editMode ? "Edit your resume data" : "Review and enhance your resume with AI"}
        </p>
      </div>
    </div>
  );
}