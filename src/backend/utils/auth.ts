import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compareSync(password, hash);

export const signToken = (userId: string) => {
  const secret = process.env.JWT_SECRET || 'setupcomparer-secret';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const [, token] = header.split(' ');
  try {
    const secret = process.env.JWT_SECRET || 'setupcomparer-secret';
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
