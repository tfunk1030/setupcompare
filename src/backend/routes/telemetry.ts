import { Router } from 'express';
import multer from 'multer';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../utils/auth';
import { parseTelemetryBuffer } from '../services/telemetryParser';
import { applyInterpretations } from '../../shared/interpretationEngine';
import { TelemetrySummary } from '../../shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload', authenticate, upload.single('file'), (req: AuthenticatedRequest, res) => {
  const { comparisonId } = req.body;
  if (!comparisonId) return res.status(400).json({ message: 'comparisonId required' });
  const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ? AND user_id = ?').get(comparisonId, req.userId) as any;
  if (!comparison) return res.status(404).json({ message: 'Comparison not found' });
  if (!req.file) return res.status(400).json({ message: 'Telemetry file missing' });

  const summary = parseTelemetryBuffer(comparisonId, req.file.originalname, req.file.buffer);
  const payload = JSON.stringify(summary);
  db.prepare('INSERT INTO telemetry (id, comparison_id, source_name, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    summary.id,
    comparisonId,
    req.file.originalname,
    payload,
    summary.createdAt,
  );

  const params = db.prepare('SELECT * FROM parameters WHERE comparison_id = ?').all(comparisonId) as any[];
  const deltas = applyInterpretations(
    params.map((row) => ({
      key: row.key,
      label: row.label,
      category: row.category,
      previousValue: coerce(row.previous_value),
      newValue: coerce(row.new_value),
      delta: coerce(row.delta),
      significance: row.significance,
      insight: row.insight,
      unit: row.unit || undefined,
    })) as any,
    summary,
    {
      carModel: comparison.car_model,
      trackCategory: comparison.track_category,
      trackName: comparison.track_name,
    },
  );
  const update = db.prepare(
    'UPDATE parameters SET interpretation_short = ?, interpretation_full = ? WHERE comparison_id = ? AND key = ?',
  );
  deltas.forEach((delta) => update.run(delta.interpretation?.short || null, delta.interpretation?.full || null, comparisonId, delta.key));
  return res.json({ telemetry: summary, deltas });
});

router.get('/:comparisonId', authenticate, (req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM telemetry WHERE comparison_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.comparisonId) as any;
  if (!row) return res.status(404).json({ message: 'No telemetry' });
  const telemetry: TelemetrySummary = JSON.parse(row.data);
  return res.json(telemetry);
});

export default router;

function coerce(value: any) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}
