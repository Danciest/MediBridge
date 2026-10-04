const app = document.getElementById("app");

const medicines = [
  {
    id: 1,
    name: "Paracetamol",
    category: "Pain Relief",
    qty: 100,
    expiry: "2027-05-20",
    location: "Kolkata",
    status: "AVAILABLE",
    donor: "Rahul Sen"
  },
  {
    id: 2,
    name: "Amoxicillin",
    category: "Antibiotic",
    qty: 200,
    expiry: "2026-12-10",
    location: "Howrah",
    status: "AVAILABLE",
    donor: "MediCare Pharmacy"
  },
  {
    id: 3,
    name: "Crocin",
    category: "Pain Relief",
    qty: 50,
    expiry: "2027-01-15",
    location: "Kolkata",
    status: "REQUESTED",
    donor: "Ananya Roy"
  },
  {
    id: 4,
    name: "ORS",
    category: "Hydration",
    qty: 80,
    expiry: "2027-09-01",
    location: "Salt Lake",
    status: "AVAILABLE",
    donor: "Green Pharmacy"
  }
];

const requests = [
  {
    id: 1,
    medicine: "Paracetamol",
    ngo: "Helping Hands",
    qty: 20,
    status: "APPROVED",
    date: "20 Sep 2026"
  },
  {
    id: 2,
    medicine: "Crocin",
    ngo: "Care NGO",
    qty: 10,
    status: "PENDING",
    date: "18 Sep 2026"
  },
  {
    id: 3,
    medicine: "Amoxicillin",
    ngo: "Health First",
    qty: 50,
    status: "REJECTED",
    date: "15 Sep 2026"
  }
];

let currentRole = localStorage.getItem("mb_role") || "DONOR";
let currentPage = "dashboard";

const roleNames = {
  DONOR: "Donor",
  PHARMACY: "Pharmacy",
  NGO: "NGO",
  HOSPITAL: "Hospital",
  ADMIN: "Admin"
};

/* =========================
   PUBLIC NAVBAR
========================= */

function navPublic() {
  return `
    <nav class="navbar">
      <div class="brand">
        <div class="brand-mark">♥</div>
        <span>MediBridge</span>
      </div>

      <div class="navlinks">
        <a onclick="goPublic()">Home</a>
        <a onclick="goPublic()">About</a>
        <a onclick="showToast('How MediBridge works')">How It Works</a>
        <a onclick="showToast('Contact: team@medibridge.demo')">Contact</a>
      </div>

      <div class="nav-actions">
        <button class="btn btn-outline" onclick="showAuth('login')">
          Login
        </button>

        <button class="btn btn-primary" onclick="showAuth('register')">
          Register
        </button>
      </div>
    </nav>
  `;
}

/* =========================
   HOME
========================= */

function home() {
  app.innerHTML = `
    ${navPublic()}

    <main>
      <section class="hero">

        <div>
          <h1>
            Connecting<br>
            Medicines <span>to People in Need</span>
          </h1>

          <p>
            MediBridge connects donors, pharmacies and NGOs so unused
            medicines can reach communities that need them — while
            reducing medicine waste.
          </p>

          <div class="hero-actions">
            <button
              class="btn btn-primary"
              onclick="showAuth('register')">
              Get Started
            </button>

            <button
              class="btn btn-outline"
              onclick="document.querySelector('.features').scrollIntoView({behavior:'smooth'})">
              Learn More
            </button>
          </div>
        </div>

        <div class="hero-visual">
          <div class="heart-card">
            <div class="heart"></div>

            <div class="float one">
              ✓ Verified donation
            </div>

            <div class="float two">
              +20 reward points
            </div>
          </div>
        </div>

      </section>

      <section class="features">

        <div class="section-title">
          <h2>A simple bridge between supply and need</h2>

          <p>
            The foundation is designed so advanced features can be
            added later.
          </p>
        </div>

        <div class="feature-grid">

          <div class="feature-card">
            <div class="icon">♙</div>

            <h3>Reduce Waste</h3>

            <p>
              Give unused, eligible medicines a path to communities
              instead of letting them go unused.
            </p>
          </div>

          <div class="feature-card">
            <div class="icon">♥</div>

            <h3>Support Communities</h3>

            <p>
              Help NGOs discover available medicine inventory and
              request what they need.
            </p>
          </div>

          <div class="feature-card">
            <div class="icon">★</div>

            <h3>Earn Rewards</h3>

            <p>
              Track contribution points and build a transparent
              donor reward history.
            </p>
          </div>

          <div class="feature-card">
            <div class="icon">♧</div>

            <h3>Built to Grow</h3>

            <p>
              Verification, notifications, location matching and AI
              can be added on top of this core.
            </p>
          </div>

        </div>
      </section>
    </main>

    <footer class="footer">
      © 2026 MediBridge · College Project MVP
    </footer>
  `;
}

