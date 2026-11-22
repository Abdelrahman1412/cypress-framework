import 'cypress-axe';
import 'cypress-mochawesome-reporter/register';
import './commands';
import { installNetwork } from './network';

beforeEach(() => {
  cy.resetData();
  installNetwork();
});
