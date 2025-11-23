import { ParameterDelta, SetupProfile, TelemetrySummary } from './types';
import profileRules from './ProfileRules.json';

interface InterpretationRule {
  keyIncludes: string[];
  threshold?: number;
  buildShort: (delta: number, direction: 'increase' | 'decrease') => string;
  buildFull: (delta: number, direction: 'increase' | 'decrease') => string;
}

interface ProfileRuleGroup {
  carModel?: string;
  trackCategory?: string;
  overrides: ProfileRule[];
}

interface ProfileRule {
  keyIncludes: string[];
  shortHint?: string;
  fullHint?: string;
}

const rules: InterpretationRule[] = [
  {
    keyIncludes: ['ride_height.front'],
    threshold: 1,
    buildShort: (delta, dir) =>
      `${dir === 'increase' ? 'Raised' : 'Lowered'} front ride height by ${Math.abs(delta)} mm: front aero balance ${
        dir === 'increase' ? 'lighter' : 'stronger'
      }`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Reducing'} front ride height by ${Math.abs(
        delta
      )} mm decreases front downforce and ${dir === 'increase' ? 'can promote understeer on turn-in' : 'sharpens turn-in but risks bottoming'}.`,
  },
  {
    keyIncludes: ['ride_height.rear'],
    threshold: 1,
    buildShort: (delta, dir) =>
      `${dir === 'increase' ? 'Raised' : 'Lowered'} rear ride height by ${Math.abs(delta)} mm: shifts aero balance ${
        dir === 'increase' ? 'forward' : 'rearward'
      }`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Raising' : 'Lowering'} the rear ${Math.abs(
        delta
      )} mm tilts the car and ${dir === 'increase' ? 'adds rotation/oversteer mid-corner' : 'stabilizes exits but can add understeer'}.`,
  },
  {
    keyIncludes: ['aero.front.wing'],
    threshold: 0.5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Added' : 'Removed'} front wing: ${dir === 'increase' ? 'more' : 'less'} turn-in bite`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'More' : 'Less'} front wing by ${Math.abs(delta)} step(s) ${
        dir === 'increase'
          ? 'increases front downforce for better high-speed rotation'
          : 'reduces drag but can cause mid-corner understeer'
      }.`,
  },
  {
    keyIncludes: ['aero.rear.wing'],
    threshold: 0.5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Added' : 'Trimmed'} rear wing: ${dir === 'increase' ? 'more' : 'less'} rear stability`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'More' : 'Less'} rear wing by ${Math.abs(delta)} step(s) ${
        dir === 'increase' ? 'adds stability in fast sweepers' : 'boosts straight-line speed but may loosen the rear'
      }.`,
  },
  {
    keyIncludes: ['tyre.front', 'pressure'],
    threshold: 0.5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Raised' : 'Dropped'} front tyre pressures: ${dir === 'increase' ? 'sharper' : 'more compliant'} front grip`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Higher' : 'Lower'} front pressures by ${Math.abs(
        delta
      )} kPa ${dir === 'increase' ? 'reduce carcass flex for response but risk overheating' : 'increase contact patch for grip but may overheat the shoulders'}.`,
  },
  {
    keyIncludes: ['tyre.rear', 'pressure'],
    threshold: 0.5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Raised' : 'Dropped'} rear tyre pressures: ${dir === 'increase' ? 'more agile' : 'more planted'} exits`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Higher' : 'Lower'} rear pressures by ${Math.abs(
        delta
      )} kPa ${dir === 'increase' ? 'sharpen rotation but reduce traction over bumps' : 'add traction and compliance but soften response'}.`,
  },
  {
    keyIncludes: ['alignment.front', 'camber'],
    threshold: 0.1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} negative front camber: ${dir === 'increase' ? 'grippier mid-corner' : 'better braking'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Adding' : 'Reducing'} front negative camber by ${Math.abs(
        delta
      )}° ${dir === 'increase' ? 'boosts lateral grip mid-corner' : 'improves braking stability and tire wear'}.`,
  },
  {
    keyIncludes: ['alignment.rear', 'camber'],
    threshold: 0.1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} negative rear camber: ${dir === 'increase' ? 'better rotation' : 'stronger traction'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Adding' : 'Reducing'} rear negative camber by ${Math.abs(
        delta
      )}° ${dir === 'increase' ? 'helps rotation but may stress inner shoulder' : 'improves traction and tire longevity'}.`,
  },
  {
    keyIncludes: ['alignment.front', 'toe'],
    threshold: 0.01,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} front toe-out: ${dir === 'increase' ? 'quicker turn-in' : 'calmer straights'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Reducing'} front toe-out by ${Math.abs(
        delta
      )}° ${dir === 'increase' ? 'sharpens initial rotation but adds scrub and heat' : 'improves straight-line stability and reduces scrub'}.`,
  },
  {
    keyIncludes: ['alignment.rear', 'toe'],
    threshold: 0.01,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} rear toe-in: ${dir === 'increase' ? 'stabler exits' : 'freer rotation'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Reducing'} rear toe-in by ${Math.abs(
        delta
      )}° ${dir === 'increase' ? 'calms the rear on throttle' : 'helps the car rotate but may feel nervous on exit'}.`,
  },
  {
    keyIncludes: ['suspension.arb.front'],
    threshold: 0.25,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Stiffer' : 'Softer'} front ARB: ${dir === 'increase' ? 'flatter but pushier' : 'more roll, more bite'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Tightening' : 'Softening'} the front anti-roll bar by ${Math.abs(
        delta
      )} step(s) ${dir === 'increase' ? 'reduces roll yet can add mid-corner understeer' : 'adds front grip on entry at the cost of more roll'}.`,
  },
  {
    keyIncludes: ['suspension.arb.rear'],
    threshold: 0.25,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Stiffer' : 'Softer'} rear ARB: ${dir === 'increase' ? 'quicker rotation' : 'calmer rear'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Tightening' : 'Softening'} the rear anti-roll bar by ${Math.abs(
        delta
      )} step(s) ${dir === 'increase' ? 'helps rotation but may snap over bumps' : 'improves traction and stability on exits'}.`,
  },
  {
    keyIncludes: ['suspension.front', 'spring_rate'],
    threshold: 5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Stiffer' : 'Softer'} front springs: ${dir === 'increase' ? 'sharper but harsher' : 'more grip on bumps'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Decreasing'} front spring rate by ${Math.abs(
        delta
      )} N/mm ${dir === 'increase' ? 'reduces roll and pitch but can add understeer on bumps' : 'improves compliance and front traction'}.`,
  },
  {
    keyIncludes: ['suspension.rear', 'spring_rate'],
    threshold: 5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Stiffer' : 'Softer'} rear springs: ${dir === 'increase' ? 'more rotation' : 'more traction'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Decreasing'} rear spring rate by ${Math.abs(
        delta
      )} N/mm ${dir === 'increase' ? 'helps rotation but can reduce power-down grip' : 'adds traction on exit but may add squat'}.`,
  },
  {
    keyIncludes: ['alignment', 'caster'],
    threshold: 0.2,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} caster: ${dir === 'increase' ? 'heavier steering' : 'lighter steering'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Adding' : 'Reducing'} caster by ${Math.abs(
        delta
      )}° ${dir === 'increase' ? 'increases self-aligning torque and dynamic camber' : 'lightens steering but reduces camber gain'}.`,
  },
  {
    keyIncludes: ['brakes.bias'],
    threshold: 0.1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} front brake bias: ${dir === 'increase' ? 'stable braking' : 'more rotation'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Moving bias forward by' : 'Shifting bias rearward by'} ${Math.abs(
        delta
      )}% ${dir === 'increase' ? 'reduces rear lock risk but may cause front lockups' : 'aids rotation under braking but can destabilize the rear'}.`,
  },
  {
    keyIncludes: ['brakes.pressure'],
    threshold: 2,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Higher' : 'Lower'} brake pressure: ${dir === 'increase' ? 'more bite' : 'more modulation'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Decreasing'} brake pressure by ${Math.abs(
        delta
      )}% ${dir === 'increase' ? 'improves peak braking but can cause lockups' : 'softens initial bite and improves control'}.`,
  },
  {
    keyIncludes: ['differential.preload'],
    threshold: 5,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Higher' : 'Lower'} diff preload: ${dir === 'increase' ? 'stable' : 'nimble'} entry`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Raising' : 'Lowering'} preload by ${Math.abs(
        delta
      )} Nm ${dir === 'increase' ? 'keeps wheels locked longer for stability' : 'allows freer rotation on entry but may feel loose on throttle lift'}.`,
  },
  {
    keyIncludes: ['differential.power'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} power ramp: ${dir === 'increase' ? 'traction' : 'rotation'} on exit`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Reducing'} power ramp by ${Math.abs(
        delta
      )}% ${dir === 'increase' ? 'locks diff on throttle for traction but can push wide' : 'frees diff for rotation but may spin inside tire'}.`,
  },
  {
    keyIncludes: ['differential.coast'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} coast ramp: ${dir === 'increase' ? 'stable braking' : 'more entry rotation'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Reducing'} coast ramp by ${Math.abs(
        delta
      )}% ${dir === 'increase' ? 'stabilizes the car off-throttle' : 'lets the rear rotate more on entry'}.`,
  },
  {
    keyIncludes: ['fuel.start'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} starting fuel: ${dir === 'increase' ? 'longer stints' : 'lighter car'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Adding' : 'Removing'} ${Math.abs(
        delta
      )} L of fuel ${dir === 'increase' ? 'extends stint length but increases weight and tire load' : 'lightens the car for agility but limits stint length'}.`,
  },
  {
    keyIncludes: ['drivetrain.gear_ratio.final'],
    threshold: 0.01,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Shorter' : 'Taller'} final drive: ${dir === 'increase' ? 'quicker accel' : 'higher top speed'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Shortening' : 'Lengthening'} the final drive by ${Math.abs(
        delta
      )} ${dir === 'increase' ? 'helps acceleration but lowers top speed' : 'reduces acceleration for better top speed'}.`,
  },
  {
    keyIncludes: ['suspension.bumpstop'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'Higher' : 'Lower'} bump stops: ${dir === 'increase' ? 'later support' : 'earlier support'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Raising' : 'Lowering'} bump stop gaps by ${Math.abs(
        delta
      )} mm ${dir === 'increase' ? 'delays extra stiffness, keeping platform freer' : 'brings bump stops in earlier for support but can upset balance on bumps'}.`,
  },
  {
    keyIncludes: ['suspension.damper.rebound.front'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} front rebound: ${dir === 'increase' ? 'firmer platform' : 'more compliance'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Decreasing'} front rebound by ${Math.abs(
        delta
      )} click(s) ${dir === 'increase' ? 'controls weight transfer but may reduce front grip on exits' : 'lets the nose rise faster, aiding traction but risking float'}.`,
  },
  {
    keyIncludes: ['suspension.damper.rebound.rear'],
    threshold: 1,
    buildShort: (delta, dir) => `${dir === 'increase' ? 'More' : 'Less'} rear rebound: ${dir === 'increase' ? 'firmer exits' : 'freer rotation'}`,
    buildFull: (delta, dir) =>
      `${dir === 'increase' ? 'Increasing' : 'Decreasing'} rear rebound by ${Math.abs(
        delta
      )} click(s) ${dir === 'increase' ? 'keeps rear planted on throttle' : 'allows weight to transfer forward for rotation'}.`,
  },
];

