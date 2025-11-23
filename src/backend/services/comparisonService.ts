import { applyInterpretations } from '../../shared/interpretationEngine';
import { ParameterDelta, SetupFile, SetupParameter, TelemetrySummary, SetupProfile } from '../../shared/types';

export function compareSetups(
  previous: SetupFile,
  next: SetupFile,
  telemetry?: TelemetrySummary,
  profile?: SetupProfile,
): ParameterDelta[] {
  const deltaMap: ParameterDelta[] = [];
  const nextParameters = new Map(next.parameters.map((p) => [p.key, p]));

  previous.parameters.forEach((param) => {
    const matching = nextParameters.get(param.key);
    if (!matching) return;
    const delta = calculateDelta(param.value, matching.value);
    const significance = calculateSignificance(delta);

    deltaMap.push({
      key: param.key,
      label: param.label,
      category: param.category,
      unit: param.unit || matching.unit,
      previousValue: param.value,
      newValue: matching.value,
      delta,
      significance,
      value: matching.value,
    });
  });

  const sorted = deltaMap.sort((a, b) => (a.category > b.category ? 1 : -1));
  return applyInterpretations(sorted, telemetry, profile);
}

function calculateDelta(prev: SetupParameter['value'], next: SetupParameter['value']): number | string {
  if (typeof prev === 'number' && typeof next === 'number') {
    return Number((next - prev).toFixed(3));
  }
  return `${next}`;
}

function calculateSignificance(delta: number | string): ParameterDelta['significance'] {
  if (typeof delta !== 'number') return 'low';
  const magnitude = Math.abs(delta);
  if (magnitude >= 5) return 'high';
  if (magnitude >= 1) return 'medium';
  return 'low';
}
