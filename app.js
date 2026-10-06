const app = document.getElementById("app");
const API = window.MediBridgeAPI;
const ROLE_LABELS = { DONOR: "Donor", PHARMACY: "Pharmacy", NGO: "NGO", HOSPITAL: "Hospital", ADMIN: "Admin" };
let currentUser = readSavedUser();
let currentRole = currentUser?.role || null;
let currentPage = "dashboard";
let matchPanel = null;
let pendingRedemption = null;

function readSavedUser() {
  try { return JSON.parse(sessionStorage.getItem("mb_user") || localStorage.getItem("mb_user") || "null"); }
  catch (_) { API.clearSession(); return null; }
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
function statusBadge(value) {
  const status = String(value || "UNKNOWN").toUpperCase();
  return `<span class="badge ${esc(status.toLowerCase())}">${esc(status.replaceAll("_", " "))}</span>`;
}
function toast(message) {
  let element = document.getElementById("toast");
  if (!element) { element = document.createElement("div"); element.id = "toast"; element.className = "toast"; document.body.append(element); }
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(element._hideTimer);
  element._hideTimer = setTimeout(() => element.classList.remove("show"), 3000);
}
window.handleExpiredSession = () => {
  currentUser = null; currentRole = null;
  showAuth("login", "Your session expired. Please log in again.");
};

function navPublic() {
  return `<nav class="navbar"><div class="brand"><div class="brand-mark">♥</div><span>MediBridge</span></div>
    <div class="navlinks"><a onclick="goPublic()">Home</a><a href="#features">About</a><a href="#features">How It Works</a></div>
    <div class="nav-actions"><button class="btn btn-outline" onclick="showAuth('login')">Login</button><button class="btn btn-primary" onclick="showAuth('register')">Register</button></div></nav>`;
}
function home() {
  app.innerHTML = `${navPublic()}<main><section class="hero"><div><h1>Connecting<br>Medicines <span>to People in Need</span></h1>
      <p>MediBridge connects donors, pharmacies and care organizations so eligible medicines can reach communities that need them.</p>
      <div class="hero-actions"><button class="btn btn-primary" onclick="showAuth('register')">Get Started</button><button class="btn btn-outline" onclick="document.querySelector('.features').scrollIntoView({behavior:'smooth'})">Learn More</button></div></div>
      <div class="hero-visual"><div class="heart-card"><div class="heart"></div><div class="float one">✓ Verified donation</div><div class="float two">Reward history</div></div></div></section>
      <section class="features" id="features"><div class="section-title"><h2>A simple bridge between supply and need</h2><p>Real inventory, requests and review tools in one place.</p></div>
      <div class="feature-grid"><div class="feature-card"><div class="icon">♙</div><h3>Reduce Waste</h3><p>Give unused, eligible medicines a safe path to communities.</p></div><div class="feature-card"><div class="icon">♥</div><h3>Support Communities</h3><p>Help care organizations discover and request available medicine.</p></div><div class="feature-card"><div class="icon">★</div><h3>Earn Rewards</h3><p>Track contribution points after donations are verified.</p></div><div class="feature-card"><div class="icon">♧</div><h3>Report Issues</h3><p>Send concerns to the administrators for review.</p></div></div></section></main>
      <footer class="footer">© 2026 MediBridge · College Project MVP</footer>`;
}
function showAuth(mode, notice = "") {
  app.innerHTML = `${navPublic()}<div class="auth-wrap"><div class="auth-card"><h1>${mode === "login" ? "Welcome Back" : "Create your account"}</h1>
    <p>${esc(notice || (mode === "login" ? "Login to your MediBridge account." : "Start contributing to MediBridge."))}</p>
    <form onsubmit="${mode === "login" ? "loginUser(event)" : "registerUser(event)"}">${mode === "register" ? `<div class="form-group"><label for="authName">Name</label><input id="authName" required minlength="2" maxlength="100" placeholder="Your name"></div><div class="form-group"><label for="authRole">Account Type</label><select id="authRole"><option value="DONOR">Donor</option><option value="NGO">NGO</option><option value="PHARMACY">Pharmacy</option><option value="HOSPITAL">Hospital</option></select></div>` : ""}<div class="form-group"><label for="authEmail">Email</label><input id="authEmail" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    <div class="form-group"><label for="authPassword">Password</label><input id="authPassword" type="password" required ${mode === "register" ? "minlength=12 maxlength=72" : ""} autocomplete="${mode === "login" ? "current-password" : "new-password"}" placeholder="${mode === "login" ? "Your password" : "At least 12 characters"}"></div>
    <button class="btn btn-primary" style="width:100%" type="submit">${mode === "login" ? "Login" : "Create Account"}</button></form>
    <p style="text-align:center;margin:18px 0 0">${mode === "login" ? `New here? <a onclick="showAuth('register')">Create an account</a>` : `Already registered? <a onclick="showAuth('login')">Login</a>`}</p></div></div>`;
}
async function registerUser(event) {
  event.preventDefault();
  if (!document.getElementById("authName").value.trim()) { toast("Enter your name."); return; }
  const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Creating account…";
  try {
    const response = await API.publicPost("/auth/register", {
      name: document.getElementById("authName").value.trim(), email: document.getElementById("authEmail").value.trim(),
      password: document.getElementById("authPassword").value, role: document.getElementById("authRole").value
    });
    toast(response.message || "Account created. Please log in."); showAuth("login", "Account created successfully. Please log in.");
  } catch (error) { toast(error.message); button.disabled = false; button.textContent = "Create Account"; }
}
async function loginUser(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Signing in…";
  try {
    const data = await API.publicPost("/auth/login", { email: document.getElementById("authEmail").value.trim(), password: document.getElementById("authPassword").value });
    sessionStorage.setItem("mb_token", data.token); sessionStorage.setItem("mb_user", JSON.stringify(data.user));
    localStorage.removeItem("mb_token"); localStorage.removeItem("mb_user"); localStorage.removeItem("mb_role");
    currentUser = data.user; currentRole = data.user.role; toast("Login successful"); await dashboard();
  } catch (error) { toast(error.message); button.disabled = false; button.textContent = "Login"; }
}

function navItems() {
  if (currentRole === "ADMIN") return [["dashboard", "▦", "Dashboard"], ["users", "♙", "Manage Users"], ["medicines", "▣", "Donations"], ["requests", "◷", "Requests"], ["rewards", "★", "Rewards"], ["reports", "⚑", "Issue Reports"]];
  if (currentRole === "DONOR") return [["dashboard", "▦", "Dashboard"], ["donate", "＋", "Donate Medicine"], ["medicines", "▣", "My Donations"], ["rewards", "★", "Reward Points"], ["reports", "⚑", "Report Issue"], ["profile", "♙", "Profile"]];
  if (currentRole === "PHARMACY") return [["dashboard", "▦", "Dashboard"], ["donate", "＋", "Add Medicine"], ["medicines", "▣", "Available Medicines"], ["reports", "⚑", "Report Issue"], ["profile", "♙", "Profile"]];
  return [["dashboard", "▦", "Dashboard"], ["medicines", "▣", "Available Medicines"], ["requests", "◷", "My Requests"], ["reports", "⚑", "Report Issue"], ["profile", "♙", "Profile"]];
}
function shell(content) {
  if (!currentRole) return home();
  const items = navItems();
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">♥</div><span>MediBridge</span></div><div class="side-nav">
    ${items.map(([id, icon, label]) => `<button class="${currentPage === id ? "active" : ""}" onclick="navigate('${id}')">${icon} <span>${label}</span></button>`).join("")}
    <button onclick="logout()">↩ <span>Log out</span></button></div></aside><div class="main"><div class="topbar"><div class="user-pill"><div class="avatar">${esc((currentUser?.name || currentRole)[0]).toUpperCase()}</div>${esc(currentUser?.name || ROLE_LABELS[currentRole])} · ${esc(ROLE_LABELS[currentRole] || currentRole)}</div></div>
    <div class="content">${content}</div></div></div>`;
}
function logout() { API.clearSession(); currentUser = null; currentRole = null; currentPage = "dashboard"; showAuth("login", "You have been logged out."); }
function requireRole(allowed) { if (!currentRole) { showAuth("login", "Please log in to continue."); return false; } if (!allowed.includes(currentRole)) { toast("Your account does not have access to that page."); dashboard(); return false; } return true; }
function loadingPage(title) { shell(`<div class="page-head"><div><h1>${esc(title)}</h1><p>Loading…</p></div></div><div class="card" aria-live="polite">Loading ${esc(title.toLowerCase())}…</div>`); }
function pageError(title, error, retry) { if (!currentRole) return; shell(`<div class="page-head"><div><h1>${esc(title)}</h1><p>We could not load this information.</p></div></div><div class="card"><p>${esc(error.message)}</p><button class="btn btn-primary" onclick="${retry}()">Try Again</button></div>`); }
function statCard(label, value) { return `<div class="stat"><small>${esc(label)}</small><strong>${esc(value ?? 0)}</strong></div>`; }
function emptyRow(columns, message = "No records found.") { return `<tr><td colspan="${columns}" class="empty">${esc(message)}</td></tr>`; }

async function dashboard() {
  currentPage = "dashboard";
  if (!currentRole) return showAuth("login");
  loadingPage(`${ROLE_LABELS[currentRole]} Dashboard`);
  try {
    if (currentRole === "ADMIN") {
      const [stats, medicines, requests, reports] = await Promise.all([API.get("/admin/statistics"), API.get("/admin/medicines?limit=5"), API.get("/admin/requests?limit=5"), API.get("/admin/reports?status=OPEN&limit=5")]);
      const m = stats.medicines || {}, u = stats.users || {}, r = stats.requests || {}, rew = stats.rewards || {};
      shell(`<div class="page-head"><div><h1>Admin Dashboard</h1><p>Platform activity at a glance.</p></div></div><div class="stats">${statCard("Total Users", u.total)}${statCard("Donations", m.total)}${statCard("Pending Reviews", m.byVerificationStatus?.PENDING || 0)}${statCard("Open Reports", reports.count)}</div>
        <div class="stats">${statCard("Requests", r.total)}${statCard("Available Units", m.availableQuantity)}${statCard("Rewards Awarded", rew.awarded)}${statCard("Rewards Redeemed", rew.redeemed)}</div>
        <div class="grid-2"><div class="card"><h2>Recent Donations</h2>${medicineTable(medicines.medicines || [], true)}</div><div class="card"><h2>Recent Requests</h2>${requestTableHtml(requests.requests || [], true)}</div></div>`);
    } else if (currentRole === "DONOR" || currentRole === "PHARMACY") {
      const [inventory, rewards] = await Promise.all([API.get("/medicines/my?limit=100"), currentRole === "DONOR" ? API.get("/rewards/balance") : Promise.resolve({ points: 0 })]);
      const list = inventory.medicines || [];
      const pending = list.filter(item => item.verificationStatus === "PENDING").length;
      const verified = list.filter(item => item.verificationStatus === "VERIFIED").length;
      shell(`<div class="page-head"><div><h1>${esc(ROLE_LABELS[currentRole])} Dashboard</h1><p>Manage your medicine contributions and status.</p></div><button class="btn btn-primary" onclick="navigate('donate')">＋ Add Medicine</button></div>
        <div class="stats">${statCard("My Donations", list.length)}${statCard("Pending Review", pending)}${statCard("Verified", verified)}${currentRole === "DONOR" ? statCard("Reward Points", rewards.points) : statCard("Available", list.filter(item => item.status === "AVAILABLE").length)}</div>
        <div class="card"><h2>Recent Contributions</h2>${medicineTable(list.slice(0, 6), false)}</div>`);
    } else {
      const [available, myRequests] = await Promise.all([API.get("/medicines"), API.get("/requests/my")]);
      const mine = myRequests.requests || [];
      shell(`<div class="page-head"><div><h1>${esc(ROLE_LABELS[currentRole])} Dashboard</h1><p>Find medicine and track your requests.</p></div><button class="btn btn-primary" onclick="navigate('requests')">Create a Request</button></div>
        <div class="stats">${statCard("Available Medicines", (available.medicines || []).length)}${statCard("My Requests", mine.length)}${statCard("Pending", mine.filter(item => item.status === "PENDING").length)}${statCard("Accepted", mine.filter(item => item.status === "ACCEPTED").length)}</div>
        <div class="grid-2"><div class="card"><h2>My Recent Requests</h2>${requestTableHtml(mine.slice(0, 6), false)}</div><div class="card"><h2>Available Medicines</h2>${medicineTable((available.medicines || []).slice(0, 5), false)}</div></div>`);
    }
  } catch (error) { pageError("Dashboard", error, "dashboard"); }
}

function medicineTable(list, admin) {
  if (!list.length) return `<div class="empty">No medicine records yet.</div>`;
  return `<div style="overflow:auto"><table><thead><tr><th>Medicine</th><th>Donor</th><th>Qty</th><th>Expiry</th><th>Review</th>${admin ? "<th>Action</th>" : ""}</tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.sourceId?.name || (item.sourceId ? "—" : "—"))}</td><td>${esc(item.quantity)}</td><td>${dateText(item.expiryDate)}</td><td>${statusBadge(item.verificationStatus || item.status)}</td>${admin ? `<td><button class="btn btn-small btn-outline" onclick="openMedicine('${esc(item._id)}')">View</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
function requestTableHtml(list, admin) {
  if (!list.length) return `<div class="empty">No requests found.</div>`;
  return `<div style="overflow:auto"><table><thead><tr><th>Medicine</th><th>${admin ? "Requester" : "Qty"}</th><th>${admin ? "Qty" : "Status"}</th><th>Status</th></tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.medicineName)}</td><td>${admin ? esc(item.requester?.name || "—") : esc(item.quantity)}</td><td>${admin ? esc(item.quantity) : statusBadge(item.status)}</td><td>${admin ? statusBadge(item.status) : dateText(item.createdAt)}</td></tr>`).join("")}</tbody></table></div>`;
}

