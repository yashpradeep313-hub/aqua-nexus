import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import {
  Zone,
  ZoneRiskEvaluation,
  OptimizationResult,
  HourlyForecast,
  Anomaly,
  RiskLevel
} from '../types';
import { Badge } from './Badge';
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Droplets,
  Layers,
  Filter,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Globe,
  Compass
} from 'lucide-react';

interface LiveMapProps {
  zones: Zone[];
  riskEvaluations: ZoneRiskEvaluation[];
  optimizationResult: OptimizationResult;
  forecasts: Map<string, HourlyForecast>;
  anomalies: Anomaly[];
  horizonHour: number;
  setHorizonHour: (h: number) => void;
  formatVolume: (ml: number) => string;
  useLitresPerHour: boolean;
  onOpenExplainModal: (zone: ZoneRiskEvaluation) => void;
  externalSelectedZoneId?: string | null;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: '#10b981',      // Emerald Green (<5%)
  Medium: '#eab308',   // Yellow (5-15%)
  High: '#f97316',     // Orange (15-30%)
  Critical: '#ef4444'  // Red (>30%)
};

// Bengaluru Geographical Center
const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

export const LiveMap: React.FC<LiveMapProps> = ({
  zones,
  riskEvaluations,
  optimizationResult,
  forecasts,
  anomalies,
  horizonHour,
  setHorizonHour,
  formatVolume,
  useLitresPerHour,
  onOpenExplainModal,
  externalSelectedZoneId
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCFufJ8OLcam5LBwVAmfJAK2tnoghlbris';

  // Map Provider: Default to Google Maps Platform as requested by user
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>('google');
  const [googleMapTypeId, setGoogleMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(zones[0]?.id || null);
  const [filterRisk, setFilterRisk] = useState<'All' | RiskLevel>('All');
  const [infoWindowZoneId, setInfoWindowZoneId] = useState<string | null>(null);

  // Sync external selected zone if passed from Anomaly Radar "View on Map"
  useEffect(() => {
    if (externalSelectedZoneId) {
      setInternalSelectedZoneId(externalSelectedZoneId);
      setInfoWindowZoneId(externalSelectedZoneId);
    }
  }, [externalSelectedZoneId]);

  const selectedZoneId = internalSelectedZoneId;

  // Filtered zones
  const displayedEvaluations = riskEvaluations.filter(r => {
    if (filterRisk !== 'All' && r.riskLevel !== filterRisk) return false;
    return true;
  });

  const selectedEvaluation = riskEvaluations.find(r => r.zoneId === selectedZoneId);
  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const selectedAllocation = optimizationResult.allocations.find(a => a.zoneId === selectedZoneId);
  const zoneAnomaly = anomalies.find(a => a.zoneId === selectedZoneId && a.status !== 'False alarm');

  const unit = useLitresPerHour ? 'L/h' : 'ML';

  // Initialize Leaflet Map centered on Bengaluru (12.9716, 77.5946)
  useEffect(() => {
    if (mapProvider !== 'leaflet' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [BENGALURU_CENTER.lat, BENGALURU_CENTER.lng],
        zoom: 11,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'dark-map-tiles'
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    const layerGroup = layerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Network Interconnection Pipelines
    const drawnLines = new Set<string>();
    zones.forEach(zone => {
      zone.connectedZoneIds.forEach(targetId => {
        const pairKey = [zone.id, targetId].sort().join('-');
        if (!drawnLines.has(pairKey)) {
          drawnLines.add(pairKey);
          const targetZone = zones.find(z => z.id === targetId);
          if (targetZone) {
            L.polyline(
              [
                [zone.latitude, zone.longitude],
                [targetZone.latitude, targetZone.longitude]
              ],
              {
                color: '#475569',
                weight: 2,
                dashArray: '4, 8',
                opacity: 0.6
              }
            ).addTo(layerGroup);
          }
        }
      });
    });

    // 2. Draw Transfer Pipes between donor zones and deficit zones
    optimizationResult.transfers.forEach(transfer => {
      const fromZ = zones.find(z => z.id === transfer.fromZoneId);
      const toZ = zones.find(z => z.id === transfer.toZoneId);
      if (fromZ && toZ) {
        const transferLine = L.polyline(
          [
            [fromZ.latitude, fromZ.longitude],
            [toZ.latitude, toZ.longitude]
          ],
          {
            color: '#06b6d4',
            weight: 4,
            opacity: 0.9,
            className: 'transfer-pipe-animated animate-pulse'
          }
        ).addTo(layerGroup);

        transferLine.bindTooltip(
          `Cauvery Interconnection Route: ${transfer.amountML} ML from ${transfer.fromZoneName} to ${transfer.toZoneName}`,
          { permanent: false, direction: 'center', className: 'leaflet-tooltip text-xs font-mono' }
        );
      }
    });

    // 3. Draw Zone Circles & Markers with Anomaly Indicators
    displayedEvaluations.forEach(evalItem => {
      const zone = zones.find(z => z.id === evalItem.zoneId);
      if (!zone) return;

      const color = RISK_COLORS[evalItem.riskLevel];
      const isSelected = zone.id === selectedZoneId;
      const zoneActiveAnomaly = anomalies.find(a => a.zoneId === zone.id && a.status !== 'False alarm');

      L.circle([zone.latitude, zone.longitude], {
        radius: isSelected ? 2400 : 1800,
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.35 : 0.2,
        weight: isSelected ? 3 : 1.5
      })
        .addTo(layerGroup)
        .on('click', () => setInternalSelectedZoneId(zone.id));

      const markerHtml = `
        <div class="cursor-pointer group flex flex-col items-center pointer-events-auto">
          <div class="px-2 py-1.5 rounded-lg shadow-xl font-mono text-[10px] border flex flex-col gap-0.5 min-w-[125px] transition-transform hover:scale-105"
               style="background-color: #090d16; border-color: ${color}; color: #f8fafc; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
            <div class="flex items-center justify-between border-b border-slate-800 pb-0.5">
              <span class="font-bold text-white">${zone.code}</span>
              <span class="px-1 py-0.2 rounded text-[8px] font-bold uppercase" style="color: ${color}; background-color: rgba(255,255,255,0.06); border: 1px solid ${color}40;">
                ${evalItem.riskLevel}
              </span>
            </div>
            <div class="flex justify-between items-center text-[9px] text-slate-300 pt-0.5">
              <span class="text-slate-400">Demand:</span>
              <span class="font-bold text-cyan-300">${formatVolume(evalItem.demandML)} ${unit}</span>
            </div>
            <div class="flex justify-between items-center text-[9px] text-slate-300">
              <span class="text-slate-400">Current:</span>
              <span class="font-bold text-slate-200">${formatVolume(evalItem.supplyML)} ${unit}</span>
            </div>
            <div class="flex justify-between items-center text-[9px] font-bold" style="color: ${color};">
              <span>Shortage:</span>
              <span>${evalItem.shortageML > 0 ? `-${formatVolume(evalItem.shortageML)} (-${evalItem.shortagePct}%)` : 'Surplus'}</span>
            </div>
            ${zoneActiveAnomaly ? `
              <div class="mt-0.5 pt-0.5 border-t border-rose-900/60 flex items-center justify-between text-[8px] text-rose-400 font-bold">
                <span>⚠️ ABNORMAL</span>
                <span>+${zoneActiveAnomaly.deviationPct}%</span>
              </div>
            ` : ''}
          </div>
          <div class="w-3.5 h-3.5 rounded-full border-2 border-slate-900 mt-1 shadow-lg ring-1 ring-white/20" style="background-color: ${color}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-zone-marker',
        html: markerHtml,
        iconSize: [135, 80],
        iconAnchor: [67, 40]
      });

      L.marker([zone.latitude, zone.longitude], { icon: customIcon })
        .addTo(layerGroup)
        .on('click', () => setInternalSelectedZoneId(zone.id));
    });
  }, [zones, displayedEvaluations, optimizationResult, selectedZoneId, anomalies, mapProvider]);

  return (
    <div className="space-y-4">
      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-white">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>BENGALURU CAUVERY WATER GRID (BWSSB DIGITAL TWIN)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-cyan-300 border border-sky-500/40">
            BENGALURU, INDIA (12.9716° N, 77.5946° E)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Map Engine Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setMapProvider('google')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mapProvider === 'google'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Google Maps Platform</span>
              <span className="text-[9px] bg-sky-900/80 px-1 py-0.2 rounded font-mono">Official</span>
            </button>
            <button
              onClick={() => setMapProvider('leaflet')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                mapProvider === 'leaflet'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OpenStreetMap
            </button>
          </div>

          {/* Google Maps Layer Type Selector */}
          {mapProvider === 'google' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              {(['roadmap', 'satellite', 'terrain', 'hybrid'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setGoogleMapTypeId(type)}
                  className={`px-2 py-1 rounded capitalize transition-all cursor-pointer font-medium ${
                    googleMapTypeId === type
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Risk Filter:</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as any)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-100">All Levels</option>
              <option value="Low" className="bg-slate-900 text-slate-100">Low (&lt;5% deficit)</option>
              <option value="Medium" className="bg-slate-900 text-slate-100">Medium (5-15%)</option>
              <option value="High" className="bg-slate-900 text-slate-100">High (15-30%)</option>
              <option value="Critical" className="bg-slate-900 text-slate-100">Critical (&gt;30%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-8 relative rounded-xl border border-slate-800 overflow-hidden h-[540px] bg-slate-950 shadow-2xl">
          {mapProvider === 'google' ? (
            <APIProvider apiKey={googleMapsApiKey}>
              <GoogleMap
                defaultCenter={BENGALURU_CENTER}
                defaultZoom={11}
                mapId="DEMO_MAP_ID"
                mapTypeId={googleMapTypeId}
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Advanced Markers for each Bengaluru Zone */}
                {displayedEvaluations.map(evalItem => {
                  const zone = zones.find(z => z.id === evalItem.zoneId);
                  if (!zone) return null;
                  const color = RISK_COLORS[evalItem.riskLevel];
                  const isSelected = zone.id === selectedZoneId;
                  const zoneActiveAnomaly = anomalies.find(a => a.zoneId === zone.id && a.status !== 'False alarm');

                  return (
                    <AdvancedMarker
                      key={zone.id}
                      position={{ lat: zone.latitude, lng: zone.longitude }}
                      onClick={() => {
                        setInternalSelectedZoneId(zone.id);
                        setInfoWindowZoneId(zone.id);
                      }}
                      title={`${zone.name} (${zone.code})`}
                    >
                      <div className="cursor-pointer group flex flex-col items-center">
                        <div
                          className={`px-2.5 py-1.5 rounded-lg shadow-2xl font-mono text-[10px] border flex flex-col gap-0.5 min-w-[125px] transition-transform hover:scale-105 ${
                            isSelected ? 'ring-2 ring-cyan-400 scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: '#090d16',
                            borderColor: color,
                            color: '#f8fafc',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-0.5">
                            <span className="font-bold text-white">{zone.code}</span>
                            <span
                              className="px-1 py-0.2 rounded text-[8px] font-bold uppercase"
                              style={{ color: color, backgroundColor: 'rgba(255,255,255,0.06)', border: `1px solid ${color}40` }}
                            >
                              {evalItem.riskLevel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-300 pt-0.5">
                            <span className="text-slate-400">Demand:</span>
                            <span className="font-bold text-cyan-300">{formatVolume(evalItem.demandML)} {unit}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-300">
                            <span className="text-slate-400">Current:</span>
                            <span className="font-bold text-slate-200">{formatVolume(evalItem.supplyML)} {unit}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold" style={{ color: color }}>
                            <span>Shortage:</span>
                            <span>{evalItem.shortageML > 0 ? `-${formatVolume(evalItem.shortageML)} (-${evalItem.shortagePct}%)` : 'Surplus'}</span>
                          </div>
                          {zoneActiveAnomaly && (
                            <div className="mt-0.5 pt-0.5 border-t border-rose-900/60 flex items-center justify-between text-[8px] text-rose-400 font-bold">
                              <span>⚠️ ABNORMAL</span>
                              <span>+{zoneActiveAnomaly.deviationPct}%</span>
                            </div>
                          )}
                        </div>
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 mt-1 shadow-lg ring-1 ring-white/20"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* InfoWindow for active clicked zone */}
                {infoWindowZoneId && (() => {
                  const zone = zones.find(z => z.id === infoWindowZoneId);
                  const evalItem = riskEvaluations.find(r => r.zoneId === infoWindowZoneId);
                  if (!zone || !evalItem) return null;
                  const color = RISK_COLORS[evalItem.riskLevel];

                  return (
                    <InfoWindow
                      position={{ lat: zone.latitude, lng: zone.longitude }}
                      onCloseClick={() => setInfoWindowZoneId(null)}
                      headerContent={
                        <div className="font-bold text-slate-900 text-xs">
                          {zone.name} ({zone.code})
                        </div>
                      }
                    >
                      <div className="text-[11px] font-mono text-slate-800 space-y-1 p-1">
                        <div>Type: <b>{zone.type} District</b></div>
                        <div>Priority Weight: <b>{zone.priorityWeight}/5</b></div>
                        <div>Critical Facilities: <b>{zone.criticalFacilities} Lifelines</b></div>
                        <div>Forecast Demand: <b>{formatVolume(evalItem.demandML)} {unit}</b></div>
                        <div>Available Supply: <b>{formatVolume(evalItem.supplyML)} {unit}</b></div>
                        <div style={{ color }}>
                          Shortage: <b>{evalItem.shortageML > 0 ? `-${formatVolume(evalItem.shortageML)} (${evalItem.shortagePct}%)` : 'Supply Surplus'}</b>
                        </div>
                        <div>Shortage Risk: <b style={{ color }}>{evalItem.riskLevel} ({evalItem.riskScore}/100)</b></div>
                      </div>
                    </InfoWindow>
                  );
                })()}
              </GoogleMap>
            </APIProvider>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full z-0" />
          )}

          {/* Floating Map Legend */}
          <div className="absolute top-3 left-3 z-10 p-3 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] space-y-1.5 shadow-xl">
            <div className="font-bold text-white text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>Bengaluru Sector Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Low Risk (&lt;5% deficit)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-slate-300">Medium Risk (5-15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-slate-300">High Risk (15-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-300">Critical Risk (&gt;30%)</span>
            </div>
            <div className="pt-1 border-t border-slate-800 flex items-center gap-2">
              <span className="w-5 h-1 bg-cyan-400 rounded"></span>
              <span className="text-cyan-300 font-mono font-semibold">Cauvery Booster Route ({optimizationResult.transfers.length})</span>
            </div>
          </div>
        </div>

        {/* Selected Zone Deep-Dive Inspection Panel */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/95 p-5 space-y-4 shadow-xl overflow-y-auto max-h-[540px]">
          {selectedZone && selectedEvaluation ? (
            <>
              {/* Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40">
                    {selectedZone.code} • {selectedZone.type}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    Priority Weight: {selectedZone.priorityWeight}/5
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-2">{selectedZone.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedZone.criticalFacilities} Critical Facilities • {selectedZone.households.toLocaleString()} Households
                </p>

                {/* Status Badges */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                      Shortage Risk
                    </span>
                    <span
                      className="font-mono text-xs font-bold mt-0.5 inline-block"
                      style={{ color: RISK_COLORS[selectedEvaluation.riskLevel] }}
                    >
                      {selectedEvaluation.riskLevel} (-{selectedEvaluation.shortagePct}%)
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                      Anomaly Status
                    </span>
                    {zoneAnomaly ? (
                      <span className="font-mono text-xs font-bold text-rose-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>+{zoneAnomaly.deviationPct}% Alert</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Normal Flow</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Demand vs Supply Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Forecast Demand</span>
                    <Badge type="MODEL OUTPUT" />
                  </div>
                  <span className="text-base font-mono font-bold text-white mt-1 block">
                    {formatVolume(selectedEvaluation.demandML)} {unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Current Inflow</span>
                    <Badge type="DEMO DATA" />
                  </div>
                  <span className="text-base font-mono font-bold text-cyan-400 mt-1 block">
                    {formatVolume(selectedEvaluation.supplyML)} {unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deficit/Surplus</span>
                    <Badge type="ENGINE-COMPUTED" />
                  </div>
                  <span
                    className={`text-base font-mono font-bold mt-1 block ${
                      selectedEvaluation.shortageML > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedEvaluation.shortageML > 0
                      ? `-${formatVolume(selectedEvaluation.shortageML)} (${selectedEvaluation.shortagePct}%)`
                      : `+${formatVolume(selectedEvaluation.surplusML)}`}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Smart Allocation</span>
                    <Badge type="ENGINE-COMPUTED" />
                  </div>
                  <span className="text-base font-mono font-bold text-teal-400 mt-1 block">
                    {formatVolume(selectedAllocation?.allocatedML || selectedEvaluation.supplyML)} {unit}
                  </span>
                </div>
              </div>

              {/* Risk Diagnostic Reason */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <span className="font-semibold text-slate-200 block">Why this risk rating?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedEvaluation.riskReason}
                </p>
                {selectedEvaluation.hoursToDepletion && (
                  <p className="text-amber-400 font-mono text-[11px] pt-1 font-semibold">
                    Est. ground-level reservoir (GLR) depletion: ~{selectedEvaluation.hoursToDepletion} hours at current shortfall
                  </p>
                )}
              </div>

              {/* Anomaly Hypotheses Notice if flagged */}
              {zoneAnomaly && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Telemetry Anomaly Flagged ({zoneAnomaly.severity})</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {zoneAnomaly.hypothesis}
                  </p>
                  <p className="text-rose-300 text-[11px] font-mono font-medium pt-0.5">
                    Action: {zoneAnomaly.recommendedAction}
                  </p>
                </div>
              )}

              {/* Inter-District Transfer Connections for this zone */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <span className="font-semibold text-slate-200 block">
                  Active Cauvery Interconnection Pipelines
                </span>
                <div className="space-y-1.5 text-[11px] font-mono">
                  {optimizationResult.transfers.filter(t => t.fromZoneId === selectedZone.id || t.toZoneId === selectedZone.id).length > 0 ? (
                    optimizationResult.transfers
                      .filter(t => t.fromZoneId === selectedZone.id || t.toZoneId === selectedZone.id)
                      .map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className={t.fromZoneId === selectedZone.id ? 'text-amber-400' : 'text-emerald-400'}>
                            {t.fromZoneId === selectedZone.id ? `Exporting to ${t.toZoneName}` : `Importing from ${t.fromZoneName}`}
                          </span>
                          <span className="font-bold text-white">
                            {formatVolume(t.amountML)} {unit}
                          </span>
                        </div>
                      ))
                  ) : (
                    <span className="text-slate-500 italic block">No active transfers on this sector boundary.</span>
                  )}
                </div>
              </div>

              {/* AI Plain English Explanation Button */}
              <button
                onClick={() => onOpenExplainModal(selectedEvaluation)}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Plain-English Operator Explanation</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
              <MapPin className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Click any Bengaluru sector marker to inspect telemetry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
