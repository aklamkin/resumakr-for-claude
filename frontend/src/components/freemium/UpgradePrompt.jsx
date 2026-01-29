import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Crown, Sparkles, Lock, Zap } from 'lucide-react';

/**
 * Inline upgrade prompt - used in place of locked features
 */
export function UpgradePrompt({ feature, message, compact = false }) {
  const navigate = useNavigate();

  const featureMessages = {
    coverLetters: 'Cover letter generation is a premium feature.',
    versionHistory: 'Version history is a premium feature.',
    resumeParsing: 'AI resume parsing is a premium feature.',
    premiumTemplates: 'This template is only available to premium users.',
    atsDetailedInsights: 'Detailed ATS insights are a premium feature.',
    aiCredits: 'You\'ve used all your free AI credits.',
    pdfDownloads: 'You\'ve reached your monthly PDF download limit.',
  };

  const displayMessage = message || featureMessages[feature] || 'This feature requires a premium subscription.';

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-amber-800 flex-1">{displayMessage}</span>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Crown className="h-5 w-5" />
          Premium Feature
        </CardTitle>
        <CardDescription className="text-amber-700">
          {displayMessage}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => navigate('/pricing')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * AI Credits remaining indicator
 */
export function AiCreditsIndicator({ credits, compact = false }) {
  const navigate = useNavigate();

  if (!credits || credits.total === 999999) {
    // Paid user - don't show indicator
    return null;
  }

  const remaining = credits.remaining;
  const total = credits.total;
  const isLow = remaining <= 2;
  const isExhausted = remaining <= 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
        isExhausted ? 'bg-red-100 text-red-700' :
        isLow ? 'bg-amber-100 text-amber-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        <Zap className="h-3 w-3" />
        <span>{remaining}/{total} AI credits</span>
      </div>
    );
  }

  if (isExhausted) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <Zap className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">AI Credits Exhausted</AlertTitle>
        <AlertDescription className="text-red-700">
          You've used all {total} AI credits. Upgrade for unlimited AI assistance.
          <Button
            variant="link"
            className="p-0 h-auto text-red-700 underline ml-1"
            onClick={() => navigate('/pricing')}
          >
            Upgrade now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLow) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Zap className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Low AI Credits</AlertTitle>
        <AlertDescription className="text-amber-700">
          You have {remaining} AI credit{remaining !== 1 ? 's' : ''} remaining.
          <Button
            variant="link"
            className="p-0 h-auto text-amber-700 underline ml-1"
            onClick={() => navigate('/pricing')}
          >
            Upgrade for unlimited
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Feature gate wrapper - shows children if feature is available, otherwise shows upgrade prompt
 */
export function FeatureGate({ feature, children, fallback }) {
  // This would typically use useAuth() to check feature access
  // For now, we'll accept an `allowed` prop or check in the parent
  return children;
}

/**
 * Premium badge to indicate a feature requires upgrade
 */
export function PremiumBadge({ small = false }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full ${
      small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
    }`}>
      <Crown className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {!small && 'Premium'}
    </span>
  );
}

/**
 * Template lock overlay for premium templates
 */
export function TemplateLockOverlay({ onUpgrade }) {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg">
      <Lock className="h-8 w-8 text-white mb-2" />
      <span className="text-white text-sm font-medium mb-3">Premium Template</span>
      <Button
        size="sm"
        onClick={onUpgrade}
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
      >
        <Crown className="h-3.5 w-3.5 mr-1.5" />
        Unlock
      </Button>
    </div>
  );
}

export default UpgradePrompt;
