import { compareSetupsDetailed, severityDefaults } from './comparisonEngine';
import { defaultRuleEngine } from './ruleEngine';
import { buildCombinedSummary } from './summaryEngine';
import { ParameterDelta, SetupAnalysisResponse, SetupFile, SetupProfile, TelemetrySummary } from './types';

export interface InterpretationOptions {
  profile?: SetupProfile;
  thresholds?: typeof severityDefaults;
  telemetry?: TelemetrySummary;
}

export function analyseSetups(
  baseline: SetupFile,
  candidate: SetupFile,
  options: InterpretationOptions = {},
): SetupAnalysisResponse {
  const deltas = compareSetupsDetailed(baseline, candidate, options.thresholds ?? severityDefaults);
  const interpreted = applyInterpretations(deltas, options.telemetry, options.profile);
  const summary = buildCombinedSummary(interpreted);
  return { deltas: interpreted, summary, baseline, candidate };
}

export function applyInterpretations(
  deltas: ParameterDelta[],
  _telemetry?: TelemetrySummary,
  profile?: SetupProfile,
): ParameterDelta[] {
  return defaultRuleEngine.apply(deltas, profile);
}
