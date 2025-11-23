import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { comparePassword, hashPassword, signToken } from '../utils/auth';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const id = uuid();
  const passwordHash = hashPassword(password);
  try {
    db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(id, email, passwordHash, new Date().toISOString());
    const token = signToken(id);
    return res.json({ token });
  } catch (err: any) {
    return res.status(400).json({ message: 'User exists or invalid data', error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!row || !comparePassword(password, row.password_hash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken(row.id);
  return res.json({ token });
});

export default router;