/* =========================
   LOGIN / REGISTER
========================= */

function showAuth(mode) {
  app.innerHTML = `
    ${navPublic()}

    <div class="auth-wrap">

      <div class="auth-card">

        <h1>
          ${mode === "login"
            ? "Welcome Back"
            : "Create your account"}
        </h1>

        <p>
          ${
            mode === "login"
              ? "Login to your MediBridge account."
              : "Start contributing to MediBridge."
          }
        </p>

        <div class="form-group">
          <label>Name</label>
          <input
            id="authName"
            placeholder="Your name">
        </div>

        <div class="form-group">
          <label>Account Type</label>

          <select id="authRole">

            <option value="DONOR">
              Donor
            </option>

            <option value="PHARMACY">
              Pharmacy
            </option>

            <option value="NGO">
              NGO
            </option>

            <option value="HOSPITAL">
              Hospital
            </option>

            <option value="ADMIN">
              Admin
            </option>

          </select>
        </div>

        <div class="form-group">
          <label>Email</label>

          <input
            id="authEmail"
            type="email"
            placeholder="you@example.com">
        </div>

        <div class="form-group">
          <label>Password</label>

          <input
            id="authPassword"
            type="password"
            placeholder="••••••••">
        </div>

        <button
          class="btn btn-primary"
          style="width:100%"
          onclick="loginDemo()">

          ${
            mode === "login"
              ? "Login"
              : "Create Account"
          }

        </button>

        <p style="text-align:center;margin:18px 0 0">
          Demo project — authentication is simulated locally.
        </p>

      </div>
    </div>
  `;
}

/* =========================
   LOGIN DEMO
========================= */

function loginDemo() {

  const role =
    document.getElementById("authRole")?.value ||
    localStorage.getItem("mb_role") ||
    "DONOR";

  const name =
    document.getElementById("authName")?.value ||
    "MediBridge User";

  localStorage.setItem("mb_role", role);
  localStorage.setItem("mb_name", name);

  currentRole = role;
  currentPage = "dashboard";

  dashboard();
}

/* =========================
   DASHBOARD SIDEBAR
========================= */

