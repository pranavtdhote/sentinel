import React from 'react';

interface PageHeaderProps {
  category: string;
  categoryDesc?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  categoryDesc,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-border ${className}`}
    >
      <div>
        <div className="flex items-center space-x-2 font-mono text-xs mb-1.5">
          <span className="bg-brand-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary uppercase tracking-wider text-[10px]">
            {category}
          </span>
          {categoryDesc && <span className="text-ink-muted text-[11px] uppercase tracking-wider">{categoryDesc}</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-primary font-sans leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center space-x-2 shrink-0">{actions}</div>}
    </div>
  );
};
