import * as React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-subtle/40 border border-dashed border-surface-border rounded-sm">
      <div className="p-3 bg-surface-strong rounded-full mb-3 text-ink-secondary">
        {icon || <ShieldAlert className="w-6 h-6 text-amber-600" />}
      </div>
      <h4 className="text-sm font-bold text-ink-primary font-sans mb-1">{title}</h4>
      <p className="text-xs text-ink-secondary max-w-sm font-sans mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 bg-amber-accent hover:bg-amber-hover text-ink-primary font-mono-tech text-xs font-semibold rounded-xs shadow-pleurat-button transition-editorial"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
