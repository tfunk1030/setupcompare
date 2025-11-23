import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/auth';
import comparisonRoutes from './routes/comparisons';
import telemetryRoutes from './routes/telemetry';
import './db';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/telemetry', telemetryRoutes);

app.use('/public', express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, () => {
  console.log(`SetupComparer backend running on port ${PORT}`);
});
