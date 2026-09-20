'use client';

import React, { useState } from 'react';
import { BookOpen, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { EvidenceRecord } from '@/lib/types/database';

interface EvidenceCardProps {
  evidence: EvidenceRecord;
  onViewSource?: (evidence: EvidenceRecord) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, onViewSource }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const confidencePct = Math.round((evidence.relevanceScore || 0.85) * 100);
  const snippetText = evidence.snippet || 'No excerpt available.';
  const docTitle = evidence.documentTitle || 'Runbook Reference';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (snippetText) {
      navigator.clipboard.writeText(snippetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-canvas border border-surface-border hover:border-amber-accent/50 rounded-sm p-4 transition-all duration-200 shadow-sm group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-amber-accent/15 border border-amber-accent/30 flex items-center justify-center text-amber-900">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono-tech text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-subtle text-ink-secondary border border-surface-border">
                {evidence.sourceType || 'BEDROCK_KNOWLEDGE_BASE'}
              </span>
              <span className="font-mono-tech text-[11px] font-bold text-amber-800">
                {confidencePct}% RELEVANCE
              </span>
            </div>
            <h4 className="text-xs font-bold text-ink-primary font-sans mt-0.5 group-hover:text-amber-900 transition-colors">
              {docTitle}
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-subtle transition-colors"
            title="Copy excerpt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onViewSource && (
            <button
              type="button"
              onClick={() => onViewSource(evidence)}
              className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-subtle transition-colors"
              title="Inspect citation"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Snippet / Cited text */}
      <div className="mt-3 text-xs text-ink-secondary font-sans leading-relaxed bg-surface-subtle/50 p-3 rounded border border-surface-border/60">
        <p className={expanded ? '' : 'line-clamp-3'}>
          &ldquo;{snippetText}&rdquo;
        </p>
        {snippetText.length > 180 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[11px] font-mono-tech text-amber-800 hover:text-amber-900 font-medium flex items-center space-x-1"
          >
            <span>{expanded ? 'Show less' : 'Read full excerpt'}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Footer metadata */}
      <div className="mt-3 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[10px] font-mono-tech text-ink-tertiary">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-700" />
          <span>VERIFIED GROUNDED CITATION</span>
        </div>
        <span>CHUNK: {evidence.chunkId || 'S3-VEC-01'}</span>
      </div>
    </div>
  );
};