function shell(content) {

  const navByRole = {

    DONOR: [
      ["dashboard", "▦", "Dashboard"],
      ["donate", "＋", "Donate Medicine"],
      ["medicines", "▣", "My Donations"],
      ["requests", "◷", "My Requests"],
      ["rewards", "★", "Reward Points"],
      ["profile", "♙", "Profile"]
    ],

    PHARMACY: [
      ["dashboard", "▦", "Dashboard"],
      ["medicines", "▣", "Medicines"],
      ["donate", "＋", "Add Medicine"],
      ["requests", "◷", "Requests"],
      ["profile", "♙", "Profile"]
    ],

    NGO: [
      ["dashboard", "▦", "Dashboard"],
      ["medicines", "▣", "Available Medicines"],
      ["requests", "◷", "My Requests"],
      ["received", "♥", "Received Donations"],
      ["profile", "♙", "Profile"]
    ],

    HOSPITAL: [
      ["dashboard", "▦", "Dashboard"],
      ["medicines", "▣", "Available Medicines"],
      ["requests", "◷", "My Requests"],
      ["history", "◷", "Request History"],
      ["profile", "♙", "Profile"]
    ],

    ADMIN: [
      ["dashboard", "▦", "Dashboard"],
      ["users", "♙", "Users"],
      ["medicines", "▣", "Medicines"],
      ["donations", "＋", "Donations"],
      ["requests", "◷", "Requests"],
      ["reports", "▤", "Reports"],
      ["profile", "♙", "Profile"]
    ]
  };

  const nav =
    navByRole[currentRole] ||
    navByRole.DONOR;

  const userName =
    localStorage.getItem("mb_name") ||
    `${roleNames[currentRole] || "User"} User`;

  app.innerHTML = `

    <div class="app-shell">

      <aside class="sidebar">

        <div class="brand">
          <div class="brand-mark">♥</div>
          <span>MediBridge</span>
        </div>

        <div class="side-nav">

          ${nav
            .map(
              ([id, ic, label]) => `
                <button
                  class="${currentPage === id ? "active" : ""}"
                  onclick="navigate('${id}')">

                  ${ic}

                  <span>
                    ${label}
                  </span>

                </button>
              `
            )
            .join("")}

          <button onclick="logout()">
            ↩
            <span>Log out</span>
          </button>

        </div>

      </aside>

      <div class="main">

        <div class="topbar">

          <div class="user-pill">

            <div class="avatar">
              ${userName[0].toUpperCase()}
            </div>

            <div>

              <strong>
                ${userName}
              </strong>

              <small style="display:block">
                ${roleNames[currentRole] || currentRole}
              </small>

            </div>

          </div>

        </div>

        <div class="content">
          ${content}
        </div>

      </div>

    </div>

    <div class="toast" id="toast"></div>
  `;
}

/* =========================
   DASHBOARD
========================= */

function dashboard() {

  currentPage = "dashboard";

  const isNgo =
    currentRole === "NGO";

  const isPharmacy =
    currentRole === "PHARMACY";

  const isHospital =
    currentRole === "HOSPITAL";

  const isAdmin =
    currentRole === "ADMIN";

  if (isAdmin) {
    return adminDashboard();
  }

  const title =
    isNgo
      ? "NGO Dashboard"
      : isPharmacy
      ? "Pharmacy Dashboard"
      : isHospital
      ? "Hospital Dashboard"
      : "Donor Dashboard";

  const description =
    isNgo
      ? "Find and request medicines for your community."
      : isPharmacy
      ? "Manage your medicines and donations."
      : isHospital
      ? "Request and manage medicines for your patients."
      : "Welcome back. Here is an overview of your contributions.";

  const actionPage =
    isNgo || isHospital
      ? "medicines"
      : "donate";

  const actionText =
    isNgo || isHospital
      ? "Browse Medicines"
      : isPharmacy
      ? "+ Add Medicine"
      : "+ Donate Medicine";

  let stats = "";

  if (isNgo) {

    stats = `
      <div class="stat">
        <small>Available Medicines</small>
        <strong>
          ${medicines.filter(
            m => m.status === "AVAILABLE"
          ).length}
        </strong>
      </div>

      <div class="stat">
        <small>Active Requests</small>
        <strong>5</strong>
      </div>

      <div class="stat">
        <small>Approved Requests</small>
        <strong>3</strong>
      </div>

      <div class="stat">
        <small>Received Donations</small>
        <strong>1</strong>
      </div>
    `;

  } else if (isPharmacy) {

    stats = `
      <div class="stat">
        <small>Medicines Listed</small>
        <strong>24</strong>
      </div>

      <div class="stat">
        <small>Total Donations</small>
        <strong>12</strong>
      </div>

      <div class="stat">
        <small>Pending Donations</small>
        <strong>3</strong>
      </div>

      <div class="stat">
        <small>Completed Donations</small>
        <strong>8</strong>
      </div>
    `;

  } else if (isHospital) {

    stats = `
      <div class="stat">
        <small>Active Requests</small>
        <strong>5</strong>
      </div>

      <div class="stat">
        <small>Approved Requests</small>
        <strong>3</strong>
      </div>

      <div class="stat">
        <small>Received Medicines</small>
        <strong>12</strong>
      </div>

      <div class="stat">
        <small>Pending Requests</small>
        <strong>2</strong>
      </div>
    `;

  } else {

    stats = `
      <div class="stat">
        <small>Total Donations</small>
        <strong>12</strong>
      </div>

      <div class="stat">
        <small>Active Donations</small>
        <strong>3</strong>
      </div>

      <div class="stat">
        <small>Completed Donations</small>
        <strong>8</strong>
      </div>

      <div class="stat">
        <small>Medicines Donated</small>
        <strong>450</strong>
      </div>
    `;
  }

  shell(`

    <div class="page-head">

      <div>

        <h1>
          ${title}
        </h1>

        <p>
          ${description}
        </p>

      </div>

      <button
        class="btn btn-primary"
        onclick="navigate('${actionPage}')">

        ${actionText}

      </button>

    </div>

    <div class="stats">
      ${stats}
    </div>

    <div class="grid-2">

      <div class="card">

        <h2>
          ${
            isNgo || isHospital
              ? "Recent Requests"
              : "Recent Donations"
          }
        </h2>

        ${
          isNgo || isHospital
            ? requestTable()
            : donationTable()
        }

      </div>

      <div class="card">

        <h2>
          ${
            isNgo || isHospital
              ? "Community Impact"
              : "Your Impact"
          }
        </h2>

        <div style="display:grid;gap:15px">

          <div>
            <b>♧</b>

            Medicines ${
              isNgo || isHospital
                ? "received"
                : "donated"
            }

            <strong style="float:right">
              ${
                isNgo || isHospital
                  ? "120"
                  : "450"
              } units
            </strong>
          </div>

          <div>
            <b>♥</b>

            People helped

            <strong style="float:right">
              ~120
            </strong>
          </div>

          <div>
            <b>♲</b>

            Waste reduced

            <strong style="float:right">
              ~12 kg
            </strong>
          </div>

        </div>

      </div>

    </div>
  `);
}

