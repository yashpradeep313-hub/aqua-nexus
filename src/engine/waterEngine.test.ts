import {
  evaluateZoneRisk,
  runWaterOptimizer,
  calculateInterZoneTransfers,
  calculateFairnessIndex
} from './waterEngine';
import { Zone, HourlyForecast } from '../types';

export function runEngineUnitTests(): { passed: boolean; logs: string[] } {
  const logs: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      logs.push(`✅ PASS: ${msg}`);
    } else {
      logs.push(`❌ FAIL: ${msg}`);
      allPassed = false;
    }
  }

  // 1. Test Zones Setup
  const mockZones: Zone[] = [
    {
      id: 'z1',
      name: 'North Core',
      code: 'NC-01',
      type: 'Commercial',
      population: 120000,
      households: 42000,
      criticalFacilities: 8,
      priorityWeight: 5,
      minGuaranteeML: 6.0,
      pipelineCapacityML: 18.0,
      currentSupplyML: 12.0,
      connectedZoneIds: ['z2', 'z3'],
      latitude: 12.97,
      longitude: 77.59
    },
    {
      id: 'z2',
      name: 'South Valley',
      code: 'SV-02',
      type: 'Residential',
      population: 85000,
      households: 28000,
      criticalFacilities: 2,
      priorityWeight: 2,
      minGuaranteeML: 4.0,
      pipelineCapacityML: 14.0,
      currentSupplyML: 11.0,
      connectedZoneIds: ['z1'], // Connected to z1, but NOT z3
      latitude: 12.95,
      longitude: 77.60
    },
    {
      id: 'z3',
      name: 'East Tech Park',
      code: 'ET-03',
      type: 'Industrial',
      population: 60000,
      households: 15000,
      criticalFacilities: 1,
      priorityWeight: 3,
      minGuaranteeML: 3.5,
      pipelineCapacityML: 12.0,
      currentSupplyML: 8.0,
      connectedZoneIds: ['z1'], // Connected to z1, NOT z2
      latitude: 12.98,
      longitude: 77.63
    }
  ];

  const mockForecasts = new Map<string, HourlyForecast>([
    ['z1', { zoneId: 'z1', horizonHour: 6, timestamp: '2026-10-11T00:00:00Z', p10DemandML: 12.0, p50DemandML: 14.5, p90DemandML: 16.5, lastWeekDemandML: 13.8, temperatureC: 31, rainMm: 0 }],
    ['z2', { zoneId: 'z2', horizonHour: 6, timestamp: '2026-10-11T00:00:00Z', p10DemandML: 7.0, p50DemandML: 8.5, p90DemandML: 9.5, lastWeekDemandML: 8.2, temperatureC: 31, rainMm: 0 }],
    ['z3', { zoneId: 'z3', horizonHour: 6, timestamp: '2026-10-11T00:00:00Z', p10DemandML: 6.0, p50DemandML: 7.5, p90DemandML: 8.5, lastWeekDemandML: 7.0, temperatureC: 31, rainMm: 0 }]
  ]);

  // Test 1: evaluateZoneRisk
  const riskZ1 = evaluateZoneRisk(mockZones[0], mockForecasts.get('z1'), 'p90');
  assert(riskZ1.riskScore >= 0 && riskZ1.riskScore <= 100, `Risk score within 0-100 (got ${riskZ1.riskScore})`);
  assert(riskZ1.demandML === 16.5, `Uses P90 demand correctly (16.5 ML)`);
  assert(riskZ1.shortageML === 4.5, `Shortage calculation accurate: 16.5 - 12.0 = 4.5 ML`);
  assert(riskZ1.riskLevel === 'High' || riskZ1.riskLevel === 'Critical', `Correctly classifies high deficit risk`);

  // Test 2: Optimizer total allocation never exceeds total supply
  const totalSupply = 28.0;
  const optResult = runWaterOptimizer(mockZones, mockForecasts, totalSupply, { percentile: 'p90' });
  assert(optResult.totalAllocatedML <= totalSupply + 0.0001, `Allocations sum <= total supply (${optResult.totalAllocatedML} <= ${totalSupply})`);
  assert(optResult.totalAllocatedML > 0, `Allocated water is positive`);

  // Test 3: Min guarantee respect when supply is adequate
  optResult.allocations.forEach(a => {
    const z = mockZones.find(m => m.id === a.zoneId)!;
    assert(a.allocatedML >= z.minGuaranteeML - 0.001, `Zone ${z.name} meets min guarantee ${z.minGuaranteeML} ML (got ${a.allocatedML} ML)`);
  });

  // Test 4: Extreme scarcity - supply less than sum of minimums
  const severeSupply = 10.0; // sum of mins is 6 + 4 + 3.5 = 13.5
  const severeResult = runWaterOptimizer(mockZones, mockForecasts, severeSupply, { percentile: 'p90' });
  assert(severeResult.totalAllocatedML <= severeSupply + 0.0001, `Under severe scarcity, allocations sum <= total supply (${severeResult.totalAllocatedML} <= ${severeSupply})`);

  // Test 5: Transfers ONLY between connected zones
  optResult.transfers.forEach(t => {
    const fromZ = mockZones.find(z => z.id === t.fromZoneId)!;
    assert(fromZ.connectedZoneIds.includes(t.toZoneId), `Transfer from ${t.fromZoneName} to ${t.toZoneName} is strictly between connected zones`);
  });

  // Test 6: Fairness index bounded
  const fIndex = calculateFairnessIndex([0.8, 0.9, 0.85]);
  assert(fIndex >= 0 && fIndex <= 1, `Jain's fairness index bounded [0, 1] (got ${fIndex})`);

  return { passed: allPassed, logs };
}
