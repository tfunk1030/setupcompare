import { TelemetryLapSample, TelemetrySummary } from '../../shared/types';
import { v4 as uuid } from 'uuid';

/**
 * Basic parser for iRacing .ibt exports. The real file format is binary;
 * for this demo we allow simplified CSV-like text with headers:
 * lap,lapTimeMs,fl_i,fl_m,fl_o,fr_i,fr_m,fr_o,rl_i,rl_m,rl_o,rr_i,rr_m,rr_o,fl_ws,fr_ws,rl_ws,rr_ws
 */
export function parseTelemetryBuffer(
  comparisonId: string,
  sourceName: string,
  buffer: Buffer,
): TelemetrySummary {
  const lines = buffer.toString('utf-8').split(/\r?\n/).filter(Boolean);
  const laps: TelemetryLapSample[] = [];

  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().includes('laptime')) return; // header
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 18) return;
    const [lap, lapTimeMs, fl_i, fl_m, fl_o, fr_i, fr_m, fr_o, rl_i, rl_m, rl_o, rr_i, rr_m, rr_o, fl_ws, fr_ws, rl_ws, rr_ws] = parts.map(Number);
    laps.push({
      lap: Number.isFinite(lap) ? lap : laps.length + 1,
      lapTimeMs: Number.isFinite(lapTimeMs) ? lapTimeMs : 0,
      tyreTemps: {
        frontLeft: { inner: fl_i, middle: fl_m, outer: fl_o },
        frontRight: { inner: fr_i, middle: fr_m, outer: fr_o },
        rearLeft: { inner: rl_i, middle: rl_m, outer: rl_o },
        rearRight: { inner: rr_i, middle: rr_m, outer: rr_o },
      },
      wheelSpeeds: {
        frontLeft: fl_ws,
        frontRight: fr_ws,
        rearLeft: rl_ws,
        rearRight: rr_ws,
      },
    });
  });

  return {
    id: uuid(),
    comparisonId,
    sourceName,
    laps,
    createdAt: new Date().toISOString(),
  };
}

export function summarizeTyreEdges(laps: TelemetryLapSample[]) {
  const aggregate = {
    frontOuter: 0,
    frontInner: 0,
    rearOuter: 0,
    rearInner: 0,
    count: 0,
  };

  laps.forEach((lap) => {
    aggregate.frontOuter += lap.tyreTemps.frontLeft.outer + lap.tyreTemps.frontRight.outer;
    aggregate.frontInner += lap.tyreTemps.frontLeft.inner + lap.tyreTemps.frontRight.inner;
    aggregate.rearOuter += lap.tyreTemps.rearLeft.outer + lap.tyreTemps.rearRight.outer;
    aggregate.rearInner += lap.tyreTemps.rearLeft.inner + lap.tyreTemps.rearRight.inner;
    aggregate.count += 2;
  });

  return aggregate.count
    ? {
        avgFrontOuter: aggregate.frontOuter / aggregate.count,
        avgFrontInner: aggregate.frontInner / aggregate.count,
        avgRearOuter: aggregate.rearOuter / aggregate.count,
        avgRearInner: aggregate.rearInner / aggregate.count,
      }
    : null;
}