/* =========================
   DONATION TABLE
========================= */

function donationTable() {

  return `
    <table>

      <thead>
        <tr>
          <th>Medicine</th>
          <th>Qty</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>

      <tbody>

        <tr>
          <td>Paracetamol</td>
          <td>100</td>
          <td>
            <span class="badge available">
              Available
            </span>
          </td>
          <td>20 Sep</td>
        </tr>

        <tr>
          <td>Crocin</td>
          <td>50</td>
          <td>
            <span class="badge requested">
              Requested
            </span>
          </td>
          <td>18 Sep</td>
        </tr>

        <tr>
          <td>Amoxicillin</td>
          <td>200</td>
          <td>
            <span class="badge allocated">
              Allocated
            </span>
          </td>
          <td>15 Sep</td>
        </tr>

      </tbody>

    </table>
  `;
}

/* =========================
   REQUEST TABLE
========================= */

function requestTable() {

  return `
    <table>

      <thead>
        <tr>
          <th>Medicine</th>
          <th>NGO</th>
          <th>Qty</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>

        ${requests
          .map(
            r => `
              <tr>

                <td>
                  ${r.medicine}
                </td>

                <td>
                  ${r.ngo}
                </td>

                <td>
                  ${r.qty}
                </td>

                <td>

                  <span
                    class="badge ${r.status.toLowerCase()}">

                    ${r.status}

                  </span>

                </td>

              </tr>
            `
          )
          .join("")}

      </tbody>

    </table>
  `;
}

/* =========================
   DONATE / ADD MEDICINE
========================= */

