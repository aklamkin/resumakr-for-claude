
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, ArrowRight, FileCheck, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = React.useState(true);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  React.useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const user = await api.auth.me();
      
      // Check if subscription is active and not expired
      if (user.is_subscribed && user.subscription_end_date) {
        const endDate = new Date(user.subscription_end_date);
        const now = new Date();
        setIsSubscribed(endDate > now);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      setIsSubscribed(false);
    } finally {
      setChecking(false);
    }
  };

  const handleNavigation = (page) => {
    if (!isSubscribed) {
      navigate(createPageUrl(`Pricing?returnUrl=${page}`));
    } else {
      navigate(createPageUrl(page));
    }
  };

  const features = [
    {
      icon: Zap,
      title: "AI-Powered",
      description: "Intelligent suggestions and formatting"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is protected and never shared"
    },
    {
      icon: FileCheck,
      title: "Multiple Formats",
      description: "Export in various professional formats"
    }
  ];

  const trustBadges = [
    "🔒 Secure Cloud Storage",
    "🌟 Trusted by Professionals",
    "🚀 #1 AI Resume Builder",
    "✓ Your Data Stays Private"
  ];

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden transition-colors duration-300">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-200/20 dark:bg-blue-900/20 rounded-full blur-3xl translate-y/2 -translate-x-1/2" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            #1 AI-Powered Resume Builder on the Internet
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            Craft Your Perfect
            <span className="block bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
              Professional Resume
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Build a standout resume in minutes with AI assistance, or enhance your existing one with intelligent improvements
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
            {trustBadges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm"
              >
                {badge}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-20"
        >
          <Card 
            className="group relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-indigo-900/50 bg-white dark:bg-slate-800"
            onClick={() => handleNavigation("BuildWizard")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-950 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Build From Scratch</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Create a new resume with our guided wizard. We'll help you structure your experience perfectly.
              </p>
              
              <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium group-hover:gap-3 gap-2 transition-all duration-300">
                Start Building
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </Card>

          <Card 
            className="group relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-indigo-900/50 bg-white dark:bg-slate-800"
            onClick={() => handleNavigation("UploadResume")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Upload className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Upload Existing Resume</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Have a resume already? Upload it and let our AI enhance it with intelligent improvements.
              </p>
              
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:gap-3 gap-2 transition-all duration-300">
                Upload & Improve
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-8">
            Why Choose Resumakr
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 hover:shadow-lg bg-white dark:bg-slate-800">
                <feature.icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>

          {/* Security Statement */}
          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 p-8 text-center">
            <Shield className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Your Privacy is Our Priority</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Your resume and personal information are stored securely and never shared with third parties. 
              We take data protection seriously and use industry-standard security measures to keep your information safe.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
