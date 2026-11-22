# Acme HR Cypress framework

A Cypress 16 + TypeScript test framework you can point at your own web app. It ships with a tiny
local "Acme HR" leave-request app and API, so every test and the CI pipeline run without any
third-party site.

Originally written in 2023, modernised in 2026.

## What it shows

- **Multi-role login with `cy.session`**: employee, manager and admin sign in through the API once
  and the session is cached across specs (`cacheAcrossSpecs`), with a `validate` step that logs in
  again if the server forgot the token.
- **One suite, two modes**: `API_MODE=live` runs against the real API; `API_MODE=mock` serves every
  API call from `cy.intercept` and fixtures. Specs never branch on the mode; both modes register
  the same route aliases (`@createLeave`, `@decideLeave`, ...), live ones as spies, mock ones as
  stubs. An unmocked call fails loudly with a 501.
- **API data seeding** with `cy.request` (`cy.seedLeaveRequest('employee')`), plus a test-only
  reset endpoint, so each test starts from a known state.
- **Typed custom commands** (`cy.loginAs`, `cy.seedLeaveRequest`, `cy.apiToken`, `cy.checkPageA11y`, `cy.getByCy`).
- **Secrets kept out of the browser bundle**: credentials are read with `cy.env()`, public settings
  with `Cypress.expose()` (the Cypress 15.10+ split that replaces `Cypress.env()`).
- **Accessibility** checks with cypress-axe on every screen and role, failing on serious and critical rules.
- **Component testing** of the app's `LeaveRequestForm` (React + Vite).
- **Honest retries**: `cypress run` retries a failed test twice, but a test that only passes on a
  retry is reported as flaky in the terminal, as a GitHub warning annotation, in the job summary and
  in `cypress/reports/flaky.json`. `FAIL_ON_FLAKY=true npm run check-flaky` turns flakes into a failure.
  Videos are kept only for specs where some attempt failed.
- **Reporting**: a single-file mochawesome HTML report with screenshots embedded, merged across CI shards.
- **CI without Cypress Cloud**: `cypress-io/github-action`, specs split into balanced shards by
  `scripts/split-specs.ts`, both modes in a matrix, reports, screenshots and videos as artifacts.

## Why page objects (and not app actions)

App actions call into the app's own code (`window.store.dispatch(...)`) to skip the UI. They are
fast, but they couple the tests to one app's internals, which defeats a framework meant to be
plugged into other apps. The speed benefit is already covered here by going through the public
API instead: `cy.session` for login and `cy.request` for data. What is left in the browser is the
behaviour under test, and thin page objects (`cypress/support/pages`) keep its selectors and
user-level actions in one place. They hold no assertions, so each spec reads as its own check list.

## Quick start

Needs Node 22.18+ (Node 24 recommended).

```bash
npm ci
npm test                 # builds the demo, starts it, runs the e2e suite against the live API
npm run test:mock        # the same specs, every API call served from fixtures
npm run test:component   # component tests
```

`npm run test:all` runs the type check and all three. `npm run cy:open` opens the runner while
`npm run start:demo:test` is running in another terminal. The HTML report lands in
`cypress/reports/html/index.html`.

## Plug it into your app

1. Set the environment (a `.env` file at the root or real variables): `BASE_URL`, `API_URL` if the
   API is on another host, and `EMPLOYEE_EMAIL`/`_PASSWORD`, `MANAGER_EMAIL`/`_PASSWORD`,
   `ADMIN_EMAIL`/`_PASSWORD` for your test users. Never commit real credentials.
2. Point the login at your auth: `cy.loginAs` in `cypress/support/commands.ts` (endpoint and where
   the token is stored, `TOKEN_KEY` in `cypress/support/types.ts`).
3. Replace the routes and fixtures in `cypress/support/network.ts` and `cypress/fixtures/` with your
   API's, and add a `data-cy` attribute to the elements your page objects use.
4. Swap the seeding and reset calls in `commands.ts` for your API (or a test-data endpoint).
5. Write specs against the page objects; run `npm run cy:run` (live) or `npm run cy:run:mock`.

| Variable | Default | Used for |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:4173` | app under test |
| `API_URL` | `BASE_URL` | `cy.request` calls |
| `API_MODE` | `live` | `live` or `mock` |
| `EMPLOYEE_EMAIL`, `MANAGER_EMAIL`, `ADMIN_EMAIL` | `<role>@acme.test` | role logins |
| `EMPLOYEE_PASSWORD`, `MANAGER_PASSWORD`, `ADMIN_PASSWORD` | `DEMO_PASSWORD` | role logins |
| `DEMO_PASSWORD`, `PORT` | `acme-demo-pass`, `4173` | demo server only |
| `TEST_RETRIES` | `2` | retries in `cypress run` |
| `FAIL_ON_FLAKY` | unset | `check-flaky` exits 1 on any flaky test |

The demo defaults are fake and only work against the bundled demo app.

## Structure

```
cypress.config.ts            reporter, retries, expose (public) vs env (secret) settings
cypress/
  e2e/                       specs: auth, leave requests, approvals, admin, accessibility
  component/                 LeaveRequestForm component tests
  fixtures/                  users and leave requests for mock mode
  support/
    commands.ts              typed custom commands (session login, seeding, a11y)
    network.ts               route aliases: spies in live mode, fixture-backed stubs in mock mode
    pages/                   page objects
    config.ts, types.ts      mode, URLs, credentials, shared types
  plugins/run-hooks.ts       flaky-test detection, video pruning, report hooks
demo/
  server/                    Express API (in-memory, test reset route behind ENABLE_TEST_ROUTES)
  app/                       React + Vite leave-request UI
scripts/                     spec splitter for CI shards, flaky-test check
.github/workflows/cypress.yml
```

## License

MIT
