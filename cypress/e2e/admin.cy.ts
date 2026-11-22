import { apiUrl, itLive } from '../support/config';
import { dashboardPage } from '../support/pages/DashboardPage';

describe('Admin visibility', () => {
  it('shows an admin everyone and every pending request', () => {
    cy.seedLeaveRequest('manager').then(({ reason }) => {
      cy.loginAs('admin');
      dashboardPage.visit();
      cy.wait('@users');
      dashboardPage.team().find('[data-cy="team-member"]').should('have.length', 3);
      dashboardPage.row('approvals', reason).should('contain', 'Morgan Manager');
    });
  });

  it('hides the team list from a manager', () => {
    cy.loginAs('manager');
    dashboardPage.visit();
    dashboardPage.approvals().should('be.visible');
    dashboardPage.team().should('not.exist');
  });

  itLive('returns 403 for the user list to a non-admin', () => {
    cy.apiToken('manager').then((token) => {
      cy.request({ url: apiUrl('/api/users'), headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false })
        .its('status')
        .should('eq', 403);
    });
  });
});
