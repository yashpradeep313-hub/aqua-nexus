import React from 'react';
import { BadgeType } from '../types';

interface BadgeProps {
  type: BadgeType | 'AI-GENERATED' | 'ENGINE-COMPUTED';
  className?: string;
  size?: 'xs' | 'sm';
}

export const Badge: React.FC<BadgeProps> = ({ type, className = '', size = 'xs' }) => {
  const sizeClasses = size === 'xs' ? 'text-[9px] px-1.5 py-0.5 tracking-wider font-semibold' : 'text-[11px] px-2 py-0.5 font-semibold';

  switch (type) {
    case 'EXTRACTED FROM PDF':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-amber-500/40 bg-amber-950/70 text-amber-300 shadow-sm ${sizeClasses} ${className}`}
          title="Extracted directly from municipal PDF document via Gemini Document Vision"
        >
          📄 EXTRACTED FROM PDF
        </span>
      );
    case 'USER-FITTED':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-purple-500/40 bg-purple-950/70 text-purple-300 shadow-sm ${sizeClasses} ${className}`}
          title="Ridge regression model trained in-browser on client data"
        >
          ⚙ USER-FITTED
        </span>
      );
    case 'PRESET SAMPLE (SYNTHETIC BENCHMARK)':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-blue-500/40 bg-blue-950/70 text-blue-300 shadow-sm ${sizeClasses} ${className}`}
          title="Pre-loaded synthetic benchmark dataset for policy demonstration"
        >
          ⚡ PRESET SAMPLE (SYNTHETIC BENCHMARK)
        </span>
      );
    case 'REAL (KAGGLE DM1718)':
    case 'REAL':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-emerald-500/40 bg-emerald-950/70 text-emerald-300 shadow-sm ${sizeClasses} ${className}`}
          title="Direct from original Kaggle dm1718 dataset"
        >
          ● REAL (KAGGLE DM1718)
        </span>
      );
    case 'ENGINE-COMPUTED':
    case 'ENGINE COMPUTED':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-cyan-500/40 bg-cyan-950/70 text-cyan-300 shadow-sm ${sizeClasses} ${className}`}
          title="Rigorous mathematical allocation by pure TypeScript optimizer"
        >
          ENGINE COMPUTED
        </span>
      );
    case 'DEMO DATA':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-indigo-500/40 bg-indigo-950/70 text-indigo-300 shadow-sm ${sizeClasses} ${className}`}
          title="Synthesized live municipal telemetry for demonstration mode"
        >
          ◈ DEMO DATA
        </span>
      );
    case 'MODEL OUTPUT':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-sky-500/40 bg-sky-950/70 text-sky-300 shadow-sm ${sizeClasses} ${className}`}
          title="Deterministic machine learning prediction from validated ensemble model"
        >
          ▲ MODEL OUTPUT
        </span>
      );
    case 'SIMULATED':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-amber-500/40 bg-amber-950/70 text-amber-300 shadow-sm ${sizeClasses} ${className}`}
          title="Simulated hydraulic condition based on mathematical model"
        >
          ◆ SIMULATED
        </span>
      );
    case 'WHAT-IF':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-purple-500/40 bg-purple-950/70 text-purple-300 shadow-sm ${sizeClasses} ${className}`}
          title="Hypothetical climate or emergency disruption scenario"
        >
          ✦ WHAT-IF
        </span>
      );
    case 'AI-GENERATED':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-teal-500/40 bg-teal-950/70 text-teal-300 shadow-sm ${sizeClasses} ${className}`}
          title="AI-written, numbers computed by the engine"
        >
          AI-WRITTEN • NUMBERS BY ENGINE
        </span>
      );
    case 'ENGINE-COMPUTED':
      return (
        <span
          className={`inline-flex items-center font-mono uppercase rounded border border-cyan-500/40 bg-cyan-950/70 text-cyan-300 shadow-sm ${sizeClasses} ${className}`}
          title="Rigorous mathematical allocation by pure TypeScript optimizer"
        >
          ENGINE COMPUTED
        </span>
      );
    default:
      return null;
  }
};
