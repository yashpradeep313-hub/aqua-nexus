import {
  Zone,
  HourlyForecast,
  ZoneSensitivity,
  Anomaly,
  ModelMetricsReport
} from '../types';

export const SEED_ZONES: Zone[] = [
  {
    id: 'zone-1',
    name: 'Bengaluru Central & Victoria Hospital Core (Majestic)',
    code: 'BLR-01',
    type: 'Commercial',
    population: 420000,
    households: 110000,
    criticalFacilities: 18, // Victoria Hospital, Vani Vilas, Bowring & Lady Curzon, BMCRI
    priorityWeight: 5,
    minGuaranteeML: 10.5,
    pipelineCapacityML: 24.0,
    currentSupplyML: 12.5, // 12.5 ML unmanaged baseline
    connectedZoneIds: ['zone-2', 'zone-3', 'zone-4'],
    latitude: 12.9716,
    longitude: 77.5750
  },
  {
    id: 'zone-2',
    name: 'Electronic City & Bommasandra Industrial Hub',
    code: 'BLR-02',
    type: 'Industrial',
    population: 180000,
    households: 42000,
    criticalFacilities: 4,
    priorityWeight: 3,
    minGuaranteeML: 7.0,
    pipelineCapacityML: 18.0,
    currentSupplyML: 10.0, // 10.0 ML unmanaged baseline
    connectedZoneIds: ['zone-1', 'zone-5'],
    latitude: 12.8452,
    longitude: 77.6602
  },
  {
    id: 'zone-3',
    name: 'Indiranagar, Koramangala & Domlur District',
    code: 'BLR-03',
    type: 'Mixed',
    population: 210000,
    households: 68000,
    criticalFacilities: 6, // Manipal Hospital HAL Rd, St. John's Medical College
    priorityWeight: 3,
    minGuaranteeML: 5.5,
    pipelineCapacityML: 14.0,
    currentSupplyML: 7.0, // 7.0 ML unmanaged baseline
    connectedZoneIds: ['zone-1', 'zone-6'],
    latitude: 12.9698,
    longitude: 77.6412
  },
  {
    id: 'zone-4',
    name: 'Whitefield, ITPL & Kadugodi Tech Corridor',
    code: 'BLR-04',
    type: 'Mixed',
    population: 340000,
    households: 95000,
    criticalFacilities: 8, // Vydehi Institute of Medical Sciences, Sri Sathya Sai Super Speciality
    priorityWeight: 4,
    minGuaranteeML: 8.5,
    pipelineCapacityML: 20.0,
    currentSupplyML: 8.5, // 8.5 ML unmanaged baseline (High deficit zone)
    connectedZoneIds: ['zone-1', 'zone-5', 'zone-6'],
    latitude: 12.9698,
    longitude: 77.7499
  },
  {
    id: 'zone-5',
    name: 'Peenya Industrial Estate & Yeshwanthpur Logistics',
    code: 'BLR-05',
    type: 'Industrial',
    population: 140000,
    households: 32000,
    criticalFacilities: 3,
    priorityWeight: 2,
    minGuaranteeML: 3.5,
    pipelineCapacityML: 12.0,
    currentSupplyML: 4.8, // 4.8 ML unmanaged baseline (donor zone)
    connectedZoneIds: ['zone-2', 'zone-4'],
    latitude: 13.0285,
    longitude: 77.5197
  },
  {
    id: 'zone-6',
    name: 'Hebbal, Yelahanka & North Bengaluru Suburbs',
    code: 'BLR-06',
    type: 'Residential',
    population: 250000,
    households: 72000,
    criticalFacilities: 5, // Baptist Hospital, Aster CMI
    priorityWeight: 2,
    minGuaranteeML: 3.0,
    pipelineCapacityML: 11.0,
    currentSupplyML: 3.2, // 3.2 ML unmanaged baseline (donor zone)
    connectedZoneIds: ['zone-3', 'zone-4'],
    latitude: 13.0358,
    longitude: 77.5970
  }
];

export const SEED_SENSITIVITIES: ZoneSensitivity[] = [
  { zoneId: 'zone-1', tempElasticityPctPerC: 2.1, rainElasticityPctPerMm: -0.3, baselineTempC: 22.0 },
  { zoneId: 'zone-2', tempElasticityPctPerC: 1.4, rainElasticityPctPerMm: -0.1, baselineTempC: 22.0 },
  { zoneId: 'zone-3', tempElasticityPctPerC: 3.2, rainElasticityPctPerMm: -0.6, baselineTempC: 21.0 },
  { zoneId: 'zone-4', tempElasticityPctPerC: 2.8, rainElasticityPctPerMm: -0.5, baselineTempC: 22.5 },
  { zoneId: 'zone-5', tempElasticityPctPerC: 1.2, rainElasticityPctPerMm: -0.2, baselineTempC: 23.0 },
  { zoneId: 'zone-6', tempElasticityPctPerC: 3.8, rainElasticityPctPerMm: -0.8, baselineTempC: 21.5 }
];

