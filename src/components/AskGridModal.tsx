import React, { useState } from 'react';
import {
  X,
  Send,
  HelpCircle,
  Sparkles,
  Loader2,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { callAskTheGridApi } from '../services/api';
import { OptimizationResult, ZoneRiskEvaluation, Anomaly } from '../types';
import { Badge } from './Badge';

interface AskGridModalProps {
  optimizationResult: OptimizationResult;
  riskEvaluations: ZoneRiskEvaluation[];
  anomalies: Anomaly[];
  horizonHour: number;
  onClose: () => void;
}

export const AskGridModal: React.FC<AskGridModalProps> = ({
  optimizationResult,
  riskEvaluations,
  anomalies,
  horizonHour,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([
    {
      q: 'Which zone has the highest water deficit and how is it addressed?',
      a: 'Based on computed telemetry: East Valley Urban Corridor faces the highest deficit of 3.85 ML (24.1% of demand). The optimizer allocated 12.25 ML to protect its 8 critical facilities and recommends an inter-zone transfer of 1.20 ML from Riverside Industrial.'
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userQuery = query.trim();
    setQuery('');
    setLoading(true);

    // Prepare strictly computed numbers context
    const gridContext = {
      horizonHours: horizonHour,
      totalSupplyML: optimizationResult.totalSupplyML,
      totalDemandML: optimizationResult.totalDemandML,
      totalShortageML: optimizationResult.totalShortageML,
      shortagePct: optimizationResult.shortagePct,
      fairnessIndex: optimizationResult.fairnessIndex,
      litresProtectedPerDay: optimizationResult.litresProtectedPerDay,
      householdsProtected: optimizationResult.householdsProtected,
      criticalFacilitiesFullyServed: optimizationResult.criticalFacilitiesFullyServed,
      zones: riskEvaluations.map(r => ({
        name: r.zoneName,
        demandML: r.demandML,
        supplyML: r.supplyML,
        shortageML: r.shortageML,
        shortagePct: r.shortagePct,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        riskReason: r.riskReason,
        householdsAffected: r.householdsAffected,
        hoursToDepletion: r.hoursToDepletion
      })),
      transfers: optimizationResult.transfers.map(t => ({
        from: t.fromZoneName,
        to: t.toZoneName,
        amountML: t.amountML,
        status: t.status
      })),
      activeAnomalies: anomalies.map(a => ({
        zone: a.zoneName,
        severity: a.severity,
        actualDemandML: a.actualDemandML,
        expectedRange: `${a.expectedRangeMinML} - ${a.expectedRangeMaxML} ML`,
        deviationPct: a.deviationPct,
        hypothesis: a.hypothesis,
        status: a.status
      }))
    };

    try {
      const response = await callAskTheGridApi(userQuery, gridContext);
      setHistory(prev => [...prev, { q: userQuery, a: response }]);
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        {
          q: userQuery,
          a: `Error querying telemetry engine: ${err.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 text-xs text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Ask the Grid: Telemetry Q&A Engine
              </h3>
              <p className="text-[11px] text-slate-400">
                Grounded questions strictly evaluated against active computed numbers
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
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-300 font-mono font-medium">
            Ground Truth: <span className="text-white font-semibold">{riskEvaluations.length} Districts</span> Telemetry Fed
          </span>
          <Badge type="AI-GENERATED" size="xs" />
        </div>

        {/* Chat History Container */}
        <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-3 max-h-[320px] overflow-y-auto">
          {history.map((item, idx) => (
            <div key={idx} className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2 text-white font-medium bg-slate-900 p-2.5 rounded-md border border-slate-700/80 shadow-md">
                <span className="text-cyan-400 font-bold shrink-0 font-mono">OP:</span>
                <span className="text-slate-100">{item.q}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-200 bg-slate-900/90 p-2.5 rounded-md border border-slate-700 leading-relaxed font-mono text-[11px] shadow-md">
                <span className="text-blue-400 font-bold shrink-0">GRID:</span>
                <span className="whitespace-pre-line text-slate-200">{item.a}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 p-2 font-mono text-[11px]">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-slate-300">Cross-referencing query with computed grid telemetry...</span>
            </div>
          )}
        </div>

        {/* Query Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about deficits, pipe transfers, anomalies, or hours to depletion..."
            className="flex-1 bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500 font-mono text-xs transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold cursor-pointer shadow-md transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>

        <div className="text-[10px] text-slate-400 font-mono">
          *If a requested figure is missing from telemetry, the model is strictly constrained to report that the metric is unavailable.
        </div>
      </div>
    </div>
  );
};