function donate() {

  currentPage = "donate";

  const isPharmacy =
    currentRole === "PHARMACY";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          ${
            isPharmacy
              ? "Add Medicine"
              : "Donate Medicine"
          }
        </h1>

        <p>
          ${
            isPharmacy
              ? "Add medicine stock available for donation."
              : "Add details of the medicine you want to donate."
          }
        </p>

      </div>

    </div>

    <div
      class="card"
      style="max-width:760px">

      <form onsubmit="addMedicine(event)">

        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:15px;
          ">

          <div class="form-group">

            <label>
              Medicine Name *
            </label>

            <input
              id="mName"
              required
              placeholder="e.g. Paracetamol">

          </div>

          <div class="form-group">

            <label>
              Category *
            </label>

            <select id="mCat">

              <option>
                Pain Relief
              </option>

              <option>
                Antibiotic
              </option>

              <option>
                Hydration
              </option>

              <option>
                Other
              </option>

            </select>

          </div>

          <div class="form-group">

            <label>
              Quantity *
            </label>

            <input
              id="mQty"
              type="number"
              min="1"
              required
              placeholder="100">

          </div>

          <div class="form-group">

            <label>
              Expiry Date *
            </label>

            <input
              id="mExpiry"
              type="date"
              required>

          </div>

        </div>

        <div class="form-group">

          <label>
            Location *
          </label>

          <input
            id="mLocation"
            required
            placeholder="Kolkata">

        </div>

        <div class="form-group">

          <label>
            Description
          </label>

          <textarea
            id="mDesc"
            placeholder="Packaging or other useful information">
          </textarea>

        </div>

        <button class="btn btn-primary">
          Add Medicine
        </button>

      </form>

    </div>
  `);
}

/* =========================
   ADD MEDICINE
========================= */

function addMedicine(e) {

  e.preventDefault();

  medicines.unshift({

    id: Date.now(),

    name: mName.value,

    category: mCat.value,

    qty: Number(mQty.value),

    expiry: mExpiry.value,

    location: mLocation.value,

    status: "AVAILABLE",

    donor:
      localStorage.getItem("mb_name") ||
      "Current User"
  });

  showToast(
    "Medicine added successfully"
  );

  setTimeout(
    () => navigate("medicines"),
    500
  );
}

/* =========================
   MEDICINES PAGE
========================= */

function medicinesPage() {

  currentPage = "medicines";

  const title =
    currentRole === "DONOR"
      ? "My Donations"
      : "Available Medicines";

  const description =
    currentRole === "DONOR"
      ? "View medicines you have added for donation."
      : "Browse medicine inventory and request what your community needs.";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          ${title}
        </h1>

        <p>
          ${description}
        </p>

      </div>

    </div>

    <div class="toolbar">

      <input
        id="search"
        oninput="filterMedicines()"
        placeholder="Search medicines...">

      <select
        id="cat"
        onchange="filterMedicines()">

        <option>
          All Categories
        </option>

        <option>
          Pain Relief
        </option>

        <option>
          Antibiotic
        </option>

        <option>
          Hydration
        </option>

      </select>

      <select
        id="status"
        onchange="filterMedicines()">

        <option>
          Available
        </option>

        <option>
          All
        </option>

      </select>

      <button
        class="btn btn-primary"
        onclick="filterMedicines()">

        Search

      </button>

    </div>

    <div
      id="medicineGrid"
      class="medicine-grid">
    </div>

  `);

  renderMedicines();
}

/* =========================
   RENDER MEDICINES
========================= */

function renderMedicines() {

  const q =
    (
      document.getElementById("search")?.value ||
      ""
    ).toLowerCase();

  const cat =
    document.getElementById("cat")?.value ||
    "All Categories";

  const st =
    document.getElementById("status")?.value ||
    "Available";

  const data = medicines.filter(m =>

    (!q ||
      m.name
        .toLowerCase()
        .includes(q))

    &&

    (
      cat === "All Categories" ||
      m.category === cat
    )

    &&

    (
      st === "All" ||
      m.status === "AVAILABLE"
    )
  );

  document.getElementById(
    "medicineGrid"
  ).innerHTML =

    data.map(
      m => `

        <div class="card medicine-card">

          <div class="medicine-icon">
            💊
          </div>

          <h3>
            ${m.name}
          </h3>

          <div class="medicine-meta">

            Category:
            ${m.category}

            <br>

            Quantity:
            ${m.qty} units

            <br>

            Expiry:
            ${m.expiry}

            <br>

            Location:
            ${m.location}

          </div>

          <div style="margin:12px 0">

            <span
              class="badge ${m.status.toLowerCase()}">

              ${m.status}

            </span>

          </div>

          <button
            class="btn btn-primary btn-small"
            onclick="requestMedicine(${m.id})">

            ${
              currentRole === "NGO" ||
              currentRole === "HOSPITAL"
                ? "Request Medicine"
                : "View Details"
            }

          </button>

        </div>

      `
    ).join("")

    ||

    `
      <div class="empty">
        No medicines found.
      </div>
    `;
}