function donate() {
  if (!requireRole(["DONOR", "PHARMACY"])) return;
  currentPage = "donate";
  shell(`<div class="page-head"><div><h1>${currentRole === "PHARMACY" ? "Add Medicine" : "Donate Medicine"}</h1><p>New contributions are submitted for administrator review.</p></div></div><div class="card" style="max-width:760px"><form onsubmit="addMedicine(event)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px"><div class="form-group"><label>Medicine Name *</label><input id="mName" required maxlength="120" placeholder="Paracetamol"></div><div class="form-group"><label>Manufacturer *</label><input id="mManufacturer" required placeholder="Manufacturer"></div>
    <div class="form-group"><label>Quantity *</label><input id="mQty" type="number" min="1" step="1" required></div><div class="form-group"><label>Batch Number *</label><input id="mBatch" required></div><div class="form-group"><label>Expiry Date *</label><input id="mExpiry" type="date" required></div><div class="form-group"><label>Category</label><input id="mCategory" placeholder="Optional"></div></div>
    <div class="form-group"><label>Pickup Location *</label><input id="mLocation" required placeholder="City or address"></div><button class="btn btn-primary" type="submit">Submit for Review</button></form></div>`);
}
async function addMedicine(event) {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Submitting…";
  try {
    const data = await API.post("/medicines", { medicineName: document.getElementById("mName").value.trim(), manufacturer: document.getElementById("mManufacturer").value.trim(), quantity: Number(document.getElementById("mQty").value), batchNumber: document.getElementById("mBatch").value.trim(), expiryDate: document.getElementById("mExpiry").value, category: document.getElementById("mCategory").value.trim(), pickupLocation: document.getElementById("mLocation").value.trim() });
    toast("Donation submitted for review."); await navigate("medicines");
  } catch (error) { toast(error.message); button.disabled = false; button.textContent = "Submit for Review"; }
}

