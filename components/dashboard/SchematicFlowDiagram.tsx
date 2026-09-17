'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, ShieldAlert, Cpu, Database, Activity } from 'lucide-react';

export const SchematicFlowDiagram: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string>('rag');

  const nodes = [
    {
      id: 'alert',
      title: 'INBOUND ALERT',
      subtitle: 'CloudWatch / P99 > 500ms',
      type: 'rect',
      tag: 'C4',
      description: 'CloudWatch alarms fire on Aurora connection starvation and 504 gateway timeouts.',
    },
    {
      id: 'rag',
      title: 'BEDROCK RAG',
      subtitle: 'Knowledge Base / OpenSearch',
      type: 'rect',
      tag: 'L3',
      description: 'Embeds query with Titan and searches indexed S3 runbooks for proven remediation steps.',
    },
    {
      id: 'decision',
      title: 'IN RUNBOOK?',
      subtitle: 'Vector Match > 0.85',
      type: 'diamond',
      tag: 'U2',
      description: 'If relevance score exceeds 85%, verified runbook steps are pinned as high-confidence evidence.',
    },
    {
      id: 'plan',
      title: 'ACTION PLAN',
      subtitle: 'Blast Radius Engine',
      type: 'rect',
      tag: 'X1',
      description: 'Claude 3.5 Sonnet formats remediation steps and calculates customer impact risks.',
    },
    {
      id: 'approval',
      title: 'HITL GATE',
      subtitle: 'Cryptographic Nonce & Role',
      type: 'rect',
      tag: 'D7',
      description: 'Incident Commander signs the execution token. AI cannot execute mutating tools autonomously.',
    },
    {
      id: 'remediation',
      title: 'AWS ROLLBACK',
      subtitle: 'Isolated Tool Runner',
      type: 'rect',
      tag: 'R1',
      description: 'Rolls back ECS service to revision :48 and monitors CloudWatch alarm recovery.',
    },
  ];

  return (
    <div className="w-full bg-canvas border border-surface-border rounded-sm shadow-pleurat-1 overflow-hidden my-8">
      {/* Top Technical Banner */}
      <div className="bg-amber-accent/90 border-b border-surface-border px-4 py-2 flex items-center justify-between text-ink-primary font-mono-tech">
        <div className="flex items-center space-x-2 font-medium">
          <span className="tracking-widest">■ ■ ■</span>
          <span>SENTINEL / WORKSPACE / PIPELINE_FLOW</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="inline-block w-2 h-2 rounded-full bg-ink-primary animate-pulse" />
          <span>ACTIVE PIPELINE · BENCH_LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Track Sidebar */}
        <div className="lg:col-span-3 border-r border-surface-border bg-surface-subtle/50 p-4 font-mono-tech space-y-3">
          <div className="text-[10px] text-ink-tertiary tracking-wider uppercase mb-2">
            EXPERTISE TRACKS
          </div>

          <button
            onClick={() => setActiveNode('rag')}
            className={`w-full text-left p-3 rounded-xs border transition-editorial ${
              activeNode === 'rag'
                ? 'bg-canvas border-ink-primary shadow-pleurat-2 font-medium text-ink-primary'
                : 'border-transparent text-ink-secondary hover:bg-canvas/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">■ Autonomous Triage</span>
              <span className="text-[9px] text-amber-600 bg-amber-light px-1.5 py-0.2 rounded">RAG</span>
            </div>
            <div className="text-[10px] text-ink-tertiary mt-1">BEDROCK · OPENSEARCH</div>
          </button>

          <button
            onClick={() => setActiveNode('plan')}
            className={`w-full text-left p-3 rounded-xs border transition-editorial ${
              activeNode === 'plan'
                ? 'bg-canvas border-ink-primary shadow-pleurat-2 font-medium text-ink-primary'
                : 'border-transparent text-ink-secondary hover:bg-canvas/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">■ Blast Radius</span>
              <span className="text-[9px] text-ink-secondary bg-surface-strong px-1.5 py-0.2 rounded">CLAUDE</span>
            </div>
            <div className="text-[10px] text-ink-tertiary mt-1">RISK ASSESSMENT · REALTIME</div>
          </button>

          <button
            onClick={() => setActiveNode('approval')}
            className={`w-full text-left p-3 rounded-xs border transition-editorial ${
              activeNode === 'approval'
                ? 'bg-canvas border-ink-primary shadow-pleurat-2 font-medium text-ink-primary'
                : 'border-transparent text-ink-secondary hover:bg-canvas/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">■ HITL Gate</span>
              <span className="text-[9px] text-amber-700 bg-amber-light px-1.5 py-0.2 rounded">NONCE</span>
            </div>
            <div className="text-[10px] text-ink-tertiary mt-1">COMMANDER ROLE · ZERO HALLUCINATION</div>
          </button>

          <button
            onClick={() => setActiveNode('remediation')}
            className={`w-full text-left p-3 rounded-xs border transition-editorial ${
              activeNode === 'remediation'
                ? 'bg-canvas border-ink-primary shadow-pleurat-2 font-medium text-ink-primary'
                : 'border-transparent text-ink-secondary hover:bg-canvas/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">■ Tool Isolation</span>
              <span className="text-[9px] text-success bg-success-surface px-1.5 py-0.2 rounded">AWS SDK</span>
            </div>
            <div className="text-[10px] text-ink-tertiary mt-1">ECS · LAMBDA · CLOUDWATCH</div>
          </button>
        </div>

        {/* Center Canvas with Dotted Grid */}
        <div className="lg:col-span-9 p-6 bg-grid-pattern relative flex flex-col justify-between overflow-x-auto">
          {/* Top Label */}
          <div className="flex items-center justify-between text-xs font-mono-tech text-ink-tertiary border-b border-surface-border pb-3">
            <span>WORKSPACE / DIAGRAM_SCHEMATIC</span>
            <span>TEST_POINTS: C4 · L3 · U2 · X1 · D7 · R1</span>
          </div>

          {/* Interactive Flow Nodes */}
          <div className="py-8 flex flex-wrap items-center justify-center gap-4 relative">
            {nodes.map((node, index) => {
              const isSelected = activeNode === node.id;
              return (
                <React.Fragment key={node.id}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveNode(node.id)}
                    className={`cursor-pointer relative p-3 rounded-xs border text-center transition-editorial min-w-[130px] ${
                      isSelected
                        ? 'bg-amber-light/90 border-ink-primary shadow-pleurat-1'
                        : 'bg-surface-strong/70 border-surface-border hover:border-ink-secondary'
                    }`}
                  >
                    <span className="absolute -top-2 left-2 text-[9px] font-mono-tech px-1 bg-ink-primary text-canvas rounded-xs">
                      {node.tag}
                    </span>
                    <div className="font-mono-tech font-bold text-xs text-ink-primary mt-1">
                      {node.title}
                    </div>
                    <div className="text-[10px] text-ink-secondary mt-0.5">{node.subtitle}</div>
                  </motion.div>

                  {index < nodes.length - 1 && (
                    <div className="text-ink-tertiary font-mono text-sm hidden sm:inline-block">
                      →
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Floating Sentinel Agent Chat Card (matching reference screenshot) */}
          <div className="bg-canvas border border-surface-border rounded-sm p-4 max-w-lg shadow-pleurat-4 font-mono-tech text-xs ml-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-2 mb-2">
              <div className="flex items-center space-x-1.5 font-bold text-ink-primary">
                <Bot className="w-3.5 h-3.5 text-amber-600" />
                <span>SENTINEL OPERATIONAL AGENT</span>
              </div>
              <span className="text-[10px] text-ink-tertiary">NODE: {activeNode.toUpperCase()}</span>
            </div>

            <p className="text-ink-secondary font-sans text-xs leading-relaxed mb-3">
              {nodes.find((n) => n.id === activeNode)?.description}
            </p>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary pt-2 border-t border-surface-border">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Bedrock Claude 3.5 Sonnet (us-east-1)</span>
              </div>
              <span>TEMP: 0.1 · DETERMINISTIC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
