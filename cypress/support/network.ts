import type { CyHttpMessages, RouteMatcherOptions } from 'cypress/types/net-stubbing';
import { isMock } from './config';
import { ROLES, type LeaveRequest, type NewLeaveRequest, type Role, type User } from './types';

/**
 * Every API route the UI calls gets the same alias in both modes:
 * - live: a pass-through spy, so specs can cy.wait('@createLeave') on the real API;
 * - mock: a fixture-backed stub with a tiny in-memory state per test.
 * Specs never branch on the mode; only this file and the seeding command do.
 */
export const routes = {
  login: { method: 'POST', pathname: '/api/auth/login' },
  me: { method: 'GET', pathname: '/api/me' },
  users: { method: 'GET', pathname: '/api/users' },
  listLeave: { method: 'GET', pathname: '/api/leave-requests' },
  createLeave: { method: 'POST', pathname: '/api/leave-requests' },
  decideLeave: { method: 'POST', url: /\/api\/leave-requests\/\d+\/(approve|reject)$/ },
} satisfies Record<string, RouteMatcherOptions>;

interface MockState {
  users: Record<Role, User>;
  requests: LeaveRequest[];
  nextId: number;
}

let state: MockState | undefined;

export const mockToken = (role: Role): string => `mock-token-${role}`;

function mockState(): MockState {
  if (!state) throw new Error('Mock backend is not installed; is API_MODE=mock set and support/e2e.ts loaded?');
  return state;
}

function caller(req: CyHttpMessages.IncomingHttpRequest): User | undefined {
  const header = String(req.headers.authorization ?? '');
  const role = ROLES.find((r) => header === `Bearer ${mockToken(r)}`);
  return role ? mockState().users[role] : undefined;
}

/** Mirrors the server rule closely enough for UI flows: managers decide for direct reports, admins for anyone else. */
function canDecide(viewer: User, request: LeaveRequest): boolean {
  if (request.employeeId === viewer.id) return false;
  if (viewer.role === 'admin') return true;
  const owner = Object.values(mockState().users).find((u) => u.id === request.employeeId);
  return viewer.role === 'manager' && owner?.managerId === viewer.id;
}

function visibleTo(viewer: User): LeaveRequest[] {
  const { users, requests } = mockState();
  if (viewer.role === 'admin') return requests;
  const reports = Object.values(users).filter((u) => u.managerId === viewer.id).map((u) => u.id);
  return requests.filter((r) => r.employeeId === viewer.id || reports.includes(r.employeeId));
}

/** Adds a request to the mock state, the mock-mode equivalent of POST /api/leave-requests. */
export function mockCreateRequest(role: Role, input: NewLeaveRequest): LeaveRequest {
  const s = mockState();
  const owner = s.users[role];
  const request: LeaveRequest = {
    id: s.nextId++,
    employeeId: owner.id,
    employeeName: owner.name,
    ...input,
    status: 'pending',
    decidedBy: null,
  };
  s.requests.push(request);
  return request;
}

function installSpies(): void {
  for (const [alias, matcher] of Object.entries(routes)) cy.intercept(matcher).as(alias);
}

function installMocks(): void {
  // Registered first, so it only catches what no specific stub below handles.
  cy.intercept({ pathname: '/api/**' }, (req) => {
    req.reply(501, { error: `No mock for ${req.method} ${req.url}` });
  }).as('unmocked');

  const credentialKeys = ROLES.flatMap((r) => [`${r.toUpperCase()}_EMAIL`, `${r.toUpperCase()}_PASSWORD`]);
  cy.env(credentialKeys, { log: false }).then((creds) => {
    cy.fixture<Record<Role, User>>('users.json').then((users) => {
      cy.fixture<LeaveRequest[]>('leave-requests.json').then((seed) => {
        state = { users, requests: structuredClone(seed), nextId: 1 };

        cy.intercept(routes.login, (req) => {
          const role = ROLES.find(
            (r) => req.body?.email === creds[`${r.toUpperCase()}_EMAIL`] && req.body?.password === creds[`${r.toUpperCase()}_PASSWORD`],
          );
          if (role) req.reply({ token: mockToken(role), user: users[role] });
          else req.reply(401, { error: 'Invalid email or password' });
        }).as('login');

        cy.intercept(routes.me, (req) => {
          const user = caller(req);
          if (user) req.reply(user);
          else req.reply(401, { error: 'Not signed in' });
        }).as('me');

        cy.intercept(routes.users, (req) => {
          const user = caller(req);
          if (!user) req.reply(401, { error: 'Not signed in' });
          else if (user.role !== 'admin') req.reply(403, { error: 'Admins only' });
          else req.reply(Object.values(users));
        }).as('users');

        cy.intercept(routes.listLeave, (req) => {
          const user = caller(req);
          if (user) req.reply(visibleTo(user));
          else req.reply(401, { error: 'Not signed in' });
        }).as('listLeave');

        cy.intercept(routes.createLeave, (req) => {
          const user = caller(req);
          if (!user) req.reply(401, { error: 'Not signed in' });
          else req.reply(201, mockCreateRequest(user.role, req.body as NewLeaveRequest));
        }).as('createLeave');

        cy.intercept(routes.decideLeave, (req) => {
          const user = caller(req);
          const [, id, decision] = /\/(\d+)\/(approve|reject)$/.exec(req.url) ?? [];
          const request = mockState().requests.find((r) => r.id === Number(id));
          if (!user) req.reply(401, { error: 'Not signed in' });
          else if (!request) req.reply(404, { error: 'Leave request not found' });
          else if (!canDecide(user, request)) req.reply(403, { error: 'You cannot decide on this request' });
          else {
            request.status = decision === 'approve' ? 'approved' : 'rejected';
            request.decidedBy = user.name;
            req.reply(request);
          }
        }).as('decideLeave');
      });
    });
  });
}

/** Called from a global beforeEach: intercepts are cleared between tests, so they are re-registered every time. */
export function installNetwork(): void {
  state = undefined;
  if (isMock()) installMocks();
  else installSpies();
}