/* =========================
   FILTER MEDICINES
========================= */

function filterMedicines() {
  renderMedicines();
}

/* =========================
   REQUEST MEDICINE
========================= */

function requestMedicine(id) {

  const m =
    medicines.find(
      x => x.id === id
    );

  if (
    currentRole !== "NGO" &&
    currentRole !== "HOSPITAL"
  ) {

    showToast(
      `${m.name}: requests are available for NGO and Hospital accounts`
    );

    return;
  }

  m.status = "REQUESTED";

  requests.unshift({

    id: Date.now(),

    medicine: m.name,

    ngo:
      currentRole === "NGO"
        ? "Current NGO"
        : "Current Hospital",

    qty: 10,

    status: "PENDING",

    date: "Today"
  });

  showToast(
    "Request submitted"
  );

  setTimeout(
    () => navigate("requests"),
    500
  );
}

/* =========================
   REQUESTS PAGE
========================= */

function requestsPage() {

  currentPage = "requests";

  const admin =
    currentRole === "ADMIN";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          ${
            admin
              ? "All Requests"
              : "My Requests"
          }
        </h1>

        <p>
          ${
            admin
              ? "Review and manage medicine allocation requests."
              : "Track the status of your medicine requests."
          }
        </p>

      </div>

    </div>

    <div class="card">

      ${
        admin

          ? `

            <table>

              <thead>

                <tr>
                  <th>Medicine</th>
                  <th>Organization</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                ${requests
                  .map(
                    r => `

                      <tr>

                        <td>
                          ${r.medicine}
                        </td>

                        <td>
                          ${r.ngo}
                        </td>

                        <td>
                          ${r.qty}
                        </td>

                        <td>

                          <span
                            class="badge ${r.status.toLowerCase()}">

                            ${r.status}

                          </span>

                        </td>

                        <td>

                          ${
                            r.status === "PENDING"

                              ? `

                                <button
                                  class="btn btn-small btn-primary"
                                  onclick="approveRequest(${r.id})">

                                  Approve

                                </button>

                                <button
                                  class="btn btn-small btn-danger"
                                  onclick="rejectRequest(${r.id})">

                                  Reject

                                </button>

                              `

                              : "—"
                          }

                        </td>

                      </tr>

                    `
                  )
                  .join("")}

              </tbody>

            </table>

          `

          : requestTable()
      }

    </div>
  `);
}

/* =========================
   APPROVE REQUEST
========================= */

function approveRequest(id) {

  const r =
    requests.find(
      x => x.id === id
    );

  if (r) {

    r.status = "APPROVED";

    showToast(
      "Request approved"
    );

    requestsPage();
  }
}

/* =========================
   REJECT REQUEST
========================= */

function rejectRequest(id) {

  const r =
    requests.find(
      x => x.id === id
    );

  if (r) {

    r.status = "REJECTED";

    showToast(
      "Request rejected"
    );

    requestsPage();
  }
}

/* =========================
   RECEIVED DONATIONS
========================= */

function receivedDonations() {

  currentPage = "received";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Received Donations
        </h1>

        <p>
          Track medicines received by your organization.
        </p>

      </div>

    </div>

    <div class="card">

      <table>

        <thead>

          <tr>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Date</th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td>
              Paracetamol
            </td>

            <td>
              20
            </td>

            <td>
              <span class="badge approved">
                Received
              </span>
            </td>

            <td>
              20 Sep
            </td>

          </tr>

          <tr>

            <td>
              ORS
            </td>

            <td>
              30
            </td>

            <td>
              <span class="badge approved">
                Received
              </span>
            </td>

            <td>
              18 Sep
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  `);
}

/* =========================
   HOSPITAL REQUEST HISTORY
========================= */

