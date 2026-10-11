import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  ArrowUpRight,
  Clock,
  Sparkles,
  Search,
  MapPin
} from 'lucide-react';
import { Anomaly, AnomalyStatus, AnomalySeverity } from '../types';
import { Badge } from './Badge';

interface AnomalyRadarProps {
  anomalies: Anomaly[];
  onUpdateStatus: (id: string, status: AnomalyStatus) => Promise<void>;
  user: any;
  onLoginPrompt: () => void;
  onViewOnMap: (zoneId: string) => void;
}

export const AnomalyRadar: React.FC<AnomalyRadarProps> = ({
  anomalies,
  onUpdateStatus,
  user,
  onLoginPrompt,
  onViewOnMap
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'All' | AnomalySeverity>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | AnomalyStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = anomalies.filter(a => {
    if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'All' && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.zoneName.toLowerCase().includes(q) ||
        a.hypothesis.toLowerCase().includes(q) ||
        a.recommendedAction.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: AnomalyStatus) => {
    setUpdatingId(id);
    try {
      await onUpdateStatus(id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = anomalies.filter(a => a.status === 'Investigating').length;
  const resolvedCount = anomalies.filter(a => a.status === 'Resolved').length;
  const falseAlarmCount = anomalies.filter(a => a.status === 'False alarm').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics - Requirement 3: Badge is DEMO DATA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Telemetry Anomaly Radar & Hypothesis Tracker
            </h2>
            <Badge type="DEMO DATA" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time hydraulic pattern deviations detected against diurnal statistical baselines.
            Causes are evaluated as operational hypotheses pending field verification.
          </p>
        </div>

        {/* Quick Tally Chips */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-center">
            <span className="text-[10px] text-rose-400 font-mono block">Investigating</span>
            <span className="text-base font-bold font-mono text-rose-200">{activeCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-center">
            <span className="text-[10px] text-emerald-400 font-mono block">Resolved</span>
            <span className="text-base font-bold font-mono text-emerald-200">{resolvedCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono block">False Alarm</span>
            <span className="text-base font-bold font-mono text-slate-300">{falseAlarmCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sector, hypothesis, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Severities</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="Low" className="bg-slate-900">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Statuses</option>
              <option value="Investigating" className="bg-slate-900">Investigating</option>
              <option value="Resolved" className="bg-slate-900">Resolved</option>
              <option value="False alarm" className="bg-slate-900">False Alarm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anomalies Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            No telemetry anomalies match the selected filters.
          </div>
        ) : (
          filtered.map((anomaly) => {
            let severityColor = 'text-rose-400 bg-rose-950/80 border-rose-500/50';
            if (anomaly.severity === 'High') severityColor = 'text-orange-400 bg-orange-950/80 border-orange-500/50';
            else if (anomaly.severity === 'Medium') severityColor = 'text-amber-400 bg-amber-950/80 border-amber-500/50';
            else if (anomaly.severity === 'Low') severityColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50';

            return (
              <div
                key={anomaly.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${severityColor}`}>
                      {anomaly.severity}
                    </span>
                    <h3 className="text-sm font-bold text-white">{anomaly.zoneName}</h3>
                    <Badge type="DEMO DATA" />
                  </div>

                  {/* Right Header Buttons: View on Map + Status Picker */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Requirement 6: View on Map Button */}
                    <button
                      onClick={() => onViewOnMap(anomaly.zoneId)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer shadow-md"
                      title="Inspect zone on geospatial Live Map"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View on Map</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                      <select
                        value={anomaly.status}
                        disabled={updatingId === anomaly.id}
                        onChange={(e) => handleStatusChange(anomaly.id, e.target.value as AnomalyStatus)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md border focus:outline-none cursor-pointer transition-colors ${
                          anomaly.status === 'Investigating'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                            : anomaly.status === 'Resolved'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="Investigating" className="bg-slate-900 text-slate-100">Investigating</option>
                        <option value="Resolved" className="bg-slate-900 text-slate-100">Resolved</option>
                        <option value="False alarm" className="bg-slate-900 text-slate-100">False alarm</option>
                      </select>
                      {updatingId === anomaly.id && (
                        <span className="text-[10px] text-cyan-400 animate-pulse font-mono">Saving...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantitative Telemetry Bar: Expected vs Actual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telemetry Actual Inflow:</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-lg font-mono font-bold text-white">
                        {anomaly.actualDemandML.toFixed(2)} ML
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          anomaly.deviationPct > 0 ? 'text-rose-400' : 'text-cyan-400'
                        }`}
                      >
                        {anomaly.deviationPct > 0 ? `+${anomaly.deviationPct}%` : `${anomaly.deviationPct}%`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Expected Confidence Band:</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-base font-mono font-semibold text-teal-400">
                        {anomaly.expectedRangeMinML.toFixed(2)} - {anomaly.expectedRangeMaxML.toFixed(2)} ML
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">(95% Interval)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Timestamp / Telemetry Sensor:</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-300 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(anomaly.timestamp).toUTCString().slice(5, 22)}</span>
                    </div>
                  </div>
                </div>

                {/* Hypotheses & Recommended Action */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Diagnostic Hypothesis:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px] pl-5">
                      {anomaly.hypothesis}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-teal-950/50 border border-teal-500/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-teal-300 font-semibold">
                      <ArrowUpRight className="w-3.5 h-3.5 text-teal-400" />
                      <span>Recommended Field Action:</span>
                    </div>
                    <p className="text-teal-200 leading-relaxed text-[11px] pl-5">
                      {anomaly.recommendedAction}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
