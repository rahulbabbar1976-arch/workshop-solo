/**
 * AI Brain — Self-Learning Cache Engine
 *
 * Every Gemini API call saves its response here. On the next similar request,
 * we check this brain first. If we find a confident match, we return it instantly
 * with ZERO API calls. Confidence grows the more a response is reused.
 *
 * Cache key strategy (semantic, not image-hash):
 *
 *  PLATE_SCAN:          Normalized plate number → learns make/model independently of photo angle
 *  BATTERY_SCAN:        "brand::model" (serial number excluded — it's unique per unit, brand+model repeats)
 *  SERVICE_SUGGESTION:  "make::model::odoBucket" (e.g. "HONDA::CITY::50k-80k")
 *  DIAGNOSTIC:          Sorted DTC codes joined (e.g. "P0171,P0420")
 *  PARTS_SCAN:          Normalized OCR text fingerprint (first 100 chars, whitespace stripped)
 */

import prisma from './db';

// Confidence thresholds
const MIN_CONFIDENCE_TO_SERVE = 0.45;  // below this, always call Gemini
const CONFIDENCE_BOOST_ON_USE = 0.08;  // each reuse boosts confidence
const CONFIDENCE_DECAY_IGNORED = 0.03; // each ignore nudges confidence down
const MAX_CONFIDENCE = 0.98;

export type BrainCacheType =
  | 'PLATE_SCAN'
  | 'BATTERY_SCAN'
  | 'SERVICE_SUGGESTION'
  | 'DIAGNOSTIC'
  | 'PARTS_SCAN';

export interface BrainResult {
  hit: boolean;
  entryId?: string;
  response?: any;
  confidence?: number;
  useCount?: number;
  source: 'local_brain' | 'gemini_api';
}

// ─── Key Builders ────────────────────────────────────────────────────────────

