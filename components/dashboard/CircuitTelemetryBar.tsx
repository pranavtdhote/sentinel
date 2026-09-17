'use client';

import React from 'react';

export const CircuitTelemetryBar: React.FC = () => {
  const chips = [
    { label: 'CloudWatch', tag: 'C4' },
    { label: 'Bedrock KB', tag: 'L3' },
    { label: 'Claude 3.5', tag: 'U2' },
    { label: 'DynamoDB', tag: 'X1' },
    { label: 'EventBridge', tag: 'D7' },
    { label: 'ECS Runner', tag: 'R1' },
    { label: 'S3 Reports', tag: 'J1' },
  ];

  return (
    <div className="w-full bg-canvas border-y border-surface-border py-6 my-10 relative overflow-hidden">
      <div className="text-center mb-4">
        <span className="font-mono-tech text-[10px] text-ink-tertiary uppercase tracking-widest">
          FIG. 003 — AWS ARCHITECTURAL BUS · HARDWARE SCHEMATIC INTERFACE
        </span>
      </div>

      {/* Horizontal Circuit Line Container */}
      <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[750px] relative py-4">
          {/* Base Circuit Wire */}
          <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-surface-border -translate-y-1/2 z-0" />

          {chips.map((chip, idx) => (
            <div key={chip.label} className="relative z-10 flex flex-col items-center">
              {/* Top Pin Sensor */}
              <div className="w-1.5 h-1.5 rounded-full bg-amber-accent mb-1 ring-2 ring-canvas" />

              {/* Hardware IC Chip Block */}
              <div className="px-3 py-1.5 bg-surface-strong border border-surface-border rounded-xs shadow-pleurat-2 font-mono-tech text-xs text-ink-primary font-medium hover:border-amber-accent transition-editorial cursor-pointer">
                {chip.label}
              </div>

              {/* Bottom Test Point Tag */}
              <div className="mt-1 font-mono-tech text-[9px] text-ink-tertiary">
                {chip.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
