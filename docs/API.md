# API reference

Base path: `/api`. JSON request bodies use `Content-Type: application/json`. Private endpoints require `Authorization: Bearer <JWT>`. Tokens expire after one day; the current role and active status are read from MongoDB on each authenticated request.

## Public and authenticated routes

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness response |
| POST | `/auth/register` | Public, throttled | Register DONOR, PHARMACY, NGO, or HOSPITAL; ADMIN is rejected |
| POST | `/auth/login` | Public, throttled | Return JWT and safe user profile |
| GET | `/protected` | Any active account | Authentication smoke check |
| GET | `/admin-test` | ADMIN | Admin authorization smoke check |
| POST | `/reports` | Any active account | Submit report; optional related reference must match its report type |
| GET | `/reports/my` | Any active account | List the caller's reports |

## Medicines

All medicine endpoints require an active account.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/medicines` | DONOR, PHARMACY | Create a pending donation/stock listing; owner and review fields are assigned server-side |
| GET | `/medicines` | DONOR, PHARMACY, NGO, HOSPITAL, ADMIN | Search listings; public roles see only available, unexpired stock; donors/pharmacies can see their own pending listings as implemented |
| GET | `/medicines/my` | DONOR, PHARMACY | Own inventory/history |
| GET | `/medicines/:id` | Any authenticated role | Read only when permitted by role, owner, availability, or admin access |
| PUT | `/medicines/:id` | ADMIN | Update permitted listing/review fields |
| DELETE | `/medicines/:id` | ADMIN | Delete listing |

Filters on list routes include `search`/`name`, `manufacturer`, `city`, `location`, `status`, `expiryDate`, `expiryAfter`, and `expiryBefore`. Date filters use `YYYY-MM-DD`. Quantity is a positive whole number up to 1,000,000. Expired or same-day expiry donations are rejected.

## Requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/requests` | NGO, HOSPITAL | Create request owned by the caller |
| GET | `/requests/my` | NGO, HOSPITAL, ADMIN | Own requests (admins can see all) |
| GET | `/requests/pending` | NGO, HOSPITAL, ADMIN | Pending queue |
| GET | `/requests` | NGO, HOSPITAL, ADMIN | Browse pending requests; admin can filter all statuses |
| GET | `/requests/:id` | Owner or ADMIN | Read request details |
| GET | `/requests/:id/matches` | Owner or ADMIN | Find available, unexpired matching stock |
| POST | `/requests/:id/accept` | Owner or ADMIN | Atomically reserve stock and accept request |
| PATCH | `/requests/:id/status` | Owner or ADMIN | Valid forward status transition |
| POST | `/requests/:id/complete` | Owner or ADMIN | Complete a fulfilling request |
| POST | `/requests/:id/cancel` | Owner or ADMIN | Cancel an eligible request; restores reserved quantity transactionally |

Request quantities must be positive whole numbers up to 1,000,000. State transitions and ownership are checked server-side. Multi-document acceptance/cancellation requires MongoDB transaction support.

## Rewards

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/rewards/balance` | DONOR | Read own balance |
| GET | `/rewards/history` | DONOR | Read own history; optional `page`, `limit` (max 100), and `type` |
| POST | `/rewards/redeem` | DONOR | Redeem points from own balance; requires `Idempotency-Key` header |
| GET | `/admin/rewards` | ADMIN | Search reward history |
| POST | `/admin/rewards/adjust` | ADMIN | Adjust a user's balance with a reason |

Reward balance changes are handled by the reward service. Donation awards and redemptions are transactional; unique indexes and idempotency keys prevent duplicate entries. Replaying the same redemption key and amount returns the original transaction; reusing it for a different amount returns 409.

## Admin

All `/admin/*` endpoints require ADMIN.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | List/filter users |
| GET | `/admin/users/:id` | User details |
| PATCH | `/admin/users/:id` | Update permitted admin-managed role/active fields |
| GET | `/admin/medicines` | List/filter donations |
| GET | `/admin/medicines/:id` | Donation plus related requests/rewards |
| PATCH | `/admin/medicines/:id/review` | Approve/reject pending donation |
| GET | `/admin/requests` | List/filter requests |
| GET | `/admin/requests/:id` | Request details |
| GET | `/admin/reports` | List/filter reports |
| GET | `/admin/reports/:id` | Report details |
| PATCH | `/admin/reports/:id` | Update report status/notes |
| GET | `/admin/statistics` | Summary statistics |

## Common responses

- `400`: malformed JSON, invalid input/date/ID, or invalid state transition.
- `401`: missing or invalid/expired token.
- `403`: authenticated user lacks the role/ownership permission, or account suspended.
- `404`: record not found.
- `409`: duplicate/conflicting operation.
- `413`: body exceeds the 32 KB JSON limit.
- `429`: authentication throttling limit reached.
- `503`: database unavailable or transactions unsupported for an operation that requires them.

The static Postman collection is in `postman/collections/MediBridge-API`. Never store real credentials or tokens in committed Postman environment files.

## Request examples

Registration (`POST /auth/register`):

```json
{
  "name": "Demo Donor",
  "email": "donor1@example.invalid",
  "password": "use-a-private-demo-password",
  "role": "DONOR"
}
```

Donation (`POST /medicines`, donor/pharmacy token):

```json
{
  "medicineName": "Example tablets",
  "manufacturer": "Example Labs",
  "quantity": 12,
  "batchNumber": "DEMO-BATCH-01",
  "expiryDate": "2030-12-31",
  "pickupLocation": "Demo City"
}
```

Request (`POST /requests`, NGO/hospital token):

```json
{
  "medicineName": "Example tablets",
  "quantity": 5,
  "urgency": "MEDIUM",
  "description": "Demonstration request"
}
```

Redemption (`POST /rewards/redeem`, donor token) uses `{ "points": 10 }` and a stable retry key such as `demo-redeem-0001` in the `Idempotency-Key` header. Use a newly generated unique key for each new redemption.
