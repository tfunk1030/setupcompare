import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../utils/auth';
import { parseSetupFromString } from '../services/setupParser';
import { runComparison } from '../services/comparisonService';
import {
  ComparisonRecord,
  ParameterDelta,
  SetupAnalysisResponse,
  SetupFile,
  SetupProfile,
  TelemetrySummary,
} from '../../shared/types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const router = Router();

router.post('/upload', authenticate, upload.array('files', 2), (req: AuthenticatedRequest, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length !== 2) {
    return res.status(400).json({ message: 'Two setup files are required' });
  }

  const [baselineFile, candidateFile] = req.files as Express.Multer.File[];
  const baseline = parseSetupFromString(baselineFile.originalname, baselineFile.buffer.toString('utf-8'));
  const candidate = parseSetupFromString(candidateFile.originalname, candidateFile.buffer.toString('utf-8'));
  const carModel = (req.body.carModel as string) || undefined;
  const trackCategory = (req.body.trackCategory as string) || undefined;
  const trackName = (req.body.trackName as string) || undefined;
  const result = runComparison(baseline, candidate, {
    profile: { carModel, trackCategory, trackName },
  });

  const persisted = persistComparison(req.userId!, baseline, candidate, result, {
    carModel,
    trackCategory,
    trackName,
  });

  return res.json(persisted);
});

router.get('/history', authenticate, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM comparisons WHERE user_id = ? ORDER BY created_at DESC').all(req.userId) as any[];
  const response = rows.map((row) => ({
    id: row.id,
    baselineName: row.baseline_name,
    candidateName: row.candidate_name,
    createdAt: row.created_at,
    shareId: row.share_id,
    carModel: row.car_model,
    trackName: row.track_name,
    trackCategory: row.track_category,
    status: row.status,
  }));
  return res.json(response);
});

router.get('/shared/:shareId', (req, res) => {
  const row = db.prepare('SELECT * FROM comparisons WHERE share_id = ?').get(req.params.shareId) as any;
  if (!row) return res.status(404).json({ message: 'Comparison not found' });
  const telemetryRow = db.prepare('SELECT * FROM telemetry WHERE comparison_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id) as any;
  const telemetry: TelemetrySummary | undefined = telemetryRow ? JSON.parse(telemetryRow.data) : undefined;
  const hydrated = hydrateComparison(row, telemetry);
  return res.json(hydrated);
});

router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM comparisons WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!row) return res.status(404).json({ message: 'Comparison not found' });
  const telemetryRow = db.prepare('SELECT * FROM telemetry WHERE comparison_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id) as any;
  const telemetry: TelemetrySummary | undefined = telemetryRow ? JSON.parse(telemetryRow.data) : undefined;
  const hydrated = hydrateComparison(row, telemetry);
  return res.json({ ...hydrated, status: row.status });
});

router.post('/analyseSetupEffects', authenticate, upload.fields([{ name: 'setupA', maxCount: 1 }, { name: 'setupB', maxCount: 1 }]), (req: AuthenticatedRequest, res) => {
  try {
    const { setupA, setupB, profile } = resolveSetupsFromRequest(req);
    if (!setupA || !setupB) return res.status(400).json({ message: 'Two setups are required' });
    const result = runComparison(setupA, setupB, { profile });
    const persisted = persistComparison(req.userId!, setupA, setupB, result, profile);
    return res.json(persisted);
  } catch (e: any) {
    return res.status(400).json({ message: e.message || 'Unable to analyse setups' });
  }
});

router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!comparison) return res.status(404).json({ message: 'Not found' });
  db.prepare('DELETE FROM parameters WHERE comparison_id = ?').run(req.params.id);
  db.prepare('DELETE FROM telemetry WHERE comparison_id = ?').run(req.params.id);
  db.prepare('DELETE FROM comparisons WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Deleted' });
});

router.post('/:id/archive', authenticate, (req: AuthenticatedRequest, res) => {
  const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!comparison) return res.status(404).json({ message: 'Not found' });
  const status = req.body?.status === 'archived' ? 'archived' : 'active';
  db.prepare('UPDATE comparisons SET status = ? WHERE id = ?').run(status, req.params.id);
  return res.json({ message: 'Updated', status });
});

export default router;

function inferMeta(baseline: ComparisonRecord['baseline'], candidate: ComparisonRecord['candidate']) {
  const carParam = [...baseline.parameters, ...candidate.parameters].find((p) => p.key.includes('car.model'));
  const trackParam = [...baseline.parameters, ...candidate.parameters].find((p) => p.key.includes('track.name'));
  return {
    carModel: (carParam?.value as string) || baseline.name || 'Unknown Car',
    trackName: (trackParam?.value as string) || candidate.name || 'Unknown Track',
  };
}

