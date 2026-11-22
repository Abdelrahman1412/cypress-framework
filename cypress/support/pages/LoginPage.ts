import type { Credentials } from '../types';

/** The sign-in screen. Page objects hold selectors and user-level actions; assertions stay in specs. */
export const loginPage = {
  visit() {
    cy.visit('/');
    cy.getByCy('login-form').should('be.visible');
  },
  signIn({ email, password }: Credentials) {
    cy.getByCy('login-email').clear().type(email);
    cy.getByCy('login-password').clear().type(password, { log: false });
    cy.getByCy('login-submit').click();
  },
  error: () => cy.getByCy('login-error'),
  form: () => cy.getByCy('login-form'),
};
