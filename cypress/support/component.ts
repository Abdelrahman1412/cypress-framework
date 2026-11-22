import 'cypress-axe';
import 'cypress-mochawesome-reporter/register';
import { mount } from 'cypress/react';
import '../../demo/app/src/styles.css';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);
