import { dashboardPage } from '../support/pages/DashboardPage';

describe('Employee leave requests', () => {
  beforeEach(() => {
    cy.loginAs('employee');
  });

  it('submits a request and shows it as pending', () => {
    const reason = `Family visit ${Date.now()}`;
    dashboardPage.visit();
    dashboardPage.leaveForm.fill({ type: 'annual', startDate: '2026-12-01', endDate: '2026-12-05', reason });
    dashboardPage.leaveForm.submit();

    cy.wait('@createLeave').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ type: 'annual', startDate: '2026-12-01', endDate: '2026-12-05', reason });
      expect(response?.statusCode).to.eq(201);
    });
    dashboardPage.notice().should('have.text', 'Leave request submitted');
    dashboardPage.statusOf('my-requests', reason).should('have.text', 'pending');
  });

  it('blocks an end date before the start date without calling the API', () => {
    dashboardPage.visit();
    dashboardPage.leaveForm.fill({ startDate: '2026-12-10', endDate: '2026-12-01', reason: 'Backwards dates' });
    dashboardPage.leaveForm.submit();

    dashboardPage.leaveForm.error().should('have.text', 'End date cannot be before start date');
    cy.get('@createLeave.all').should('have.length', 0);
  });

  it('lists a request created through the API', () => {
    cy.seedLeaveRequest('employee', { type: 'sick', startDate: '2026-11-30', endDate: '2026-11-30' }).then((seeded) => {
      dashboardPage.visit();
      dashboardPage.row('my-requests', seeded.reason).should('contain', 'sick').and('contain', '2026-11-30');
      dashboardPage.statusOf('my-requests', seeded.reason).should('have.text', 'pending');
    });
  });
});