function requestHistory() {

  currentPage = "history";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Request History
        </h1>

        <p>
          View your hospital's previous medicine requests.
        </p>

      </div>

    </div>

    <div class="card">

      ${requestTable()}

    </div>
  `);
}

/* =========================
   ADMIN DONATIONS
========================= */

function donationsPage() {

  currentPage = "donations";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Donations
        </h1>

        <p>
          View medicine donations across the platform.
        </p>

      </div>

    </div>

    <div class="card">

      ${donationTable()}

    </div>

  `);
}

/* =========================
   ADMIN REPORTS
========================= */

function reportsPage() {

  currentPage = "reports";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Reports
        </h1>

        <p>
          Overview of MediBridge platform activity.
        </p>

      </div>

    </div>

    <div class="stats">

      <div class="stat">
        <small>Total Users</small>
        <strong>24</strong>
      </div>

      <div class="stat">
        <small>Medicines</small>
        <strong>
          ${medicines.length + 52}
        </strong>
      </div>

      <div class="stat">
        <small>Requests</small>
        <strong>
          ${requests.length + 12}
        </strong>
      </div>

      <div class="stat">
        <small>Donations</small>
        <strong>36</strong>
      </div>

    </div>

    <div class="card">

      <h2>
        Platform Summary
      </h2>

      <p>
        MediBridge connects medicine donors and pharmacies
        with NGOs and hospitals that need eligible medicines.
      </p>

    </div>
  `);
}

/* =========================
   REWARDS
========================= */

function rewards() {

  currentPage = "rewards";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Reward Points
        </h1>

        <p>
          Track points earned through successful contributions.
        </p>

      </div>

    </div>

    <div class="stats">

      <div class="stat">
        <small>Current Points</small>
        <strong>250</strong>
      </div>

      <div class="stat">
        <small>Donations</small>
        <strong>12</strong>
      </div>

      <div class="stat">
        <small>Successful</small>
        <strong>8</strong>
      </div>

      <div class="stat">
        <small>This Month</small>
        <strong>60</strong>
      </div>

    </div>

    <div class="card">

      <h2>
        Reward History
      </h2>

      <table>

        <thead>

          <tr>
            <th>Reason</th>
            <th>Points</th>
            <th>Date</th>
          </tr>

        </thead>

        <tbody>

          <tr>
            <td>
              Successful donation
            </td>

            <td>
              +20
            </td>

            <td>
              20 Sep
            </td>
          </tr>

          <tr>
            <td>
              Medicine contribution
            </td>

            <td>
              +10
            </td>

            <td>
              18 Sep
            </td>
          </tr>

          <tr>
            <td>
              Successful donation
            </td>

            <td>
              +20
            </td>

            <td>
              15 Sep
            </td>
          </tr>

        </tbody>

      </table>

    </div>
  `);
}

/* =========================
   PROFILE
========================= */

