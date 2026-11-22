import { LeaveRequestForm } from '../../demo/app/src/components/LeaveRequestForm';

describe('<LeaveRequestForm />', () => {
  it('submits a trimmed payload and clears itself', () => {
    const onSubmit = cy.stub().as('onSubmit').resolves();
    cy.mount(<LeaveRequestForm onSubmit={onSubmit} />);

    cy.get('[data-cy="leave-type"]').select('unpaid');
    cy.get('[data-cy="leave-start"]').type('2027-02-01');
    cy.get('[data-cy="leave-end"]').type('2027-02-03');
    cy.get('[data-cy="leave-reason"]').type('  Moving house  ');
    cy.get('[data-cy="leave-submit"]').click();

    cy.get('@onSubmit').should('have.been.calledOnceWith', {
      type: 'unpaid',
      startDate: '2027-02-01',
      endDate: '2027-02-03',
      reason: 'Moving house',
    });
    cy.get('[data-cy="leave-reason"]').should('have.value', '');
  });

  it('validates before calling onSubmit', () => {
    const onSubmit = cy.stub().as('onSubmit');
    cy.mount(<LeaveRequestForm onSubmit={onSubmit} />);

    cy.get('[data-cy="leave-submit"]').click();
    cy.get('[data-cy="leave-form-error"]').should('have.text', 'Start and end dates are required');

    cy.get('[data-cy="leave-start"]').type('2027-02-01');
    cy.get('[data-cy="leave-end"]').type('2027-02-03');
    cy.get('[data-cy="leave-reason"]').type('no');
    cy.get('[data-cy="leave-submit"]').click();
    cy.get('[data-cy="leave-form-error"]').should('have.text', 'Reason must be at least 3 characters');
    cy.get('@onSubmit').should('not.have.been.called');
  });

  it('shows the error when the submit handler rejects, and keeps the input', () => {
    cy.mount(<LeaveRequestForm onSubmit={cy.stub().rejects(new Error('Server says no'))} />);

    cy.get('[data-cy="leave-start"]').type('2027-02-01');
    cy.get('[data-cy="leave-end"]').type('2027-02-01');
    cy.get('[data-cy="leave-reason"]').type('Dentist');
    cy.get('[data-cy="leave-submit"]').click();

    cy.get('[data-cy="leave-form-error"]').should('have.text', 'Server says no');
    cy.get('[data-cy="leave-reason"]').should('have.value', 'Dentist');
  });

  it('passes axe checks', () => {
    cy.mount(<LeaveRequestForm onSubmit={cy.stub()} />);
    cy.injectAxe();
    cy.checkA11y('[data-cy-root]', { includedImpacts: ['serious', 'critical'] });
  });
});
