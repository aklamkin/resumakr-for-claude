import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Give Stripe webhook time to process (usually < 1 second)
    const timer = setTimeout(async () => {
      try {
        // Invalidate user query to fetch updated subscription status
        await queryClient.invalidateQueries(["current-user"]);
        // Redirect directly to My Resumes page
        navigate("/MyResumes");
      } catch (err) {
        console.error("Error refreshing user data:", err);
        setError("Failed to verify subscription. Please refresh the page.");
        setVerifying(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [queryClient, navigate]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6 transition-colors duration-300">
        <Card className="p-8 max-w-md w-full text-center border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Verifying Your Payment
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Please wait while we confirm your subscription...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950 flex items-center justify-center p-6 transition-colors duration-300">
        <Card className="p-8 max-w-md w-full text-center border-2 border-red-200 dark:border-red-800 bg-white dark:bg-slate-800">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Verification Error
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button
            onClick={() => navigate("/my-resumes")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Continue to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-green-950 flex items-center justify-center p-6 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center border-2 border-green-200 dark:border-green-800 bg-white dark:bg-slate-800">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
          >
            Welcome to Resumakr!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-600 dark:text-slate-400 mb-6"
          >
            Your payment was successful and your subscription is now active. You have full access to all features!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg mb-6 border border-indigo-200 dark:border-indigo-800"
          >
            <div className="flex items-center gap-2 justify-center mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Features Unlocked</span>
            </div>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <li>✓ Unlimited resume creation</li>
              <li>✓ AI-powered improvements</li>
              <li>✓ ATS optimization</li>
              <li>✓ Multiple export formats</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => navigate(createPageUrl("MyResumes"))}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white text-lg py-6 mb-3"
            >
              Start Building Resumes
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Session ID: {sessionId?.slice(0, 20)}...
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
