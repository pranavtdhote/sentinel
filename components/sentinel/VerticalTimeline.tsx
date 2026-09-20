'use client';

import React from 'react';
import { TimelineEventRecord } from '@/lib/types/database';
import {
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Search,
  Clock,
  Radio,
} from 'lucide-react';

interface VerticalTimelineProps {
  events: TimelineEventRecord[];
}

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-xs font-mono-tech text-ink-tertiary bg-surface-subtle/30 rounded border border-surface-border">
        NO TIMELINE EVENTS RECORDED YET.
      </div>
    );
  }

  // Sort events chronologically (oldest first or newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const getCategoryIcon = (category: TimelineEventRecord['category']) => {
    switch (category) {
      case 'ALERT':
        return <AlertTriangle className="w-3.5 h-3.5 text-danger" />;
      case 'TRIAGE':
        return <Sparkles className="w-3.5 h-3.5 text-amber-700" />;
      case 'APPROVAL':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />;
      case 'REMEDIATION':
        return <Wrench className="w-3.5 h-3.5 text-amber-800" />;
      case 'RECOVERY':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />;
      case 'INVESTIGATION':
      default:
        return <Search className="w-3.5 h-3.5 text-ink-secondary" />;
    }
  };

  const getCategoryColor = (category: TimelineEventRecord['category']) => {
    switch (category) {
      case 'ALERT':
        return 'bg-danger/10 border-danger/30';
      case 'TRIAGE':
        return 'bg-amber-accent/20 border-amber-accent/40';
      case 'APPROVAL':
        return 'bg-blue-500/15 border-blue-500/30';
      case 'REMEDIATION':
        return 'bg-amber-light border-amber-accent/40';
      case 'RECOVERY':
        return 'bg-emerald-500/15 border-emerald-500/30';
      case 'INVESTIGATION':
      default:
        return 'bg-surface-subtle border-surface-border';
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-border">
      {sortedEvents.map((event, idx) => {
        const timeStr = (() => {
          try {
            const d = new Date(event.timestamp);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          } catch {
            return event.timestamp;
          }
        })();

        return (
          <div key={event.eventId || idx} className="relative group">
            {/* Dot / Icon on timeline wire */}
            <div
              className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-xs ${getCategoryColor(
                event.category
              )}`}
            >
              {getCategoryIcon(event.category)}
            </div>

            {/* Content card */}
            <div className="bg-canvas border border-surface-border group-hover:border-surface-border/80 rounded-sm p-3.5 shadow-xs transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono-tech text-[11px] font-bold text-ink-primary">
                    {timeStr}
                  </span>
                  <span className="text-surface-border text-xs">·</span>
                  <span className="font-sans text-xs font-bold text-ink-primary">
                    {event.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono-tech text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle border border-surface-border text-ink-secondary">
                    {event.actor}
                  </span>
                  <span className="font-mono-tech text-[9px] uppercase text-ink-tertiary">
                    {event.category}
                  </span>
                </div>
              </div>

              {event.description && (
                <p className="text-xs text-ink-secondary font-sans leading-relaxed mt-1">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
