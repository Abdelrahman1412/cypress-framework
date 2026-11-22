import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  canDecide,
  createRequest,
  findRequest,
  login,
  reset,
  userForToken,
  users,
  visibleRequests,
  type LeaveType,
  type User,
} from './store.ts';

const port = Number(process.env.PORT ?? 4173);
const testRoutes = process.env.ENABLE_TEST_ROUTES === 'true';
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/dist');
const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid'];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

type AuthedRequest = Request & { user?: User };

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const result = login(String(email ?? ''), String(password ?? ''));
  if (!result) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  res.json(result);
});

function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer /, '');
  const user = userForToken(token);
  if (!user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  req.user = user;
  next();
}

app.get('/api/me', requireUser, (req: AuthedRequest, res) => {
  res.json(req.user);
});

app.get('/api/users', requireUser, (req: AuthedRequest, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admins only' });
    return;
  }
  res.json(users);
});

app.get('/api/leave-requests', requireUser, (req: AuthedRequest, res) => {
  res.json(visibleRequests(req.user as User));
});

app.post('/api/leave-requests', requireUser, (req: AuthedRequest, res) => {
  const { type, startDate, endDate, reason } = req.body ?? {};
  const errors: string[] = [];
  if (!leaveTypes.includes(type)) errors.push('type must be annual, sick or unpaid');
  if (!isoDate.test(startDate ?? '') || !isoDate.test(endDate ?? '')) errors.push('dates must be YYYY-MM-DD');
  else if (endDate < startDate) errors.push('endDate must not be before startDate');
  if (typeof reason !== 'string' || reason.trim().length < 3) errors.push('reason must be at least 3 characters');
  if (errors.length) {
    res.status(400).json({ error: errors.join('; ') });
    return;
  }
  res.status(201).json(createRequest(req.user as User, { type, startDate, endDate, reason: reason.trim() }));
});

app.post('/api/leave-requests/:id/:decision', requireUser, (req: AuthedRequest, res) => {
  const { decision } = req.params;
  if (decision !== 'approve' && decision !== 'reject') {
    res.status(404).json({ error: 'Unknown action' });
    return;
  }
  const request = findRequest(Number(req.params.id));
  if (!request) {
    res.status(404).json({ error: 'Leave request not found' });
    return;
  }
  const viewer = req.user as User;
  if (!canDecide(viewer, request)) {
    res.status(403).json({ error: 'You cannot decide on this request' });
    return;
  }
  if (request.status !== 'pending') {
    res.status(409).json({ error: `Request is already ${request.status}` });
    return;
  }
  request.status = decision === 'approve' ? 'approved' : 'rejected';
  request.decidedBy = viewer.name;
  res.json(request);
});

if (testRoutes) {
  app.post('/api/test/reset', (_req, res) => {
    reset();
    res.status(204).end();
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn(`No built UI at ${distDir}; run "npm run build:app" first. Serving the API only.`);
}

app.listen(port, () => {
  console.log(`Acme HR listening on http://localhost:${port} (test routes ${testRoutes ? 'on' : 'off'})`);
});
