# Security audit and verification record

This document records checks run locally on 2026-10-06. It is a code/repository audit, not a production penetration test.

## Applied controls

- `.env` and `.env.*` are ignored while `.env.example` is allowed. The working `.env` was not tracked and did not appear in Git history. Repository scanning found database connection configuration only in `.env`; no credential was copied into source or docs.
- `server.js` requires JWT configuration, validates production key length and frontend origin, limits JSON bodies to 32 KB, applies Helmet, restricts CORS origins, and rate-limits registration/login.
- Authentication accepts Bearer JWTs, requires an expiry, checks signature and current account state/role in MongoDB, and rejects deleted or suspended accounts. Tokens carry the user ID only.
- Registration whitelists fields, normalizes email, hashes passwords with bcrypt, enforces length, and rejects public admin registration. Login returns a generic invalid-credentials response and never includes the password hash.
- Routes validate role, ownership, allowed update fields, IDs, dates, quantities, query filters, and state transitions. Admin-only routes apply auth and ADMIN authorization at router level.
- Reward balance changes go through the reward service. Donation awards, redemptions, admin adjustments, and stock/request acceptance use transactions. Donation awards have a unique medicine/type guard; redemptions require idempotency keys.
- API errors avoid returning stacks, paths, environment values, or database URIs. Production MongoDB Atlas access controls remain an operator configuration task.

## Repository findings

- The original README had unresolved merge-conflict markers; it was replaced with project setup and links to maintained docs.
- `.env` is local-only, ignored, and not tracked in the inspected history. No real secret was found in tracked project source during this scan.
- `npm audit --omit=dev`: 0 production vulnerabilities after removing the unused `nodemon` dependency. The development script uses Node's built-in watch mode.
- Dependencies were audited; full `npm audit` reported zero vulnerabilities after the change.
- Atlas database user privilege, IP allowlist, backups, and production URI cannot be verified from this repository. Set these in the Atlas account before deployment.

## Tests run

`npm test`: 7 passing unit/security checks for model validation, reward calculation, role middleware, rejection of missing/malformed/expired/invalid-signature JWTs, and live HTTP behavior for health, unauthenticated admin access, CORS rejection, and oversized bodies.

`npm run check`: passed JavaScript syntax checks for the API, middleware, routes, and reward service.

## Not verified against a live database

The tests above do not exercise successful authenticated requests, transaction rollback, unique-index races, real Atlas permissions, complete Postman scenarios, or frontend browser behavior. Those require a disposable replica-set database and demo accounts. Do not use a production database to run the demo workflow.

## Manual acceptance matrix

| Scenario | Expected | Local code/test status |
|---|---|---|
| No token on protected route | 401 | Unit middleware rejection covered |
| Malformed, expired, bad-signature JWT | 401 | Unit middleware rejection covered |
| Donor on admin route | 403 | Role middleware unit covered; live API not run |
| Public ADMIN registration | 403 | Implemented, live API not run |
| Invalid medicine/request quantities | 400/schema rejection | Model validation covered; route-level live API not run |
| Invalid Mongo ID | 400 | Route guards inspected; live API not run |
| Donor changes another donor's medicine | 403 | Ownership guards inspected; live API not run |
| Duplicate donation reward | One reward | Unique index + transaction inspected; concurrency not exercised |
| Duplicate redemption retry | Same transaction returned | Idempotency code inspected; live DB not run |
| Request accepts same stock twice | One successful reservation | Conditional transaction inspected; concurrency not exercised |
| Atlas replica-set transaction | Commit/rollback | Not live-tested |
