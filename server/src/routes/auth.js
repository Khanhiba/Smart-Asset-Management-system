import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncRoute } from '../utils/appError.js';
import { userInput } from '../utils/validation.js';
import { runtime } from '../config/env.js';

const router = express.Router();
const userView = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department });
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, runtime.jwtSecret, { expiresIn: runtime.jwtExpiresIn, issuer: runtime.jwtIssuer, audience: runtime.jwtAudience });

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(72) }).strict().parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.active || !(await user.verifyPassword(password))) throw new AppError('Invalid email or password.', 401);
  res.json({ token: tokenFor(user), user: userView(user) });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: userView(req.user) }));

router.get('/users', authenticate, authorize('admin', 'asset_manager', 'technician'), asyncRoute(async (req, res) => {
  const users = await User.find({ active: true }).select('name email role department').sort('name');
  res.json({ users: users.map(userView) });
}));

router.post('/users', authenticate, authorize('admin'), asyncRoute(async (req, res) => {
  const values = userInput.parse(req.body);
  const user = await User.create(values);
  res.status(201).json({ user: userView(user) });
}));

export default router;
