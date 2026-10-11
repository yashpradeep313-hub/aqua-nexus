import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Sparkles,
  Loader2,
  FileText,
  Download
} from 'lucide-react';
import { OptimizationResult, ZoneRiskEvaluation, Anomaly } from '../types';
import { callDailyBriefApi } from '../services/api';
import { Badge } from './Badge';

interface OperatorBriefModalProps {
  optimizationResult: OptimizationResult;
  riskEvaluations: ZoneRiskEvaluation[];
  anomalies: Anomaly[];
  horizonHour: number;
  onClose: () => void;
}

export const OperatorBriefModal: React.FC<OperatorBriefModalProps> = ({
  optimizationResult,
  riskEvaluations,
  anomalies,
  horizonHour,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [briefText, setBriefText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const highRiskZones = riskEvaluations
      .filter(r => r.riskLevel === 'Critical' || r.riskLevel === 'High')
      .map(r => ({
        name: r.zoneName,
        deficitML: r.shortageML,
        pct: r.shortagePct,
        risk: r.riskLevel
      }));

    const activeAnomalies = anomalies
      .filter(a => a.status === 'Investigating')
      .map(a => ({
        zone: a.zoneName,
        severity: a.severity,
        deviation: a.deviationPct,
        hypothesis: a.hypothesis
      }));

    const transfers = optimizationResult.transfers.map(t => ({
      from: t.fromZoneName,
      to: t.toZoneName,
      amountML: t.amountML
    }));

    callDailyBriefApi({
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
      horizonHours: horizonHour,
      totalSupplyML: optimizationResult.totalSupplyML,
      totalDemandML: optimizationResult.totalDemandML,
      totalShortageML: optimizationResult.totalShortageML,
      shortagePct: optimizationResult.shortagePct,
      unmetDemandBeforePct: optimizationResult.baselineShortagePct,
      unmetDemandAfterPct: optimizationResult.shortagePct,
      litresProtectedPerDay: optimizationResult.litresProtectedPerDay,
      householdsProtected: optimizationResult.householdsProtected,
      criticalFacilitiesServed: optimizationResult.criticalFacilitiesFullyServed,
      activeAnomalies,
      highRiskZones,
      recommendedTransfers: transfers
    })
      .then(text => {
        if (isMounted) {
          setBriefText(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBriefText('Unable to generate automated brief.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [optimizationResult, riskEvaluations, anomalies, horizonHour]);

  const handleCopy = () => {
    navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Aqua Nexus - Daily Operator Brief</title>
          <style>
            body { font-family: monospace; padding: 24px; color: #111; line-height: 1.5; font-size: 13px; }
            h1, h2, h3 { color: #0f172a; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${briefText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 text-xs text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Daily Operator Shift Brief
              </h3>
              <p className="text-[11px] text-slate-400">
                Printable operational summary for shift supervisors & valve crews
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
            Next {horizonHour}h Horizon Shift Plan
          </span>
          <Badge type="AI-GENERATED" size="xs" />
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-100 leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap selection:bg-teal-500/30 selection:text-teal-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
              <span className="text-slate-300 font-mono text-xs">Compiling Daily Operator Shift Brief...</span>
            </div>
          ) : (
            briefText
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[10px] text-slate-400 font-mono">
            *Ground-truth numbers computed by the hydraulic optimizer.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer shadow-md border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Brief</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
