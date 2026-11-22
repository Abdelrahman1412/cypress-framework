import { ROLES } from '../support/types';
import { dashboardPage } from '../support/pages/DashboardPage';
import { loginPage } from '../support/pages/LoginPage';

describe('Accessibility (axe, serious and critical rules)', () => {
  it('has no violations on the sign-in page', () => {
    loginPage.visit();
    cy.checkPageA11y();
  });

  for (const role of ROLES) {
    it(`has no violations on the ${role} dashboard`, () => {
      cy.seedLeaveRequest('employee');
      cy.loginAs(role);
      dashboardPage.visit();
      cy.wait('@listLeave');
      cy.checkPageA11y();
    });
  }
});