function profile() {

  currentPage = "profile";

  const userName =
    localStorage.getItem("mb_name") ||
    "MediBridge User";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Profile
        </h1>

        <p>
          Manage your MediBridge account.
        </p>

      </div>

    </div>

    <div
      class="card"
      style="max-width:650px">

      <div class="form-group">

        <label>
          Name
        </label>

        <input
          value="${userName}">

      </div>

      <div class="form-group">

        <label>
          Email
        </label>

        <input
          value="demo@medibridge.local">

      </div>

      <div class="form-group">

        <label>
          Role
        </label>

        <input
          value="${roleNames[currentRole] || currentRole}"
          disabled>

      </div>

      <div class="form-group">

        <label>
          Phone
        </label>

        <input
          placeholder="Enter phone number">

      </div>

      ${
        ["NGO", "HOSPITAL", "PHARMACY"]
          .includes(currentRole)

          ? `

            <div class="form-group">

              <label>
                Organization
              </label>

              <input
                placeholder="Organization name">

            </div>

          `

          : ""
      }

      <div class="form-group">

        <label>
          Location
        </label>

        <input
          placeholder="Kolkata">

      </div>

      <button
        class="btn btn-primary"
        onclick="showToast('Profile saved')">

        Save Changes

      </button>

    </div>
  `);
}

/* =========================
   ADMIN DASHBOARD
========================= */

function adminDashboard() {

  currentPage = "dashboard";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Admin Dashboard
        </h1>

        <p>
          Manage users, medicines, requests and platform activity.
        </p>

      </div>

    </div>

    <div class="stats">

      <div class="stat">
        <small>Total Users</small>
        <strong>24</strong>
      </div>

      <div class="stat">
        <small>Donors</small>
        <strong>12</strong>
      </div>

      <div class="stat">
        <small>Pharmacies</small>
        <strong>4</strong>
      </div>

      <div class="stat">
        <small>NGOs</small>
        <strong>8</strong>
      </div>

      <div class="stat">
        <small>Hospitals</small>
        <strong>3</strong>
      </div>

      <div class="stat">
        <small>Medicines</small>
        <strong>
          ${medicines.length + 52}
        </strong>
      </div>

      <div class="stat">
        <small>Donations</small>
        <strong>36</strong>
      </div>

      <div class="stat">
        <small>Pending Requests</small>
        <strong>5</strong>
      </div>

    </div>

    <div class="grid-2">

      <div class="card">

        <h2>
          Pending Requests
        </h2>

        ${requestTable()}

      </div>

      <div class="card">

        <h2>
          Recent Activity
        </h2>

        <p>
          ▣ New medicine donated — Today
        </p>

        <p>
          ✓ Request approved — Yesterday
        </p>

        <p>
          ♙ New NGO registered — 18 Sep
        </p>

        <p>
          ★ Reward points issued — 17 Sep
        </p>

      </div>

    </div>
  `);
}

/* =========================
   ADMIN USERS
========================= */

function users() {

  currentPage = "users";

  shell(`

    <div class="page-head">

      <div>

        <h1>
          Users
        </h1>

        <p>
          Admin view of MediBridge accounts.
        </p>

      </div>

    </div>

    <div class="card">

      <table>

        <thead>

          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td>
              Rahul Sen
            </td>

            <td>
              rahul@example.com
            </td>

            <td>
              Donor
            </td>

            <td>
              <span class="badge available">
                Active
              </span>
            </td>

          </tr>

          <tr>

            <td>
              Helping Hands
            </td>

            <td>
              ngo@example.com
            </td>

            <td>
              NGO
            </td>

            <td>
              <span class="badge available">
                Verified
              </span>
            </td>

          </tr>

          <tr>

            <td>
              MediCare Pharmacy
            </td>

            <td>
              pharmacy@example.com
            </td>

            <td>
              Pharmacy
            </td>

            <td>
              <span class="badge available">
                Active
              </span>
            </td>

          </tr>

          <tr>

            <td>
              City Hospital
            </td>

            <td>
              hospital@example.com
            </td>

            <td>
              Hospital
            </td>

            <td>
              <span class="badge available">
                Active
              </span>
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  `);
}

/* =========================
   LOGOUT
========================= */

function logout() {

  localStorage.removeItem("mb_role");
  localStorage.removeItem("mb_name");

  currentRole = "DONOR";
  currentPage = "dashboard";

  goPublic();
}

/* =========================
   NAVIGATION
========================= */

function navigate(page) {

  currentPage = page;

  if (page === "dashboard") {
    dashboard();
  }

  else if (page === "donate") {
    donate();
  }

  else if (page === "medicines") {
    medicinesPage();
  }

  else if (page === "requests") {
    requestsPage();
  }

  else if (page === "rewards") {
    rewards();
  }

  else if (page === "profile") {
    profile();
  }

  else if (page === "users") {
    users();
  }

  else if (page === "received") {
    receivedDonations();
  }

  else if (page === "history") {
    requestHistory();
  }

  else if (page === "donations") {
    donationsPage();
  }

  else if (page === "reports") {
    reportsPage();
  }
}

/* =========================
   GO PUBLIC
========================= */

function goPublic() {
  home();
}

/* =========================
   TOAST
========================= */

function showToast(msg) {

  const t =
    document.getElementById("toast");

  if (!t) return;

  t.textContent = msg;

  t.classList.add("show");

  setTimeout(
    () => t.classList.remove("show"),
    2200
  );
}

/* =========================
   START APP
========================= */

home();