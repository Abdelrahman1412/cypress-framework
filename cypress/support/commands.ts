import { apiUrl, credentialsFor, isMock } from './config';
import { mockCreateRequest, mockToken } from './network';
import { TOKEN_KEY, type LeaveRequest, type NewLeaveRequest, type Role } from './types';
import type { Result } from 'axe-core';

declare global {
  namespace Cypress {
    interface Chainable {
      /** Selects by data-cy attribute: the one selector contract between tests and app. */
      getByCy(id: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>): Chainable<JQuery<HTMLElement>>;
      /** Signs in as a role through the API (or a mock token) and caches the session across specs. */
      loginAs(role: Role): Chainable<void>;
      /** Returns an API bearer token for a role (live mode), cached for the spec. */
      apiToken(role: Role): Chainable<string>;
      /** Creates a leave request owned by `role` without touching the UI. */
      seedLeaveRequest(role: Role, input?: Partial<NewLeaveRequest>): Chainable<LeaveRequest>;
      /** Clears server data between tests (live mode; a no-op in mock mode, where state is per test). */
      resetData(): Chainable<void>;
      /** Injects axe and fails on serious or critical violations, printing each one to the terminal. */
      checkPageA11y(context?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('getByCy', (id, options) => cy.get(`[data-cy="${id}"]`, options));

Cypress.Commands.add('loginAs', (role) => {
  const mock = isMock();
  cy.session(
    [role, mock ? 'mock' : 'live'],
    () => {
      if (mock) {
        window.localStorage.setItem(TOKEN_KEY, mockToken(role));
        return;
      }
      credentialsFor(role).then(({ email, password }) => {
        cy.request({ method: 'POST', url: apiUrl('/api/auth/login'), body: { email, password }, log: false })
          .its('body.token')
          .then((token: string) => window.localStorage.setItem(TOKEN_KEY, token));
      });
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        const token = window.localStorage.getItem(TOKEN_KEY);
        expect(token, 'session token').to.be.a('string');
        if (!mock) {
          // A restarted server forgets tokens; this makes cy.session log in again instead of failing later.
          cy.request({ url: apiUrl('/api/me'), headers: { Authorization: `Bearer ${token}` } })
            .its('status')
            .should('eq', 200);
        }
      },
    },
  );
});

const tokens = new Map<Role, string>();

Cypress.Commands.add('apiToken', (role) => {
  const cached = tokens.get(role);
  if (cached) return cy.wrap(cached, { log: false });
  return credentialsFor(role).then(({ email, password }) =>
    cy
      .request({ method: 'POST', url: apiUrl('/api/auth/login'), body: { email, password }, log: false })
      .its('body.token', { log: false })
      .then((token: string) => {
        tokens.set(role, token);
        return token;
      }),
  );
});

let seedCounter = 0;

Cypress.Commands.add('seedLeaveRequest', (role, input = {}) => {
  seedCounter += 1;
  const body: NewLeaveRequest = {
    type: 'annual',
    startDate: '2026-12-21',
    endDate: '2026-12-24',
    reason: `Seeded ${role} request ${seedCounter}-${Date.now()}`,
    ...input,
  };
  if (isMock()) return cy.then(() => mockCreateRequest(role, body));
  return cy.apiToken(role).then((token) =>
    cy
      .request<LeaveRequest>({
        method: 'POST',
        url: apiUrl('/api/leave-requests'),
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      .then((response) => {
        expect(response.status).to.eq(201);
        return response.body;
      }),
  );
});

Cypress.Commands.add('resetData', () => {
  if (isMock()) return;
  cy.request({ method: 'POST', url: apiUrl('/api/test/reset'), log: false }).its('status').should('eq', 204);
});

function logViolations(violations: Result[]): void {
  cy.task(
    'table',
    violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
    { log: false },
  );
}

Cypress.Commands.add('checkPageA11y', (context) => {
  cy.injectAxe();
  cy.checkA11y(context, { includedImpacts: ['serious', 'critical'] }, logViolations);
});
