import { credentialsFor } from '../support/config';
import { dashboardPage } from '../support/pages/DashboardPage';
import { loginPage } from '../support/pages/LoginPage';

describe('Signing in', () => {
  it('signs an employee in through the form and out again', () => {
    loginPage.visit();
    credentialsFor('employee').then((creds) => loginPage.signIn(creds));
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    dashboardPage.currentUser().should('contain', '(employee)');

    dashboardPage.signOut();
    loginPage.form().should('be.visible');
    cy.window().its('localStorage').invoke('getItem', 'acme.token').should('be.null');
  });

  it('rejects a wrong password and stays on the sign-in page', () => {
    loginPage.visit();
    credentialsFor('employee').then(({ email }) => loginPage.signIn({ email, password: 'not-the-password' }));
    cy.wait('@login').its('response.statusCode').should('eq', 401);
    loginPage.error().should('have.text', 'Invalid email or password');
    cy.getByCy('current-user').should('not.exist');
  });

  it('restores a cached session without the form', () => {
    cy.loginAs('manager');
    dashboardPage.visit();
    dashboardPage.currentUser().should('contain', '(manager)');
    cy.get('@login.all').should('have.length', 0);
  });
});
