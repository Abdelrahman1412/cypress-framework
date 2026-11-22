import { apiUrl, itLive } from '../support/config';
import { dashboardPage } from '../support/pages/DashboardPage';

describe('Approving leave', () => {
  it('lets a manager approve a direct report, and the employee sees the decision', () => {
    cy.seedLeaveRequest('employee').then(({ reason }) => {
      cy.loginAs('manager');
      dashboardPage.visit();
      dashboardPage.approve(reason);
      cy.wait('@decideLeave').its('response.statusCode').should('eq', 200);
      dashboardPage.notice().should('have.text', 'Request approved');
      dashboardPage.approvals().should('not.contain', reason);

      cy.loginAs('employee');
      dashboardPage.visit();
      dashboardPage.statusOf('my-requests', reason).should('have.text', 'approved');
    });
  });

  it('lets a manager reject a request', () => {
    cy.seedLeaveRequest('employee').then(({ reason }) => {
      cy.loginAs('manager');
      dashboardPage.visit();
      dashboardPage.reject(reason);
      cy.wait('@decideLeave').its('response.body.status').should('eq', 'rejected');
    });
  });

  it('does not show the approvals queue to an employee', () => {
    cy.loginAs('employee');
    dashboardPage.visit();
    dashboardPage.myRequests().should('be.visible');
    dashboardPage.approvals().should('not.exist');
  });

  itLive('refuses an approval from the API when the caller is an employee', () => {
    cy.seedLeaveRequest('manager').then(({ id }) => {
      cy.apiToken('employee').then((token) => {
        cy.request({
          method: 'POST',
          url: apiUrl(`/api/leave-requests/${id}/approve`),
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(403);
          expect(response.body.error).to.eq('You cannot decide on this request');
        });
      });
    });
  });
});