function persistComparison(
  userId: string,
  baseline: SetupFile,
  candidate: SetupFile,
  analysis: SetupAnalysisResponse,
  profile: SetupProfile,
) {
  const comparisonId = uuid();
  const shareId = uuid();
  const inferred = inferMeta(baseline, candidate);
  const finalCarModel = profile.carModel || inferred.carModel;
  const finalTrackName = profile.trackName || inferred.trackName;
  const setupAId = persistSetup(userId, baseline, finalCarModel, finalTrackName);
  const setupBId = persistSetup(userId, candidate, finalCarModel, finalTrackName);

  db.prepare(
    'INSERT INTO comparisons (id, user_id, baseline_name, candidate_name, created_at, share_id, car_model, track_name, track_category, setupA_id, setupB_id, delta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    comparisonId,
    userId,
    baseline.name,
    candidate.name,
    new Date().toISOString(),
    shareId,
    finalCarModel,
    finalTrackName,
    profile.trackCategory,
    setupAId,
    setupBId,
    JSON.stringify(analysis),
  );

  const result: ComparisonRecord = {
    id: comparisonId,
    userId,
    createdAt: new Date().toISOString(),
    baseline,
    candidate,
    deltas: analysis.deltas,
    summary: analysis.summary,
    shareId,
    carModel: finalCarModel,
    trackName: finalTrackName,
    trackCategory: profile.trackCategory,
  };

  return result;
}

function persistSetup(userId: string, setup: SetupFile, carModel?: string, track?: string) {
  const id = uuid();
  db.prepare('INSERT INTO setups (id, user_id, car_model, track, parameter_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    userId,
    carModel,
    track,
    JSON.stringify(setup),
    new Date().toISOString(),
  );
  return id;
}

function resolveSetupsFromRequest(req: AuthenticatedRequest) {
  const setupSchema = z.object({
    name: z.string(),
    parameters: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        category: z.string(),
        value: z.union([z.string(), z.number()]),
        unit: z.string().optional(),
      }),
    ),
  });

  const profile: SetupProfile = {
    carModel: (req.body.carModel as string) || undefined,
    trackCategory: (req.body.trackCategory as string) || undefined,
    trackName: (req.body.trackName as string) || undefined,
  };

  const setupAId = req.body.setupA_id as string | undefined;
  const setupBId = req.body.setupB_id as string | undefined;

  if (setupAId && setupBId) {
    const setupA = loadSetup(setupAId, req.userId!);
    const setupB = loadSetup(setupBId, req.userId!);
    if (!setupA || !setupB) throw new Error('Invalid setup ids');
    return { setupA, setupB, profile };
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const setupAFile = files?.setupA?.[0];
  const setupBFile = files?.setupB?.[0];
  if (setupAFile && setupBFile) {
    return {
      setupA: parseSetupFromString(setupAFile.originalname, setupAFile.buffer.toString('utf-8')),
      setupB: parseSetupFromString(setupBFile.originalname, setupBFile.buffer.toString('utf-8')),
      profile,
    };
  }

  const setupAJson = req.body.setupA;
  const setupBJson = req.body.setupB;
  if (setupAJson && setupBJson) {
    const parsedA = setupSchema.parse(typeof setupAJson === 'string' ? JSON.parse(setupAJson) : setupAJson);
    const parsedB = setupSchema.parse(typeof setupBJson === 'string' ? JSON.parse(setupBJson) : setupBJson);
    return { setupA: parsedA, setupB: parsedB, profile };
  }

  throw new Error('No setups provided');
}

function loadSetup(id: string, userId: string): SetupFile | null {
  const row = db.prepare('SELECT * FROM setups WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!row) return null;
  return JSON.parse(row.parameter_json) as SetupFile;
}

function hydrateComparison(row: any, telemetry?: TelemetrySummary) {
  const meta: SetupProfile = {
    carModel: row.car_model,
    trackCategory: row.track_category,
    trackName: row.track_name,
  };
  if (row.delta_json) {
    const parsed = JSON.parse(row.delta_json) as SetupAnalysisResponse;
    const baseline = row.setupA_id ? loadSetup(row.setupA_id, row.user_id) : undefined;
    const candidate = row.setupB_id ? loadSetup(row.setupB_id, row.user_id) : undefined;
    return {
      id: row.id,
      baselineName: row.baseline_name,
      candidateName: row.candidate_name,
      createdAt: row.created_at,
      deltas: parsed.deltas,
      summary: parsed.summary,
      telemetry,
      carModel: row.car_model,
      trackName: row.track_name,
      trackCategory: row.track_category,
      setupAId: row.setupA_id,
      setupBId: row.setupB_id,
      baseline,
      candidate,
    };
  }

  const params = db.prepare('SELECT * FROM parameters WHERE comparison_id = ?').all(row.id) as any[];
  const deltas = applyInterpretationFromParams(params, meta);
  return {
    id: row.id,
    baselineName: row.baseline_name,
    candidateName: row.candidate_name,
    createdAt: row.created_at,
    deltas,
    telemetry,
    carModel: row.car_model,
    trackName: row.track_name,
    trackCategory: row.track_category,
  };
}

function applyInterpretationFromParams(rows: any[], profile: SetupProfile) {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    category: row.category,
    value: coerce(row.new_value),
    previousValue: coerce(row.previous_value),
    newValue: coerce(row.new_value),
    delta: coerce(row.delta),
    significance: row.significance,
    insight: row.insight,
    unit: row.unit || undefined,
    interpretation:
      row.interpretation_short || row.interpretation_full
        ? { short: row.interpretation_short, full: row.interpretation_full }
        : undefined,
    severity: row.significance === 'high' ? { level: 'major', threshold: 0 } : undefined,
  }));
}

function coerce(value: any) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}
