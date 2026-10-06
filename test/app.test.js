const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");

test("HTTP app exposes health, protects admin check, limits request bodies, and rejects unknown CORS origins", async t => {
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });

    const admin = await fetch(`${base}/api/admin-test`);
    assert.equal(admin.status, 401);

    const cors = await fetch(`${base}/api/health`, { headers: { Origin: "https://untrusted.example.invalid" } });
    assert.equal(cors.headers.get("access-control-allow-origin"), null);

    const oversized = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: "x".repeat(33 * 1024) })
    });
    assert.equal(oversized.status, 413);
});
