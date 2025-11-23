import { describe, expect, it } from 'vitest';
import { compareSetupsDetailed, severityDefaults } from '../comparisonEngine';
import { defaultRuleEngine } from '../ruleEngine';
import { buildCombinedSummary } from '../summaryEngine';
import { analyseSetups } from '../interpretationEngine';
import { ParameterDelta, SetupFile } from '../types';

const baseline: SetupFile = {
  name: 'baseline',
  parameters: [
    { key: 'ride_height.front', label: 'Front RH', category: 'ride_height', value: 50, unit: 'mm' },
    { key: 'ride_height.rear', label: 'Rear RH', category: 'ride_height', value: 55, unit: 'mm' },
    { key: 'tyre.front.left.pressure', label: 'FL Pressure', category: 'tyre', value: 24, unit: 'psi' },
    { key: 'alignment.front.toe', label: 'Front Toe', category: 'alignment', value: 0.1, unit: 'deg' },
  ],
};

const candidate: SetupFile = {
  name: 'candidate',
  parameters: [
    { key: 'ride_height.front', label: 'Front RH', category: 'ride_height', value: 52, unit: 'mm' },
    { key: 'ride_height.rear', label: 'Rear RH', category: 'ride_height', value: 50, unit: 'mm' },
    { key: 'tyre.front.left.pressure', label: 'FL Pressure', category: 'tyre', value: 23, unit: 'psi' },
    { key: 'alignment.front.toe', label: 'Front Toe', category: 'alignment', value: 0.05, unit: 'deg' },
    { key: 'alignment.rear.toe', label: 'Rear Toe', category: 'alignment', value: 0.05, unit: 'deg' },
  ],
};

describe('compareSetupsDetailed', () => {
  it('classifies numeric deltas against thresholds', () => {
    const deltas = compareSetupsDetailed(baseline, candidate);
    const frontHeight = deltas.find((d) => d.key === 'ride_height.front')!;
    expect(frontHeight.severity?.level).toBe('moderate');
    const rearHeight = deltas.find((d) => d.key === 'ride_height.rear')!;
    expect(rearHeight.severity?.level).toBe('major');
  });

  it('includes missing candidate parameters', () => {
    const missingCandidateSetup: SetupFile = {
      name: 'candidate',
      parameters: [{ key: 'ride_height.front', label: 'Front', category: 'ride_height', value: 52 }],
    };
    const deltas = compareSetupsDetailed(baseline, missingCandidateSetup);
    const missingRear = deltas.find((d) => d.missingSide === 'candidate');
    expect(missingRear?.key).toBe('ride_height.rear');
  });

  it('includes missing baseline parameters', () => {
    const missingBaseline: SetupFile = {
      name: 'candidate',
      parameters: [{ key: 'ride_height.front', label: 'Front', category: 'ride_height', value: 52 }],
    };
    const deltas = compareSetupsDetailed(missingBaseline, candidate);
    const newParam = deltas.find((d) => d.missingSide === 'baseline');
    expect(newParam?.key).toBe('ride_height.rear');
  });

  it('handles string deltas', () => {
    const baselineString: SetupFile = { name: 'b', parameters: [{ key: 'mode', label: 'Mode', category: 'other', value: 'dry' }] };
    const candidateString: SetupFile = {
      name: 'c',
      parameters: [{ key: 'mode', label: 'Mode', category: 'other', value: 'wet' }],
    };
    const deltas = compareSetupsDetailed(baselineString, candidateString);
    expect(deltas[0].severity?.level).toBe('minor');
  });

  it('supports custom thresholds', () => {
    const thresholds = { minor: 0.1, moderate: 0.2, major: 0.3 };
    const deltas = compareSetupsDetailed(baseline, candidate, thresholds);
    expect(deltas.find((d) => d.key === 'ride_height.front')?.severity?.level).toBe('major');
  });

  it('orders by category for readability', () => {
    const deltas = compareSetupsDetailed(baseline, candidate);
    expect(deltas[0].category <= deltas[deltas.length - 1].category).toBe(true);
  });
});