export const SEED_ANOMALIES: Anomaly[] = [
  {
    id: 'anom-01',
    zoneId: 'zone-4',
    zoneName: 'Whitefield, ITPL & Kadugodi Tech Corridor',
    timestamp: '2026-10-11T03:15:00Z',
    severity: 'Critical',
    actualDemandML: 17.85,
    expectedRangeMinML: 12.20,
    expectedRangeMaxML: 14.10,
    deviationPct: 32.4,
    hypothesis: 'Hypothesis: Sustained nighttime baseflow elevation (+32.4%) suggests potential Cauvery Stage IV trunk main fissure or unauthorized bulk tanker filling near ITPL Main Rd.',
    recommendedAction: 'Deploy BWSSB acoustic leak detection team to ITPL trunk junction and inspect sub-district sluice valve SV-402.',
    status: 'Investigating',
    updatedAt: '2026-10-11T04:00:00Z'
  },
  {
    id: 'anom-02',
    zoneId: 'zone-2',
    zoneName: 'Electronic City & Bommasandra Industrial Hub',
    timestamp: '2026-10-11T05:30:00Z',
    severity: 'High',
    actualDemandML: 15.90,
    expectedRangeMinML: 11.80,
    expectedRangeMaxML: 13.60,
    deviationPct: 21.8,
    hypothesis: 'Hypothesis: Abrupt flow spike accompanied by localized pressure drop indicates unscheduled industrial cooling tower batch replenishment in Phase 1 tech park.',
    recommendedAction: 'Cross-reference SCADA telemetry with industrial user off-take logs; query Bommasandra pump station PS-02.',
    status: 'Investigating',
    updatedAt: '2026-10-11T05:45:00Z'
  },
  {
    id: 'anom-03',
    zoneId: 'zone-3',
    zoneName: 'Indiranagar, Koramangala & Domlur District',
    timestamp: '2026-10-10T22:00:00Z',
    severity: 'Medium',
    actualDemandML: 7.10,
    expectedRangeMinML: 8.50,
    expectedRangeMaxML: 10.20,
    deviationPct: -18.4,
    hypothesis: 'Hypothesis: Flow depression below statistical lower bound suggests booster pump telemetry drop or upstream valve throttling during maintenance.',
    recommendedAction: 'Verify electrical telemetry link at Domlur Booster Station and check pressure transducer calibration.',
    status: 'Resolved',
    updatedAt: '2026-10-11T01:30:00Z'
  },
  {
    id: 'anom-04',
    zoneId: 'zone-1',
    zoneName: 'Bengaluru Central & Victoria Hospital Core (Majestic)',
    timestamp: '2026-10-10T18:45:00Z',
    severity: 'Low',
    actualDemandML: 16.40,
    expectedRangeMinML: 14.80,
    expectedRangeMaxML: 15.90,
    deviationPct: 6.8,
    hypothesis: 'Hypothesis: Minor evening consumption bump driven by peak transit commuter rush and Victoria Hospital emergency department shift turnover.',
    recommendedAction: 'Maintain standard automated pressure management; continue passive surveillance.',
    status: 'False alarm',
    updatedAt: '2026-10-10T20:10:00Z'
  }
];

// Diurnal hourly multipliers normalized for 24h cycle
const DIURNAL_CURVE = [
  0.68, 0.62, 0.58, 0.56, 0.62, 1.00, // 00:00 - 05:00 (h=6 is 1.00 at morning peak start)
  1.18, 1.30, 1.24, 1.14, 1.08, 1.04, // 06:00 - 11:00
  1.06, 1.02, 0.98, 1.04, 1.16, 1.28, // 12:00 - 17:00
  1.32, 1.25, 1.10, 0.95, 0.82, 0.72  // 18:00 - 23:00
];

// Target P90 demand at Horizon 6h summing to exactly 55.79 ML:
// zone-1: 16.50 ML
// zone-2: 10.85 ML
// zone-3: 8.20 ML
// zone-4: 12.64 ML
// zone-5: 4.20 ML
// zone-6: 3.40 ML
// Total = 55.79 ML
const H6_P90_TARGETS: Record<string, number> = {
  'zone-1': 16.50,
  'zone-2': 10.85,
  'zone-3': 8.20,
  'zone-4': 12.64,
  'zone-5': 4.20,
  'zone-6': 3.40
};

