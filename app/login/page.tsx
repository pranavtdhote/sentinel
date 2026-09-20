'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState<string>('demo@sentinel.ai');
  const [password, setPassword] = useState<string>('Sentinel2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Validate returnTo URL against open-redirect vulnerabilities
  const rawReturnTo = searchParams.get('returnTo');
  const getSafeReturnUrl = (url: string | null): string => {
    if (!url) return '/dashboard';
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
      return url;
    }
    return '/dashboard';
  };
  const returnTo = getSafeReturnUrl(rawReturnTo);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace(returnTo);
    }
  }, [isAuthenticated, authLoading, router, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setError(result.error || 'Authentication failed. Please check your credentials.');
        setIsSubmitting(false);
      } else {
        router.replace(returnTo);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to Sentinel authentication service.');
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('Sentinel2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-primary flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-amber-accent/30 selection:text-ink-primary font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-at-t from-amber-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Top Brand & Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-3">
        <Link
          href="/"
          className="inline-flex items-center space-x-3 group hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xs bg-ink-primary flex items-center justify-center text-amber-accent font-bold font-mono text-lg shadow-pleurat-button border border-surface-border">
            S
          </div>
          <span className="font-extrabold tracking-tight text-ink-primary text-2xl font-sans">
            SENTINEL
          </span>
        </Link>
        <p className="text-xs font-mono text-ink-muted uppercase tracking-widest">
          AI Incident Intelligence & Autonomous Response
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-canvas border border-surface-border rounded-xs shadow-xl px-6 py-8 sm:px-10 space-y-6">
          <div className="border-b border-surface-border pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-primary font-sans">
                Operator Sign In
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                Authenticate with Amazon Cognito User Pool
              </p>
            </div>
            <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-mono font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>COGNITO</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xs bg-brand-critical/10 border border-brand-critical/30 text-brand-critical text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-mono uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Operator Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="commander@sentinel.internal"
                  className="w-full pl-9 pr-3 py-2 bg-surface-subtle border border-surface-border rounded-xs text-xs font-mono text-ink-primary placeholder:text-ink-tertiary focus:outline-hidden focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
                />
                <Mail className="w-4 h-4 text-ink-muted absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-mono uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-surface-subtle border border-surface-border rounded-xs text-xs font-mono text-ink-primary placeholder:text-ink-tertiary focus:outline-hidden focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
                />
                <Lock className="w-4 h-4 text-ink-muted absolute left-2.5 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono text-xs font-bold rounded-xs shadow-pleurat-button transition-editorial flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-ink-primary border-t-transparent rounded-full animate-spin" />
                  <span>AUTHENTICATING WITH COGNITO...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO SENTINEL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-surface-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider font-semibold">
                Hackathon Demo Roles (Pre-Provisioned)
              </span>
              <span className="text-[9px] font-mono text-amber-700 bg-amber-light px-1.5 py-0.2 rounded border border-amber-accent/30 font-bold">
                ONE-CLICK FILL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemoUser('demo@sentinel.ai', 'INCIDENT_COMMANDER')}
                className={`p-2 rounded-xs border text-left transition-colors cursor-pointer ${
                  email === 'demo@sentinel.ai'
                    ? 'border-brand-accent bg-amber-light/30'
                    : 'border-surface-border bg-surface-subtle hover:bg-surface-strong'
                }`}
              >
                <div className="text-[11px] font-bold text-ink-primary font-sans flex items-center justify-between">
                  <span>Commander</span>
                  {email === 'demo@sentinel.ai' && <CheckCircle2 className="w-3 h-3 text-amber-700" />}
                </div>
                <div className="text-[9px] font-mono text-ink-muted truncate">
                  demo@sentinel.ai
                </div>
                <div className="text-[8px] font-mono text-amber-800 mt-1 font-semibold">
                  Full Approval & Resolution
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser('responder@sentinel.ai', 'RESPONDER')}
                className={`p-2 rounded-xs border text-left transition-colors cursor-pointer ${
                  email === 'responder@sentinel.ai'
                    ? 'border-brand-accent bg-amber-light/30'
                    : 'border-surface-border bg-surface-subtle hover:bg-surface-strong'
                }`}
              >
                <div className="text-[11px] font-bold text-ink-primary font-sans flex items-center justify-between">
                  <span>Responder</span>
                  {email === 'responder@sentinel.ai' && <CheckCircle2 className="w-3 h-3 text-amber-700" />}
                </div>
                <div className="text-[9px] font-mono text-ink-muted truncate">
                  responder@sentinel.ai
                </div>
                <div className="text-[8px] font-mono text-ink-muted mt-1 font-semibold">
                  Triage & Investigation
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser('admin@sentinel.ai', 'ADMIN')}
                className={`p-2 rounded-xs border text-left transition-colors cursor-pointer ${
                  email === 'admin@sentinel.ai'
                    ? 'border-brand-accent bg-amber-light/30'
                    : 'border-surface-border bg-surface-subtle hover:bg-surface-strong'
                }`}
              >
                <div className="text-[11px] font-bold text-ink-primary font-sans flex items-center justify-between">
                  <span>Admin</span>
                  {email === 'admin@sentinel.ai' && <CheckCircle2 className="w-3 h-3 text-amber-700" />}
                </div>
                <div className="text-[9px] font-mono text-ink-muted truncate">
                  admin@sentinel.ai
                </div>
                <div className="text-[8px] font-mono text-ink-muted mt-1 font-semibold">
                  Full System Control
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser('viewer@sentinel.ai', 'VIEWER')}
                className={`p-2 rounded-xs border text-left transition-colors cursor-pointer ${
                  email === 'viewer@sentinel.ai'
                    ? 'border-brand-accent bg-amber-light/30'
                    : 'border-surface-border bg-surface-subtle hover:bg-surface-strong'
                }`}
              >
                <div className="text-[11px] font-bold text-ink-primary font-sans flex items-center justify-between">
                  <span>Viewer</span>
                  {email === 'viewer@sentinel.ai' && <CheckCircle2 className="w-3 h-3 text-amber-700" />}
                </div>
                <div className="text-[9px] font-mono text-ink-muted truncate">
                  viewer@sentinel.ai
                </div>
                <div className="text-[8px] font-mono text-brand-critical mt-1 font-semibold">
                  Read-Only (No Approvals)
                </div>
              </button>
            </div>
          </div>

          {/* Security Telemetry Details */}
          <div className="bg-surface-subtle rounded-xs p-2.5 border border-surface-border text-[10px] font-mono text-ink-muted space-y-1">
            <div className="flex items-center justify-between">
              <span>USER POOL:</span>
              <span className="text-ink-primary">us-east-1_Lz4flXPaw</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AUTH FLOW:</span>
              <span className="text-ink-primary">USER_PASSWORD_AUTH</span>
            </div>
            <div className="flex items-center justify-between">
              <span>TOKEN FORMAT:</span>
              <span className="text-ink-primary">RS256 JWT (OIDC)</span>
            </div>
          </div>
        </div>

        {/* Back to Public Landing Page Link */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs font-mono text-ink-muted hover:text-ink-primary transition-colors inline-flex items-center space-x-1"
          >
            <span>← Back to Sentinel Public Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
