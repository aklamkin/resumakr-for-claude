
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, ArrowLeft, Loader2, CheckCircle, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function UploadResume() {
  const navigate = useNavigate();
  const { canAccessFeature, loading: authLoading } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check if user can access resume parsing feature
  const canUpload = canAccessFeature('resumeParsing');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.includes("document"))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a PDF or DOC/DOCX file");
    }
  }, []);

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(20);

    try {
      // Upload file
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setUploadProgress(50);

      // Extract data from resume file using AI
      setProcessing(true);
      
      // Define the schema for resume data extraction
      const resumeSchema = {
        type: "object",
        properties: {
          personal_info: {
            type: "object",
            properties: {
              full_name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              location: { type: "string" },
              linkedin: { type: "string" },
              website: { type: "string" },
              github: { type: "string" }
            }
          },
          professional_summary: { type: "string" },
          work_experience: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string" },
                position: { type: "string" },
                location: { type: "string" },
                start_date: { type: "string" },
                end_date: { type: "string" },
                current: { type: "boolean" },
                responsibilities: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                institution: { type: "string" },
                degree: { type: "string" },
                field_of_study: { type: "string" },
                location: { type: "string" },
                graduation_date: { type: "string" },
                gpa: { type: "string" },
                honors: { type: "string" }
              }
            }
          },
          skills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                items: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          certifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                issuer: { type: "string" },
                date_obtained: { type: "string" },
                expiry_date: { type: "string" },
                credential_id: { type: "string" }
              }
            }
          },
          projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                technologies: {
                  type: "array",
                  items: { type: "string" }
                },
                url: { type: "string" }
              }
            }
          },
          languages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                language: { type: "string" },
                proficiency: { type: "string" }
              }
            }
          }
        }
      };
      
      setUploadProgress(70);
      
      const extractResult = await api.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: resumeSchema
      });
      setUploadProgress(90);

      if (extractResult.status === "success" && extractResult.output) {
        // Create Resumakr resume record
        const resume = await api.entities.Resume.create({
          title: `Resume - ${file.name.replace(/\.[^/.]+$/, "")}`,
          status: "draft",
          source_type: "upload",
          file_url
        });

        // Save extracted resume data
        await api.entities.ResumeData.create({
          resume_id: resume.id,
          ...extractResult.output
        });

        // Create initial version for tracking
        await api.entities.ResumeVersion.create({
          resume_id: resume.id,
          version_number: 1,
          data_snapshot: extractResult.output,
          version_name: "Initial upload",
          notes: ""
        });

        setUploadProgress(100);
        
        // Navigate to review page
        setTimeout(() => {
          navigate(createPageUrl(`ResumeReview?id=${resume.id}`));
        }, 500);
      } else {
        throw new Error(extractResult.details || "Failed to extract data from file");
      }
    } catch (err) {
      setError(err.message || "Failed to process file. Please try again.");
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show upgrade prompt for free users who can't access resume parsing
  if (!canUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Home"))}
              className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>

            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">Upload Your Resume</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Upload your existing resume and we'll help you enhance it with AI
            </p>
          </motion.div>

          {/* Upgrade Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700">
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Crown className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-3">
                  Premium Feature
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mb-6 max-w-md mx-auto">
                  AI-powered resume parsing is available with a premium subscription.
                  Upload your resume and let our AI extract and organize all your information automatically.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate(createPageUrl("Pricing"))}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl("BuildWizard"))}
                    className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  >
                    Create Resume Manually
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
          >
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What you get with Premium:</h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>AI-powered resume parsing from PDF/DOCX files</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Unlimited AI credits for content improvements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Access to all premium templates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Unlimited PDF downloads without watermark</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Home"))}
            className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">Upload Your Resume</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Upload your existing resume and we'll help you enhance it with AI
          </p>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-12 transition-all duration-300 ${
                dragActive ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-500" : "bg-white dark:bg-slate-800"
              }`}
            >
              {!file ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-2xl flex items-center justify-center">
                    <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Drop your resume here
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    or click to browse from your device
                  </p>
                  
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                      <span>Browse Files</span>
                    </Button>
                  </label>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                    Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {uploadProgress === 100 && (
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                  </div>

                  {(uploading || processing) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {processing ? "Analyzing resume..." : "Uploading..."}
                        </span>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setUploadProgress(0);
                      }}
                      disabled={uploading || processing}
                      className="flex-1 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      Change File
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || processing}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      {uploading || processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Upload & Process"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
        >
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>We'll extract all information from your resume</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>AI will analyze and suggest improvements</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>You can review and edit before finalizing</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
