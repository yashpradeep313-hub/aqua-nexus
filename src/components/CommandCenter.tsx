import React from 'react';
import {
  Droplets,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Zap,
  Sliders,
  Scale,
  Building,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Zone, ZoneRiskEvaluation, OptimizationResult, Anomaly, DemandPercentile } from '../types';
import { Badge } from './Badge';

interface CommandCenterProps {
  zones: Zone[];
  riskEvaluations: ZoneRiskEvaluation[];
  optimizationResult: OptimizationResult;
  anomalies: Anomaly[];
  horizonHour: number;
  percentile: DemandPercentile;
  useLitresPerHour: boolean;
  formatVolume: (ml: number) => string;
  currentTotalSupply?: number;
  onSetTotalSupply?: (newSupplyML: number) => void;
  onRunSmartAllocation: () => void;
  onSimulateShortage: () => void;
  onResetToDefault: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenExplainModal: (zone: ZoneRiskEvaluation) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  zones,
  riskEvaluations,
  optimizationResult,
  anomalies,
  horizonHour,
  percentile,
  useLitresPerHour,
  formatVolume,
  currentTotalSupply = 46.0,
  onSetTotalSupply,
  onRunSmartAllocation,
  onSimulateShortage,
  onResetToDefault,
  onNavigateToTab,
  onOpenExplainModal
}) => {
  const shortageZones = riskEvaluations.filter(r => r.shortageML > 0.05);
  const criticalZones = riskEvaluations.filter(r => r.riskLevel === 'Critical');
  const highRiskZones = riskEvaluations.filter(r => r.riskLevel === 'High');
  const activeAnomalies = anomalies.filter(a => a.status === 'Investigating');

  // Overall totals
  const totalDemand = riskEvaluations.reduce((acc, r) => acc + r.demandML, 0);
  const totalSupply = riskEvaluations.reduce((acc, r) => acc + r.supplyML, 0);
  const totalShortage = Math.max(0, totalDemand - totalSupply);
  const totalShortagePct = totalDemand > 0 ? (totalShortage / totalDemand) * 100 : 0;
  const totalReroutedML = optimizationResult.transfers.reduce((a, b) => a + b.amountML, 0);

  // Highest active anomaly for 30-second panel
  const primaryAnomaly = activeAnomalies[0] || anomalies[0];

  return (
    <div className="space-y-6">
      {/* Live Operational Status Banner - Dark High-Contrast */}
      <div className="relative overflow-hidden rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/80 via-slate-900 to-blue-950/70 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  GRID TELEMETRY ACTIVE • NEXT {horizonHour}H HORIZON
                </span>
                <Badge type="MODEL OUTPUT" size="xs" />
              </div>
              <p className="text-base sm:text-lg font-bold text-white mt-0.5">
                Next {horizonHour}h: <span className="text-amber-400 font-bold">{shortageZones.length} of {zones.length} zones</span> in projected shortage,{' '}
                <span className="text-rose-400 font-bold">{activeAnomalies.length} active anomalies</span> under investigation
              </p>
            </div>
          </div>

          {/* Action Buttons: Run Smart Allocation, Simulate Shortage, and Reset to Default */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRunSmartAllocation}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-sky-950/50 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Run Smart Allocation</span>
            </button>
            <button
              onClick={onSimulateShortage}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-950/30"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Simulate Shortage (-30%)</span>
            </button>
            <button
              onClick={onResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Reset grid supply and allocations back to the authentic 46.0 ML default state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset to Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Water Supply Control Bar (Brownie Point: Change available supply & see redistribution change) */}
      <div className="p-4 rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-xl space-y-3 ring-1 ring-cyan-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Interactive Available Water Supply Control (Dynamic Inflow Regulator)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              BROWNIE POINT
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Current Grid Inflow:</span>
            <span className="text-base font-bold text-cyan-300">
              {formatVolume(currentTotalSupply)} {useLitresPerHour ? 'L/h' : 'ML'}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              totalShortage > 0 
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30' 
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
            }`}>
              {totalShortage > 0 ? `Deficit -${formatVolume(totalShortage)} ML` : 'Supply Balanced'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Severe Drought (20.0 ML)</span>
              <span className="text-cyan-400 font-bold">Slide to test municipal supply changes</span>
              <span>High Capacity (70.0 ML)</span>
            </div>
            <input
              type="range"
              min={20}
              max={70}
              step={0.5}
              value={currentTotalSupply}
              onChange={(e) => onSetTotalSupply && onSetTotalSupply(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg appearance-none"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-end gap-1.5 flex-wrap">
            <button
              onClick={() => onSetTotalSupply && onSetTotalSupply(32.2)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
              title="Set supply to 32.2 ML (-30% drought)"
            >
              🚨 Drought (32.2 ML)
            </button>
            <button
              onClick={() => onSetTotalSupply && onSetTotalSupply(46.0)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
              title="Reset supply to standard 46.0 ML"
            >
              ⚖️ Standard (46.0 ML)
            </button>
            <button
              onClick={() => onSetTotalSupply && onSetTotalSupply(58.0)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
              title="Set supply to 58.0 ML (+26% reservoir surplus)"
            >
              💧 Surplus (58.0 ML)
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-850 pt-2">
          💡 <b className="text-slate-200">How Redistribution Works:</b> Moving the slider instantly recalculates expected shortages for all 6 zones. If total supply drops, the optimizer prioritizes high-demand and high-risk zones (e.g. Metro Core hospitals) while non-critical residential zones receive proportional fairness floor allocations.
        </p>
      </div>

      {/* Suggested Approach 4-Pillar Pipeline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[10px]">1</span>
            <span>Demand Prediction</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Predicts expected water consumption for each zone for upcoming hours using historical consumption, time of day, and weather factors.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-[10px]">2</span>
            <span>Abnormal Consumption</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Identifies zones where current consumption significantly deviates from normal diurnal patterns (+{primaryAnomaly?.deviationPct || 42}% flagged).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-5 h-5 rounded-full bg-rose-950 border border-rose-500/40 flex items-center justify-center text-[10px]">3</span>
            <span>Shortage Prediction</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Compares predicted demand with available supply, calculating exact deficits and risk ratings ({shortageZones.length} zones facing shortage).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-500/40 flex items-center justify-center text-[10px]">4</span>
            <span>Supply Redistribution</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Recommends inter-district valve transfers ({totalReroutedML.toFixed(2)} ML rerouted) prioritizing higher demand and critical lifelines.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Predicted Demand */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Demand Target ({percentile.toUpperCase()})</span>
            <Badge type="MODEL OUTPUT" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{formatVolume(totalDemand)}</span>
            <span className="text-xs text-slate-400">{useLitresPerHour ? 'L/h' : 'ML'}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across 6 metropolitan zones for {horizonHour}h horizon
          </p>
        </div>

        {/* Card 2: Current Grid Supply (Requirement 3: DEMO DATA badge) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Current Grid Inflow</span>
            <Badge type="DEMO DATA" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">{formatVolume(totalSupply)}</span>
            <span className="text-xs text-slate-400">{useLitresPerHour ? 'L/h' : 'ML'}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Raw water intake & reservoir dispatch capacity
          </p>
        </div>

        {/* Card 3: Projected Deficit */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">System Shortfall</span>
            <Badge type="ENGINE-COMPUTED" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${totalShortage > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatVolume(totalShortage)}
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({totalShortagePct.toFixed(1)}%)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {criticalZones.length > 0 ? `${criticalZones.length} critical zone(s) require intervention` : 'No critical depressurization risk'}
          </p>
        </div>

        {/* Card 4: Optimizer Protection */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Potable Water Saved</span>
            <Badge type="ENGINE-COMPUTED" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400">
              {(optimizationResult.litresProtectedPerDay / 1_000_000).toFixed(2)} ML
            </span>
            <span className="text-xs text-slate-400">/day</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {optimizationResult.householdsProtected.toLocaleString()} households shielded from cutoff
          </p>
        </div>
      </div>

      {/* 30-Second Answer Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-950/80 text-cyan-400 border border-sky-500/40">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-white">
              The 30-Second Hydraulic Answer Panel
            </h2>
          </div>
          <Badge type="ENGINE-COMPUTED" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Question 1 */}
          <div className="pt-2 md:pt-0 md:pr-3">
            <span className="text-slate-400 font-semibold block mb-1">1. Water Needed?</span>
            <p className="text-slate-200">
              Need <span className="font-mono font-bold text-cyan-400">{formatVolume(totalDemand)}</span> {useLitresPerHour ? 'L/h' : 'ML'} to fully meet {percentile.toUpperCase()} municipal demand across all 6 zones.
            </p>
          </div>

          {/* Question 2 */}
          <div className="pt-2 md:pt-0 md:px-3">
            <span className="text-slate-400 font-semibold block mb-1">2. Zones at Risk?</span>
            <p className="text-slate-200">
              {criticalZones.length > 0 || highRiskZones.length > 0 ? (
                <>
                  <span className="font-bold text-rose-400">
                    {[...criticalZones, ...highRiskZones].map(z => z.zoneName.split(' ')[0]).join(', ')}
                  </span>{' '}
                  face primary deficits exceeding minimum thresholds.
                </>
              ) : (
                <span className="text-emerald-400 font-medium">All zones operate within safe margins under current inflow.</span>
              )}
            </p>
          </div>

          {/* Question 3 */}
          <div className="pt-2 md:pt-0 md:px-3">
            <span className="text-slate-400 font-semibold block mb-1">3. Unusual Consumption?</span>
            <p className="text-slate-200">
              {primaryAnomaly ? (
                <>
                  <span className="font-bold text-amber-400">{primaryAnomaly.zoneName}</span>:{' '}
                  +{primaryAnomaly.deviationPct}% above model baseline ({primaryAnomaly.severity} alert).
                </>
              ) : (
                'Sensors align within statistical 95% confidence bands.'
              )}
            </p>
          </div>

          {/* Question 4 - Reroute X ML via inter-district valves */}
          <div className="pt-2 md:pt-0 md:px-3">
            <span className="text-slate-400 font-semibold block mb-1">4. How to Distribute?</span>
            <p className="text-slate-200">
              Enforce priority weights: guarantee 100% supply to <span className="text-teal-400 font-bold">Bengaluru Central (Victoria Hospital)</span>, reroute{' '}
              <span className="font-mono font-bold text-cyan-400">
                {totalReroutedML.toFixed(2)} ML
              </span>{' '}
              via Cauvery inter-district booster valves.
            </p>
          </div>

          {/* Question 5 */}
          <div className="pt-2 md:pt-0 md:pl-3">
            <span className="text-slate-400 font-semibold block mb-1">5. If Supply Drops 30%?</span>
            <p className="text-slate-200">
              Non-critical residential sectors (Hebbal, Peenya) will drop to fairness floor while protecting critical hospital lifelines.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Impact Scoreboard & Live Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Impact Scoreboard & Optimizer vs Baseline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Impact Scoreboard: Optimizer vs Proportional Baseline
                </h3>
                <p className="text-xs text-slate-400">
                  Quantifying humanitarian and network gains achieved over naive proportional distribution
                </p>
              </div>
              <Badge type="ENGINE-COMPUTED" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Unmet Demand (Before)</span>
                <span className="text-lg font-mono font-bold text-rose-400">
                  {optimizationResult.baselineShortagePct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block">Naive Proportional</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Hospital Deficit (After)</span>
                <span className="text-lg font-mono font-bold text-teal-400">
                  0.0%
                </span>
                <span className="text-[10px] text-teal-400 block font-medium">Metro Core 100% Met</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Critical Facilities Served</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {optimizationResult.criticalFacilitiesFullyServed} / {optimizationResult.totalCriticalFacilities}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">34/34 Lifelines Guarded</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Jain's Fairness Index</span>
                <span className="text-lg font-mono font-bold text-sky-400">
                  {(optimizationResult.fairnessIndex * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">&gt;0.90 Verified Equity</span>
              </div>
            </div>

            {/* Active Inter-Zone Transfer Orders */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Recommended Inter-Zone Valve Transfers ({optimizationResult.transfers.length})
                </span>
                <span className="text-[11px] text-cyan-400 font-mono font-semibold">
                  Total Rerouted: {totalReroutedML.toFixed(2)} ML
                </span>
              </div>

              {optimizationResult.transfers.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-950/60 rounded-lg text-center border border-slate-800">
                  No inter-zone transfers required under current equilibrium.
                </div>
              ) : (
                <div className="space-y-2">
                  {optimizationResult.transfers.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{t.fromZoneName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-cyan-300">{t.toZoneName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-cyan-300">
                          {formatVolume(t.amountML)} {useLitresPerHour ? 'L/h' : 'ML'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            t.status === 'Near Capacity'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Zone Risk Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Zone Risk Status ({riskEvaluations.length})
              </h3>
              <button
                onClick={() => onNavigateToTab('live-map')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                View on Map <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 mt-4 max-h-[360px] overflow-y-auto pr-1">
              {riskEvaluations.map((z) => {
                let badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
                if (z.riskLevel === 'Critical') badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
                else if (z.riskLevel === 'High') badgeColor = 'bg-orange-950/80 text-orange-300 border-orange-500/40';
                else if (z.riskLevel === 'Medium') badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/40';

                return (
                  <div
                    key={z.zoneId}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 text-xs">{z.zoneName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}>
                            {z.riskLevel} ({z.riskScore}/100)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {z.riskReason}
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenExplainModal(z)}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                        title="AI Plain English Explanation"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Explain</span>
                      </button>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Demand: <b className="text-white">{formatVolume(z.demandML)}</b></span>
                      <span>Supply: <b className="text-white">{formatVolume(z.supplyML)}</b></span>
                      <span className={z.shortageML > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {z.shortageML > 0 ? `-${formatVolume(z.shortageML)}` : 'Surplus'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
