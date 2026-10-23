import './load-env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from './async-handler.js';
import { prisma } from './db.js';
import { authRouter, dashboardRouter, projectRouter, userRouter, accessRouter, secretRouter, auditRouter, policyRouter, incidentRouter } from './routes/index.js';
import { isAllowedOrigin } from './middleware/auth.js';

function configurationError() {
  const auditKey = Buffer.from(process.env.AUDIT_HMAC_KEY || '', 'base64');
  const kekValue = process.env.NODE_ENV === 'production' ? process.env.VAULT_KEK_BASE64 : process.env.DEV_KEK_BASE64;
  const kek = Buffer.from(kekValue || '', 'base64');
  if (!process.env.DATABASE_URL) return 'DATABASE_URL is not configured.';
  if (auditKey.length !== 32) return 'AUDIT_HMAC_KEY must encode exactly 32 random bytes.';
  if (kek.length !== 32) return process.env.NODE_ENV === 'production'
    ? 'VAULT_KEK_BASE64 must encode exactly 32 random bytes.'
    : 'DEV_KEK_BASE64 must encode exactly 32 random bytes.';
  return null;
}

const app = express();
// Vercel sanitizes and forwards the client IP in X-Forwarded-For. Trust only
// that single platform proxy so the rate limiter keys requests per client.
if (process.env.VERCEL === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use((req, res, next) => cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin, req)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
})(req, res, next));
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());
app.get('/health', asyncHandler(async (_req, res) => { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); }));
const api = express.Router();
api.use(rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
api.use((_req, res, next) => {
  const issue = configurationError();
  if (issue) return res.status(503).json({ error: { code: 'VAULT_NOT_CONFIGURED', message: `Vault services are not configured: ${issue}` } });
  next();
});
api.use('/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRouter);
api.use('/dashboard', dashboardRouter);
api.use('/projects', projectRouter);
api.use('/users', userRouter);
api.use('/access-requests', accessRouter);
api.use('/secrets', secretRouter);
api.use('/audit', auditRouter);
api.use('/policies', policyRouter);
api.use('/incidents', incidentRouter);
app.use('/api/v1', api);
app.use((err, req, res, _next) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', fields: err.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) } });
  if (err?.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with those details already exists.' } });
  if (err?.name === 'PrismaClientInitializationError' || err?.code === 'P1001') return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The vault database is unavailable. Start PostgreSQL, then retry.' } });
  console.error('request_failed', { path: req.path, method: req.method, name: err?.name, code: err?.code ?? null });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
});
export default app;
