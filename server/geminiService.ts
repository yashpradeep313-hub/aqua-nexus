import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Explains an allocation recommendation or zone risk in plain English.
 */
export async function explainAllocationRecommendation(data: {
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
  if (!aiClient) {
    return `[Operational Assessment] For ${data.zoneName}, the engine allocated ${data.allocatedML} ML against a demand of ${data.demandML} ML. Priority weight is ${data.priorityWeight}/5 with ${data.criticalFacilities} critical facilities. Remaining deficit is ${data.shortageML} ML (${data.shortagePct}%). Recommended actions: ${data.interZoneTransfers.length > 0 ? data.interZoneTransfers.join('; ') : 'Maintain current booster valve pressure.'}`;
  }

  try {
    const prompt = `You are the AquaGuard AI Chief Hydraulic Operations Specialist for a municipal water authority.
Provide a concise, professional operational explanation (2-3 paragraphs) of the optimizer's allocation decision and risk label.
Explain strictly using these computed numbers:
${JSON.stringify(data, null, 2)}

Ground your explanation entirely in these computed values. Do not invent ungrounded external statistics.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    return response.text || 'Explanation unavailable.';
  } catch (error) {
    console.error('Gemini explanation error:', error);
    return `The optimizer allocated ${data.allocatedML} ML to ${data.zoneName} to protect ${data.criticalFacilities} critical facilities while mitigating regional deficit to ${data.shortagePct}%.`;
  }
}

/**
 * Generates the Daily Operator Brief.
 */
export async function generateDailyOperatorBrief(data: {
  date: string;
  horizonHours: number;
  totalSupplyML: number;
  totalDemandML: number;
  totalShortageML: number;
  shortagePct: number;
  unmetDemandBeforePct: number;
  unmetDemandAfterPct: number;
  litresProtectedPerDay: number;
  householdsProtected: number;
  criticalFacilitiesServed: number;
  activeAnomalies: { zone: string; severity: string; deviation: number; hypothesis: string }[];
  highRiskZones: { name: string; deficitML: number; pct: number; risk: string }[];
  recommendedTransfers: { from: string; to: string; amountML: number }[];
}): Promise<string> {
  if (!aiClient) {
    return `# DAILY WATER AUTHORITY OPERATOR BRIEF
**Date:** ${data.date} | **Horizon:** ${data.horizonHours} Hours
**Status:** AI Generated (Deterministic Fallback Mode)

## 1. Executive Grid Summary
- Total Municipal Demand: ${data.totalDemandML} ML
- Total Available Supply: ${data.totalSupplyML} ML
- System Shortfall: ${data.totalShortageML} ML (${data.shortagePct}%)
- Unmet Demand Improvement: ${data.unmetDemandBeforePct}% baseline reduced to ${data.unmetDemandAfterPct}%
- Potable Water Protected: ${(data.litresProtectedPerDay / 1_000_000).toFixed(2)} Million Litres/day (${data.householdsProtected.toLocaleString()} households protected)
- Critical Facilities Fully Secured: ${data.criticalFacilitiesServed}

## 2. Priority Risk Zones
${data.highRiskZones.map(z => `- **${z.name}** [${z.risk}]: Deficit of ${z.deficitML} ML (${z.pct}%).`).join('\n')}

## 3. Active Telemetry Anomalies
${data.activeAnomalies.map(a => `- **${a.zone}** (${a.severity}, ${a.deviation > 0 ? '+' : ''}${a.deviation}%): ${a.hypothesis}`).join('\n')}

## 4. Valve & Interconnection Dispatch Orders
${data.recommendedTransfers.map(t => `- Transfer **${t.amountML} ML** from **${t.from}** to **${t.to}** via interconnection valves.`).join('\n')}
`;
  }

  try {
    const prompt = `You are the AquaGuard AI Senior Water Grid Commander.
Generate a structured, authoritative "Daily Operator Brief" for shift supervisors, field valve crews, and city leadership.
Here is the exact computed system telemetry JSON:
${JSON.stringify(data, null, 2)}

Requirements:
- Structure clearly with headers: Executive Grid Status, Critical Risk Zones & Deficits, Active Telemetry Anomalies (must explicitly preserve anomaly hypotheses), and Recommended Valve Dispatches / Inter-zone Transfers.
- Strictly quote the numbers from the JSON; do not invent fictional metrics.
- Conclude with a safety and pressure-integrity sign-off statement.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    return response.text || 'Brief generation returned empty content.';
  } catch (error) {
    console.error('Gemini brief error:', error);
    return `Daily Operator Brief: Total demand ${data.totalDemandML} ML with ${data.totalShortageML} ML deficit. ${data.recommendedTransfers.length} transfers recommended to protect ${data.criticalFacilitiesServed} critical facilities.`;
  }
}

/**
 * "Ask the grid" assistant: Answers questions strictly given the computed numbers JSON.
 */
export async function askTheGrid(query: string, gridContextJSON: any): Promise<string> {
  if (!aiClient) {
    // Intelligent deterministic response based on provided context
    return `[Demo Engine Analysis] Based on the active telemetry provided: Total system demand is ${gridContextJSON.totalDemandML ?? 'N/A'} ML, supply is ${gridContextJSON.totalSupplyML ?? 'N/A'} ML, and remaining shortfall is ${gridContextJSON.totalShortageML ?? 'N/A'} ML (${gridContextJSON.shortagePct ?? 'N/A'}%). Query answered from computed state. (Gemini API key is configured or offline fallback active).`;
  }

  try {
    const prompt = `You are AquaGuard AI's Grid Intelligence Query Engine.
A water engineer or utility operator is asking you a question about the water distribution network.

USER QUESTION:
"${query}"

COMPUTED GRID STATE (STRICT SOURCE OF TRUTH):
${JSON.stringify(gridContextJSON, null, 2)}

STRICT RULES:
1. Ground your response ONLY in the computed JSON figures above.
2. If the user asks for a specific number or fact that is NOT in the JSON above, you MUST explicitly say: "This metric is not provided in the current computed telemetry."
3. Never invent ungrounded data.
4. Keep the answer direct, quantitative, and concise for emergency operations room staff.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Gemini Ask-the-Grid error:', error);
    return `The query could not be completed with the remote model. Engine state: Current total demand is ${gridContextJSON.totalDemandML ?? 'N/A'} ML with ${gridContextJSON.totalShortageML ?? 'N/A'} ML projected shortfall.`;
  }
}

/**
 * Extracts structured water data and policy from uploaded PDF using Gemini Vision
 */
export async function extractWaterDataFromPdf(
  pdfBase64: string,
  filename: string,
  suggestedCityName?: string
): Promise<any> {
  const prompt = `You are a Municipal Water Master Plan Document Intelligence Analyzer.
Extract structured water consumption tables, distribution policies, and operational metrics from the attached PDF document.

City name hint: "${suggestedCityName || filename}".

You MUST return ONLY valid JSON matching this EXACT schema:
{
  "city": string,
  "tables": [
    {
      "name": string,
      "columns": [string],
      "rows": [[number | string]],
      "unit": string,
      "page": number
    }
  ],
  "policy": {
    "priority_order": [string],
    "minimum_guarantee": [
      {
        "sector": string,
        "value": number,
        "unit": string,
        "page": number
      }
    ],
    "per_capita_norm_lpcd": number | null,
    "network_loss_percent": number | null,
    "rationing_rules": [string],
    "supply_hours": string | null
  },
  "notes": [string]
}

STRICT HONESTY RULES:
1. Extract ONLY what is written in the document. Use null if absent. Do not estimate.
2. Every table and minimum guarantee item must include the specific page number where it appears.
3. If no tables or series exist in the document, return an empty array for "tables".
4. Do not wrap the JSON with commentary or markdown codeblocks if possible, or return strictly valid JSON.`;

  if (!aiClient) {
    // Return structured default schema informing user
    return {
      city: suggestedCityName || filename.replace(/\.pdf$/i, ''),
      tables: [],
      policy: {
        priority_order: ['Hospitals & Healthcare', 'Domestic Water Supply', 'Commercial', 'Industrial'],
        minimum_guarantee: [],
        per_capita_norm_lpcd: null,
        network_loss_percent: null,
        rationing_rules: ['System operating in offline demo mode. Configure GEMINI_API_KEY to enable live multimodal PDF reading.'],
        supply_hours: null
      },
      notes: [`Parsed in offline environment: ${filename}. Please review and adjust fields manually.`]
    };
  }

  // Clean base64 string
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();

  const response = await aiClient.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json'
    }
  });

  const rawText = response.text || '';
  // Strip markdown code fences safely
  const cleanedText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);
    return parsed;
  } catch (err: any) {
    console.error('Failed to parse Gemini JSON output:', cleanedText, err);
    throw new Error(`Failed to parse extracted JSON from document: ${err.message}`);
  }
}

