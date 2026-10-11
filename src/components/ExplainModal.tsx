import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Droplets, CheckCircle, AlertTriangle } from 'lucide-react';
import { ZoneRiskEvaluation, OptimizationResult } from '../types';
import { callExplainApi } from '../services/api';
import { Badge } from './Badge';

interface ExplainModalProps {
  zone: ZoneRiskEvaluation | null;
  optimizationResult: OptimizationResult;
  onClose: () => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  zone,
  optimizationResult,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');

  useEffect(() => {
    if (!zone) return;

    let isMounted = true;
    setLoading(true);

    const alloc = optimizationResult.allocations.find(a => a.zoneId === zone.zoneId);
    const relatedTransfers = optimizationResult.transfers
      .filter(t => t.fromZoneId === zone.zoneId || t.toZoneId === zone.zoneId)
      .map(t => `${t.fromZoneName} -> ${t.toZoneName} (${t.amountML} ML)`);

    callExplainApi({
      zoneName: zone.zoneName,
      demandML: zone.demandML,
      currentSupplyML: zone.supplyML,
      allocatedML: alloc?.allocatedML || zone.supplyML,
      shortageML: zone.shortageML,
      shortagePct: zone.shortagePct,
      riskLevel: zone.riskLevel,
      riskReason: zone.riskReason,
      priorityWeight: 4,
      criticalFacilities: 8,
      interZoneTransfers: relatedTransfers
    })
      .then(text => {
        if (isMounted) {
          setExplanation(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setExplanation('Explanation unavailable at this time.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [zone, optimizationResult]);

  if (!zone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 text-xs text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-500/40 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Operational Explanation: {zone.zoneName}
              </h3>
              <p className="text-[11px] text-slate-400">
                Ground-truth interpretation of optimizer allocations and risk scoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
          <span className="text-slate-300 font-mono font-medium">Status: <span className="text-white font-semibold">{zone.riskLevel} Risk</span> ({zone.riskScore}/100)</span>
          <Badge type="AI-GENERATED" size="xs" />
        </div>

        {/* Content Body */}
        <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 text-slate-200 leading-relaxed min-h-[140px] max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-slate-300 font-mono text-xs">Synthesizing operational explanation from computed telemetry...</span>
            </div>
          ) : (
            <div className="whitespace-pre-line text-xs font-mono space-y-2 text-slate-200">
              {explanation}
            </div>
          )}
        </div>

        {/* Telemetry Summary */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono text-[11px] text-slate-300">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Demand</span>
            <span className="font-bold text-white text-xs">{zone.demandML} ML</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Supply Inflow</span>
            <span className="font-bold text-cyan-400 text-xs">{zone.supplyML} ML</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Net Deficit</span>
            <span className={zone.shortageML > 0 ? 'text-rose-400 font-bold text-xs' : 'text-emerald-400 font-bold text-xs'}>
              {zone.shortageML > 0 ? `-${zone.shortageML} ML` : 'Surplus'}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer transition-colors shadow-md border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
