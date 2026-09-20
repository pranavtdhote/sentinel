'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Code,
  Eye,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostmortemReportViewerProps {
  markdown: string;
  s3Key?: string;
  s3Bucket?: string;
  downloadUrl?: string;
  incidentId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

/**
 * Intelligent Markdown formatter for SRE Postmortem Retrospectives
 */
export const PostmortemReportViewer: React.FC<PostmortemReportViewerProps> = ({
  markdown,
  s3Key,
  s3Bucket = 'sentinel-reports-090686622776',
  downloadUrl,
  incidentId,
  onClose,
  isModal = true,
}) => {
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedMarkdown = (content: string) => {
    if (!content) {
      return (
        <div className="p-8 text-center text-xs font-mono-tech text-ink-tertiary">
          No retrospective markdown content available.
        </div>
      );
    }

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0]
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      const rows = tableRows.slice(2).map((row) =>
        row
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
      );

      elements.push(
        <div key={`table-${key}`} className="my-4 overflow-x-auto border border-surface-border rounded-xs">
          <table className="w-full text-xs font-sans text-left border-collapse">
            <thead>
              <tr className="bg-surface-subtle border-b border-surface-border font-mono-tech text-[11px] text-ink-primary font-bold">
                {headers.map((h, i) => (
                  <th key={i} className="p-2.5">
                    {h.replace(/\*\*/g, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-canvas' : 'bg-surface-subtle/30'}>
                  {r.map((cell, j) => {
                    const isCode = cell.startsWith('`') && cell.endsWith('`');
                    const clean = cell.replace(/[`*]/g, '');
                    return (
                      <td key={j} className="p-2.5 text-ink-secondary">
                        {isCode ? (
                          <code className="px-1.5 py-0.5 bg-surface-subtle rounded font-mono-tech text-[11px] text-ink-primary font-semibold">
                            {clean}
                          </code>
                        ) : (
                          clean
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    const flushCode = (key: string) => {
      if (codeLines.length === 0) return;
      elements.push(
        <pre
          key={`code-${key}`}
          className="my-3 p-3 bg-surface-subtle/80 border border-surface-border rounded-xs font-mono-tech text-[11px] text-ink-primary overflow-x-auto leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
      inCodeBlock = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Detection
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCode(`code-${i}`);
        } else {
          if (inTable) flushTable(`pre-code-${i}`);
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Table Detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableRows.push(line.trim());
        continue;
      } else if (inTable) {
        flushTable(`line-${i}`);
      }

      // H1 Header
      if (line.startsWith('# ')) {
        const title = line.replace('# ', '').trim();
        elements.push(
          <div key={`h1-${i}`} className="pb-3 border-b border-surface-border mb-4">
            <h1 className="text-lg sm:text-xl font-bold font-sans text-ink-primary tracking-tight">
              {title}
            </h1>
          </div>
        );
        continue;
      }

      // H2 Header
      if (line.startsWith('## ')) {
        const heading = line.replace('## ', '').trim();
        elements.push(
          <div key={`h2-${i}`} className="mt-6 mb-2 flex items-center space-x-2">
            <span className="w-1 h-3.5 bg-amber-accent rounded-full inline-block" />
            <h2 className="text-sm font-bold font-mono-tech text-ink-primary uppercase tracking-wide">
              {heading}
            </h2>
          </div>
        );
        continue;
      }

      // H3 / Ticket Header
      if (line.startsWith('### ')) {
        const sub = line.replace('### ', '').trim();
        const priorityMatch = sub.match(/\[(P[0-2])\]/);
        const priority = priorityMatch ? priorityMatch[1] : null;

        elements.push(
          <div
            key={`h3-${i}`}
            className="mt-4 p-3 bg-surface-subtle/50 border border-surface-border rounded-xs flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              {priority && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
                    priority === 'P0'
                      ? 'bg-danger/15 text-danger border border-danger/30'
                      : priority === 'P1'
                      ? 'bg-amber-accent/20 text-amber-900 border border-amber-accent/40'
                      : 'bg-blue-500/15 text-blue-800 border border-blue-500/30'
                  }`}
                >
                  {priority}
                </span>
              )}
              <span className="font-bold text-xs text-ink-primary font-mono-tech">
                {sub.replace(/\[P[0-2]\]\s*/, '')}
              </span>
            </div>
          </div>
        );
        continue;
      }

      // Blockquote / Document Callout
      if (line.startsWith('> ')) {
        const quoteText = line.replace('> ', '').trim();
        elements.push(
          <div
            key={`quote-${i}`}
            className="my-2 p-3 bg-surface-subtle/60 border-l-2 border-amber-accent text-xs font-mono-tech text-ink-secondary rounded-r"
          >
            {quoteText.replace(/\*\*/g, '').replace(/`/g, '')}
          </div>
        );
        continue;
      }

      // Horizontal Rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-surface-border/80" />);
        continue;
      }

      // 5-Whys Numbered List
      const whyMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (whyMatch) {
        const num = whyMatch[1];
        const contentText = whyMatch[2];
        elements.push(
          <div
            key={`why-${i}`}
            className="my-2 p-2.5 bg-canvas border border-surface-border rounded-xs flex items-start space-x-3 text-xs"
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-light border border-amber-accent/40 font-mono-tech font-bold text-[10px] flex items-center justify-center text-ink-primary">
              {num}
            </span>
            <div className="text-ink-secondary leading-relaxed pt-0.5">
              {contentText.split('*').map((part, idx) =>
                idx % 2 === 1 ? (
                  <strong key={idx} className="text-ink-primary font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </div>
          </div>
        );
        continue;
      }

      // Bullet List Item
      if (line.trim().startsWith('- ')) {
        const item = line.trim().replace(/^- /, '');
        const hasBoldPrefix = item.startsWith('**');
        elements.push(
          <div key={`bullet-${i}`} className="my-1.5 flex items-start space-x-2 text-xs font-sans text-ink-secondary">
            <span className="text-amber-accent font-bold mt-0.5 shrink-0">•</span>
            <div className="leading-relaxed">
              {item.split('**').map((seg, idx) =>
                idx % 2 === 1 ? (
                  <strong key={idx} className="text-ink-primary font-semibold">
                    {seg}
                  </strong>
                ) : (
                  seg.replace(/`/g, '')
                )
              )}
            </div>
          </div>
        );
        continue;
      }

      // Empty Lines
      if (!line.trim()) {
        continue;
      }

      // Standard Paragraph
      elements.push(
        <p key={`p-${i}`} className="my-2 text-xs font-sans text-ink-secondary leading-relaxed">
          {line}
        </p>
      );
    }

    if (inTable) flushTable('end-table');
    if (inCodeBlock) flushCode('end-code');

    return <div className="space-y-1">{elements}</div>;
  };

  const containerContent = (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="p-4 bg-surface-subtle/80 border border-surface-border rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono-tech font-bold text-xs text-ink-primary">
                S3 INCIDENT RETROSPECTIVE
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 rounded font-mono-tech text-[9px] font-bold">
                ● PERSISTED
              </span>
            </div>
            <div className="font-mono-tech text-[10px] text-ink-tertiary flex items-center space-x-1.5 mt-0.5">
              <span>s3://{s3Bucket}/{s3Key || 'postmortem.md'}</span>
            </div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex bg-surface-strong p-0.5 rounded border border-surface-border">
            <button
              type="button"
              onClick={() => setActiveTab('rendered')}
              className={`px-2.5 py-1 text-[11px] font-mono-tech rounded flex items-center space-x-1 transition-colors ${
                activeTab === 'rendered'
                  ? 'bg-canvas text-ink-primary font-bold shadow-xs'
                  : 'text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Formatted Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-2.5 py-1 text-[11px] font-mono-tech rounded flex items-center space-x-1 transition-colors ${
                activeTab === 'raw'
                  ? 'bg-canvas text-ink-primary font-bold shadow-xs'
                  : 'text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Raw Markdown</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="font-mono-tech text-xs flex items-center space-x-1 h-7"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-amber-accent hover:bg-amber-hover text-ink-primary text-xs font-mono-tech font-bold rounded-xs flex items-center space-x-1.5 shadow-pleurat-button h-7 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download .md</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-canvas border border-surface-border rounded-xs p-5 max-h-[62vh] overflow-y-auto select-text shadow-inner">
        {activeTab === 'rendered' ? (
          renderFormattedMarkdown(markdown)
        ) : (
          <pre className="font-mono-tech text-[11px] text-ink-primary leading-relaxed whitespace-pre-wrap select-all">
            {markdown}
          </pre>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between font-mono-tech text-[10px] text-ink-tertiary pt-2 border-t border-surface-border">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Cryptographically grounded on Amazon Bedrock + AWS S3 telemetry</span>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose} className="font-mono-tech text-xs h-7">
            Close
          </Button>
        )}
      </div>
    </div>
  );

  if (!isModal) {
    return containerContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-canvas border border-surface-border rounded-sm max-w-4xl w-full p-6 shadow-pleurat-1 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <h2 className="text-sm font-bold font-sans text-ink-primary">
              Incident #{incidentId || 'REPORT'} Retrospective & Blameless Postmortem
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
            >
              ✕ CLOSE
            </button>
          )}
        </div>

        {containerContent}
      </div>
    </div>
  );
};
