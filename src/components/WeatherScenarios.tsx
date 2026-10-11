import React, { useState } from 'react';
import {
  CloudSun,
  Flame,
  PartyPopper,
  AlertOctagon,
  Droplets,
  Save,
  CheckCircle,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import {
  Zone,
  HourlyForecast,
  ZoneSensitivity,
  ScenarioDefinition,
  OptimizationResult,
  DemandPercentile
} from '../types';
import { SEED_SENSITIVITIES } from '../data/seedData';
import { runWaterOptimizer } from '../engine/waterEngine';
import { Badge } from './Badge';

interface WeatherScenariosProps {
  zones: Zone[];
  forecasts: Map<string, HourlyForecast>;
  percentile: DemandPercentile;
  formatVolume: (ml: number) => string;
  useLitresPerHour: boolean;
  onSaveScenario: (scenario: ScenarioDefinition) => Promise<void>;
  user: any;
}

export const WeatherScenarios: React.FC<WeatherScenariosProps> = ({
  zones,
  forecasts,
  percentile,
  formatVolume,
  useLitresPerHour,
  onSaveScenario,
  user
}) => {
  const [selectedPreset, setSelectedPreset] = useState<
    'Normal' | 'Heatwave' | 'Festival' | 'Pipeline burst' | 'Supply disruption' | 'Custom'
  >('Normal');

  const [tempDeltaC, setTempDeltaC] = useState<number>(0);
  const [rainDeltaMm, setRainDeltaMm] = useState<number>(0);
  const [supplyReductionPct, setSupplyReductionPct] = useState<number>(0);
  const [burstZoneId, setBurstZoneId] = useState<string>('zone-4');

  const [savedScenarios, setSavedScenarios] = useState<ScenarioDefinition[]>([
    {
      id: 'scen-preset-1',
      title: 'Historical Baseline Normal',
      preset: 'Normal',
      tempDeltaC: 0,
      rainDeltaMm: 0,
      supplyReductionPct: 0,
      createdAt: '2026-10-10T12:00:00Z'
    },
    {
      id: 'scen-preset-2',
      title: 'Severe Urban Heatwave (+5°C)',
      preset: 'Heatwave',
      tempDeltaC: 5,
      rainDeltaMm: 0,
      supplyReductionPct: 0,
      createdAt: '2026-10-10T14:30:00Z'
    },
    {
      id: 'scen-preset-3',
      title: 'Sector 4 Trunk Main Failure (-30% Supply)',
      preset: 'Pipeline burst',
      tempDeltaC: 2,
      rainDeltaMm: 0,
      supplyReductionPct: 30,
      burstZoneId: 'zone-4',
      createdAt: '2026-10-10T16:00:00Z'
    }
  ]);

  const [scenarioTitle, setScenarioTitle] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Apply Presets
  const applyPreset = (preset: typeof selectedPreset) => {
    setSelectedPreset(preset);
    if (preset === 'Normal') {
      setTempDeltaC(0);
      setRainDeltaMm(0);
      setSupplyReductionPct(0);
    } else if (preset === 'Heatwave') {
      setTempDeltaC(5.0);
      setRainDeltaMm(-2.0);
      setSupplyReductionPct(0);
    } else if (preset === 'Festival') {
      // Large tourist surge in Metro Core + East Valley
      setTempDeltaC(2.0);
      setRainDeltaMm(0);
      setSupplyReductionPct(0);
    } else if (preset === 'Pipeline burst') {
      setTempDeltaC(1.0);
      setRainDeltaMm(0);
      setSupplyReductionPct(30);
      setBurstZoneId('zone-4');
    } else if (preset === 'Supply disruption') {
      setTempDeltaC(3.0);
      setRainDeltaMm(-5.0);
      setSupplyReductionPct(20);
    }
  };

  // Compute Adjusted Demands based on Sensitivity Grid
  const sensitivityMap = new Map(SEED_SENSITIVITIES.map(s => [s.zoneId, s]));
  const baseTotalSupply = zones.reduce((a, b) => a + b.currentSupplyML, 0);
  const adjustedTotalSupply = baseTotalSupply * (1 - supplyReductionPct / 100);

  // Adjusted Forecasts
  const adjustedForecastMap = new Map<string, HourlyForecast>();
  zones.forEach(z => {
    const orig = forecasts.get(z.id);
    const sens = sensitivityMap.get(z.id) || { tempElasticityPctPerC: 2.0, rainElasticityPctPerMm: -0.3, baselineTempC: 22 };
    const tempImpact = 1 + (tempDeltaC * sens.tempElasticityPctPerC) / 100;
    const rainImpact = Math.max(0.7, 1 + (rainDeltaMm * sens.rainElasticityPctPerMm) / 100);

    const festivalBump = selectedPreset === 'Festival' && (z.id === 'zone-1' || z.id === 'zone-4') ? 1.18 : 1.0;
    const factor = tempImpact * rainImpact * festivalBump;

    const baseP50 = orig?.p50DemandML ?? z.currentSupplyML;
    const baseP90 = orig?.p90DemandML ?? z.currentSupplyML * 1.15;

    adjustedForecastMap.set(z.id, {
      zoneId: z.id,
      horizonHour: orig?.horizonHour ?? 6,
      timestamp: orig?.timestamp ?? new Date().toISOString(),
      p10DemandML: Number((baseP50 * 0.9 * factor).toFixed(2)),
      p50DemandML: Number((baseP50 * factor).toFixed(2)),
      p90DemandML: Number((baseP90 * factor).toFixed(2)),
      lastWeekDemandML: orig?.lastWeekDemandML ?? baseP50,
      temperatureC: (orig?.temperatureC ?? 24) + tempDeltaC,
      rainMm: Math.max(0, (orig?.rainMm ?? 0) + rainDeltaMm)
    });
  });

  // Run Optimizer on this what-if scenario
  const scenarioResult: OptimizationResult = runWaterOptimizer(
    zones,
    adjustedForecastMap,
    adjustedTotalSupply,
    { percentile, fairnessFloor: 0.65 }
  );

  const handleSaveScenario = async () => {
    const title = scenarioTitle.trim() || `${selectedPreset} Scenario (${tempDeltaC > 0 ? `+${tempDeltaC}°C` : `${tempDeltaC}°C`}, -${supplyReductionPct}% Supply)`;
    const newScen: ScenarioDefinition = {
      id: `scen-${Date.now()}`,
      title,
      preset: selectedPreset,
      tempDeltaC,
      rainDeltaMm,
      supplyReductionPct,
      burstZoneId,
      authorEmail: user?.email || 'operator@waterauthority.gov',
      createdAt: new Date().toISOString()
    };

    try {
      await onSaveScenario(newScen);
      setSavedScenarios(prev => [newScen, ...prev]);
      setSaveSuccessMsg(`Scenario "${title}" saved successfully to grid scenarios.`);
      setScenarioTitle('');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      setSavedScenarios(prev => [newScen, ...prev]);
      setSaveSuccessMsg(`Scenario "${title}" stored locally.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Weather Sensitivity & Crisis Scenario Simulator
            </h2>
            <Badge type="WHAT-IF" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate climate shocks, heatwaves, and emergency main bursts using empirical elasticity grids.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge type="SIMULATED" />
          <span className="text-xs text-slate-400 font-mono">Sensitivity Elasticity Model</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'Normal', label: 'Normal Baseline', icon: <Droplets className="w-4 h-4 text-cyan-400" /> },
          { id: 'Heatwave', label: 'Severe Heatwave', icon: <Flame className="w-4 h-4 text-orange-400" /> },
          { id: 'Festival', label: 'Civic Festival (+18%)', icon: <PartyPopper className="w-4 h-4 text-purple-400" /> },
          { id: 'Pipeline burst', label: 'Pipeline Burst (-30%)', icon: <AlertOctagon className="w-4 h-4 text-rose-400" /> },
          { id: 'Supply disruption', label: 'Supply Drought', icon: <Layers className="w-4 h-4 text-amber-400" /> }
        ].map((p) => {
          const isActive = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id as any)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-950/80 border-sky-500/50 text-cyan-300 shadow-md ring-1 ring-sky-400'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Controls Grid: Temperature, Rain, Supply Shock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl text-xs">
        {/* Temperature Delta */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-200">Temperature Shift (ΔT):</span>
            <span className="font-mono font-bold text-orange-400 text-sm">
              {tempDeltaC > 0 ? `+${tempDeltaC}°C` : `${tempDeltaC}°C`}
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={10}
            step={0.5}
            value={tempDeltaC}
            onChange={(e) => {
              setSelectedPreset('Custom');
              setTempDeltaC(Number(e.target.value));
            }}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Rule of thumb: <b className="text-teal-400">+3°C raises East Valley by ~8.4%</b> and Highland by ~9.6%.
          </p>
        </div>

        {/* Rain Delta */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-200">Precipitation Shift:</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {rainDeltaMm > 0 ? `+${rainDeltaMm}mm` : `${rainDeltaMm}mm`}
            </span>
          </div>
          <input
            type="range"
            min={-10}
            max={25}
            step={1}
            value={rainDeltaMm}
            onChange={(e) => {
              setSelectedPreset('Custom');
              setRainDeltaMm(Number(e.target.value));
            }}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Suburban lawn irrigation drops ~0.8% per mm of rainfall.
          </p>
        </div>

        {/* Supply Shock */}
        <div className="space-y-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-200">Inflow Supply Loss:</span>
            <span className="font-mono font-bold text-rose-400 text-sm">
              -{supplyReductionPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={supplyReductionPct}
            onChange={(e) => {
              setSelectedPreset('Custom');
              setSupplyReductionPct(Number(e.target.value));
            }}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Available supply: <b className="text-white">{adjustedTotalSupply.toFixed(1)} ML</b> (down from {baseTotalSupply.toFixed(1)} ML)
          </p>
        </div>
      </div>

      {/* What-If Impact Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Scenario Total Demand</span>
          <span className="text-xl font-mono font-bold text-white">
            {formatVolume(scenarioResult.totalDemandML)} {useLitresPerHour ? 'L/h' : 'ML'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {tempDeltaC > 0 ? `+${(tempDeltaC * 2.2).toFixed(1)}% weather surge` : 'Baseline'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Remaining Grid Shortfall</span>
          <span className={`text-xl font-mono font-bold ${scenarioResult.totalShortageML > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatVolume(scenarioResult.totalShortageML)} {useLitresPerHour ? 'L/h' : 'ML'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            ({scenarioResult.shortagePct.toFixed(1)}% of demand)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Inter-Zone Transfers</span>
          <span className="text-xl font-mono font-bold text-cyan-400">
            {scenarioResult.transfers.length} Pipe Routes
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {scenarioResult.transfers.reduce((a, b) => a + b.amountML, 0).toFixed(1)} ML rerouted
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Critical Facilities Protected</span>
          <span className="text-xl font-mono font-bold text-emerald-400">
            {scenarioResult.criticalFacilitiesFullyServed} / {scenarioResult.totalCriticalFacilities}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Priority protection enforced
          </span>
        </div>
      </div>

      {/* Save Scenario Form */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex-1 w-full flex items-center gap-2">
          <Save className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder="Scenario name (e.g., Summer Peak Heatwave + Pipe Burst)..."
            value={scenarioTitle}
            onChange={(e) => setScenarioTitle(e.target.value)}
            className="w-full bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={handleSaveScenario}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shrink-0 shadow-md shadow-sky-950/50 cursor-pointer"
        >
          Save What-If Scenario
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Saved Scenarios Comparison Ledger */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white">Saved Scenario Vault ({savedScenarios.length})</h3>
        <div className="space-y-2">
          {savedScenarios.map(scen => (
            <div
              key={scen.id}
              className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{scen.title}</span>
                  <Badge type="WHAT-IF" size="xs" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Preset: {scen.preset} • ΔT: {scen.tempDeltaC > 0 ? `+${scen.tempDeltaC}°C` : `${scen.tempDeltaC}°C`} • Supply Shock: -{scen.supplyReductionPct}%
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedPreset(scen.preset as any);
                  setTempDeltaC(scen.tempDeltaC);
                  setRainDeltaMm(scen.rainDeltaMm);
                  setSupplyReductionPct(scen.supplyReductionPct);
                  if (scen.burstZoneId) setBurstZoneId(scen.burstZoneId);
                }}
                className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[11px] font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                Load Parameters
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
