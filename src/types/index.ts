export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type DemandPercentile = 'p50' | 'p90';
export type AnomalySeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AnomalyStatus = 'Investigating' | 'Resolved' | 'False alarm';
export type BadgeType =
  | 'REAL'
  | 'DEMO DATA'
  | 'SIMULATED'
  | 'MODEL OUTPUT'
  | 'WHAT-IF'
  | 'ENGINE COMPUTED'
  | 'AI-GENERATED'
  | 'EXTRACTED FROM PDF'
  | 'USER-FITTED'
  | 'PRESET SAMPLE (SYNTHETIC BENCHMARK)'
  | 'REAL (KAGGLE DM1718)';

export interface CityTable {
  name: string;
  columns: string[];
  rows: (number | string)[][];
  unit: string;
  page: number;
}

export interface CityPolicyMinimumGuarantee {
  sector: string;
  value: number;
  unit: string;
  page: number;
}

export interface CityPolicy {
  priority_order: string[]; // e.g. hospitals, drinking water, households, industry
  minimum_guarantee: CityPolicyMinimumGuarantee[];
  per_capita_norm_lpcd: number | null;
  network_loss_percent: number | null;
  rationing_rules: string[];
  supply_hours: string | null;
}

export interface FittedModelPredictionPoint {
  index: number;
  label: string;
  actual: number;
  predicted: number;
  naive: number;
}

export interface FittedModelResult {
  city: string;
  tableName: string;
  targetColumn: string;
  featureColumns: string[];
  splitType: 'Chronological 80/20' | '5-Fold Cross Validation';
  rowCount: number;
  fittedAt: string;
  weights: { feature: string; coefficient: number; stdWeight: number }[];
  intercept: number;
  mae: number;
  wapePct: number;
  naiveBaselineMae: number;
  naiveBaselineWapePct: number;
  maeImprovementPct: number;
  predictedVsActual: FittedModelPredictionPoint[];
  warning?: string;
  r2Score: number;
}

export interface CityProfile {
  id: string;
  cityName: string;
  sourceType: 'pdf' | 'preset' | 'default';
  sourceFilename?: string;
  confirmed: boolean;
  uploadedAt: string;
  tables: CityTable[];
  policy: CityPolicy;
  notes: string[];
  fittedModel?: FittedModelResult | null;
  completenessPct: number;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  type: 'Residential' | 'Commercial' | 'Industrial' | 'Mixed';
  population: number;
  households: number;
  criticalFacilities: number; // Hospitals, schools, emergency stations
  priorityWeight: number; // 1 (lowest) to 5 (highest, e.g., hospital zone)
  minGuaranteeML: number; // Megalitres minimum required to avoid pipe depressurization & critical loss
  pipelineCapacityML: number; // Maximum inflow capacity of trunk mains
  currentSupplyML: number; // Baseline water dispatched to zone
  connectedZoneIds: string[]; // Adjacent zones connected via interconnection valves
  latitude: number;
  longitude: number;
  polygon?: [number, number][]; // Boundary coordinates for map
}

export interface HourlyForecast {
  zoneId: string;
  horizonHour: number; // 1 to 48
  timestamp: string;
  p10DemandML: number;
  p50DemandML: number;
  p90DemandML: number;
  lastWeekDemandML: number;
  temperatureC: number;
  rainMm: number;
}

export interface ZoneSensitivity {
  zoneId: string;
  tempElasticityPctPerC: number; // e.g. +2.5% demand increase per 1C
  rainElasticityPctPerMm: number; // e.g. -0.4% demand decrease per 1mm rain
  baselineTempC: number;
}

export interface Anomaly {
  id: string;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  severity: AnomalySeverity;
  actualDemandML: number;
  expectedRangeMinML: number;
  expectedRangeMaxML: number;
  deviationPct: number;
  hypothesis: string; // Phrased as hypothesis, never confirmed leak
  recommendedAction: string;
  status: AnomalyStatus;
  updatedAt?: string;
}

export interface ZoneRiskEvaluation {
  zoneId: string;
  zoneName: string;
  demandML: number;
  supplyML: number;
  shortageML: number;
  surplusML: number;
  shortagePct: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  riskReason: string;
  householdsAffected: number;
  hoursToDepletion: number | null; // Estimated time until local reservoir runs dry at current shortfall
  hasAnomaly: boolean;
}

export interface ZoneAllocationResult {
  zoneId: string;
  zoneName: string;
  demandML: number;
  currentSupplyML: number;
  allocatedML: number;
  remainingShortageML: number;
  remainingShortagePct: number;
  isMinGuaranteeMet: boolean;
  pipelineCapacityML: number;
}

export interface InterZoneTransfer {
  fromZoneId: string;
  fromZoneName: string;
  toZoneId: string;
  toZoneName: string;
  amountML: number;
  pipelineCapacityML: number;
  status: 'Feasible' | 'Near Capacity';
}

export interface OptimizationResult {
  allocations: ZoneAllocationResult[];
  transfers: InterZoneTransfer[];
  totalSupplyML: number;
  totalAllocatedML: number;
  totalDemandML: number;
  totalShortageML: number;
  shortagePct: number;
  fairnessIndex: number; // Jain's fairness index (0 to 1)
  baselineShortageML: number;
  baselineShortagePct: number;
  improvementShortageML: number;
  improvementPct: number;
  litresProtectedPerDay: number;
  householdsProtected: number;
  criticalFacilitiesFullyServed: number;
  totalCriticalFacilities: number;
  appliedTimestamp?: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  preset: 'Normal' | 'Heatwave' | 'Festival' | 'Pipeline burst' | 'Supply disruption' | 'Custom';
  tempDeltaC: number;
  rainDeltaMm: number;
  supplyReductionPct: number; // e.g. -30% for pipeline burst
  burstZoneId?: string;
  authorId?: string;
  authorEmail?: string;
  createdAt: string;
}

export interface SavedPlan {
  id: string;
  title: string;
  demandPercentile: DemandPercentile;
  totalSupplyML: number;
  emergencyReserveML: number;
  fairnessFloor: number;
  result: OptimizationResult;
  applied: boolean;
  authorEmail: string;
  createdAt: string;
}

export interface ModelMetricsReport {
  _note?: string;
  isDemoValues?: boolean;
  dataset?: string;
  validationMethod?: string;
  primaryMetric?: string;
  mae: number; // Primary competition metric: Mean Absolute Error
  naiveBaselineMae: number; // Baseline from same-hour-last-week column
  maeImprovementPct: number;
  lastTrained: string;
  wapePct: number; // Secondary metric: Weighted Absolute Percentage Error
  naiveBaselineWapePct: number;
  rmseML: number;
  intervalCoveragePct: number;
  anomalyPrecisionPct: number;
  anomalyRecallPct: number;
  dataDriftStatus: string;
  featureImportance: { feature: string; importance: number; direction: 'positive' | 'negative' }[];
  backtestHistory: { sample?: string; hour?: string; actual: number; predictedP50: number; predictedP90: number; naive: number }[];
}

export type UserRole = 'operator' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface AdminMember {
  uid: string;
  email: string;
  assignedBy?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  details: string;
}