async function medicinesPage() {
  if (!requireRole(["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"])) return;
  currentPage = "medicines"; loadingPage("Donations & Medicines");
  try {
    const admin = currentRole === "ADMIN", own = ["DONOR", "PHARMACY"].includes(currentRole);
    const params = new URLSearchParams();
    const search = document.getElementById("medicineSearch")?.value || "";
    const status = document.getElementById("medicineStatus")?.value || "";
    if (search) params.set(admin ? "name" : "search", search);
    if (status) params.set(admin ? "verificationStatus" : "status", status);
    const endpoint = admin ? "/admin/medicines" : own && currentRole === "DONOR" ? "/medicines/my" : "/medicines";
    const data = await API.get(`${endpoint}${params.size ? `?${params}` : ""}`);
    const list = data.medicines || [];
    shell(`<div class="page-head"><div><h1>${admin ? "Donation Management" : own && currentRole === "DONOR" ? "My Donations" : "Available Medicines"}</h1><p>${admin ? "Review contributions and track verification." : own ? "See all submitted contributions and their review status." : "Browse available medicine from the platform."}</p></div>${own ? `<button class="btn btn-primary" onclick="navigate('donate')">＋ Add Medicine</button>` : ""}</div>
      <div class="toolbar"><input id="medicineSearch" placeholder="Search by medicine name" value="${esc(search)}"><select id="medicineStatus"><option value="">${admin ? "All review states" : "All statuses"}</option>${(admin ? ["PENDING", "VERIFIED", "REJECTED"] : ["AVAILABLE", "REQUESTED", "ALLOCATED", "EXPIRED"]).map(value => `<option ${value === status ? "selected" : ""}>${value}</option>`).join("")}</select><button class="btn btn-primary" onclick="medicinesPage()">Search</button></div>
      ${admin ? medicineTable(list.map(item => ({ ...item, sourceId: item.sourceId })), true) : list.length ? `<div class="medicine-grid">${list.map(item => `<div class="card medicine-card"><div class="medicine-icon">💊</div><h3>${esc(item.name)}</h3><div class="medicine-meta">${esc(item.manufacturer || "")}<br>Quantity: ${esc(item.quantity)} units<br>Expiry: ${dateText(item.expiryDate)}<br>Location: ${esc(item.location?.city || item.location?.address || "—")}</div><div style="margin:12px 0">${statusBadge(item.verificationStatus || item.status)}</div>${!own && ["NGO", "HOSPITAL"].includes(currentRole) && item.status === "AVAILABLE" ? `<button class="btn btn-primary btn-small" data-name="${esc(item.name)}" onclick="startRequest('${esc(item._id)}',this)">Request</button>` : ""}</div>`).join("")}</div>` : `<div class="empty">No medicines found.</div>`}`);
  } catch (error) { pageError("Medicines", error, "medicinesPage"); }
}
function startRequest(medicineId, button) {
  const name = button?.dataset.name || "medicine";
  currentPage = "requests";
  shell(`<div class="page-head"><div><h1>Request ${esc(name)}</h1><p>Send a request to reserve medicine for your organization.</p></div></div><div class="card" style="max-width:650px"><form onsubmit="createRequest(event)"><input type="hidden" id="requestMedicine" value="${esc(name)}"><div class="form-group"><label>Medicine</label><input value="${esc(name)}" disabled></div><div class="form-group"><label>Quantity *</label><input id="requestQuantity" type="number" min="1" required></div><div class="form-group"><label>Urgency</label><select id="requestUrgency"><option>LOW</option><option selected>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></div><div class="form-group"><label>Details</label><textarea id="requestDescription" maxlength="2000"></textarea></div><button class="btn btn-primary" type="submit">Submit Request</button></form></div>`);
}

