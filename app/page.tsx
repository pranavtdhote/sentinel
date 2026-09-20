'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Database,
  Cloud,
  FileText,
  Search,
  CheckCircle2,
  Terminal,
  Clock,
  Layers,
  Sparkles,
  Lock,
  GitBranch,
  ChevronDown,
  AlertTriangle,
  Radio,
  Users,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api/safeFetch';

export default function LandingPage() {
  const [awsConnected, setAwsConnected] = useState<boolean>(false);
  const [region, setRegion] = useState<string>('us-east-1');

  useEffect(() => {
    safeFetchJson<any>('/api/health')
      .then((res) => {
        if (res.ok && res.data?.aws?.isConfigured) {
          setAwsConnected(true);
          if (res.data.aws.region) setRegion(res.data.aws.region);
        }
      })
      .catch(() => setAwsConnected(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-primary selection:bg-amber-accent/30 selection:text-ink-primary font-sans">
      {/* Top Brand Navbar */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-surface-border transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xs bg-ink-primary flex items-center justify-center text-amber-accent font-bold font-mono-tech text-base shadow-sm">
              S
            </div>
            <div>
              <span className="font-bold tracking-tight text-ink-primary text-base font-sans">
                SENTINEL
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-surface-subtle text-ink-secondary border border-surface-border uppercase">
                AI Incident Intelligence
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-mono-tech text-ink-secondary">
            <a href="#how-it-works" className="hover:text-ink-primary transition-colors">
              HOW IT WORKS
            </a>
            <a href="#ai-intelligence" className="hover:text-ink-primary transition-colors">
              INTELLIGENCE
            </a>
            <a href="#architecture" className="hover:text-ink-primary transition-colors">
              AWS ARCHITECTURE
            </a>
            <a href="#security" className="hover:text-ink-primary transition-colors">
              SAFETY & HITL
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-surface-border text-[11px] font-mono-tech text-ink-secondary">
              <span className={`w-2 h-2 rounded-full ${awsConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-accent'}`} />
              <span>{awsConnected ? `AWS Connected (${region})` : 'Sandbox Active'}</span>
            </div>

            <Link
              href="/login?returnTo=/dashboard"
              className="px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-bold rounded-xs shadow-pleurat-button transition-editorial flex items-center space-x-1.5"
            >
              <span>Launch Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="pt-16 pb-20 border-b border-surface-border relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-light border border-amber-accent/40 font-mono-tech text-xs text-amber-900">
                <Radio className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                <span>Autonomous Incident Intelligence & Real-Time Response</span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-primary font-sans leading-[1.1]"
              >
                AI Incident Intelligence,{' '}
                <span className="text-amber-800 block sm:inline">
                  Built for Real-Time Response.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-ink-secondary text-base sm:text-lg leading-relaxed max-w-2xl font-sans"
              >
                Sentinel transforms operational incidents into grounded, explainable response workflows using AI, real-time knowledge, and human-controlled automation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap items-center gap-4 pt-2"
              >
                <Link
                  href="/login?returnTo=/dashboard"
                  className="px-6 py-3 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs sm:text-sm font-bold rounded-xs shadow-pleurat-button transition-editorial flex items-center space-x-2"
                >
                  <span>Launch Demo / Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="px-6 py-3 bg-canvas border border-surface-border hover:bg-surface-subtle text-ink-primary font-mono-tech text-xs sm:text-sm font-medium rounded-xs transition-editorial flex items-center space-x-2"
                >
                  <span>Explore How Sentinel Works</span>
                  <ChevronDown className="w-4 h-4 text-ink-tertiary" />
                </a>
              </motion.div>

              <div className="pt-4 flex items-center space-x-6 text-xs font-mono-tech text-ink-tertiary">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Human Approval Enforced</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Bedrock Vector Citations</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual: Animated Incident Command Pipeline */}
            <div className="lg:col-span-5">
              <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1 space-y-3">
                <div className="flex items-center justify-between border-b border-surface-border pb-3 font-mono-tech text-xs text-ink-tertiary">
                  <span className="font-bold text-ink-primary">RESPONSE WORKFLOW</span>
                  <span className="text-amber-800">AUTOMATED PIPELINE</span>
                </div>

                {/* Workflow sequence pills */}
                {[
                  { label: 'Incident Ingestion', detail: 'CloudWatch alarm or SRE report', icon: AlertTriangle, color: 'text-danger' },
                  { label: 'AI Triage & Classification', detail: 'Severity, category & SLA calculation', icon: Sparkles, color: 'text-amber-700' },
                  { label: 'Knowledge Retrieval', detail: 'S3 runbooks & historical postmortems', icon: Search, color: 'text-blue-700' },
                  { label: 'Root Cause Hypothesis', detail: 'Evidence-grounded diagnostic hypothesis', icon: Terminal, color: 'text-purple-700' },
                  { label: 'Remediation Action Plan', detail: 'Ordered steps with blast radius assessment', icon: Layers, color: 'text-amber-800' },
                  { label: 'Human Approval Gate', detail: 'Cryptographic HMAC commander sign-off', icon: ShieldCheck, color: 'text-emerald-700' },
                  { label: 'Autonomous Resolution', detail: 'Verification & S3 retrospective synthesis', icon: CheckCircle2, color: 'text-emerald-700' },
                ].map((step, idx, arr) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="space-y-1.5">
                      <div className="p-2.5 rounded bg-surface-subtle/70 border border-surface-border flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-1.5 rounded bg-canvas border border-surface-border ${step.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold font-sans text-ink-primary">
                              {step.label}
                            </div>
                            <div className="text-[11px] font-mono-tech text-ink-tertiary">
                              {step.detail}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-tech text-[10px] text-ink-tertiary">
                          0{idx + 1}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="h-2 w-px bg-surface-border mx-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE PROBLEM */}
      <section className="py-20 border-b border-surface-border bg-surface-subtle/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-4 mb-12">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Operational Fragility
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              Incidents move faster than teams.
            </h2>
            <p className="text-ink-secondary text-sm sm:text-base leading-relaxed font-sans">
              When production degrades, engineers juggle fragmented Slack threads, obsolete runbooks, and uncoordinated triage steps while downtime costs accumulate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Fragmented Telemetry',
                desc: 'Alarms span CloudWatch, Datadog, and ECS clusters with zero unified narrative for root cause.',
                tag: 'SILOED DATA',
              },
              {
                title: 'Slow Manual Triage',
                desc: 'On-call responders spend 15 to 30 minutes just locating the right SOP and historical resolution.',
                tag: 'HIGH MTTR',
              },
              {
                title: 'Undocumented Decisions',
                desc: 'Ad-hoc terminal fixes executed during outages vanish without an audit trail or institutional learning.',
                tag: 'LOST CONTEXT',
              },
              {
                title: 'Repeated Incidents',
                desc: 'Identical connection pool exhaustion and gateway timeouts recur because postmortems sit unindexed.',
                tag: 'RECURRING OUTAGES',
              },
              {
                title: 'Unvetted AI Hallucinations',
                desc: 'Generic LLMs recommend risky infrastructure commands with zero blast radius verification.',
                tag: 'SAFETY RISK',
              },
              {
                title: 'Knowledge Scattered Across Systems',
                desc: 'Critical architectural documentation remains trapped across Confluence, GitHub, and Google Docs.',
                tag: 'OBSOLETE RUNBOOKS',
              },
            ].map((prob) => (
              <div
                key={prob.title}
                className="bg-canvas border border-surface-border rounded-sm p-5 space-y-2 hover:border-amber-accent/50 transition-colors"
              >
                <span className="font-mono-tech text-[10px] text-amber-900 bg-amber-accent/15 px-2 py-0.5 rounded font-bold">
                  {prob.tag}
                </span>
                <h3 className="text-base font-bold text-ink-primary font-sans pt-1">
                  {prob.title}
                </h3>
                <p className="text-xs text-ink-secondary font-sans leading-relaxed">
                  {prob.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW SENTINEL WORKS (6-Step Sequence) */}
      <section id="how-it-works" className="py-20 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Architecture Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              How Sentinel Works
            </h2>
            <p className="text-ink-secondary text-sm font-sans">
              A deterministic, six-stage operational loop transforming raw alarms into verified resolutions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Detect',
                desc: 'Ingests CloudWatch alarms, error telemetry, or manual commander reports instantly.',
                icon: AlertTriangle,
              },
              {
                step: '02',
                title: 'Understand',
                desc: 'Bedrock classifies incident severity (SEV1-SEV4), category, and computes SLA deadlines.',
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Retrieve',
                desc: 'Performs semantic vector search across S3 runbooks, SOPs, and past postmortems.',
                icon: Search,
              },
              {
                step: '04',
                title: 'Recommend',
                desc: 'Formulates an ordered action plan with blast radius risk assessment for each step.',
                icon: Layers,
              },
              {
                step: '05',
                title: 'Approve',
                desc: 'Incident commander signs off high-impact actions via HMAC cryptographic authorization.',
                icon: ShieldCheck,
              },
              {
                step: '06',
                title: 'Resolve',
                desc: 'Executes approved remediation, verifies telemetry, and automatically persists S3 postmortems.',
                icon: CheckCircle2,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-canvas border border-surface-border rounded-sm p-6 relative hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono-tech text-xl font-bold text-amber-800">
                      {item.step}
                    </span>
                    <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-ink-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-ink-primary font-sans mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-secondary font-sans leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — AI INCIDENT INTELLIGENCE (Realistic UI Preview) */}
      <section id="ai-intelligence" className="py-20 border-b border-surface-border bg-surface-subtle/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
                Intelligent Synthesis
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
                Explainable AI analysis, not black-box predictions.
              </h2>
              <p className="text-ink-secondary text-sm font-sans leading-relaxed">
                Sentinel presents clear severity classifications, root cause hypotheses, and verified evidence excerpts so commanders can make informed, fast decisions.
              </p>
              <div className="space-y-2 pt-2 text-xs font-mono-tech text-ink-secondary">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>No internal chain-of-thought exposure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Grounding confidence percentages</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Direct citation links to runbooks</span>
                </div>
              </div>
            </div>

            {/* UI Preview Card */}
            <div className="lg:col-span-7">
              <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1 space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border pb-3">
                  <div className="flex items-center space-x-2 font-mono-tech text-xs">
                    <span className="bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-xs font-bold">
                      SEV1 · CRITICAL
                    </span>
                    <span className="text-ink-tertiary">INC-2026-0917-01</span>
                  </div>
                  <span className="font-mono-tech text-xs text-amber-800 font-bold">
                    92% CONFIDENCE
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="font-mono-tech text-[10px] text-ink-tertiary uppercase">
                    Root Cause Hypothesis
                  </div>
                  <p className="text-xs font-sans text-ink-primary bg-amber-light/60 p-3 rounded border border-amber-accent/30 leading-relaxed">
                    Exhaustion of Aurora PostgreSQL connection pool triggered by unindexed batch query in payment-service v2.14.0 release.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="font-mono-tech text-[10px] text-ink-tertiary uppercase">
                    Retrieved Runbook Evidence
                  </div>
                  <div className="p-3 bg-surface-subtle rounded border border-surface-border text-xs font-sans space-y-1">
                    <div className="flex items-center justify-between font-mono-tech text-[11px] text-ink-secondary">
                      <span className="font-bold text-ink-primary">SOP-AURORA-POOL-09.md</span>
                      <span className="text-emerald-700">96% MATCH</span>
                    </div>
                    <p className="text-ink-secondary text-[11px] italic">
                      &ldquo;When pool wait exceeds 5000ms, increase max_connections or rollback ECS task definition to previous stable revision.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-surface-border font-mono-tech text-xs">
                  <span className="text-ink-tertiary">SLA TARGET: &lt; 15 MINUTES</span>
                  <Link
                    href="/dashboard"
                    className="text-amber-800 hover:underline flex items-center space-x-1 font-bold"
                  >
                    <span>Test In Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — GROUNDED AI (RAG Workflow) */}
      <section className="py-20 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Knowledge Grounding
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              Grounded in Evidence, Not Assumptions
            </h2>
            <p className="text-ink-secondary text-sm font-sans">
              Bedrock Knowledge Bases continuously index enterprise SOPs, historical incident postmortems, and architecture policies stored securely in S3.
            </p>
          </div>

          <div className="bg-canvas border border-surface-border rounded-sm p-8 max-w-4xl mx-auto shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center font-mono-tech text-xs text-center">
              <div className="p-4 bg-surface-subtle rounded border border-surface-border space-y-1">
                <FileText className="w-5 h-5 mx-auto text-ink-primary" />
                <div className="font-bold text-ink-primary">Alarm Ingest</div>
                <div className="text-[10px] text-ink-tertiary">Incident Query</div>
              </div>

              <div className="text-amber-800 font-bold hidden md:block">→</div>

              <div className="p-4 bg-amber-accent/15 rounded border border-amber-accent/40 space-y-1">
                <Database className="w-5 h-5 mx-auto text-amber-800" />
                <div className="font-bold text-ink-primary">Bedrock KB</div>
                <div className="text-[10px] text-amber-900">Vector Retrieval</div>
              </div>

              <div className="text-amber-800 font-bold hidden md:block">→</div>

              <div className="p-4 bg-emerald-500/10 rounded border border-emerald-500/30 space-y-1">
                <ShieldCheck className="w-5 h-5 mx-auto text-emerald-700" />
                <div className="font-bold text-ink-primary">Grounded Plan</div>
                <div className="text-[10px] text-emerald-800">Citations & Actions</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-surface-border text-center text-xs text-ink-secondary font-sans max-w-xl mx-auto">
              Every remediation proposal references specific runbook chunk IDs, eliminating hallucinated commands and aligning response with organization standards.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — HUMAN-IN-THE-LOOP */}
      <section id="security" className="py-20 border-b border-surface-border bg-surface-subtle/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
                Controlled Automation
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
                Human-in-the-loop by design.
              </h2>
              <p className="text-ink-secondary text-sm sm:text-base font-sans leading-relaxed">
                Autonomous actions are powerful, but high-impact operations require verified human authorization. Sentinel enforces cryptographic sign-offs on any action affecting customer traffic or database state.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'AI Formulates', desc: 'Bedrock evaluates blast radius and orders remediation steps.' },
                  { title: 'Human Evaluates', desc: 'Incident Commander reviews blast radius detail and expected impact.' },
                  { title: 'Cryptographic Sign-Off', desc: 'HMAC signature confirms identity before AWS API execution.' },
                  { title: 'Audited Execution', desc: 'Action runs via tool allowlisting with full CloudWatch logging.' },
                ].map((item, idx) => (
                  <div key={item.title} className="flex items-start space-x-3 text-xs font-sans">
                    <div className="w-5 h-5 rounded-full bg-amber-accent/20 text-amber-900 font-mono-tech text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <strong className="text-ink-primary">{item.title}:</strong>{' '}
                      <span className="text-ink-secondary">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1 space-y-4 font-mono-tech text-xs">
                <div className="flex items-center justify-between border-b border-surface-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-amber-800" />
                    <span className="font-bold text-ink-primary">AUTHORIZATION GATE</span>
                  </div>
                  <span className="text-emerald-700 font-bold text-[10px]">ENFORCED</span>
                </div>

                <div className="p-3 bg-surface-subtle rounded border border-surface-border space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-ink-tertiary">PROPOSED ACTION:</span>
                    <span className="text-ink-primary font-bold">Rollback ECS Task Definition</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-tertiary">BLAST RADIUS:</span>
                    <span className="text-amber-800 font-bold">MEDIUM (Service Restart)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-tertiary">APPROVER:</span>
                    <span className="text-ink-primary">prana@sentinel.internal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-tertiary">SIGNATURE:</span>
                    <span className="text-ink-secondary truncate max-w-[180px]">sha256:7f4a0c8b91e...</span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-block px-4 py-2 bg-amber-accent hover:bg-amber-hover text-ink-primary font-bold rounded-xs shadow-pleurat-button text-xs"
                  >
                    View Approval Gate in Action
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — OPERATIONS COMMAND CENTER PREVIEW */}
      <section className="py-20 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Single Pane of Glass
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              Operations Command Center
            </h2>
            <p className="text-ink-secondary text-sm font-sans">
              Monitor active outages, SLA countdowns, and real-time Bedrock remediations from one unified console.
            </p>
          </div>

          <div className="bg-canvas border border-surface-border rounded-sm p-6 shadow-pleurat-1 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-tech text-xs">
              <div className="p-3 bg-surface-subtle rounded border border-surface-border">
                <div className="text-[10px] text-ink-tertiary uppercase">ACTIVE INCIDENTS</div>
                <div className="text-2xl font-bold text-ink-primary mt-1 font-sans">2</div>
                <div className="text-[10px] text-amber-800 mt-1">1 SEV-1 active</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-surface-border">
                <div className="text-[10px] text-ink-tertiary uppercase">SLA COMPLIANCE</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1 font-sans">99.4%</div>
                <div className="text-[10px] text-ink-secondary mt-1">&lt; 15m MTTR</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-surface-border">
                <div className="text-[10px] text-ink-tertiary uppercase">AVG RESOLUTION</div>
                <div className="text-2xl font-bold text-ink-primary mt-1 font-sans">4.6m</div>
                <div className="text-[10px] text-emerald-700 mt-1">-68% vs manual</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-surface-border">
                <div className="text-[10px] text-ink-tertiary uppercase">BEDROCK RUNBOOKS</div>
                <div className="text-2xl font-bold text-ink-primary mt-1 font-sans">18</div>
                <div className="text-[10px] text-ink-secondary mt-1">Vector indexed</div>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs sm:text-sm font-bold rounded-xs shadow-pleurat-button flex items-center space-x-2"
              >
                <span>Launch Live Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — AWS ARCHITECTURE */}
      <section id="architecture" className="py-20 border-b border-surface-border bg-surface-subtle/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Infrastructure Blueprint
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              Cloud-Native AWS Serverless Architecture
            </h2>
            <p className="text-ink-secondary text-sm font-sans">
              Engineered with modern AWS primitives for zero-idle cost, high resiliency, and deterministic security.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono-tech text-xs text-center">
            {[
              { name: 'Next.js Frontend', desc: 'App Router & UI', icon: Terminal },
              { name: 'Amazon Cognito', desc: 'RBAC & Identity', icon: Lock },
              { name: 'API Gateway', desc: 'HTTP Proxy & Auth', icon: Radio },
              { name: 'AWS Lambda', desc: 'Serverless Compute', icon: Zap },
              { name: 'DynamoDB', desc: 'Single-Table Store', icon: Database },
              { name: 'Amazon Bedrock', desc: 'Claude 3.5 Sonnet', icon: Cpu },
              { name: 'Bedrock KB', desc: 'Titan Embeddings & S3', icon: Search },
              { name: 'EventBridge', desc: 'Telemetry Bus', icon: Cloud },
              { name: 'Amazon SNS', desc: 'Incident Broadcast', icon: Activity },
              { name: 'CloudWatch', desc: 'Alarms & Logs', icon: Clock },
              { name: 'Amazon S3', desc: 'Postmortems & SOPs', icon: FileText },
              { name: 'IAM / RCPs', desc: 'Least Privilege', icon: ShieldCheck },
            ].map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.name}
                  className="bg-canvas border border-surface-border rounded-sm p-4 space-y-2 hover:border-amber-accent/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border mx-auto flex items-center justify-center text-ink-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-ink-primary font-sans text-xs">{srv.name}</div>
                  <div className="text-[10px] text-ink-tertiary">{srv.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 9 — SECURITY & GOVERNANCE */}
      <section className="py-20 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
              Enterprise Safety
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary font-sans">
              Built for Strict Enterprise Governance
            </h2>
            <p className="text-ink-secondary text-sm font-sans">
              Preventing unauthorized executions, prompt injections, and data leakage across production environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Human Approval Required',
                desc: 'Destructive commands are physically gated until an authorized commander provides HMAC approval.',
                icon: ShieldCheck,
              },
              {
                title: 'Strict RBAC',
                desc: 'Fine-grained permissions differentiating Viewers, Responders, and Incident Commanders.',
                icon: Users,
              },
              {
                title: 'Immutable Audit Trail',
                desc: 'Every triage assessment, evidence retrieval, and operator sign-off is logged to DynamoDB and S3.',
                icon: FileText,
              },
              {
                title: 'Prompt Injection Defense',
                desc: 'All user telemetry is sanitised before invocation, preventing prompt override attacks.',
                icon: Shield,
              },
              {
                title: 'Tool Allowlisting',
                desc: 'Bedrock functions can only invoke explicitly allowlisted, predefined serverless tools.',
                icon: Terminal,
              },
              {
                title: 'Versioned State Machine',
                desc: 'Optimistic locking prevents race conditions when multiple engineers respond simultaneously.',
                icon: GitBranch,
              },
            ].map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.title}
                  className="bg-canvas border border-surface-border rounded-sm p-6 space-y-3 hover:shadow-sm transition-all"
                >
                  <div className="w-8 h-8 rounded bg-amber-accent/15 border border-amber-accent/30 flex items-center justify-center text-amber-900">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-ink-primary font-sans">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-ink-secondary font-sans leading-relaxed">
                    {sec.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 10 — FINAL CTA & FOOTER */}
      <section className="py-24 bg-surface-subtle/50 text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <span className="font-mono-tech text-xs text-amber-800 font-bold uppercase tracking-wider">
            Transform Your Operations
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-primary font-sans">
            Turn every incident into institutional knowledge.
          </h2>
          <p className="text-ink-secondary text-base font-sans max-w-xl mx-auto">
            Experience real-time AI incident intelligence with deterministic safety guarantees.
          </p>
          <div className="pt-4 flex justify-center">
            <Link
              href="/login?returnTo=/dashboard"
              className="px-8 py-4 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-sm font-bold rounded-xs shadow-pleurat-button transition-editorial flex items-center space-x-2"
            >
              <span>Launch Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border py-12 bg-canvas font-mono-tech text-xs text-ink-secondary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-xs bg-ink-primary text-amber-accent font-bold flex items-center justify-center text-xs">
              S
            </div>
            <div>
              <span className="font-bold text-ink-primary">SENTINEL</span>
              <span className="text-ink-tertiary ml-2">AI Incident Intelligence Platform</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="hover:text-ink-primary transition-colors">
              Command Center
            </Link>
            <Link href="/incidents" className="hover:text-ink-primary transition-colors">
              Incidents
            </Link>
            <Link href="/analytics" className="hover:text-ink-primary transition-colors">
              Analytics
            </Link>
            <Link href="/knowledge" className="hover:text-ink-primary transition-colors">
              Knowledge Base
            </Link>
            <Link href="/settings" className="hover:text-ink-primary transition-colors">
              Settings
            </Link>
          </div>

          <div className="text-[10px] text-ink-tertiary">
            © 2026 Sentinel · AWS Production Hackathon Ready
          </div>
        </div>
      </footer>
    </div>
  );
}
