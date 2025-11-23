export type SetupParameterCategory =
  | 'suspension'
  | 'aero'
  | 'ride_height'
  | 'tyre'
  | 'alignment'
  | 'differential'
  | 'brakes'
  | 'fuel'
  | 'drivetrain'
  | 'other';

export interface SetupParameter {
  key: string;
  label: string;
  category: SetupParameterCategory;
  value: number | string;
  unit?: string;
}

export type CarModelProfile = 'GT3' | 'Prototype' | 'Oval';
export type TrackCategory = 'road' | 'short-oval' | 'superspeedway';

export interface SetupProfile {
  carModel?: CarModelProfile | string;
  trackCategory?: TrackCategory | string;
  trackName?: string;
}

export interface SetupFile {
  name: string;
  parameters: SetupParameter[];
}

export interface ParameterDelta extends SetupParameter {
  previousValue: number | string;
  newValue: number | string;
  delta: number | string;
  significance: 'low' | 'medium' | 'high';
  insight?: string;
  interpretation?: {
    short: string;
    full: string;
  };
}

export interface TelemetryLapSample {
  lap: number;
  lapTimeMs: number;
  tyreTemps: {
    frontLeft: { inner: number; middle: number; outer: number };
    frontRight: { inner: number; middle: number; outer: number };
    rearLeft: { inner: number; middle: number; outer: number };
    rearRight: { inner: number; middle: number; outer: number };
  };
  wheelSpeeds: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
}

export interface TelemetrySummary {
  id: string;
  comparisonId: string;
  sourceName: string;
  laps: TelemetryLapSample[];
  createdAt: string;
}

export interface ComparisonRecord {
  id: string;
  userId: string;
  createdAt: string;
  baseline: SetupFile;
  candidate: SetupFile;
  deltas: ParameterDelta[];
  notes?: string;
  shareId?: string;
  carModel?: string;
  trackName?: string;
  trackCategory?: TrackCategory | string;
  status?: 'active' | 'archived';
  telemetry?: TelemetrySummary;
}
