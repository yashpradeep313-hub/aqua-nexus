export async function callExplainApi(payload: {
  zoneName: string;
  demandML: number;
  currentSupplyML: number;
  allocatedML: number;
  shortageML: number;
  shortagePct: number;
  riskLevel: string;
  riskReason: string;
  priorityWeight: number;
  criticalFacilities: number;
  interZoneTransfers: string[];
}): Promise<string> {
  try {
    const res = await fetch('/api/gemini/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.explanation) {
      return data.explanation;
    }
    throw new Error(data.error || 'Failed to explain');
  } catch (err) {
    // Client-side fallback
    return `Operational Analysis: In ${payload.zoneName}, the engine allocated ${payload.allocatedML} ML to satisfy essential demand. Priority rating is ${payload.priorityWeight}/5 safeguarding ${payload.criticalFacilities} critical facilities. Remaining shortfall is ${payload.shortageML} ML (${payload.shortagePct}%). Recommended action: ${payload.interZoneTransfers.length > 0 ? payload.interZoneTransfers.join('; ') : 'Maintain current pressure throttle.'}`;
  }
}

export async function callDailyBriefApi(payload: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.brief) {
      return data.brief;
    }
    throw new Error(data.error || 'Failed to generate brief');
  } catch (err) {
    // Fallback brief
    return `# DAILY OPERATOR BRIEF
**Generated:** ${payload.date} | **Horizon:** ${payload.horizonHours}h
- Total System Demand: ${payload.totalDemandML} ML
- Total Supply Available: ${payload.totalSupplyML} ML
- Overall Deficit: ${payload.totalShortageML} ML (${payload.shortagePct}%)
- Potable Water Protected: ${(payload.litresProtectedPerDay / 1_000_000).toFixed(2)} ML/day
- Critical Facilities Fully Guarded: ${payload.criticalFacilitiesServed} / ${payload.totalCriticalFacilities ?? 34}

## Priority Risk Focus
${(payload.highRiskZones || []).map((z: any) => `- **${z.name}**: ${z.deficitML} ML deficit (${z.pct}%)`).join('\n')}

## Recommended Interconnections
${(payload.recommendedTransfers || []).map((t: any) => `- ${t.amountML} ML from ${t.from} to ${t.to}`).join('\n')}
`;
  }
}

export async function callAskTheGridApi(query: string, gridContext: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, gridContext })
    });
    const data = await res.json();
    if (data.success && data.answer) {
      return data.answer;
    }
    throw new Error(data.error || 'Failed to query grid');
  } catch (err) {
    return `[Engine Grounded Summary] Based on the active computed grid telemetry: Total demand is ${gridContext.totalDemandML ?? 'N/A'} ML, supply is ${gridContext.totalSupplyML ?? 'N/A'} ML, and system shortage is ${gridContext.totalShortageML ?? 'N/A'} ML.`;
  }
}

export async function callExtractCityPdfApi(payload: {
  base64Pdf?: string;
  fileName?: string;
  textContent?: string;
  cityName?: string;
}): Promise<any> {
  const res = await fetch('/api/gemini/extract-city-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || 'Failed to extract PDF data');
}