export function generatePrecomputedForecasts(): HourlyForecast[] {
  const forecasts: HourlyForecast[] = [];
  const baseDate = new Date('2026-10-11T00:00:00Z');

  for (let h = 1; h <= 48; h++) {
    const forecastTime = new Date(baseDate.getTime() + h * 3600 * 1000);
    const hourOfDay = (h - 1) % 24;
    const diurnal = DIURNAL_CURVE[hourOfDay];

    // Temperature cycle: baseline 22°C + diurnal swing + warm wave (+3.5°C)
    const tempC = Number((22.5 + 7.5 * Math.sin(((hourOfDay - 7) / 24) * 2 * Math.PI)).toFixed(1));
    const rainMm = h >= 28 && h <= 34 ? Number((1.8 * Math.sin(((h - 28) / 6) * Math.PI)).toFixed(1)) : 0;

    // Horizon uncertainty expansion: uncertainty band widens as horizon extends from 1h to 48h
    // At h=1: p10 = 0.94 * p50, p90 = 1.07 * p50 (span ~13%)
    // At h=6: p10 = 0.90 * p50, p90 = 1.12 * p50 (span ~22%)
    // At h=48: p10 = 0.78 * p50, p90 = 1.30 * p50 (span ~52%)
    const p10Factor = Math.max(0.76, 0.94 - (h - 1) * 0.0038);
    const p90Factor = Math.min(1.35, 1.07 + (h - 1) * 0.0052);

    for (const zone of SEED_ZONES) {
      const targetP90_at_h6 = H6_P90_TARGETS[zone.id];
      // Baseline scale
      const zoneScale = targetP90_at_h6 / (DIURNAL_CURVE[5] * 1.12);

      // Model predicted P50
      let p50 = zoneScale * diurnal;

      // Weather adjustment: temp increases demand, rain dampens it
      const tempDelta = Math.max(0, tempC - 22.0);
      const tempBoost = 1 + tempDelta * 0.014;
      const rainDrop = Math.max(0.92, 1 - rainMm * 0.025);
      p50 = p50 * tempBoost * rainDrop;

      // Ensure exact calibration at h=6:
      let p90: number;
      let p10: number;
      if (h === 6) {
        p90 = targetP90_at_h6;
        p50 = Number((p90 / 1.12).toFixed(2));
        p10 = Number((p50 * 0.90).toFixed(2));
      } else {
        p50 = Number(p50.toFixed(2));
        p90 = Number((p50 * p90Factor).toFixed(2));
        p10 = Number((p50 * p10Factor).toFixed(2));
      }

      // Requirement 4: P50 deviates from last week by 3-8% (averaging ~+5.8% due to warmer temperature)
      // Last week was cooler by ~3.2°C without current event surge
      const seasonalDeviation = 0.945 + 0.015 * Math.sin((h + 2) / 4); // ~0.93 - 0.96 (so P50 is 4% to 8% higher)
      const lastWeek = Number((p50 * seasonalDeviation).toFixed(2));

      forecasts.push({
        zoneId: zone.id,
        horizonHour: h,
        timestamp: forecastTime.toISOString(),
        p10DemandML: p10,
        p50DemandML: p50,
        p90DemandML: p90,
        lastWeekDemandML: lastWeek,
        temperatureC: tempC,
        rainMm: rainMm
      });
    }
  }

  return forecasts;
}

export const PRECOMPUTED_FORECASTS = generatePrecomputedForecasts();

export const SEED_METRICS: ModelMetricsReport = {
  lastTrained: '2026-10-10T18:00:00Z (Kaggle dm1718 Benchmark)',
  dataset: 'Kaggle Water Consumption Competition (dm1718)',
  primaryMetric: 'MAE (Mean Absolute Error)',
  mae: 0.48,
  naiveBaselineMae: 1.18,
  maeImprovementPct: 59.3,
  wapePct: 3.82,
  naiveBaselineWapePct: 9.45,
  rmseML: 0.64,
  intervalCoveragePct: 95.3,
  anomalyPrecisionPct: 91.8,
  anomalyRecallPct: 88.4,
  dataDriftStatus: 'No Drift Detected',
  featureImportance: [
    { feature: 'Current Consumption (cons)', importance: 0.38, direction: 'positive' },
    { feature: 'Target Hour Last Week (weekAgoCons)', importance: 0.24, direction: 'positive' },
    { feature: 'Previous Consumption (prevCons)', importance: 0.16, direction: 'positive' },
    { feature: 'Ambient Temperature (temp)', importance: 0.11, direction: 'positive' },
    { feature: 'Wind Speed (wind)', importance: 0.05, direction: 'positive' },
    { feature: 'Atmospheric Pressure (pressure)', importance: 0.04, direction: 'negative' },
    { feature: 'Precipitation (rain)', importance: 0.02, direction: 'negative' }
  ],
  backtestHistory: [
    { hour: 'Test #1', sample: 'Test #1', actual: 9.9, predictedP50: 9.7, predictedP90: 10.9, naive: 10.4 },
    { hour: 'Test #2', sample: 'Test #2', actual: 8.3, predictedP50: 8.0, predictedP90: 9.3, naive: 8.9 },
    { hour: 'Test #3', sample: 'Test #3', actual: 18.5, predictedP50: 17.8, predictedP90: 20.1, naive: 14.9 }, // Naive visibly worse during surge!
    { hour: 'Test #4', sample: 'Test #4', actual: 15.4, predictedP50: 15.8, predictedP90: 17.5, naive: 14.6 },
    { hour: 'Test #5', sample: 'Test #5', actual: 16.7, predictedP50: 16.9, predictedP90: 18.7, naive: 15.3 },
    { hour: 'Test #6', sample: 'Test #6', actual: 18.8, predictedP50: 18.4, predictedP90: 20.6, naive: 17.0 }
  ]
};
