'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavigationHeader } from '@/components/ui/NavigationHeader';
import { SchematicFlowDiagram } from '@/components/dashboard/SchematicFlowDiagram';
import { InteractiveWorkbench } from '@/components/dashboard/InteractiveWorkbench';
import { PillarsCarousel } from '@/components/dashboard/PillarsCarousel';
import { CircuitTelemetryBar } from '@/components/dashboard/CircuitTelemetryBar';
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview';
import { ArrowUpRight, Shield, Radio, Terminal, Cpu, Database } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>('workbench');
  const [isSandbox, setIsSandbox] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setIsSandbox(!data.aws?.isConfigured);
      })
      .catch(() => setIsSandbox(true));
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-primary">
      {/* Sticky Navigation Header */}
      <NavigationHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSandbox={isSandbox}
      />

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section (Matching Pleurat Shala Screenshot 1) */}
        <section className="pt-4 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Headline */}
            <div className="lg:col-span-8">
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-primary font-sans leading-[1.1]"
              >
                Autonomous incident intelligence,{' '}
                <span className="text-ink-tertiary block sm:inline font-normal">
                  and evidence-grounded response
                </span>
              </motion.h1>
            </div>

            {/* Right Supporting Text & Buttons */}
            <div className="lg:col-span-4 space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-ink-secondary text-sm sm:text-base leading-relaxed font-sans"
              >
                Built for mission-critical cloud infrastructure. Converting raw CloudWatch alarms and
                fragmented runbooks into deterministic, human-approved remediation powered by Amazon
                Bedrock and AWS serverless architecture.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center space-x-3"
              >
                <a
                  href="#workbench"
                  className="px-5 py-2.5 bg-amber-accent hover:bg-amber-hover text-ink-primary font-medium text-xs sm:text-sm rounded-xs shadow-pleurat-button transition-editorial flex items-center space-x-1.5"
                >
                  <span>Launch Workbench</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
                <a
                  href="/docs/ARCHITECTURE.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-canvas border border-surface-border hover:bg-surface-subtle text-ink-primary font-medium text-xs sm:text-sm rounded-xs transition-editorial flex items-center space-x-1.5"
                >
                  <span>System Spec</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </div>

          {/* Section Indicator Bar (Matching Screenshot 1) */}
          <div className="flex items-center justify-between border-t border-surface-border mt-12 pt-4 font-mono-tech text-xs text-ink-tertiary">
            <div className="flex items-center space-x-2">
              <span className="text-amber-700 font-bold">01</span>
              <span className="font-bold text-ink-primary">Sentinel</span>
              <span>AI Incident Intelligence & Autonomous Response</span>
            </div>
            <div className="hidden sm:block uppercase tracking-wider">
              AWS BEDROCK · DYNAMODB SINGLE-TABLE · HUMAN-IN-THE-LOOP
            </div>
          </div>
        </section>

        {/* Section 1: Schematic Architecture Workflow (Screenshot 1 Inspiration) */}
        <section id="flow">
          <SchematicFlowDiagram />
        </section>

        {/* Section 2: Core Operational Pillars (Screenshot 2 Inspiration) */}
        <section id="tracks">
          <PillarsCarousel />
        </section>

        {/* Section 3: The Live Incident Workbench (Heart of the Demo) */}
        <section id="workbench">
          <div className="mb-4">
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                WORKBENCH
              </span>
              <span className="text-ink-tertiary">LIVE SEV-1 SIMULATION ENVIRONMENT</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-primary font-sans">
              Incident Command Center
            </h2>
          </div>
          <InteractiveWorkbench />
        </section>

        {/* Section 4: Hardware Circuit Bus (Screenshot 3 Inspiration) */}
        <CircuitTelemetryBar />

        {/* Section 5: SRE Operational Analytics */}
        <section id="analytics">
          <AnalyticsOverview />
        </section>
      </main>

      {/* Footer (Matching Screenshot 3 Layout) */}
      <footer className="border-t border-surface-border bg-canvas pt-12 pb-16 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 font-mono-tech text-xs">
            <div>
              <div className="text-ink-tertiary uppercase tracking-wider mb-3">CONTACT</div>
              <a
                href="mailto:commander@sentinel.internal"
                className="text-ink-primary font-bold hover:text-amber-700 block mb-1"
              >
                ops@sentinel.internal
              </a>
              <p className="text-ink-secondary text-[11px]">SRE On-Call Dispatch</p>
              <p className="text-ink-secondary text-[11px]">Response within 60 seconds</p>
            </div>

            <div>
              <div className="text-ink-tertiary uppercase tracking-wider mb-3">SITEMAP</div>
              <ul className="space-y-1.5 text-ink-secondary">
                <li>
                  <a href="#workbench" className="hover:text-ink-primary">
                    Command Workbench
                  </a>
                </li>
                <li>
                  <a href="#flow" className="hover:text-ink-primary">
                    Architecture Flow
                  </a>
                </li>
                <li>
                  <a href="#tracks" className="hover:text-ink-primary">
                    Core Pillars
                  </a>
                </li>
                <li>
                  <a href="#analytics" className="hover:text-ink-primary">
                    SRE Metrics
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-ink-tertiary uppercase tracking-wider mb-3">AWS STACK</div>
              <ul className="space-y-1.5 text-ink-secondary">
                <li className="flex items-center space-x-1">
                  <span>Amazon Bedrock</span>
                  <span className="text-[9px] text-amber-700 font-bold">RAG</span>
                </li>
                <li>Bedrock Knowledge Bases</li>
                <li>Amazon DynamoDB</li>
                <li>Amazon S3 & EventBridge</li>
                <li>AWS Lambda & CloudWatch</li>
              </ul>
            </div>

            <div>
              <div className="text-ink-tertiary uppercase tracking-wider mb-3">HACKATHON</div>
              <p className="text-ink-primary font-semibold mb-1">AWS AI Innovation Challenge</p>
              <p className="text-ink-secondary text-[11px] leading-relaxed">
                3-Day Implementation Window. Zero Hallucinated Parameters. 100% Demonstrable AWS
                Services.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-surface-border pt-6 font-mono-tech text-[10px] text-ink-tertiary">
            <div>© 2026 SENTINEL PLATFORM — ALL RIGHTS RESERVED</div>
            <div className="mt-2 sm:mt-0 flex space-x-4">
              <span>ZERO DIRECT AI MUTATION INVARIANT</span>
              <span>·</span>
              <span>CRYPTOGRAPHIC HITL VERIFIED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
