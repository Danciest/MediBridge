const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const frontendSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function createFrontend(api) {
  const appElement = { innerHTML: "" };
  const storage = { getItem: () => null, removeItem: () => {} };
  const context = {
    document: { getElementById: id => id === "app" ? appElement : null, body: { append() {} } },
    sessionStorage: storage,
    localStorage: storage,
    URLSearchParams,
    console,
    setTimeout,
    clearTimeout
  };
  context.window = context;
  context.MediBridgeAPI = api;
  vm.createContext(context);
  vm.runInContext(frontendSource, context);
  vm.runInContext("currentRole = 'DONOR'; currentUser = { name: 'Demo Donor', role: 'DONOR' };", context);
  return { context, appElement };
}

const sampleDonations = [
  { _id: "medicine-pending", name: "Pending Medicine", manufacturer: "Demo Labs", quantity: 2, verificationStatus: "PENDING" },
  { _id: "medicine-approved", name: "Approved Medicine", manufacturer: "Demo Labs", quantity: 3, verificationStatus: "VERIFIED" },
  { _id: "medicine-rejected", name: "Rejected Medicine", manufacturer: "Demo Labs", quantity: 4, verificationStatus: "REJECTED" }
];

test("donor donations view uses own endpoint, filters backend review values, and shows earned rewards", async () => {
  const calls = [];
  const { context, appElement } = createFrontend({
    clearSession() {},
    async get(route) {
      calls.push(route);
      if (route === "/medicines/my?limit=100") return { medicines: sampleDonations };
      if (route === "/rewards/history?limit=100") return { transactions: [{ type: "EARN", medicine: { _id: "medicine-approved" }, points: 10 }] };
      throw new Error(`Unexpected API route: ${route}`);
    }
  });

  await vm.runInContext("medicinesPage()", context);
  assert.deepEqual(calls, ["/medicines/my?limit=100", "/rewards/history?limit=100"]);
  assert.match(appElement.innerHTML, /Pending Donations \(1\)/);
  assert.match(appElement.innerHTML, /Reward:<\/strong> Awaiting approval/);
  assert.match(appElement.innerHTML, /\+10 points/);

  vm.runInContext("setDonorDonationReviewFilter('PENDING')", context);
  assert.match(appElement.innerHTML, /Pending Medicine/);
  assert.doesNotMatch(appElement.innerHTML, /Approved Medicine|Rejected Medicine/);

  vm.runInContext("setDonorDonationReviewFilter('VERIFIED')", context);
  assert.match(appElement.innerHTML, /Approved Medicine/);
  assert.doesNotMatch(appElement.innerHTML, /Pending Medicine|Rejected Medicine/);

  vm.runInContext("setDonorDonationReviewFilter('REJECTED')", context);
  assert.match(appElement.innerHTML, /Rejected Medicine/);
  assert.doesNotMatch(appElement.innerHTML, /Pending Medicine|Approved Medicine/);
});

test("donor donations view has required empty, loading, and safe error states", async () => {
  let resolveDonations;
  const delayed = createFrontend({
    clearSession() {},
    get: route => route === "/medicines/my?limit=100"
      ? new Promise(resolve => { resolveDonations = resolve; })
      : Promise.resolve({ transactions: [] })
  });
  const loadPromise = vm.runInContext("medicinesPage()", delayed.context);
  assert.match(delayed.appElement.innerHTML, /Loading your donations\.\.\./);
  resolveDonations({ medicines: [] });
  await loadPromise;
  assert.match(delayed.appElement.innerHTML, /You haven&#39;t donated any medicines yet\./);

  const emptyPending = createFrontend({
    clearSession() {},
    async get(route) {
      if (route === "/medicines/my?limit=100") return { medicines: sampleDonations.slice(1) };
      return { transactions: [] };
    }
  });
  await vm.runInContext("medicinesPage()", emptyPending.context);
  vm.runInContext("setDonorDonationReviewFilter('PENDING')", emptyPending.context);
  assert.match(emptyPending.appElement.innerHTML, /No pending donations\./);

  const failed = createFrontend({ clearSession() {}, async get() { throw new Error("private backend diagnostic"); } });
  await vm.runInContext("medicinesPage()", failed.context);
  assert.match(failed.appElement.innerHTML, /Unable to load your donations\. Please try again\./);
  assert.doesNotMatch(failed.appElement.innerHTML, /private backend diagnostic/);
});
