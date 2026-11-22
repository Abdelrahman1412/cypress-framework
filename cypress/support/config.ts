import type { ApiMode, Credentials, Role } from './types';

export const apiMode = (): ApiMode => (Cypress.expose('apiMode') === 'mock' ? 'mock' : 'live');
export const isMock = (): boolean => apiMode() === 'mock';
export const apiUrl = (path: string): string => `${String(Cypress.expose('apiUrl')).replace(/\/$/, '')}${path}`;

/** Reads a role's credentials from cy.env(), so they stay out of the spec bundle and the command log. */
export function credentialsFor(role: Role): Cypress.Chainable<Credentials> {
  const prefix = role.toUpperCase();
  return cy
    .env([`${prefix}_EMAIL`, `${prefix}_PASSWORD`], { log: false })
    .then((values) => ({ email: values[`${prefix}_EMAIL`], password: values[`${prefix}_PASSWORD`] }));
}

/** Registers a test that only makes sense against the real API (status codes, server rules). */
export function itLive(title: string, fn: () => void): void {
  if (isMock()) {
    it.skip(`${title} [live API only]`, fn);
  } else {
    it(title, fn);
  }
}
