import type { NewLeaveRequest } from '../types';

/** The signed-in screen: request form, own requests, approvals (managers/admins) and team list (admins). */
export const dashboardPage = {
  visit() {
    cy.visit('/');
    cy.getByCy('current-user').should('be.visible');
  },
  currentUser: () => cy.getByCy('current-user'),
  notice: () => cy.getByCy('notice'),
  signOut: () => cy.getByCy('logout').click(),

  leaveForm: {
    fill(input: Partial<NewLeaveRequest>) {
      if (input.type) cy.getByCy('leave-type').select(input.type);
      if (input.startDate) cy.getByCy('leave-start').type(input.startDate);
      if (input.endDate) cy.getByCy('leave-end').type(input.endDate);
      if (input.reason) cy.getByCy('leave-reason').type(input.reason);
    },
    submit: () => cy.getByCy('leave-submit').click(),
    error: () => cy.getByCy('leave-form-error'),
  },

  myRequests: () => cy.getByCy('my-requests'),
  approvals: () => cy.getByCy('approvals'),
  team: () => cy.getByCy('team'),

  /** The table row whose reason matches, inside the given section. */
  row(section: 'my-requests' | 'approvals', reason: string) {
    return cy.getByCy(section).contains('[data-cy="leave-row"]', reason);
  },
  statusOf(section: 'my-requests' | 'approvals', reason: string) {
    return this.row(section, reason).find('[data-cy="leave-row-status"]');
  },
  approve(reason: string) {
    this.row('approvals', reason).find('[data-cy="approve"]').click();
  },
  reject(reason: string) {
    this.row('approvals', reason).find('[data-cy="reject"]').click();
  },
};