const profileConfig: { profiles: ProfileRuleGroup[] } = profileRules as any;

function normalize(value?: string) {
  return value ? value.toLowerCase() : undefined;
}

function matchesGroup(group: ProfileRuleGroup, profile: SetupProfile) {
  const carMatch = group.carModel ? normalize(group.carModel) === normalize(profile.carModel) : true;
  const trackMatch = group.trackCategory ? normalize(group.trackCategory) === normalize(profile.trackCategory) : true;
  return carMatch && trackMatch;
}

function resolveProfileGroups(profile?: SetupProfile): ProfileRuleGroup[] {
  if (!profileConfig?.profiles?.length) return [];
  const context = profile || {};
  const groups = profileConfig.profiles as ProfileRuleGroup[];
  const exact = groups.filter((g) => g.carModel && g.trackCategory && matchesGroup(g, context));
  if (exact.length) return exact;
  const carOnly = groups.filter((g) => g.carModel && !g.trackCategory && matchesGroup(g, context));
  const trackOnly = groups.filter((g) => !g.carModel && g.trackCategory && matchesGroup(g, context));
  const generic = groups.filter((g) => !g.carModel && !g.trackCategory);
  return [...carOnly, ...trackOnly, ...generic];
}

function findProfileOverride(delta: ParameterDelta, groups: ProfileRuleGroup[]): ProfileRule | undefined {
  return groups
    .map((group) => group.overrides.find((override) => override.keyIncludes.every((k) => delta.key.includes(k))))
    .find((hit) => !!hit);
}

