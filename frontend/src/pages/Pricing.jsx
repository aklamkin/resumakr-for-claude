import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import api from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle, Lock, CreditCard, Zap, Crown, Tag, X, Loader2, Rocket, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP = {
  Zap: Zap,
  Sparkles: Sparkles,
  Crown: Crown,
  Rocket: Rocket,
  Star: Star
};

const FALLBACK_PLANS = [
  {
    id: "weekly",
    plan_id: "weekly",
    name: "Weekly Plan",
    price: 6.49,
    period: "per week",
    duration: 7,
    icon_name: "Sparkles",
    color_from: "indigo-600",
    color_to: "indigo-700",
    is_popular: true,
    features: ["Unlimited resumes", "AI improvements", "Export formats"],
    order: 1
  }
];

const FALLBACK_FEATURES = [
  "Create unlimited resumes without restrictions",
  "AI-powered resume enhancements tailored to your goals",
  "Export in multiple professional formats",
  "ATS optimization to get past automated screening",
  "Cancel anytime with full access until period ends"
];

export default function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activating, setActivating] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const returnUrl = new URLSearchParams(location.search).get("returnUrl") || "MyResumes";

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => api.auth.me(),
    retry: false,
    enabled: !!localStorage.getItem('resumakr_token'),
    staleTime: 0
  });

  const { data: plans = FALLBACK_PLANS, isLoading: loadingPlans } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: async () => {
      const fetchedPlans = await api.entities.SubscriptionPlan.list();
      return fetchedPlans.length > 0 ? fetchedPlans : FALLBACK_PLANS;
    },
    staleTime: 0
  });

  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans.find(p => p.is_popular)?.plan_id || plans[0].plan_id);
    }
  }, [plans, selectedPlan]);

  const handlePlanSelect = async (planId) => {
    // Check if user is logged in
    if (!currentUser) {
      navigate('/login?returnUrl=Pricing');
      return;
    }

    setSelectedPlan(planId);
    setActivating(true);

    try {
      // Get the base URL from environment or current window location
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

      // Create Stripe Checkout session
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('resumakr_token')}`
        },
        body: JSON.stringify({
          plan_id: planId,
          coupon_code: null, // Coupons can be entered in Stripe Checkout
          success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/pricing?canceled=true`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout session:", err);
      alert(err.message || "Failed to start checkout. Please try again.");
      setActivating(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponError("");

    try {
      const response = await api.functions.validateCoupon(
        couponCode.trim(),
        selectedPlan
      );

      if (response.valid) {
        setAppliedCoupon(response.coupon);
        setCouponError("");
      } else {
        setCouponError(response.error || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponError("Failed to validate coupon");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const calculateFinalPrice = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    if (!plan) return { final: "0.00", original: "0.00" };

    let basePrice = parseFloat(plan.price);
    const originalPrice = basePrice;

    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        basePrice = basePrice * (1 - appliedCoupon.discount_value / 100);
      } else {
        basePrice = Math.max(0, basePrice - appliedCoupon.discount_value);
      }
    }

    return { final: basePrice.toFixed(2), original: originalPrice.toFixed(2) };
  };

  const calculateSubscriptionDates = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    return { startDate, endDate };
  };

  const handleActivateSubscription = async () => {
    // Check if user is logged in
    if (!currentUser) {
      navigate('/login?returnUrl=Pricing');
      return;
    }

    setActivating(true);
    try {
      // Get the base URL from environment or current window location
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

      // Create Stripe Checkout session
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('resumakr_token')}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan,
          coupon_code: appliedCoupon?.code || null,
          success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/pricing?canceled=true`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout session:", err);
      alert(err.message || "Failed to start checkout. Please try again.");
      setActivating(false);
    }
  };
  const getAllFeatures = () => {
    const allFeatures = new Set();
    plans.forEach(plan => {
      if (plan.features && plan.features.length > 0) {
        plan.features.forEach(f => allFeatures.add(f));
      }
    });

    return allFeatures.size > 0 ? Array.from(allFeatures) : FALLBACK_FEATURES;
  };

  const selectedPlanDetails = plans.find(p => p.plan_id === selectedPlan);

  if (loadingUser || loadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isSubscribed = currentUser?.is_subscribed && 
    currentUser?.subscription_end_date && 
    new Date(currentUser.subscription_end_date) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            {isSubscribed ? "Change Your Plan" : "Subscription Required"}
          </div>

          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {isSubscribed ? "Change Your Plan" : "Choose Your Plan"}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get unlimited access to all Resumakr features. Cancel anytime.
          </p>
        </motion.div>

        {!showPaymentForm ? (
          <>
            <div className={`grid gap-6 mb-12 ${
              plans.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
              plans.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' :
              'md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {plans.map((plan, index) => {
                const isCurrentPlan = isSubscribed && currentUser?.subscription_plan === plan.plan_id;
                const IconComponent = ICON_MAP[plan.icon_name] || Sparkles;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex"
                  >
                    <Card className={`relative p-6 border-2 bg-white dark:bg-slate-800 w-full ${
                      isCurrentPlan
                        ? "border-green-500 dark:border-green-400 shadow-xl"
                        : plan.is_popular
                        ? "border-indigo-500 dark:border-indigo-400 shadow-xl"
                        : "border-slate-200 dark:border-slate-700"
                    } hover:shadow-2xl transition-all duration-300`}>
                      {isCurrentPlan && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="bg-green-600 dark:bg-green-500 text-white px-4 py-1">
                            Current Plan
                          </Badge>
                        </div>
                      )}
                      {!isCurrentPlan && plan.is_popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <Badge className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-1">
                            {plan.badge_text || "Most Popular"}
                          </Badge>
                        </div>
                      )}
                      {!isCurrentPlan && !plan.is_popular && plan.badge_text && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-1">
                            {plan.badge_text}
                          </Badge>
                        </div>
                      )}

                      <div className={`w-12 h-12 bg-gradient-to-br from-${plan.color_from} to-${plan.color_to} rounded-xl flex items-center justify-center mb-4`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">${plan.price}</span>
                        <span className="text-slate-600 dark:text-slate-400">{plan.period}</span>
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Access for {plan.duration} days
                      </p>

                      <Button
                        onClick={() => handlePlanSelect(plan.plan_id)}
                        disabled={isCurrentPlan}
                        className={`w-full ${
                          isCurrentPlan
                            ? "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
                            : plan.is_popular || plan.badge_text
                            ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            : "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700"
                        }`}
                      >
                        {isCurrentPlan ? "Current Plan" : (plan.ai_generated_content?.cta_text || "Select Plan")}
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
                  Everything You Need to Build the Perfect Resume
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {getAllFeatures().map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-center"
            >
              <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                  <strong>100% Transparent:</strong> All plans auto-renew for your convenience.
                  You can cancel anytime from your account settings. Cancellation takes effect at the
                  end of your current billing cycle, so you get full value from your subscription.
                  No partial refunds, but you'll have access until your paid period ends.
                </p>
              </Card>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className={`w-12 h-12 bg-gradient-to-br from-${selectedPlanDetails.color_from} to-${selectedPlanDetails.color_to} rounded-xl flex items-center justify-center`}>
                  {React.createElement(ICON_MAP[selectedPlanDetails.icon_name] || Sparkles, { className: "w-6 h-6 text-white" })}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedPlanDetails.name}</h2>
                  <p className="text-slate-600 dark:text-slate-400">${selectedPlanDetails.price} {selectedPlanDetails.period}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPaymentForm(false);
                    handleRemoveCoupon();
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Change Plan
                </Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">Have a coupon code?</span>
                  </div>
                  
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="font-mono uppercase bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleValidateCoupon();
                          }
                        }}
                      />
                      <Button
                        onClick={handleValidateCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      >
                        {validatingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-mono font-bold text-green-900 dark:text-green-100">{appliedCoupon.code}</p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {appliedCoupon.discount_type === 'percentage' 
                              ? `${appliedCoupon.discount_value}% off` 
                              : `$${appliedCoupon.discount_value} off`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {couponError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-600 dark:text-red-400 mt-2"
                      >
                        {couponError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {appliedCoupon && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Original Price:</span>
                        <span className="line-through">${selectedPlanDetails.price}</span>
                      </div>
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                        <span>Coupon Discount:</span>
                        <span>
                          -{appliedCoupon.discount_type === 'percentage'
                            ? `${appliedCoupon.discount_value}%`
                            : `$${appliedCoupon.discount_value}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span>Final Price:</span>
                        <span className="text-green-600 dark:text-green-400">${calculateFinalPrice(selectedPlan).final}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={handleActivateSubscription}
                    disabled={activating}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white text-lg py-6"
                  >
                    {activating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Continue to Payment
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                    Secure payment powered by Stripe
                  </p>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-4">
                  By subscribing, you agree to our terms of service. Your subscription will be active 
                  for {selectedPlanDetails.duration} days starting today.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}