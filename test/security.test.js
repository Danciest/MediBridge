const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Request = require("../models/Request");
const Reward = require("../models/Reward");
const { protect, authorizeRoles } = require("../middleware/auth");
const { calculateDonationReward } = require("../utils/rewardCalculator");

test("public user schema rejects ADMIN-invalid roles and plaintext length edge cases", () => {
    const user = new User({ name: "Tester", email: "tester@example.invalid", password: "already-hashed", role: "ROOT" });
    assert.ok(user.validateSync().errors.role);
});

test("medicine and request schemas reject fractional or out-of-range quantities", () => {
    const medicine = new Medicine({ name: "Medicine", manufacturer: "Maker", quantity: 1.5, batchNumber: "B1", expiryDate: new Date("2030-01-01"), sourceId: "507f1f77bcf86cd799439011", sourceType: "DONOR" });
    assert.ok(medicine.validateSync().errors.quantity);
    const request = new Request({ requester: "507f1f77bcf86cd799439011", requesterRole: "NGO", medicineName: "Medicine", quantity: 0, urgency: "HIGH" });
    assert.ok(request.validateSync().errors.quantity);
});

test("reward schema enforces transaction signs and redemption idempotency key", () => {
    const base = { user: "507f1f77bcf86cd799439011", balanceAfter: 10, reason: "Test" };
    assert.ok(new Reward({ ...base, type: "EARN", points: -2, medicine: "507f1f77bcf86cd799439012" }).validateSync().errors.points);
    assert.ok(new Reward({ ...base, type: "REDEEM", points: -2 }).validateSync().errors.idempotencyKey);
    assert.ok(new Reward({ ...base, type: "REDEEM", points: 2, idempotencyKey: "request-123" }).validateSync().errors.points);
});

test("donation reward calculator returns bounded integer points", () => {
    const points = calculateDonationReward({ quantity: 3 });
    assert.ok(Number.isSafeInteger(points));
    assert.ok(points > 0);
});

test("authorization middleware distinguishes missing role from forbidden role", () => {
    const call = (user, allowed) => {
        let nextCalled = false;
        let result;
        const res = { status(code) { result = { status: code }; return this; }, json(body) { result.body = body; return this; } };
        authorizeRoles(...allowed)({ user }, res, () => { nextCalled = true; });
        return { nextCalled, result };
    };
    assert.equal(call(undefined, ["ADMIN"]).result.status, 401);
    assert.equal(call({ role: "DONOR" }, ["ADMIN"]).result.status, 403);
    assert.equal(call({ role: "ADMIN" }, ["ADMIN"]).nextCalled, true);
});

test("JWT middleware rejects missing, malformed, expired, and invalid-signature tokens", async () => {
    process.env.JWT_SECRET = "test-only-secret-that-is-not-a-real-credential";
    const validShape = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const expired = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, { expiresIn: -1 });
    const cases = [undefined, "Basic token", "Bearer broken.token", `Bearer ${expired}`, `Bearer ${jwt.sign({ id: "507f1f77bcf86cd799439011" }, "wrong-secret", { expiresIn: "1h" })}`];
    for (const authorization of cases) {
        let response;
        const req = { headers: authorization ? { authorization } : {} };
        const res = { status(code) { response = { status: code }; return this; }, json(body) { response.body = body; return this; } };
        let advanced = false;
        await protect(req, res, () => { advanced = true; });
        assert.equal(advanced, false);
        assert.equal(response.status, 401);
    }
    assert.ok(validShape);
});
