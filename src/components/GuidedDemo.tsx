import React from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Compass } from 'lucide-react';

interface GuidedDemoProps {
  step: number;
  isOpen: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    title: '1. Machine Learning Forecast Explorer',
    tab: 'forecast-explorer',
    desc: 'Notice how the P50 ensemble forecast deviates +5.8% above the seasonal baseline due to warm temperatures (+3.5°C). The P10–P90 uncertainty envelope expands wider toward 48h.'
  },
  {
    title: '2. Telemetry Anomaly Radar',
    tab: 'anomaly-radar',
    desc: 'Real-time telemetry anomalies are captured in East Valley (+32.4%) and Riverside (+21.8%). Anomalies are framed as diagnostic hypotheses without false alarm panic.'
  },
  {
    title: '3. Default Shortage Baseline (Supply Planner)',
    tab: 'supply-planner',
    desc: 'Aqua Nexus demo defaults to an authentic crisis: 46.0 ML total supply vs 55.79 ML demand (~18% shortage). Under naive proportional distribution, hospitals would suffer cutoffs.'
  },
  {
    title: '4. Smart Priority Allocation & Lifeline Protection',
    tab: 'supply-planner',
    desc: 'The optimizer guarantees Metro Core (14 hospitals) at 100% fulfillment while shielding 34/34 critical facilities. Deficits are absorbed by low-priority sectors without breaching minimum guarantees.'
  },
  {
    title: '5. Geospatial Dispatch & Transfer Pipes',
    tab: 'live-map',
    desc: 'Animated teal transfer pipes reroute 3.50 ML directly from donor sectors to deficit zones. Anomaly pulses mark affected sectors for acoustic field inspection.'
  }
];

export const GuidedDemo: React.FC<GuidedDemoProps> = ({
  step,
  isOpen,
  onNext,
  onPrev,
  onSkip
}) => {
  if (!isOpen) return null;

  const current = STEPS[step - 1] || STEPS[0];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl animate-fade-in">
      <div className="p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl space-y-2.5 text-xs text-slate-100 ring-1 ring-cyan-500/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Guided Operator Tour • Step {step} of 5
            </span>
          </div>

          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Exit tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div>
          <h4 className="font-bold text-sm text-white tracking-wide">{current.title}</h4>
          <p className="text-slate-300 text-[11px] leading-relaxed mt-1">
            {current.desc}
          </p>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(dot => (
              <span
                key={dot}
                className={`h-2 rounded-full transition-all ${
                  dot === step ? 'bg-cyan-400 w-5 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-slate-700 w-2'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 shadow-md transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev</span>
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
