'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PillarsCarousel: React.FC = () => {
  const [currentPillar, setCurrentPillar] = useState<number>(0);

  const pillars = [
    {
      title: 'Autonomous Triage',
      years: 'AWS BEDROCK · RAG',
      description:
        'Vector-grounded root cause analysis over enterprise runbooks and architectural postmortems with zero hallucinated resource names.',
      metric: '< 90s MTTD',
      metricDetail: 'Down from 22 minutes median human triage',
      tag: '01',
    },
    {
      title: 'Blast-Radius Modeling',
      years: 'CLAUDE 3.5 · PREDICTIVE',
      description:
        'Analyzes customer impact, downstream microservice dependencies, and safe automated rollback procedures before proposing any action.',
      metric: '0 Outages',
      metricDetail: 'Caused by unchecked automation scripts',
      tag: '02',
    },
    {
      title: 'Cryptographic HITL Gate',
      years: 'SECURITY · LEAST PRIVILEGE',
      description:
        'Enforces application-level role authorization, single-use cryptographic nonces, and bounded execution for mutating operations.',
      metric: '100% Audited',
      metricDetail: 'Immutable DynamoDB & S3 retrospective logs',
      tag: '03',
    },
  ];

  const handleNext = () => {
    setCurrentPillar((prev) => (prev + 1) % pillars.length);
  };

  const handlePrev = () => {
    setCurrentPillar((prev) => (prev - 1 + pillars.length) % pillars.length);
  };

  const current = pillars[currentPillar];

  return (
    <div id="tracks" className="w-full bg-canvas border border-surface-border rounded-sm p-8 shadow-pleurat-1 my-8">
      {/* Top Track Label */}
      <div className="flex items-center space-x-2 font-mono-tech text-xs mb-8">
        <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
          TRACKS
        </span>
        <span className="text-ink-tertiary">CORE OPERATIONAL PILLARS</span>
      </div>

      {/* Editorial Headline */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-ink-primary font-sans mb-3">
          Primarily focused on
        </h2>
        <p className="text-ink-secondary text-sm leading-relaxed font-sans">
          Proven Site Reliability Engineering methodologies translated into deterministic AI-native workflows.
        </p>
      </div>

      {/* Interactive Isometric Block & Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-4xl mx-auto">
        {/* Isometric SVG Hardware Illustration */}
        <div className="md:col-span-6 flex justify-center">
          <div className="relative w-64 h-64 flex items-center justify-center bg-surface-subtle/40 rounded-sm border border-surface-border p-4">
            <svg
              viewBox="0 0 240 200"
              className="w-full h-full drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Base Isometric Plate */}
              <polygon
                points="120,30 220,80 120,130 20,80"
                fill="#efe9d2"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="20,80 120,130 120,150 20,100"
                fill="#e5dec5"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="120,130 220,80 220,100 120,150"
                fill="#d8d0b5"
                stroke="#16140e"
                strokeWidth="1.5"
              />

              {/* Elevated Amber Module */}
              <polygon
                points="80,75 140,45 100,25 40,55"
                fill="#f3b44a"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="40,55 80,75 80,100 40,80"
                fill="#e2a338"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="80,75 140,45 140,70 80,100"
                fill="#c68a25"
                stroke="#16140e"
                strokeWidth="1.5"
              />

              {/* Secondary Module */}
              <polygon
                points="140,90 190,65 160,50 110,75"
                fill="#efe9d2"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="110,75 140,90 140,110 110,95"
                fill="#d8d0b5"
                stroke="#16140e"
                strokeWidth="1.5"
              />
              <polygon
                points="140,90 190,65 190,85 140,110"
                fill="#c8c0a5"
                stroke="#16140e"
                strokeWidth="1.5"
              />

              {/* Technical Indicator Pin */}
              <line x1="80" y1="40" x2="80" y2="15" stroke="#16140e" strokeWidth="1.5" />
              <circle cx="80" cy="15" r="3" fill="#16140e" />

              {/* Monospace Annotation Labels */}
              <text x="30" y="35" fontFamily="monospace" fontSize="8" fill="#8b8577">
                AWS.BEDROCK
              </text>
              <text x="180" y="115" fontFamily="monospace" fontSize="8" fill="#8b8577">
                KB.RAG
              </text>
              <text x="50" y="165" fontFamily="monospace" fontSize="8" fill="#8b8577">
                1600 · 12 000
              </text>
            </svg>
          </div>
        </div>

        {/* Content Description & Controls */}
        <div className="md:col-span-6 space-y-4">
          <div className="text-[10px] font-mono-tech text-amber-700 font-bold uppercase tracking-widest">
            {current.years}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPillar}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <h3 className="text-2xl font-bold text-ink-primary font-sans">{current.title}</h3>
              <p className="text-ink-secondary text-xs leading-relaxed font-sans">
                {current.description}
              </p>

              <div className="p-3 bg-surface-subtle/70 border border-surface-border rounded-xs font-mono-tech">
                <div className="text-base font-bold text-ink-primary">{current.metric}</div>
                <div className="text-[10px] text-ink-tertiary">{current.metricDetail}</div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Arrows */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={handlePrev}
              className="p-2 border border-surface-border hover:bg-surface-subtle text-ink-primary rounded-xs transition-editorial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 border border-surface-border hover:bg-surface-subtle text-ink-primary rounded-xs transition-editorial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono-tech text-xs text-ink-tertiary ml-2">
              0{currentPillar + 1} / 0{pillars.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