function matchRule(delta: ParameterDelta): InterpretationRule | undefined {
  if (typeof delta.delta !== 'number') return undefined;
  return rules.find((rule) => rule.keyIncludes.every((k) => delta.key.includes(k)));
}

function buildTelemetryTail(delta: ParameterDelta, telemetry?: TelemetrySummary): string | null {
  if (!telemetry || !telemetry.laps.length || typeof delta.delta !== 'number') return null;
  const outerInner = telemetry.laps.reduce(
    (acc, lap) => {
      acc.frontOuter += lap.tyreTemps.frontLeft.outer + lap.tyreTemps.frontRight.outer;
      acc.frontInner += lap.tyreTemps.frontLeft.inner + lap.tyreTemps.frontRight.inner;
      acc.rearOuter += lap.tyreTemps.rearLeft.outer + lap.tyreTemps.rearRight.outer;
      acc.rearInner += lap.tyreTemps.rearLeft.inner + lap.tyreTemps.rearRight.inner;
      acc.count += 2;
      return acc;
    },
    { frontOuter: 0, frontInner: 0, rearOuter: 0, rearInner: 0, count: 0 },
  );

  const avg = outerInner.count
    ? {
        frontOuter: outerInner.frontOuter / outerInner.count,
        frontInner: outerInner.frontInner / outerInner.count,
        rearOuter: outerInner.rearOuter / outerInner.count,
        rearInner: outerInner.rearInner / outerInner.count,
      }
    : null;

  if (!avg) return null;

  const moreNegative =
    typeof delta.previousValue === 'number' && typeof delta.newValue === 'number'
      ? delta.newValue < delta.previousValue
      : false;

  if (delta.key.includes('alignment.rear') && delta.key.includes('camber') && moreNegative && avg.rearOuter - avg.rearInner > 3) {
    return `Telemetry shows hot rear outer shoulders; combined with adding negative camber this may keep the tire on edge and loosen exits.`;
  }

  if (delta.key.includes('alignment.front') && delta.key.includes('toe') && avg.frontInner - avg.frontOuter > 2 && delta.delta > 0) {
    return `Front inners are running hotter; extra toe-out could worsen scrub and heat—consider moderating toe or pressures.`;
  }

  if (delta.key.includes('tyre') && delta.key.includes('pressure') && avg.frontOuter > 100 && delta.delta < 0) {
    return `Telemetry highlights high outer temps; lowering pressures further could overwork the shoulders—watch longevity.`;
  }

  return null;
}

export function applyInterpretations(
  deltas: ParameterDelta[],
  telemetry?: TelemetrySummary,
  profile?: SetupProfile,
): ParameterDelta[] {
  const profileGroups = resolveProfileGroups(profile);
  return deltas.map((delta) => {
    const rule = matchRule(delta);
    if (!rule || typeof delta.delta !== 'number') return delta;
    if (rule.threshold && Math.abs(delta.delta) < rule.threshold) return delta;

    const direction: 'increase' | 'decrease' = delta.delta >= 0 ? 'increase' : 'decrease';
    const short = rule.buildShort(delta.delta, direction);
    const telemetryTail = buildTelemetryTail(delta, telemetry);
    const baseFull = rule.buildFull(delta.delta, direction);
    const full = telemetryTail ? `${baseFull} ${telemetryTail}` : baseFull;
    const override = findProfileOverride(delta, profileGroups);
    const enhancedShort = override?.shortHint ? `${short} — ${override.shortHint}` : short;
    const enhancedFull = override?.fullHint ? `${full} ${override.fullHint}` : full;

    return {
      ...delta,
      insight: enhancedShort,
      interpretation: { short: enhancedShort, full: enhancedFull },
    };
  });
}
