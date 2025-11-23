import { ParameterDelta, SetupFile, SeverityLevel, SeverityMeta } from './types';

export interface SeverityThresholds {
  minor: number;
  moderate: number;
  major: number;
}

const defaultThresholds: SeverityThresholds = {
  minor: 0.25,
  moderate: 1,
  major: 3,
};

export function compareSetupsDetailed(
  baseline: SetupFile,
  candidate: SetupFile,
  thresholds: SeverityThresholds = defaultThresholds,
): ParameterDelta[] {
  const candidateMap = new Map(candidate.parameters.map((p) => [p.key, p]));
  const baselineKeys = new Set(baseline.parameters.map((p) => p.key));
  const allKeys = new Set<string>([...baselineKeys, ...candidate.parameters.map((p) => p.key)]);

  const deltas: ParameterDelta[] = [];

  allKeys.forEach((key) => {
    const baseParam = baseline.parameters.find((p) => p.key === key);
    const candParam = candidateMap.get(key);

    if (!baseParam && candParam) {
      const severity: SeverityMeta = {
        level: 'moderate',
        threshold: thresholds.moderate,
        reason: 'Only present in candidate setup',
      };
      deltas.push({
        key,
        label: candParam.label,
        category: candParam.category,
        previousValue: '—',
        newValue: candParam.value,
        delta: candParam.value,
        significance: mapSeverityToSignificance(severity.level),
        severity,
        unit: candParam.unit,
        missingSide: 'baseline',
        value: candParam.value,
      });
      return;
    }

    if (baseParam && !candParam) {
      const severity: SeverityMeta = {
        level: 'moderate',
        threshold: thresholds.moderate,
        reason: 'Only present in baseline setup',
      };
      deltas.push({
        key,
        label: baseParam.label,
        category: baseParam.category,
        previousValue: baseParam.value,
        newValue: '—',
        delta: baseParam.value,
        significance: mapSeverityToSignificance(severity.level),
        severity,
        unit: baseParam.unit,
        missingSide: 'candidate',
        value: baseParam.value,
      });
      return;
    }

    if (!baseParam || !candParam) return;

    const delta = calculateDelta(baseParam.value, candParam.value);
    const severity = determineSeverity(delta, thresholds);

    deltas.push({
      key,
      label: candParam.label || baseParam.label,
      category: candParam.category || baseParam.category,
      previousValue: baseParam.value,
      newValue: candParam.value,
      delta,
      significance: mapSeverityToSignificance(severity.level),
      severity,
      unit: candParam.unit || baseParam.unit,
      value: candParam.value,
    });
  });

  return deltas.sort((a, b) => (a.category > b.category ? 1 : -1));
}

function calculateDelta(prev: any, next: any): number | string {
  if (typeof prev === 'number' && typeof next === 'number') {
    return Number((next - prev).toFixed(3));
  }
  if (prev === next) return 0;
  return `${next}`;
}

function determineSeverity(delta: number | string, thresholds: SeverityThresholds): SeverityMeta {
  if (typeof delta !== 'number') {
    return { level: 'minor', threshold: thresholds.minor, reason: 'Non-numeric change' };
  }
  const magnitude = Math.abs(delta);
  if (magnitude >= thresholds.major)
    return { level: 'major', magnitude, threshold: thresholds.major, reason: 'Exceeded major threshold' };
  if (magnitude >= thresholds.moderate)
    return { level: 'moderate', magnitude, threshold: thresholds.moderate, reason: 'Exceeded moderate threshold' };
  if (magnitude >= thresholds.minor)
    return { level: 'minor', magnitude, threshold: thresholds.minor, reason: 'Exceeded minor threshold' };
  return { level: 'minor', magnitude, threshold: thresholds.minor, reason: 'Below threshold but recorded' };
}

function mapSeverityToSignificance(level: SeverityLevel): ParameterDelta['significance'] {
  if (level === 'major') return 'high';
  if (level === 'moderate') return 'medium';
  return 'low';
}

export const severityDefaults = defaultThresholds;