export function buildPlateKey(plateNumber: string): string {
  return plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildBatteryKey(brand: string, model: string): string {
  // Exclude serial numbers — they are unique per unit.
  // Battery model (e.g. PRO55B24R, PC625) repeats across all units of that type.
  const cleanBrand = (brand || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanModel = (model || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${cleanBrand}::${cleanModel}`;
}

export function buildServiceKey(make: string, model: string, odometer: number): string {
  const cleanMake  = (make  || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanModel = (model || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bucket = odoToBucket(odometer);
  return `${cleanMake}::${cleanModel}::${bucket}`;
}

export function buildDiagnosticKey(dtcCodes: string[]): string {
  return [...dtcCodes]
    .map(c => c.toUpperCase().trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

export function buildPartsKey(ocrText: string): string {
  // Normalize: strip whitespace, lowercase, take first 100 chars as fingerprint
  return ocrText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function odoToBucket(odometer: number): string {
  if (odometer <  20000) return '0-20k';
  if (odometer <  50000) return '20k-50k';
  if (odometer <  80000) return '50k-80k';
  if (odometer < 120000) return '80k-120k';
  return '120k+';
}

// ─── Brain Operations ─────────────────────────────────────────────────────────

/**
 * Check if we have a confident local answer for this cache key.
 * Returns the cached response if confidence is above the threshold.
 */
export async function checkBrain(
  cacheType: BrainCacheType,
  cacheKey: string
): Promise<BrainResult> {
  try {
    const entry = await (prisma as any).aIKnowledgeCache.findUnique({
      where: { cacheKey },
    });

    if (!entry) return { hit: false, source: 'gemini_api' };

    if (entry.confidenceScore < MIN_CONFIDENCE_TO_SERVE) {
      // We know about this but aren't confident yet — let Gemini answer again
      return { hit: false, source: 'gemini_api' };
    }

    // Boost confidence and record hit
    await (prisma as any).aIKnowledgeCache.update({
      where: { id: entry.id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
        confidenceScore: Math.min(MAX_CONFIDENCE, entry.confidenceScore + CONFIDENCE_BOOST_ON_USE),
      },
    });

    return {
      hit: true,
      entryId: entry.id,
      response: JSON.parse(entry.responseJson),
      confidence: entry.confidenceScore,
      useCount: entry.useCount,
      source: 'local_brain',
    };
  } catch (e) {
    // Brain not available — fall through to Gemini
    return { hit: false, source: 'gemini_api' };
  }
}

/**
 * Save a new Gemini API response to the brain.
 * If an entry already exists for this key (low confidence), update it.
 */
export async function saveToiBrain(
  cacheType: BrainCacheType,
  cacheKey: string,
  inputSummary: string,
  response: any,
  source: string = "gemini",
  partDataJson: string | null = null
): Promise<void> {
  try {
    const responseJson = JSON.stringify(response);
    await (prisma as any).aIKnowledgeCache.upsert({
      where: { cacheKey },
      create: {
        cacheType,
        cacheKey,
        inputSummary,
        responseJson,
        source,
        partDataJson,
        useCount: 1,
        confidenceScore: source === "user" ? 0.95 : 0.5,
        isValidated: source === "user",
      },
      update: {
        responseJson,        // update with freshest Gemini response
        inputSummary,
        source,
        partDataJson,
        useCount: { increment: 1 },
        confidenceScore: source === "user" ? 0.95 : 0.5, // reset/set confidence
        lastUsedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn('[AI Brain] Failed to save:', e);
  }
}


/**
 * Record that a cached answer was USED (tapped by advisor, confirmed by mechanic).
 * Boosts confidence significantly.
 */
export async function recordBrainValidation(entryId: string): Promise<void> {
  try {
    await (prisma as any).aIKnowledgeCache.update({
      where: { id: entryId },
      data: {
        isValidated: true,
        confidenceScore: { increment: CONFIDENCE_BOOST_ON_USE * 2 },
        useCount: { increment: 1 },
      },
    });
  } catch (e) {
    console.warn('[AI Brain] Validation record failed:', e);
  }
}

/**
 * Record that a cached answer was IGNORED (user didn't use the suggestion).
 * Slowly reduces confidence.
 */
export async function recordBrainIgnored(entryId: string): Promise<void> {
  try {
    const entry = await (prisma as any).aIKnowledgeCache.findUnique({ where: { id: entryId } });
    if (!entry) return;
    await (prisma as any).aIKnowledgeCache.update({
      where: { id: entryId },
      data: {
        confidenceScore: Math.max(0.1, entry.confidenceScore - CONFIDENCE_DECAY_IGNORED),
      },
    });
  } catch (e) {
    console.warn('[AI Brain] Ignore record failed:', e);
  }
}

/**
 * Get brain learning statistics for the Owner dashboard.
 */
export async function getBrainStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  avgConfidence: number;
  byType: Record<string, number>;
  topPatterns: Array<{ summary: string; useCount: number; confidence: number }>;
}> {
  try {
    const all = await (prisma as any).aIKnowledgeCache.findMany({
      select: {
        cacheType: true,
        inputSummary: true,
        useCount: true,
        confidenceScore: true,
      },
      orderBy: { useCount: 'desc' },
    });

    const totalEntries = all.length;
    const totalHits    = all.reduce((s: number, e: any) => s + e.useCount, 0);
    const avgConfidence = totalEntries > 0
      ? all.reduce((s: number, e: any) => s + e.confidenceScore, 0) / totalEntries
      : 0;

    const byType: Record<string, number> = {};
    all.forEach((e: any) => {
      byType[e.cacheType] = (byType[e.cacheType] || 0) + 1;
    });

    const topPatterns = all.slice(0, 10).map((e: any) => ({
      summary:    e.inputSummary,
      useCount:   e.useCount,
      confidence: Math.round(e.confidenceScore * 100),
    }));

    return { totalEntries, totalHits, avgConfidence: Math.round(avgConfidence * 100), byType, topPatterns };
  } catch (e) {
    return { totalEntries: 0, totalHits: 0, avgConfidence: 0, byType: {}, topPatterns: [] };
  }
}