async function requestsPage() {
  if (!requireRole(["NGO", "HOSPITAL", "ADMIN"])) return;
  const search = document.getElementById("requestSearch")?.value || "";
  const status = document.getElementById("requestStatus")?.value || "";
  currentPage = "requests"; loadingPage("Requests");
  try {
    const admin = currentRole === "ADMIN";
    const params = new URLSearchParams(); if (search) params.set(admin ? "medicine" : "search", search); if (status) params.set("status", status);
    const data = await API.get(`${admin ? "/admin/requests" : "/requests/my"}${params.size ? `?${params}` : ""}`);
    const list = data.requests || [];
    shell(`<div class="page-head"><div><h1>${admin ? "Request Management" : "My Requests"}</h1><p>${admin ? "Review platform request activity; cancellation uses the existing request state rules." : "Track request status and find suitable available inventory."}</p></div>${!admin ? `<button class="btn btn-primary" onclick="newRequest()">＋ New Request</button>` : ""}</div>
      <div class="toolbar"><input id="requestSearch" placeholder="Search medicine name" value="${esc(search)}"><select id="requestStatus"><option value="">All statuses</option>${["PENDING", "MATCHED", "ACCEPTED", "FULFILLING", "COMPLETED", "CANCELLED"].map(value => `<option ${value === status ? "selected" : ""}>${value}</option>`).join("")}</select><button class="btn btn-primary" onclick="requestsPage()">Filter</button></div>
      ${admin ? adminRequestsTable(list) : `<div class="card">${myRequestsTable(list)}</div>`}${matchPanel ? `<div class="card" style="margin-top:18px"><h2>Matching Available Medicines</h2>${matchPanel.matches.length ? matchPanel.matches.map(item => `<p>${esc(item.name)} · ${esc(item.manufacturer)} · ${esc(item.quantity)} units · ${dateText(item.expiryDate)} <button class="btn btn-small btn-primary" onclick="acceptRequest('${esc(matchPanel.requestId)}','${esc(item.medicineId)}')">Accept Match</button></p>`).join("") : `<p class="empty">No matching medicine is currently available.</p>`}</div>` : ""}`);
  } catch (error) { pageError("Requests", error, "requestsPage"); }
}
function newRequest() {
  shell(`<div class="page-head"><div><h1>Create Medicine Request</h1><p>Describe what your organization needs.</p></div></div><div class="card" style="max-width:650px"><form onsubmit="createRequest(event)"><div class="form-group"><label>Medicine Name *</label><input id="requestMedicine" required></div><div class="form-group"><label>Quantity *</label><input id="requestQuantity" type="number" min="1" step="1" required></div><div class="form-group"><label>Urgency</label><select id="requestUrgency"><option>LOW</option><option selected>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></div><div class="form-group"><label>Details</label><textarea id="requestDescription" maxlength="2000"></textarea></div><button class="btn btn-primary" type="submit">Submit Request</button></form></div>`);
}
async function createRequest(event) {
  event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
  try { await API.post("/requests", { medicineName: document.getElementById("requestMedicine").value.trim(), quantity: Number(document.getElementById("requestQuantity").value), urgency: document.getElementById("requestUrgency").value, description: document.getElementById("requestDescription").value.trim() }); matchPanel = null; toast("Request submitted."); await requestsPage(); }
  catch (error) { toast(error.message); button.disabled = false; }
}
function myRequestsTable(list) {
  if (!list.length) return `<div class="empty">You have not submitted any requests yet.</div>`;
  return `<div style="overflow:auto"><table><thead><tr><th>Medicine</th><th>Qty</th><th>Urgency</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.medicineName)}</td><td>${esc(item.quantity)}</td><td>${esc(item.urgency)}</td><td>${statusBadge(item.status)}</td><td>${dateText(item.createdAt)}</td><td>${["PENDING", "MATCHED"].includes(item.status) ? `<button class="btn btn-small btn-outline" onclick="findMatches('${esc(item._id)}')">Find Matches</button> <button class="btn btn-small btn-danger" onclick="cancelRequest('${esc(item._id)}')">Cancel</button>` : item.status === "ACCEPTED" ? `<button class="btn btn-small btn-danger" onclick="cancelRequest('${esc(item._id)}')">Cancel</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>`;
}
function adminRequestsTable(list) {
  if (!list.length) return `<div class="empty">No requests found.</div>`;
  return `<div class="card"><div style="overflow:auto"><table><thead><tr><th>Medicine</th><th>Requester</th><th>Qty</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.medicineName)}</td><td>${esc(item.requester?.name || "—")}</td><td>${esc(item.quantity)}</td><td>${statusBadge(item.status)}</td><td>${dateText(item.createdAt)}</td><td>${["PENDING", "MATCHED", "ACCEPTED"].includes(item.status) ? `<button class="btn btn-small btn-danger" onclick="cancelRequest('${esc(item._id)}')">Cancel</button>` : "—"}</td></tr>`).join("")}</tbody></table></div></div>`;
}
async function findMatches(id) {
  try { const data = await API.get(`/requests/${encodeURIComponent(id)}/matches`); matchPanel = { requestId: id, matches: data.matches || [] }; await requestsPage(); }
  catch (error) { toast(error.message); }
}
async function acceptRequest(requestId, medicineId) {
  try { await API.post(`/requests/${encodeURIComponent(requestId)}/accept`, { medicineId }); matchPanel = null; toast("Medicine matched to request."); await requestsPage(); }
  catch (error) { toast(error.message); }
}
async function cancelRequest(id) {
  if (!confirm("Cancel this request?")) return;
  try { await API.post(`/requests/${encodeURIComponent(id)}/cancel`, {}); matchPanel = null; toast("Request cancelled."); await requestsPage(); }
  catch (error) { toast(error.message); }
}

