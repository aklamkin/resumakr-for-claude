import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Upload, ArrowRight, FileCheck, Zap, Shield,
  CheckCircle, Star, Target, Clock, Users, Award,
  ChevronRight, Play, FileText, Wand2, BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('resumakr_token');
      if (token) {
        const userData = await api.auth.me();
        setUser(userData);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryCTA = () => {
    if (user) {
      navigate(createPageUrl("MyResumes"));
    } else {
      navigate("/signup");
    }
  };

  const handleSecondaryCTA = () => {
    if (user) {
      navigate(createPageUrl("BuildWizard"));
    } else {
      navigate("/login");
    }
  };

  // Features showcase
  const features = [
    {
      icon: Wand2,
      title: "AI-Powered Writing",
      description: "Get intelligent suggestions that transform your experience into compelling achievements. Our AI understands what recruiters want.",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      icon: Target,
      title: "ATS Optimization",
      description: "Every resume is automatically optimized for Applicant Tracking Systems. Stop getting filtered out before a human sees your resume.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Professional Templates",
      description: "Clean, modern designs that look great on screen and in print. All templates are tested with real recruiters.",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data stays yours. We never share or sell your information. Secure cloud storage with enterprise-grade encryption.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  // How it works steps
  const steps = [
    {
      number: "01",
      title: "Start Fresh or Upload",
      description: "Begin with our guided wizard or upload your existing resume for instant AI enhancement.",
      icon: Upload
    },
    {
      number: "02",
      title: "AI Enhances Your Content",
      description: "Our AI analyzes your experience and suggests powerful improvements that get noticed.",
      icon: Sparkles
    },
    {
      number: "03",
      title: "Download & Apply",
      description: "Export in multiple formats, perfectly formatted and ATS-ready. Land more interviews.",
      icon: FileCheck
    }
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "I went from zero callbacks to 5 interviews in two weeks. The AI suggestions were spot-on.",
      author: "Sarah M.",
      role: "Software Engineer",
      company: "Now at Google"
    },
    {
      quote: "Finally, a resume builder that doesn't feel like a chore. Simple, fast, and the results speak for themselves.",
      author: "James K.",
      role: "Marketing Manager",
      company: "Now at Spotify"
    },
    {
      quote: "The ATS optimization feature alone is worth it. My resume was getting filtered out before—not anymore.",
      author: "Priya R.",
      role: "Data Analyst",
      company: "Now at Amazon"
    }
  ];

  // Stats
  const stats = [
    { value: "10K+", label: "Resumes Created" },
    { value: "94%", label: "Interview Rate" },
    { value: "2 min", label: "Average Build Time" },
    { value: "4.9/5", label: "User Rating" }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <FileCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Resumakr</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to={createPageUrl("Pricing")} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to={createPageUrl("Help")} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Help
              </Link>
              {user ? (
                <Button onClick={handlePrimaryCTA} className="bg-blue-600 hover:bg-blue-700">
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Button onClick={handlePrimaryCTA} className="bg-blue-600 hover:bg-blue-700">
                    Get Started Free
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button onClick={handlePrimaryCTA} size="sm" className="bg-blue-600 hover:bg-blue-700">
                {user ? "Dashboard" : "Get Started"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Resume Builder
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">
              Everything You Need to Build the Perfect Resume.
              <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Nothing You Don't.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Create a standout resume in minutes, not hours. Our AI helps you write compelling content
              that gets past ATS filters and impresses recruiters.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={handlePrimaryCTA}
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
              >
                {user ? "Go to My Resumes" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {!user && (
                <Button
                  onClick={handleSecondaryCTA}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-6 border-2"
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>ATS-optimized templates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Export in multiple formats</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-500 dark:text-slate-400">
                    Resumakr - Resume Builder
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left side - Form preview */}
                    <div className="space-y-4">
                      <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-24 bg-blue-200 dark:bg-blue-800 rounded" />
                            <div className="h-3 w-full bg-blue-100 dark:bg-blue-900 rounded" />
                            <div className="h-3 w-2/3 bg-blue-100 dark:bg-blue-900 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Right side - Resume preview */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                      <div className="space-y-4">
                        <div className="h-6 w-40 bg-slate-800 dark:bg-slate-200 rounded" />
                        <div className="h-3 w-32 bg-slate-300 dark:bg-slate-600 rounded" />
                        <div className="border-b border-slate-200 dark:border-slate-700 my-4" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-slate-400 dark:bg-slate-500 rounded" />
                          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-16 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Stop Getting Filtered Out
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              75% of resumes are rejected by ATS before a human ever sees them.
              Resumakr ensures yours makes it through—and stands out when it does.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-lg">✗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">The Old Way</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Staring at a blank document, guessing what recruiters want, hoping your format doesn't break</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">The Resumakr Way</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">AI-guided content, ATS-tested templates, and expert formatting—all in minutes</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
                <BarChart3 className="w-12 h-12 mb-4 opacity-80" />
                <h3 className="text-2xl font-bold mb-2">94% Interview Rate</h3>
                <p className="opacity-90">
                  Users who complete their resume with Resumakr's AI suggestions report
                  significantly higher callback rates compared to DIY resumes.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Features That Actually Matter
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              No bloat. No confusion. Just the tools you need to create a resume that gets results.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Three Steps to Your Perfect Resume
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              No complicated setup. No learning curve. Just results.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800" />
                )}
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                    STEP {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Trusted by Job Seekers Worldwide
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Real stories from people who landed their dream jobs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {testimonial.role} • {testimonial.company}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-center text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Land Your Dream Job?
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of professionals who've transformed their job search with Resumakr.
                Start building your perfect resume today.
              </p>
              <Button
                onClick={handlePrimaryCTA}
                size="lg"
                className="bg-white text-blue-600 hover:bg-slate-100 text-lg px-8 py-6 shadow-lg"
              >
                {user ? "Go to My Resumes" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {!user && (
                <p className="text-sm opacity-75 mt-4">
                  No credit card required • Free to start
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <FileCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">Resumakr</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">
                Everything you need to build the perfect resume. Nothing you don't.
                AI-powered, ATS-optimized, and designed for results.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to={createPageUrl("Pricing")} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to={createPageUrl("Help")} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                {user ? (
                  <>
                    <li><Link to={createPageUrl("MyResumes")} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">My Resumes</Link></li>
                    <li><Link to={createPageUrl("AccountSettings")} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Settings</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link></li>
                    <li><Link to="/signup" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Create Account</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Resumakr. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>Built with privacy in mind</span>
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
