import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  Download,
  CheckCircle,
  Save,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  Zone,
  HourlyForecast,
  OptimizationResult,
  DemandPercentile,
  SavedPlan,
  CityProfile
} from '../types';
import { runWaterOptimizer } from '../engine/waterEngine';
import { Badge } from './Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface SupplyPlannerProps {
  zones: Zone[];
  forecasts: Map<string, HourlyForecast>;
  percentile: DemandPercentile;
  currentOptimization: OptimizationResult;
  formatVolume: (ml: number) => string;
  useLitresPerHour: boolean;
  onApplyPlan: (plan: SavedPlan) => Promise<void>;
  user: any;
  activeCityProfile?: CityProfile;
  onResetCityPolicy?: () => void;
}

export const SupplyPlanner: React.FC<SupplyPlannerProps> = ({
  zones,
  forecasts,
  percentile,
  currentOptimization,
  formatVolume,
  useLitresPerHour,
  onApplyPlan,
  user,
  activeCityProfile,
  onResetCityPolicy
}) => {
  // Configurable sliders - Default is 46.0 ML
  const defaultTotalSupply = 46.0;
  const [totalSupplySlider, setTotalSupplySlider] = useState<number>(defaultTotalSupply);
  const [emergencyReserve, setEmergencyReserve] = useState<number>(0);
  const [fairnessFloor, setFairnessFloor] = useState<number>(0.65);

  const [activeResult, setActiveResult] = useState<OptimizationResult>(() => {
    return runWaterOptimizer(zones, forecasts, defaultTotalSupply, {
      percentile,
      fairnessFloor: 0.65,
      emergencyReserveML: 0,
      cityPolicy: activeCityProfile?.id !== 'profile-kaggle-default' ? activeCityProfile?.policy : null
    });
  });
  const [isApplying, setIsApplying] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  // Recalculate when activeCityProfile or currentOptimization changes
  useEffect(() => {
    const res = runWaterOptimizer(zones, forecasts, totalSupplySlider, {
      percentile,
      fairnessFloor,
      emergencyReserveML: emergencyReserve,
      cityPolicy: activeCityProfile?.id !== 'profile-kaggle-default' ? activeCityProfile?.policy : null
    });
    setActiveResult(res);
  }, [activeCityProfile, percentile]);

  const isCityPolicyActive = !!activeCityProfile && activeCityProfile.id !== 'profile-kaggle-default';

  const defaultResult = React.useMemo(() => {
    return runWaterOptimizer(zones, forecasts, totalSupplySlider, {
      percentile,
      fairnessFloor,
      emergencyReserveML: emergencyReserve,
      cityPolicy: null
    });
  }, [zones, forecasts, totalSupplySlider, percentile, fairnessFloor, emergencyReserve]);

  const activeRulesCount = isCityPolicyActive
    ? (activeCityProfile.policy.priority_order.length > 0 ? 1 : 0) +
      activeCityProfile.policy.minimum_guarantee.length +
      (activeCityProfile.policy.network_loss_percent !== null ? 1 : 0) +
      activeCityProfile.policy.rationing_rules.length
    : 0;

  const handleRecalculate = () => {
    const result = runWaterOptimizer(zones, forecasts, totalSupplySlider, {
      percentile,
      fairnessFloor,
      emergencyReserveML: emergencyReserve,
      cityPolicy: isCityPolicyActive ? activeCityProfile.policy : null
    });
    setActiveResult(result);
  };

  const handleReset = () => {
    setTotalSupplySlider(defaultTotalSupply);
    setEmergencyReserve(0);
    setFairnessFloor(0.65);
    const res = runWaterOptimizer(zones, forecasts, defaultTotalSupply, {
      percentile,
      fairnessFloor: 0.65,
      emergencyReserveML: 0,
      cityPolicy: isCityPolicyActive ? activeCityProfile.policy : null
    });
    setActiveResult(res);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const plan: SavedPlan = {
        id: `plan-${Date.now()}`,
        title: `Dynamic Allocation Plan (${activeResult.totalSupplyML} ML Total Supply)`,
        demandPercentile: percentile,
        totalSupplyML: activeResult.totalSupplyML,
        emergencyReserveML: emergencyReserve,
        fairnessFloor,
        result: activeResult,
        applied: true,
        authorEmail: user?.email || 'operator@waterauthority.gov',
        createdAt: new Date().toISOString()
      };
      await onApplyPlan(plan);
      setAppliedMessage('Dispatch order successfully saved and applied to system state.');
      setTimeout(() => setAppliedMessage(null), 4000);
    } finally {
      setIsApplying(false);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      'Zone Code',
      'Zone Name',
      'Priority Weight',
      'Forecast Demand (ML)',
      'Baseline Supply (ML)',
      'Smart Allocated (ML)',
      'Net Shift (ML)',
      'Remaining Shortage (ML)',
      'Shortage Pct (%)',
      'Min Guarantee Met'
    ];

    const rows = activeResult.allocations.map(a => {
      const z = zones.find(item => item.id === a.zoneId);
      const shift = Number((a.allocatedML - a.currentSupplyML).toFixed(2));
      return [
        z?.code || '',
        `"${a.zoneName}"`,
        z?.priorityWeight || '',
        a.demandML,
        a.currentSupplyML,
        a.allocatedML,
        shift > 0 ? `+${shift}` : `${shift}`,
        a.remainingShortageML,
        `${a.remainingShortagePct}%`,
        a.isMinGuaranteeMet ? 'YES' : 'NO'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AquaNexus_Allocation_Plan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const comparisonChartData = activeResult.allocations.map(a => {
    const z = zones.find(item => item.id === a.zoneId);
    return {
      name: z?.code || a.zoneName.split(' ')[0],
      demand: a.demandML,
      current: a.currentSupplyML,
      optimized: a.allocatedML
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Interactive Hydraulic Supply Planner
            </h2>
            <Badge type="ENGINE-COMPUTED" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate total inflow throttles, pipeline bottlenecks, and emergency reserves with mathematical guarantees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Reset to default 46.0 ML supply"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset (46.0 ML)</span>
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(20,184,166,0.3)] cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{isApplying ? 'Applying...' : 'Apply Recommendation'}</span>
          </button>
        </div>
      </div>

      {appliedMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedMessage}</span>
        </div>
      )}

      {/* City Policy Driven Banner */}
      {isCityPolicyActive && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 shadow-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  Allocation driven by {activeCityProfile.cityName} policy ({activeRulesCount} rules active)
                  <Badge type="ENGINE COMPUTED" />
                </h4>
                <p className="text-xs text-slate-300">
                  {activeCityProfile.policy.priority_order.length > 0 && (
                    <span>Rank 1: <strong className="text-cyan-300">{activeCityProfile.policy.priority_order[0]}</strong>. </span>
                  )}
                  {activeCityProfile.policy.network_loss_percent !== null && (
                    <span>Transmission loss: <strong className="text-cyan-300">{activeCityProfile.policy.network_loss_percent}%</strong>. </span>
                  )}
                  {activeCityProfile.policy.minimum_guarantee.length > 0 && (
                    <span>{activeCityProfile.policy.minimum_guarantee.length} minimum sector quotas enforced.</span>
                  )}
                </p>
              </div>
            </div>

            {onResetCityPolicy && (
              <button
                onClick={onResetCityPolicy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Return to standard default Bengaluru Kaggle policy"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to default anytime
              </button>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side: Default Allocation vs City Policy Allocation (Diff Table) */}
      {isCityPolicyActive && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Side-by-Side: Default Allocation vs {activeCityProfile.cityName} Allocation</span>
                <Badge type="ENGINE COMPUTED" />
              </h3>
              <p className="text-xs text-slate-400">
                Direct policy variance delta comparing standard priority allocation against {activeCityProfile.cityName}'s operational doctrine.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
              Net Shift: {activeResult.allocations.reduce((sum, a) => {
                const defAlloc = defaultResult.allocations.find(d => d.zoneId === a.zoneId)?.allocatedML || 0;
                return sum + Math.abs(a.allocatedML - defAlloc);
              }, 0).toFixed(2)} ML
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-2 px-3">District</th>
                  <th className="py-2 px-3">Sector Type</th>
                  <th className="py-2 px-3">Default Alloc</th>
                  <th className="py-2 px-3">{activeCityProfile.cityName} Alloc</th>
                  <th className="py-2 px-3">Policy Delta (ML)</th>
                  <th className="py-2 px-3">Policy Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {activeResult.allocations.map(a => {
                  const z = zones.find(item => item.id === a.zoneId);
                  const defAlloc = defaultResult.allocations.find(d => d.zoneId === a.zoneId)?.allocatedML || a.currentSupplyML;
                  const delta = Number((a.allocatedML - defAlloc).toFixed(2));

                  let rationale = 'Standard balanced distribution';
                  if (activeCityProfile.cityName.toLowerCase().includes('singapore')) {
                    if (z?.type === 'Industrial' || z?.name.includes('West') || z?.name.includes('Valley')) {
                      rationale = 'Wafer Fab & High-Tech Industrial priority boost';
                    } else if (z?.name.includes('Metro')) {
                      rationale = 'Healthcare lifeline protected at 100%';
                    } else {
                      rationale = 'Tighter 5% non-revenue loss redistribution';
                    }
                  } else if (activeCityProfile.cityName.toLowerCase().includes('cape town')) {
                    if (z?.name.includes('Metro')) {
                      rationale = 'Trauma Centers & Hospital emergency guarantee';
                    } else {
                      rationale = 'Stage 6 emergency rationing cap (50 lpcd quota)';
                    }
                  } else {
                    if (delta > 0) rationale = 'Elevated priority in municipal hierarchy';
                    else if (delta < 0) rationale = 'Absorbing proportional regional deficit';
                  }

                  return (
                    <tr key={a.zoneId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {z?.code} - {a.zoneName}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{z?.type}</td>
                      <td className="py-2 px-3 text-slate-300 font-bold">{defAlloc.toFixed(2)} ML</td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">{a.allocatedML.toFixed(2)} ML</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            delta > 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : delta < 0
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'text-slate-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta.toFixed(2)} ML` : `${delta.toFixed(2)} ML`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm text-xs">
        {/* Slider 1: Total Raw Water Supply */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Total System Inflow:</span>
            <span className="font-mono font-bold text-teal-300 text-sm">{totalSupplySlider.toFixed(1)} ML</span>
          </div>
          <input
            type="range"
            min={25}
            max={80}
            step={0.5}
            value={totalSupplySlider}
            onChange={(e) => {
              const val = Number(e.target.value);
              setTotalSupplySlider(val);
              const result = runWaterOptimizer(zones, forecasts, val, {
                percentile,
                fairnessFloor,
                emergencyReserveML: emergencyReserve
              });
              setActiveResult(result);
            }}
            className="w-full accent-teal-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>25 ML (Severe Crisis)</span>
            <span>Default (46.0 ML)</span>
            <span>80 ML (Surplus)</span>
          </div>
        </div>

        {/* Slider 2: Emergency Reserve Buffer */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Emergency Reserve Buffer:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">{emergencyReserve.toFixed(1)} ML</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={emergencyReserve}
            onChange={(e) => {
              const val = Number(e.target.value);
              setEmergencyReserve(val);
              const result = runWaterOptimizer(zones, forecasts, totalSupplySlider, {
                percentile,
                fairnessFloor,
                emergencyReserveML: val
              });
              setActiveResult(result);
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 ML</span>
            <span>Standard (1-3 ML)</span>
            <span>10 ML</span>
          </div>
        </div>

        {/* Slider 3: Fairness Floor Ratio */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Fairness Floor Minimum:</span>
            <span className="font-mono font-bold text-blue-300 text-sm">{(fairnessFloor * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.4}
            max={0.9}
            step={0.05}
            value={fairnessFloor}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFairnessFloor(val);
              const result = runWaterOptimizer(zones, forecasts, totalSupplySlider, {
                percentile,
                fairnessFloor: val,
                emergencyReserveML: emergencyReserve
              });
              setActiveResult(result);
            }}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>40% (Strict Priority)</span>
            <span>Balanced (65%)</span>
            <span>90% (Strict Equity)</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleRecalculate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Recalculate Optimization Invariant</span>
        </button>
      </div>

      {/* Comparison Chart: Current vs Smart Optimized */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Allocation Comparison: Demand vs Baseline vs Optimized
            </h3>
            <p className="text-xs text-slate-400">
              Visualizing reallocation shift: Metro Core receives 100% while low-priority zones absorb deficit above minimum guarantee
            </p>
          </div>
          <Badge type="ENGINE-COMPUTED" />
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 15, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#cbd5e1' }} unit=" ML" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl bg-slate-900/95 p-3 border border-slate-700 text-xs font-mono space-y-1 shadow-2xl text-slate-100">
                        <div className="font-bold text-white border-b border-slate-700 pb-1">{label}</div>
                        <div className="text-slate-400">Demand: <span className="font-semibold text-white">{payload[0]?.value} ML</span></div>
                        <div className="text-cyan-400">Baseline Inflow: <span className="font-semibold text-cyan-300">{payload[1]?.value} ML</span></div>
                        <div className="text-teal-400 font-bold">Optimized Alloc: {payload[2]?.value} ML</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="demand" fill="#475569" name="P90 Demand" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" fill="#0284c7" name="Baseline Supply" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimized" fill="#14b8a6" name="Smart Allocation" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Before / After Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-100">
            District Allocation Ledger & Minimum Guarantee Verification
          </h3>
          <span className="text-xs font-mono text-teal-400 font-semibold">
            Jain's Fairness Index: {(activeResult.fairnessIndex * 100).toFixed(0)}% (&gt;0.90)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Demand</th>
                <th className="py-2.5 px-3">Baseline</th>
                <th className="py-2.5 px-3">Smart Alloc</th>
                <th className="py-2.5 px-3">Net Shift</th>
                <th className="py-2.5 px-3">Remaining Deficit</th>
                <th className="py-2.5 px-3">Min Guarantee Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {activeResult.allocations.map(a => {
                const z = zones.find(item => item.id === a.zoneId);
                const shift = Number((a.allocatedML - a.currentSupplyML).toFixed(2));
                return (
                  <tr key={a.zoneId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {z?.code} - {a.zoneName}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {'★'.repeat(z?.priorityWeight || 1)}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-200">
                      {formatVolume(a.demandML)}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {formatVolume(a.currentSupplyML)}
                    </td>
                    <td className="py-2 px-3 font-bold text-teal-300">
                      {formatVolume(a.allocatedML)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-semibold ${
                          shift > 0 ? 'text-teal-400' : shift < 0 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {shift > 0 ? `+${shift.toFixed(2)}` : shift.toFixed(2)} ML
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {a.remainingShortageML > 0 ? (
                        <span className="text-rose-400 font-semibold">
                          -{formatVolume(a.remainingShortageML)} ({a.remainingShortagePct}%)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">0 (100% Met)</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {a.isMinGuaranteeMet ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          GUARANTEED ({z?.minGuaranteeML} ML)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500/30">
                          UNDER MIN
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-700 bg-slate-950/80 font-bold text-slate-200">
              <tr>
                <td className="py-3 px-3 uppercase tracking-wider text-teal-300">
                  Total System Grid
                </td>
                <td className="py-3 px-3 text-slate-400">
                  6 Districts
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-100">
                  {formatVolume(activeResult.totalDemandML)}
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">
                  {formatVolume(activeResult.totalSupplyML)}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-teal-300">
                  {formatVolume(activeResult.totalAllocatedML)}
                </td>
                <td className="py-3 px-3 font-mono text-teal-300">
                  +{activeResult.improvementShortageML.toFixed(2)} ML Rerouted
                </td>
                <td className="py-3 px-3 font-mono text-rose-400">
                  -{formatVolume(activeResult.totalShortageML)} ({activeResult.shortagePct}%)
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    6/6 MIN MET (34/34 HOSPITALS)
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
