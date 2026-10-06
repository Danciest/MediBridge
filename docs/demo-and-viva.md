# Demo workflow and viva notes

## Safe preparation

Use a disposable local replica-set MongoDB database because approval, redemption, admin reward adjustment, and request acceptance use transactions. The fake records in [demo-fixtures.json](demo-fixtures.json) use reserved `.invalid` email domains and contain no password or token. They are reference data, not automatically loaded. Register non-admin accounts through the app with unique local passwords; provision the admin only in the disposable database through the trusted process. Do not connect a demo seed to production Atlas.

## Deterministic walkthrough

1. Start MongoDB and API, then serve `index.html` with a local static server.
2. Register/login as one of the synthetic donors and submit one future-expiry medicine donation.
3. Sign in as the pre-provisioned demo admin; review and approve that pending donation. Show the one-time reward result.
4. Sign in as a demo NGO or hospital; browse available stock, create a matching request, view matches, and accept it.
5. Show the request state and reduced medicine quantity. Complete the request through the supported transition.
6. Sign in as the donor; show balance and transaction history, then redeem an eligible amount. Retry the exact request with the same idempotency key only to demonstrate that it does not debit twice.
7. Submit a synthetic issue report and use the admin account to update its status.
8. Show admin statistics, explain role/ownership checks, and show the architecture and ER diagrams.

Use the actual UI and accounts from your disposable local database. Do not claim a screen or workflow was demonstrated until you have exercised it.

## Viva prompts

| Question | Implementation-based answer |
|---|---|
| Why MongoDB? | The application stores related, evolving donation/request records as documents and uses Mongoose schemas for field validation and references. |
| Why Node.js/Express? | The JSON API and browser frontend share JavaScript, and Express provides the HTTP route/middleware layer. |
| Why JWT? | The API returns a signed, one-day bearer token after successful login; protected requests verify it and reload current account state and role. |
| Why bcrypt? | Passwords are stored as bcrypt hashes; registration uses cost 12 and login compares hashes. |
| Why RBAC? | Role middleware limits actions, while ownership checks restrict each NGO/hospital to its own request records. |
| How are medicines verified? | New stock is pending; an admin approves or rejects it. Approval and donor reward awarding happen transactionally. |
| How are rewards calculated? | `utils/rewardCalculator.js` awards 10 points for quantity up to 10, 25 for 11–50, and 50 above 50. |
| How are duplicate rewards prevented? | The award is in a transaction, checks for an existing earn record, and has a unique index per medicine/type. |
| How are transactions handled? | Mongoose sessions protect multi-document operations. MongoDB must support transactions, typically through a replica set. |
| How is unauthorized access prevented? | Bearer JWT, active-account lookup, current database role, role checks, ownership checks, and explicit writable-field lists. |
| How does the frontend communicate with the backend? | `api-client.js` sends JSON requests to `window.MEDIBRIDGE_API_URL` or defaults to local `http://localhost:5000/api`. |
| How is CORS configured? | Exact configured frontend origins are accepted; wildcard CORS is not used. Development includes common localhost origins. |
| How is it deployed? | Production architecture is a static frontend, Express API, and MongoDB Atlas. No hosting provider or production environment has been configured yet. |

## Screenshots

The requested screenshots (login, registration, donor dashboard, donation, inventory, requests, rewards, admin views, statistics, and reports) must be captured from the running application with demo data. No screenshots are included because a safe demo database/account set was not running during this implementation. Do not substitute mockups for evidence screenshots.
