# Test cases

Results below distinguish automated checks from expected/manual scenarios. “Not run” means no live API/database call was made.

| Test ID | Feature | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| AUTH-01 | Register | Valid non-admin role and strong password | 201, safe user profile | Route code reviewed; API not run | Not run |
| AUTH-02 | Register | Existing email | 409 | Duplicate check/index reviewed; API not run | Not run |
| AUTH-03 | Register | Admin role | 403 | Implemented; API not run | Not run |
| AUTH-04 | Login | Correct credentials | JWT with one-day expiry; no hash | Implemented; API not run | Not run |
| AUTH-05 | Login | Wrong email/password | Generic 401 | Implemented; API not run | Not run |
| AUTH-06 | JWT | Missing, malformed, expired, wrong signature | 401 | Unit tests passed for each | Pass |
| MED-01 | Donation | Valid future expiry and positive integer quantity | 201 pending donation | Route/model reviewed; API not run | Not run |
| MED-02 | Donation | Fractional/zero/excessive quantity | 400 or schema validation failure | Schema test passed; route API not run | Partial |
| MED-03 | Donation | Expired/today date | 400 | Route guard reviewed; API not run | Not run |
| MED-04 | Authorization | Non-admin modifies/deletes listing | 403 | ADMIN-only route middleware reviewed; API not run | Not run |
| MED-05 | Admin review | Approve same donation twice | Only one reward | Unique guard/transaction reviewed; DB race not run | Not run |
| REQ-01 | Request | Valid NGO/hospital request | 201 | Route/model reviewed; API not run | Not run |
| REQ-02 | Request ownership | Another requester modifies request ID | 403 | Ownership guard reviewed; API not run | Not run |
| REQ-03 | Request status | Invalid transition | 400 | Transition checks reviewed; API not run | Not run |
| REQ-04 | Acceptance | Two callers reserve same stock concurrently | At most one valid reservation | Transaction/conditional update reviewed; concurrency not run | Not run |
| REW-01 | Reward calculation | Eligible donation | Integer reward | Calculator unit test passed | Pass |
| REW-02 | Redemption | Same key and points retried | Same transaction returned once | Code reviewed; DB test not run | Not run |
| REW-03 | Redemption | Insufficient points | 400; no balance change | Transaction code reviewed; DB test not run | Not run |
| ADMIN-01 | RBAC | Donor against admin role | 403 | Middleware unit test passed; endpoint API not run | Partial |
| ADMIN-02 | Management | Admin list/review/statistics/report | Admin-only behavior | Router guard reviewed; API not run | Not run |
| API-01 | IDs | Malformed Mongo ID | Controlled 400 | Route guards reviewed; API not run | Not run |
| API-02 | Request parser | Body over 32 KB | 413 | Middleware configured; HTTP call not run | Not run |
| API-03 | HTTP smoke | GET health; GET admin test without token; hostile Origin; oversized JSON | 200, 401, no CORS allow-origin, 413 | All four assertions passed in HTTP app test | Pass |
| BUILD-01 | Syntax | Backend JavaScript source | No syntax errors | `npm run check` passed | Pass |
| UNIT-01 | Unit/security | Schema, reward, RBAC, JWT checks | All pass | 6 tests passed via `npm test` | Pass |
| DEP-01 | Production login/API/database/CORS | Deployed environment | External requests succeed safely | No provider/domain/production environment configured | Not run |