describe('rule engine', () => {
  it('applies rule templates with context', () => {
    const deltas: ParameterDelta[] = [
      {
        key: 'ride_height.front',
        label: 'Front RH',
        category: 'ride_height',
        previousValue: 50,
        newValue: 52,
        delta: 2,
        significance: 'medium',
        severity: { level: 'moderate', threshold: severityDefaults.moderate, magnitude: 2 },
      },
    ];
    const result = defaultRuleEngine.apply(deltas, { carModel: 'GT3', trackCategory: 'road' });
    expect(result[0].interpretation?.short).toContain('ride height');
  });

  it('respects context filters', () => {
    const deltas: ParameterDelta[] = [
      {
        key: 'differential.power',
        label: 'Power Ramp',
        category: 'differential',
        previousValue: 50,
        newValue: 60,
        delta: 10,
        significance: 'high',
        severity: { level: 'major', threshold: severityDefaults.major, magnitude: 10 },
      },
    ];
    const result = defaultRuleEngine.apply(deltas, { trackCategory: 'road' });
    expect(result[0].interpretation?.short).toContain('Power ramp');
  });
});

describe('summary engine', () => {
  it('computes balance dominance', () => {
    const deltas = compareSetupsDetailed(baseline, candidate);
    const summary = buildCombinedSummary(deltas);
    expect(summary.balance.length).toBeGreaterThan(0);
  });

  it('detects interactions between axles', () => {
    const deltas: ParameterDelta[] = [
      {
        key: 'suspension.front.spring',
        label: 'Front spring',
        category: 'suspension',
        previousValue: 100,
        newValue: 110,
        delta: 10,
        significance: 'high',
        severity: { level: 'major', threshold: 3, magnitude: 10 },
      },
      {
        key: 'suspension.rear.spring',
        label: 'Rear spring',
        category: 'suspension',
        previousValue: 100,
        newValue: 90,
        delta: -10,
        significance: 'high',
        severity: { level: 'major', threshold: 3, magnitude: 10 },
      },
    ];
    const summary = buildCombinedSummary(deltas);
    expect(summary.interactions.length).toBeGreaterThan(0);
  });

  it('adds recommendations for missing parameters', () => {
    const deltas: ParameterDelta[] = [
      {
        key: 'alignment.front',
        label: 'Front alignment',
        category: 'alignment',
        previousValue: 1,
        newValue: '—',
        delta: 1,
        significance: 'medium',
        severity: { level: 'moderate', threshold: 1 },
        missingSide: 'candidate',
      },
    ];
    const summary = buildCombinedSummary(deltas);
    expect(summary.recommendations.some((r) => r.includes('missing'))).toBe(true);
  });
});

describe('analysis orchestration', () => {
  it('returns combined summary and interpretations', () => {
    const result = analyseSetups(baseline, candidate, { profile: { carModel: 'GT3', trackCategory: 'road' } });
    expect(result.summary.combinedShort.length).toBeGreaterThan(0);
    expect(result.deltas.some((d) => d.interpretation)).toBe(true);
  });

  it('supports zero-delta reporting', () => {
    const result = analyseSetups(baseline, baseline, { profile: { carModel: 'GT3' } });
    expect(result.summary.overallEffect).toContain('Minor');
  });

  it('keeps severity metadata attached', () => {
    const result = analyseSetups(baseline, candidate, {});
    expect(result.deltas.every((d) => d.severity)).toBe(true);
  });

  it('works with non-numeric parameters', () => {
    const base: SetupFile = { name: 'b', parameters: [{ key: 'mode', label: 'Mode', category: 'other', value: 'dry' }] };
    const next: SetupFile = { name: 'c', parameters: [{ key: 'mode', label: 'Mode', category: 'other', value: 'wet' }] };
    const result = analyseSetups(base, next, {});
    expect(result.deltas[0].severity?.level).toBe('minor');
  });
});
