import { analyseSetups, InterpretationOptions } from '../../shared/interpretationEngine';
import { SetupAnalysisResponse, SetupFile } from '../../shared/types';

export function runComparison(
  baseline: SetupFile,
  candidate: SetupFile,
  options: InterpretationOptions,
): SetupAnalysisResponse {
  return analyseSetups(baseline, candidate, options);
}
