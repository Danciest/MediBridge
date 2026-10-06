# MediBridge

MediBridge is a medicine donation and distribution application. The repository contains a static browser frontend and an Express/Mongoose API.

## Features

- JWT login and role-based access for donors, pharmacies, NGOs, hospitals, and admins.
- Medicine donations, admin review, search, and expiry-aware availability.
- Medicine requests and matching/fulfillment workflow.
- Reward balances, transaction history, idempotent redemption, and admin adjustments.
- Admin user, donation, request, report, reward, and statistics endpoints.
- Authenticated issue reporting.

## Technology and roles

- Frontend: static HTML/CSS/JavaScript (`index.html`, `styles.css`, `app.js`, `api-client.js`).
- Backend: Node.js, Express 5, Mongoose, MongoDB, bcryptjs, and JSON Web Tokens.
- Roles: DONOR, PHARMACY, NGO, HOSPITAL, and ADMIN. Public registration supports the first four; admin accounts require trusted provisioning.
- Deployment: production architecture is a static frontend, Express API, and MongoDB Atlas. No production hosting provider or URLs are configured in this checkout.

## Project structure

```text
backend/
├── config/          # MongoDB and reward configuration
├── docs/            # API, architecture, security, demo, and test docs
├── middleware/      # Authentication and role authorization
├── models/          # User, Medicine, Request, Reward, IssueReport
├── postman/         # Postman collection and request definitions
├── routes/          # Auth, medicine, request, reward, admin, report APIs
├── services/        # Transactional reward operations
├── test/            # Node test-runner checks
├── utils/            # Reward calculation helpers
├── app.js            # Browser application
├── index.html        # Static frontend entry point
├── server.js         # Express setup and startup
└── .env.example      # Safe environment template
```

## Requirements

- Node.js 20.19 or newer and npm.
- MongoDB configured as a replica set for multi-record transactions (MongoDB Atlas is suitable).

## Local setup

1. Copy `.env.example` to `.env` and fill in a MongoDB URI and a random JWT secret of at least 32 characters. Keep `.env` private.
2. Install packages with `npm install`.
3. Start the API with `npm start` (or `npm run dev` during development).
4. Serve `index.html` through a local static server. Set `FRONTEND_URL` to that exact origin if it is not one of the supported localhost development origins.
5. Open the frontend and register a non-admin account. An administrator must be provisioned through a trusted database/admin process; public registration rejects `ADMIN`.

The API defaults to port 5000. `GET /api/health` returns a simple health response. The server connects to MongoDB before listening.

## Environment

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | production | Enables production checks and stricter auth throttling |
| `PORT` | no | API listening port; defaults to 5000 |
| `MONGO_URI` | yes | MongoDB connection URI |
| `JWT_SECRET` | yes | JWT signing secret; at least 32 bytes in production |
| `FRONTEND_URL` | production | Comma-separated exact frontend origins for CORS |
| `DNS_SERVERS` | no | Optional comma-separated DNS resolver override for local networks |
| `TRUST_PROXY_HOPS` | no | Set only to the hosting provider's documented trusted proxy hop count |

Never commit `.env`, database credentials, signing keys, or real demo account credentials.

## API and security

See [API reference](docs/API.md), [architecture and diagrams](docs/architecture.md), and [security and verification notes](docs/security-audit.md). All API routes are mounted under `/api`. Private routes require `Authorization: Bearer <token>`. Public registration supports user roles only; admin access is provisioned separately.

## Development checks

- `npm test` runs the local unit/security checks.
- `npm run check` performs syntax checks on the backend JavaScript files.
- Import `postman/collections/MediBridge-API` into Postman for manual API checks. Set the base URL and user tokens in its environment; never save real credentials in the collection.

See [demo workflow](docs/demo-and-viva.md) for a safe demonstration sequence. Real deployment still requires production MongoDB, hosting, frontend domain, and provider-specific environment setup.
