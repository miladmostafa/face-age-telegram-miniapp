export interface SkinProblemSummary {
  key: string;
  title?: string;
  score?: number;
}

export interface SkinSummary {
  skinAge?: number;
  damagePercentage?: number;
  problems: SkinProblemSummary[];
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000) {
      return Math.round(value * 10) / 10;
    }
  }
  return undefined;
}

function sanitizeProblem(value: unknown): SkinProblemSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const key = typeof record.key === "string" ? record.key.trim().slice(0, 40) : "";
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) return null;
  const title =
    typeof record.title === "string"
      ? record.title.replace(/<[^>]*>/g, "").trim().slice(0, 80)
      : "";
  const score = pickNumber(record, ["score", "value", "percent", "percentage"]);
  return {
    key,
    ...(title ? { title } : {}),
    ...(score != null ? { score } : {}),
  };
}

/**
 * Keep a cosmetic summary only. Photos, data URLs, and unknown fields are dropped.
 * `analysis` matches the object passed to `API.getAdvisorData` (the problems list,
 * or an object that also carries skinAge / damagePercentage).
 */
export function sanitizeAnalysis(analysis: unknown): SkinSummary | null {
  if (Array.isArray(analysis)) {
    const problems = analysis
      .slice(0, 13)
      .map(sanitizeProblem)
      .filter((item): item is SkinProblemSummary => item != null);
    return problems.length > 0 ? { problems } : null;
  }
  if (!analysis || typeof analysis !== "object") return null;
  const record = analysis as Record<string, unknown>;
  const skinAge = pickNumber(record, ["skinAge", "skin_age"]);
  const damagePercentage = pickNumber(record, ["damagePercentage", "damage_percentage", "damage"]);
  const problems = Array.isArray(record.problems)
    ? record.problems
        .slice(0, 13)
        .map(sanitizeProblem)
        .filter((item): item is SkinProblemSummary => item != null)
    : [];
  if (skinAge == null && damagePercentage == null && problems.length === 0) return null;
  return {
    ...(skinAge != null ? { skinAge } : {}),
    ...(damagePercentage != null ? { damagePercentage } : {}),
    problems,
  };
}
