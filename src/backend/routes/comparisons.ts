import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../utils/auth';
import { parseSetupFromString } from '../services/setupParser';
import { compareSetups } from '../services/comparisonService';
import { applyInterpretations } from '../../shared/interpretationEngine';
import { ComparisonRecord, ParameterDelta, SetupProfile, TelemetrySummary } from '../../shared/types';

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
  const deltas = compareSetups(baseline, candidate, undefined, { carModel, trackCategory, trackName });

  const comparisonId = uuid();
  const shareId = uuid();
  const inferred = inferMeta(baseline, candidate);
  const finalCarModel = carModel || inferred.carModel;
  const finalTrackName = trackName || inferred.trackName;
  db.prepare(
    'INSERT INTO comparisons (id, user_id, baseline_name, candidate_name, created_at, share_id, car_model, track_name, track_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    comparisonId,
    req.userId,
    baseline.name,
    candidate.name,
    new Date().toISOString(),
    shareId,
    finalCarModel,
    finalTrackName,
    trackCategory,
  );

  const paramStmt = db.prepare(
    'INSERT INTO parameters (comparison_id, key, label, category, previous_value, new_value, delta, significance, insight, unit, interpretation_short, interpretation_full) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertMany = db.transaction((rows) => {
    rows.forEach((row) =>
      paramStmt.run(
        comparisonId,
        row.key,
        row.label,
        row.category,
        String(row.previousValue),
        String(row.newValue),
        String(row.delta),
        row.significance,
        row.insight || null,
        row.unit || null,
        row.interpretation?.short || null,
        row.interpretation?.full || null,
      ),
    );
  });
  insertMany(deltas);

  const result: ComparisonRecord = {
    id: comparisonId,
    userId: req.userId!,
    createdAt: new Date().toISOString(),
    baseline,
    candidate,
    deltas,
    shareId,
    carModel: finalCarModel,
    trackName: finalTrackName,
    trackCategory,
  };

  return res.json(result);
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
  const params = db.prepare('SELECT * FROM parameters WHERE comparison_id = ?').all(row.id) as any[];
  const telemetryRow = db.prepare('SELECT * FROM telemetry WHERE comparison_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id) as any;
  const telemetry: TelemetrySummary | undefined = telemetryRow ? JSON.parse(telemetryRow.data) : undefined;
  const deltas = applyInterpretationFromDb(params, telemetry, {
    carModel: row.car_model,
    trackCategory: row.track_category,
    trackName: row.track_name,
  });
  return res.json({
    id: row.id,
    baselineName: row.baseline_name,
    candidateName: row.candidate_name,
    createdAt: row.created_at,
    deltas,
    telemetry,
    carModel: row.car_model,
    trackName: row.track_name,
    trackCategory: row.track_category,
  });
});

router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM comparisons WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!row) return res.status(404).json({ message: 'Comparison not found' });
  const params = db.prepare('SELECT * FROM parameters WHERE comparison_id = ?').all(row.id) as any[];
  const telemetryRow = db.prepare('SELECT * FROM telemetry WHERE comparison_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id) as any;
  const telemetry: TelemetrySummary | undefined = telemetryRow ? JSON.parse(telemetryRow.data) : undefined;
  const deltas = applyInterpretationFromDb(params, telemetry, {
    carModel: row.car_model,
    trackCategory: row.track_category,
    trackName: row.track_name,
  });
  return res.json({
    id: row.id,
    baselineName: row.baseline_name,
    candidateName: row.candidate_name,
    createdAt: row.created_at,
    deltas,
    telemetry,
    carModel: row.car_model,
    trackName: row.track_name,
    trackCategory: row.track_category,
    status: row.status,
  });
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

function applyInterpretationFromDb(rows: any[], telemetry?: TelemetrySummary, profile?: SetupProfile) {
  const deltas: ParameterDelta[] = rows.map((row) => ({
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
  }));
  return applyInterpretations(deltas, telemetry, profile);
}

function coerce(value: any) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}
