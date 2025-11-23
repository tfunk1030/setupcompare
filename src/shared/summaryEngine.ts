import { ParameterDelta, SetupAnalysisSummary } from './types';

export function buildCombinedSummary(deltas: ParameterDelta[]): SetupAnalysisSummary {
  const majorChanges = deltas.filter((d) => d.severity?.level === 'major');
  const moderateChanges = deltas.filter((d) => d.severity?.level === 'moderate');

  const overallEffect = majorChanges.length
    ? `Major balance shifts detected across ${majorChanges.length} parameter(s)`
    : moderateChanges.length
    ? `Moderate tuning changes detected (${moderateChanges.length} parameter(s))`
    : 'Minor baseline adjustments only';

  const interactions = findInteractions(deltas);
  const balance = buildBalanceCheck(deltas);
  const recommendations = buildRecommendations(deltas);

  return {
    overallEffect,
    interactions,
    balance,
    recommendations,
    combinedShort: `${overallEffect}. ${balance}`.trim(),
    combinedFull: `${overallEffect}. ${balance}. Interactions: ${
      interactions.length ? interactions.join('; ') : 'none detected'
    }. Recommendations: ${recommendations.join('; ')}`,
  };
}

function findInteractions(deltas: ParameterDelta[]): string[] {
  const interactions: string[] = [];
  const frontRearPairs: Record<string, { front?: ParameterDelta; rear?: ParameterDelta }> = {};

  deltas.forEach((delta) => {
    if (delta.key.includes('front')) {
      const token = delta.key.replace('front', '');
      if (!frontRearPairs[token]) frontRearPairs[token] = {};
      frontRearPairs[token].front = delta;
    }
    if (delta.key.includes('rear')) {
      const token = delta.key.replace('rear', '');
      if (!frontRearPairs[token]) frontRearPairs[token] = {};
      frontRearPairs[token].rear = delta;
    }
  });

  Object.values(frontRearPairs).forEach((pair) => {
    if (pair.front && pair.rear && typeof pair.front.delta === 'number' && typeof pair.rear.delta === 'number') {
      if (pair.front.delta > 0 && pair.rear.delta < 0) {
        interactions.push('Front increase offset by rear decrease, check balance');
      }
      if (pair.front.delta < 0 && pair.rear.delta > 0) {
        interactions.push('Rear increase offset by front decrease, expect neutral balance');
      }
    }
  });

  return interactions;
}

function buildBalanceCheck(deltas: ParameterDelta[]): string {
  const frontChanges = deltas.filter((d) => d.key.includes('front'));
  const rearChanges = deltas.filter((d) => d.key.includes('rear'));
  const frontMagnitude = sumMagnitude(frontChanges);
  const rearMagnitude = sumMagnitude(rearChanges);

  if (frontMagnitude === 0 && rearMagnitude === 0) return 'No axle-specific balance change detected';
  if (frontMagnitude > rearMagnitude) return 'Front axle changes dominate, expect more responsiveness';
  if (rearMagnitude > frontMagnitude) return 'Rear axle changes dominate, exits may feel different';
  return 'Balanced axle adjustments applied';
}

function sumMagnitude(deltas: ParameterDelta[]) {
  return deltas.reduce((total, delta) => {
    if (typeof delta.delta === 'number' && delta.severity) {
      return total + Math.abs(delta.delta);
    }
    return total;
  }, 0);
}

function buildRecommendations(deltas: ParameterDelta[]): string[] {
  const recommendations: string[] = [];
  const missing = deltas.filter((d) => d.missingSide);
  if (missing.length) {
    recommendations.push('Verify missing parameters and align both setups before testing');
  }
  if (deltas.some((d) => d.severity?.level === 'major')) {
    recommendations.push('Plan a shakedown lap to validate major changes');
  }
  if (deltas.some((d) => d.category === 'tyre')) {
    recommendations.push('Monitor tyre temps/pressures to confirm expected behaviour');
  }
  if (recommendations.length === 0) recommendations.push('Run standard validation laps to confirm feel');
  return recommendations;
}