async function rewards() {
  if (!requireRole(["DONOR", "ADMIN"])) return;
  currentPage = "rewards"; loadingPage("Rewards");
  try {
    if (currentRole === "ADMIN") {
      const [transactions, users] = await Promise.all([API.get("/admin/rewards?limit=100"), API.get("/admin/users?limit=100")]);
      const entries = transactions.transactions || [];
      shell(`<div class="page-head"><div><h1>Reward Management</h1><p>Review transactions and adjust points through the reward service.</p></div></div>
        <div class="card" style="margin-bottom:18px"><h2>Adjust a User Balance</h2><form onsubmit="adjustReward(event)"><div style="display:grid;grid-template-columns:2fr 1fr 2fr auto;gap:10px"><select id="rewardUser" required><option value="">Select user</option>${(users.users || []).map(user => `<option value="${esc(user._id)}">${esc(user.name)} (${esc(user.role)}) · ${esc(user.rewardPoints || 0)} points</option>`).join("")}</select><input id="rewardPoints" type="number" step="1" required placeholder="± points"><input id="rewardReason" required maxlength="500" placeholder="Reason"><button class="btn btn-primary" type="submit">Adjust</button></div></form></div>
        <div class="card"><h2>Reward Transactions</h2>${rewardTable(entries, true)}</div>`);
    } else {
      const [balance, history] = await Promise.all([API.get("/rewards/balance"), API.get("/rewards/history?limit=100")]);
      const entries = history.transactions || [];
      shell(`<div class="page-head"><div><h1>Reward Points</h1><p>Your balance comes directly from the MediBridge reward service.</p></div></div><div class="stats">${statCard("Current Points", balance.points)}${statCard("Earned", entries.filter(item => item.type === "EARN").reduce((sum, item) => sum + item.points, 0))}${statCard("Redeemed", Math.abs(entries.filter(item => item.type === "REDEEM").reduce((sum, item) => sum + item.points, 0)))}${statCard("Transactions", history.count)}</div>
        <div class="card" style="margin-bottom:18px"><h2>Redeem Points</h2><form onsubmit="redeemRewards(event)"><div style="display:flex;gap:10px;max-width:500px"><input id="redeemPoints" type="number" min="1" step="1" required placeholder="Points to redeem"><button class="btn btn-primary" type="submit">Redeem</button></div></form></div><div class="card"><h2>Reward History</h2>${rewardTable(entries, false)}</div>`);
    }
  } catch (error) { pageError("Rewards", error, "rewards"); }
}
function rewardTable(entries, admin) {
  if (!entries.length) return `<div class="empty">No reward transactions yet.</div>`;
  return `<div style="overflow:auto"><table><thead><tr>${admin ? "<th>User</th>" : ""}<th>Type</th><th>Points</th><th>Balance After</th><th>Reason</th><th>Date</th></tr></thead><tbody>${entries.map(item => `<tr>${admin ? `<td>${esc(item.user?.name || "—")}</td>` : ""}<td>${statusBadge(item.type)}</td><td>${esc(item.points)}</td><td>${esc(item.balanceAfter)}</td><td>${esc(item.reason)}</td><td>${dateText(item.createdAt)}</td></tr>`).join("")}</tbody></table></div>`;
}
async function redeemRewards(event) {
  event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
  const points = Number(document.getElementById("redeemPoints").value);
  if (!pendingRedemption || pendingRedemption.points !== points) {
    const key = window.crypto?.randomUUID ? window.crypto.randomUUID() : `redeem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingRedemption = { points, key };
  }
  try {
    const result = await API.post("/rewards/redeem", { points }, { "Idempotency-Key": pendingRedemption.key });
    pendingRedemption = null;
    toast(result.replayed ? `This redemption was already processed. Balance: ${result.points}` : `Redeemed. New balance: ${result.points}`);
    await rewards();
  } catch (error) { toast(error.message); button.disabled = false; }
}
async function adjustReward(event) {
  event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
  try { await API.post("/admin/rewards/adjust", { userId: document.getElementById("rewardUser").value, points: Number(document.getElementById("rewardPoints").value), reason: document.getElementById("rewardReason").value.trim() }); toast("Reward adjustment recorded."); await rewards(); }
  catch (error) { toast(error.message); button.disabled = false; }
}

async function users() {
  if (!requireRole(["ADMIN"])) return;
  currentPage = "users"; loadingPage("Manage Users");
  try {
    const search = document.getElementById("userSearch")?.value || "", role = document.getElementById("userRole")?.value || "";
    const params = new URLSearchParams(); if (search) params.set("search", search); if (role) params.set("role", role);
    const data = await API.get(`/admin/users${params.size ? `?${params}` : ""}`); const list = data.users || [];
    shell(`<div class="page-head"><div><h1>Manage Users</h1><p>Review accounts, roles, activity and access status.</p></div></div><div class="toolbar"><input id="userSearch" placeholder="Search name or email" value="${esc(search)}"><select id="userRole"><option value="">All roles</option>${["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"].map(item => `<option ${role === item ? "selected" : ""}>${item}</option>`).join("")}</select><button class="btn btn-primary" onclick="users()">Search</button></div>
      ${!list.length ? `<div class="empty">No users found.</div>` : `<div class="card"><div style="overflow:auto"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Reward Points</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead><tbody>${list.map(user => `<tr><td><button class="btn btn-small btn-outline" onclick="viewUser('${esc(user._id)}')">${esc(user.name)}</button></td><td>${esc(user.email)}</td><td><select id="role-${esc(user._id)}">${["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"].map(roleName => `<option ${user.role === roleName ? "selected" : ""}>${roleName}</option>`).join("")}</select></td><td>${esc(user.rewardPoints || 0)}</td><td>${statusBadge(user.active === false ? "SUSPENDED" : "ACTIVE")}</td><td>${dateText(user.createdAt)}</td><td><button class="btn btn-small btn-primary" onclick="saveUser('${esc(user._id)}',${user.active !== false})">Save</button> <button class="btn btn-small ${user.active === false ? "btn-outline" : "btn-danger"}" onclick="setUserActive('${esc(user._id)}',${user.active === false})">${user.active === false ? "Reactivate" : "Suspend"}</button></td></tr>`).join("")}</tbody></table></div></div>`}`);
  } catch (error) { pageError("Manage Users", error, "users"); }
}
async function saveUser(id, active) {
  try { await API.patch(`/admin/users/${encodeURIComponent(id)}`, { role: document.getElementById(`role-${id}`).value, active }); toast("User updated."); await users(); }
  catch (error) { toast(error.message); }
}
async function setUserActive(id, active) {
  try { await API.patch(`/admin/users/${encodeURIComponent(id)}`, { active: !active }); toast(active ? "Account reactivated." : "Account suspended."); await users(); }
  catch (error) { toast(error.message); }
}
async function viewUser(id) {
  try { const { user, activity } = await API.get(`/admin/users/${encodeURIComponent(id)}`); alert(`${user.name}\n${user.email}\n${user.role} · ${user.active === false ? "Suspended" : "Active"}\nDonations: ${activity.donations} · Requests: ${activity.requests} · Reward transactions: ${activity.rewardTransactions}`); }
  catch (error) { toast(error.message); }
}

async function openMedicine(id) {
  try {
    const { medicine } = await API.get(`/admin/medicines/${encodeURIComponent(id)}`);
    const answer = medicine.verificationStatus === "PENDING" ? confirm(`Review ${medicine.name} from ${medicine.sourceId?.name || "unknown donor"}?\nOK = approve, Cancel = enter rejection reason.`) : false;
    if (medicine.verificationStatus !== "PENDING") { alert(`${medicine.name}\n${medicine.verificationStatus}\n${medicine.reviewReason || "No review note"}`); return; }
    if (answer) return reviewMedicine(id, "APPROVE");
    const reason = prompt("Enter a reason for rejecting this donation:");
    if (reason) await reviewMedicine(id, "REJECT", reason);
  } catch (error) { toast(error.message); }
}
async function reviewMedicine(id, action, reason = "") {
  try { await API.patch(`/admin/medicines/${encodeURIComponent(id)}/review`, { action, ...(reason ? { reason } : {}) }); toast(action === "APPROVE" ? "Donation approved and rewards processed." : "Donation rejected."); await medicinesPage(); }
  catch (error) { toast(error.message); }
}

async function reports() {
  if (!requireRole(["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"])) return;
  currentPage = "reports"; loadingPage("Issue Reports");
  try {
    if (currentRole === "ADMIN") {
      const data = await API.get("/admin/reports?limit=100"); const list = data.reports || [];
      shell(`<div class="page-head"><div><h1>Issue Reports</h1><p>Review community reports and record your decision.</p></div></div>${!list.length ? `<div class="empty">No reports have been submitted.</div>` : `<div class="card"><div style="overflow:auto"><table><thead><tr><th>Type</th><th>Reporter</th><th>Description</th><th>Status</th><th>Date</th><th>Update</th></tr></thead><tbody>${list.map(report => `<tr><td>${esc(report.type)}</td><td>${esc(report.reporter?.name || "—")}</td><td><button class="btn btn-small btn-outline" onclick="viewReport('${esc(report._id)}')">View</button> ${esc(report.description)}</td><td>${statusBadge(report.status)}</td><td>${dateText(report.createdAt)}</td><td><select id="report-status-${esc(report._id)}">${["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"].map(status => `<option ${report.status === status ? "selected" : ""}>${status}</option>`).join("")}</select><input id="report-note-${esc(report._id)}" value="${esc(report.adminNotes || "")}" maxlength="2000" placeholder="Admin notes"><button class="btn btn-small btn-primary" onclick="updateReport('${esc(report._id)}')">Save</button></td></tr>`).join("")}</tbody></table></div></div>`}`);
    } else {
      const data = await API.get("/reports/my"); const list = data.reports || [];
      shell(`<div class="page-head"><div><h1>Report an Issue</h1><p>Send a concern to the MediBridge administrators.</p></div></div><div class="card" style="max-width:760px;margin-bottom:20px"><form onsubmit="submitReport(event)"><div class="form-group"><label>Report Type</label><select id="reportType"><option>OTHER</option><option>MEDICINE</option><option>REQUEST</option><option>USER</option></select></div><div class="form-group"><label>Description (10–2000 characters)</label><textarea id="reportDescription" required minlength="10" maxlength="2000"></textarea></div><div class="form-group"><label>Related record ID (optional)</label><input id="reportRelatedId" placeholder="Required for Medicine, Request or User reports"></div><button class="btn btn-primary" type="submit">Submit Report</button></form></div><div class="card"><h2>My Reports</h2>${list.length ? `<table><thead><tr><th>Type</th><th>Description</th><th>Status</th><th>Date</th></tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.type)}</td><td>${esc(item.description)}</td><td>${statusBadge(item.status)}</td><td>${dateText(item.createdAt)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">You have not sent a report yet.</div>`}</div>`);
    }
  } catch (error) { pageError("Issue Reports", error, "reports"); }
}
async function submitReport(event) {
  event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
  try {
    const type = document.getElementById("reportType").value, body = { type, description: document.getElementById("reportDescription").value.trim() }, related = document.getElementById("reportRelatedId").value.trim();
    if (type !== "OTHER") { if (!related) throw new Error("Enter the related record ID for this report type."); body[{ USER: "relatedUser", MEDICINE: "relatedMedicine", REQUEST: "relatedRequest" }[type]] = related; }
    await API.post("/reports", body); toast("Report submitted."); await reports();
  } catch (error) { toast(error.message); button.disabled = false; }
}
async function viewReport(id) {
  try { const { report } = await API.get(`/admin/reports/${encodeURIComponent(id)}`); alert(`${report.type} · ${report.status}\n\n${report.description}\n\nReporter: ${report.reporter?.name || "—"}\nAdmin notes: ${report.adminNotes || "—"}`); }
  catch (error) { toast(error.message); }
}
async function updateReport(id) {
  try { await API.patch(`/admin/reports/${encodeURIComponent(id)}`, { status: document.getElementById(`report-status-${id}`).value, adminNotes: document.getElementById(`report-note-${id}`).value }); toast("Report updated."); await reports(); }
  catch (error) { toast(error.message); }
}

function profile() {
  currentPage = "profile";
  shell(`<div class="page-head"><div><h1>Profile</h1><p>Account information from your authenticated session.</p></div></div><div class="card" style="max-width:650px"><div class="form-group"><label>Name</label><input value="${esc(currentUser?.name)}" disabled></div><div class="form-group"><label>Email</label><input value="${esc(currentUser?.email)}" disabled></div><div class="form-group"><label>Role</label><input value="${esc(ROLE_LABELS[currentRole] || currentRole)}" disabled></div><button class="btn btn-outline" onclick="navigate('reports')">Report an Issue</button></div>`);
}
async function navigate(page) {
  if (page === "dashboard") return dashboard();
  if (page === "donate") return donate();
  if (page === "medicines") return medicinesPage();
  if (page === "requests") return requestsPage();
  if (page === "rewards") return rewards();
  if (page === "users") return users();
  if (page === "reports") return reports();
  if (page === "profile") return profile();
  toast("Page not found.");
}
function goPublic() { currentRole ? dashboard() : home(); }

if (currentRole && sessionStorage.getItem("mb_token")) dashboard();
else if (currentRole && localStorage.getItem("mb_token")) dashboard();
else { API.clearSession(); currentUser = null; currentRole = null; home(); }
