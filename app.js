const app = document.getElementById("app");

const medicines = [
  {id:1,name:"Paracetamol",category:"Pain Relief",qty:100,expiry:"2027-05-20",location:"Kolkata",status:"AVAILABLE",donor:"Rahul Sen"},
  {id:2,name:"Amoxicillin",category:"Antibiotic",qty:200,expiry:"2026-12-10",location:"Howrah",status:"AVAILABLE",donor:"MediCare Pharmacy"},
  {id:3,name:"Crocin",category:"Pain Relief",qty:50,expiry:"2027-01-15",location:"Kolkata",status:"REQUESTED",donor:"Ananya Roy"},
  {id:4,name:"ORS",category:"Hydration",qty:80,expiry:"2027-09-01",location:"Salt Lake",status:"AVAILABLE",donor:"Green Pharmacy"}
];

const requests = [
  {id:1,medicine:"Paracetamol",ngo:"Helping Hands",qty:20,status:"APPROVED",date:"20 Sep 2026"},
  {id:2,medicine:"Crocin",ngo:"Care NGO",qty:10,status:"PENDING",date:"18 Sep 2026"},
  {id:3,medicine:"Amoxicillin",ngo:"Health First",qty:50,status:"REJECTED",date:"15 Sep 2026"}
];

const savedUser = JSON.parse(localStorage.getItem("mb_user"));

let currentRole = savedUser ? savedUser.role : null;let currentPage = "dashboard";

function navPublic() {
  return `<nav class="navbar">
    <div class="brand"><div class="brand-mark">♥</div><span>MediBridge</span></div>
    <div class="navlinks">
      <a onclick="goPublic()">Home</a><a onclick="goPublic()">About</a><a onclick="showToast('How MediBridge works')">How It Works</a><a onclick="showToast('Contact: team@medibridge.demo')">Contact</a>
    </div>
    <div class="nav-actions"><button class="btn btn-outline" onclick="showAuth('login')">Login</button><button class="btn btn-primary" onclick="showAuth('register')">Register</button></div>
  </nav>`;
}

function home() {
  app.innerHTML = navPublic() + `<main>
    <section class="hero">
      <div>
        <h1>Connecting<br>Medicines <span>to People in Need</span></h1>
        <p>MediBridge connects donors, pharmacies and NGOs so unused medicines can reach communities that need them — while reducing medicine waste.</p>
        <div class="hero-actions"><button class="btn btn-primary" onclick="showAuth('register')">Get Started</button><button class="btn btn-outline" onclick="document.querySelector('.features').scrollIntoView({behavior:'smooth'})">Learn More</button></div>
      </div>
      <div class="hero-visual"><div class="heart-card"><div class="heart"></div><div class="float one">✓ Verified donation</div><div class="float two">+20 reward points</div></div></div>
    </section>
    <section class="features">
      <div class="section-title"><h2>A simple bridge between supply and need</h2><p>The foundation is designed so advanced features can be added later.</p></div>
      <div class="feature-grid">
        <div class="feature-card"><div class="icon">♙</div><h3>Reduce Waste</h3><p>Give unused, eligible medicines a path to communities instead of letting them go unused.</p></div>
        <div class="feature-card"><div class="icon">♥</div><h3>Support Communities</h3><p>Help NGOs discover available medicine inventory and request what they need.</p></div>
        <div class="feature-card"><div class="icon">★</div><h3>Earn Rewards</h3><p>Track contribution points and build a transparent donor reward history.</p></div>
        <div class="feature-card"><div class="icon">♧</div><h3>Built to Grow</h3><p>Verification, notifications, location matching and AI can be added on top of this core.</p></div>
      </div>
    </section>
  </main>
  <footer class="footer">© 2026 MediBridge · College Project MVP</footer>`;
}

function showAuth(mode) {
  app.innerHTML = navPublic() + `<div class="auth-wrap"><div class="auth-card">
    <h1>${mode === "login" ? "Welcome Back" : "Create your account"}</h1>
    <p>${mode === "login" ? "Login to your MediBridge account." : "Start contributing to MediBridge."}</p>
    ${mode === "register" ? `<div class="form-group"><label>Name</label><input id="authName" placeholder="Your name"></div>
      <div class="form-group"><label>Account Type</label><select id="authRole"><option value="DONOR">Donor</option><option value="NGO">NGO</option><option value="PHARMACY">Pharmacy</option><option value="HOSPITAL">Medical Centre</option></select></div>` : ""}
    <div class="form-group"><label>Email</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
    <div class="form-group"><label>Password</label><input id="authPassword" type="password" placeholder="••••••••"></div>
    <button class="btn btn-primary" style="width:100%" onclick="${mode === "login" ? "loginUser()" : "registerUser()"}">
      ${mode === "login" ? "Login" : "Create Account"}
    </button>
    <p style="text-align:center;margin:18px 0 0">Demo project — authentication is simulated locally.</p>
  </div></div>`;
}

async function registerUser() {
  const name = document.getElementById("authName").value;
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  const role = document.getElementById("authRole").value;

  try {
    const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || "Registration failed");
      return;
    }

    showToast("Account created successfully!");

    console.log("Registered user:", data.user);

    // Go to login
    setTimeout(() => {
      showAuth("login");
    }, 1000);

  } catch (error) {
    console.error(error);
    showToast("Could not connect to server");
  }
}

async function loginUser() {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || "Login failed");
      return;
    }

    // Save JWT
    localStorage.setItem("mb_token", data.token);

    // Save user information
    localStorage.setItem("mb_user", JSON.stringify(data.user));

    currentRole = data.user.role;
    localStorage.setItem("mb_role", data.user.role);

    showToast("Login successful!");

    setTimeout(() => {
      dashboard();
    }, 500);

  } catch (error) {
    console.error(error);
    showToast("Could not connect to server");
  }
}

function shell(content) {
  const nav = currentRole === "DONOR" ? [
    ["dashboard","▦","Dashboard"],["donate","＋","Donate Medicine"],["medicines","▣","Available Medicines"],["requests","◷","My Requests"],["rewards","★","Reward Points"],["profile","♙","Profile"]
  ] : currentRole === "NGO" ? [
    ["dashboard","▦","Dashboard"],["medicines","▣","Available Medicines"],["requests","◷","My Requests"],["profile","♙","Profile"]
  ] : [
    ["dashboard","▦","Dashboard"],["medicines","▣","All Medicines"],["requests","◷","All Requests"],["users","♙","Manage Users"],["rewards","★","Rewards"]
  ];
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar"><div class="brand"><div class="brand-mark">♥</div><span>MediBridge</span></div>
      <div class="side-nav">${nav.map(([id,ic,label])=>`<button class="${currentPage===id?'active':''}" onclick="navigate('${id}')">${ic} <span>${label}</span></button>`).join("")}
      <button onclick="goPublic()">↩ <span>Log out</span></button></div>
    </aside>
<div class="main">
    <div class="topbar">
        <div class="user-pill">
            <div class="avatar">${currentRole[0]}</div>
            ${currentRole}
        </div>
    </div>    <div class="content">${content}</div></div></div><div class="toast" id="toast"></div>`;
}

function dashboard() {

    currentPage = "dashboard";

    const isNgo = currentRole === "NGO";
    const isAdmin = currentRole === "ADMIN";
    const isPharmacy = currentRole === "PHARMACY";
    const isHospital = currentRole === "HOSPITAL";
    const isDonor = currentRole === "DONOR";

    if (isAdmin) return adminDashboard();

    let title;
    let description;
    let buttonText;
    let buttonPage;
    let stat1;
    let stat2;
    let stat3;
    let stat4;
    let recentTitle;
    let impactTitle;

    if (isNgo) {
        title = "NGO Dashboard";
        description = "Find and request medicines for your community.";
        buttonText = "Browse Medicines";
        buttonPage = "medicines";

        stat1 = "Total Requests";
        stat2 = "Approved";
        stat3 = "Pending";
        stat4 = "Received";

        recentTitle = "Recent Requests";
        impactTitle = "Community Impact";

    } else if (isPharmacy) {
        title = "Pharmacy Dashboard";
        description = "Manage your medicines and donations.";
        buttonText = "+ Add Medicine";
        buttonPage = "medicines";

        stat1 = "Medicines Listed";
        stat2 = "Pending Donations";
        stat3 = "Completed";
        stat4 = "Reward Points";

        recentTitle = "Recent Medicines";
        impactTitle = "Pharmacy Impact";

    } else if (isHospital) {
        title = "Hospital Dashboard";
        description = "Request and manage medicines for your patients.";
        buttonText = "Request Medicine";
        buttonPage = "requests";

        stat1 = "Total Requests";
        stat2 = "Approved";
        stat3 = "Pending";
        stat4 = "Received";

        recentTitle = "Recent Requests";
        impactTitle = "Hospital Impact";

    } else {
        title = "Donor Dashboard";
        description = "Welcome back. Here is an overview of your contributions.";
        buttonText = "+ Donate Medicine";
        buttonPage = "donate";

        stat1 = "Total Donations";
        stat2 = "Pending Requests";
        stat3 = "Completed";
        stat4 = "Reward Points";

        recentTitle = "Recent Donations";
        impactTitle = "Your Impact";
    }

    shell(`
        <div class="page-head">
            <div>
                <h1>${title}</h1>
                <p>${description}</p>
            </div>

            <button class="btn btn-primary"
                onclick="navigate('${buttonPage}')">
                ${buttonText}
            </button>
        </div>

        <div class="stats">

            <div class="stat">
                <small>${stat1}</small>
                <strong>12</strong>
            </div>

            <div class="stat">
                <small>${stat2}</small>
                <strong>3</strong>
            </div>

            <div class="stat">
                <small>${stat3}</small>
                <strong>8</strong>
            </div>

            <div class="stat">
                <small>${stat4}</small>
                <strong>250</strong>
            </div>

        </div>

        <div class="grid-2">

            <div class="card">
                <h2>${recentTitle}</h2>
                ${isNgo || isHospital ? requestTable() : donationTable()}
            </div>

            <div class="card">
                <h2>${impactTitle}</h2>

                <div style="display:grid;gap:15px">

                    <div>
                        <b>♧</b>
                        Medicines donated
                        <strong style="float:right">450 units</strong>
                    </div>

                    <div>
                        <b>♥</b>
                        People helped
                        <strong style="float:right">~120</strong>
                    </div>

                    <div>
                        <b>♲</b>
                        Waste reduced
                        <strong style="float:right">~12 kg</strong>
                    </div>

                </div>
            </div>

        </div>
    `);
}

function donationTable(){ return `<table><thead><tr><th>Medicine</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead><tbody>
<tr><td>Paracetamol</td><td>100</td><td><span class="badge available">Available</span></td><td>20 Sep</td></tr>
<tr><td>Crocin</td><td>50</td><td><span class="badge requested">Requested</span></td><td>18 Sep</td></tr>
<tr><td>Amoxicillin</td><td>200</td><td><span class="badge allocated">Allocated</span></td><td>15 Sep</td></tr>
</tbody></table>`; }

function requestTable(){ return `<table><thead><tr><th>Medicine</th><th>NGO</th><th>Qty</th><th>Status</th></tr></thead><tbody>
${requests.map(r=>`<tr><td>${r.medicine}</td><td>${r.ngo}</td><td>${r.qty}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("")}
</tbody></table>`; }

function donate() {
  currentPage="donate";
  shell(`<div class="page-head"><div><h1>Donate Medicine</h1><p>Add details of the medicine you want to donate.</p></div></div>
  <div class="card" style="max-width:760px"><form onsubmit="addMedicine(event)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
      <div class="form-group"><label>Medicine Name *</label><input id="mName" required placeholder="e.g. Paracetamol"></div>
      <div class="form-group"><label>Category *</label><select id="mCat"><option>Pain Relief</option><option>Antibiotic</option><option>Hydration</option><option>Other</option></select></div>
      <div class="form-group"><label>Quantity *</label><input id="mQty" type="number" min="1" required placeholder="100"></div>
      <div class="form-group"><label>Expiry Date *</label><input id="mExpiry" type="date" required></div>
    </div>
    <div class="form-group"><label>Location *</label><input id="mLocation" required placeholder="Kolkata"></div>
    <div class="form-group"><label>Description</label><textarea id="mDesc" placeholder="Packaging or other useful information"></textarea></div>
    <button class="btn btn-primary">Add Medicine</button>
  </form></div>`);
}

function addMedicine(e){
  e.preventDefault();
  medicines.unshift({id:Date.now(),name:mName.value,category:mCat.value,qty:Number(mQty.value),expiry:mExpiry.value,location:mLocation.value,status:"AVAILABLE",donor:"Current User"});
  showToast("Medicine added successfully");
  setTimeout(()=>navigate("medicines"),500);
}

function medicinesPage(){
  currentPage="medicines";
  shell(`<div class="page-head"><div><h1>Available Medicines</h1><p>Browse medicine inventory and request what your community needs.</p></div></div>
  <div class="toolbar"><input id="search" oninput="filterMedicines()" placeholder="Search medicines..."><select id="cat" onchange="filterMedicines()"><option>All Categories</option><option>Pain Relief</option><option>Antibiotic</option><option>Hydration</option></select><select id="status" onchange="filterMedicines()"><option>Available</option><option>All</option></select><button class="btn btn-primary" onclick="filterMedicines()">Search</button></div>
  <div id="medicineGrid" class="medicine-grid"></div>`);
  renderMedicines();
}

function renderMedicines(){
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  const cat=document.getElementById("cat")?.value||"All Categories";
  const st=document.getElementById("status")?.value||"Available";
  const data=medicines.filter(m=>(!q||m.name.toLowerCase().includes(q))&&(cat==="All Categories"||m.category===cat)&&(st==="All"||m.status==="AVAILABLE"));
  document.getElementById("medicineGrid").innerHTML=data.map(m=>`<div class="card medicine-card">
    <div class="medicine-icon">💊</div><h3>${m.name}</h3><div class="medicine-meta">Category: ${m.category}<br>Quantity: ${m.qty} units<br>Expiry: ${m.expiry}<br>Location: ${m.location}</div>
    <div style="margin:12px 0"><span class="badge ${m.status.toLowerCase()}">${m.status}</span></div>
    <button class="btn btn-primary btn-small" onclick="requestMedicine(${m.id})">${currentRole==="NGO"?"Request Medicine":"View Details"}</button>
  </div>`).join("") || `<div class="empty">No medicines found.</div>`;
}
function filterMedicines(){renderMedicines();}

function requestMedicine(id){
  const m=medicines.find(x=>x.id===id);
  if(currentRole!=="NGO"){showToast(`${m.name}: available for NGO requests`);return;}
  m.status="REQUESTED"; requests.unshift({id:Date.now(),medicine:m.name,ngo:"Current NGO",qty:10,status:"PENDING",date:"Today"});
  showToast("Request submitted");
  setTimeout(()=>navigate("requests"),500);
}

function requestsPage(){
  currentPage="requests";
  const admin=currentRole==="ADMIN";
  shell(`<div class="page-head"><div><h1>${admin?"All Requests":"My Requests"}</h1><p>${admin?"Review and manage medicine allocation requests.":"Track the status of your medicine requests."}</p></div></div>
  <div class="card">${admin?`<table><thead><tr><th>Medicine</th><th>NGO</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>${requests.map(r=>`<tr><td>${r.medicine}</td><td>${r.ngo}</td><td>${r.qty}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td><td>${r.status==="PENDING"?`<button class="btn btn-small btn-primary" onclick="approveRequest(${r.id})">Approve</button> <button class="btn btn-small btn-danger" onclick="rejectRequest(${r.id})">Reject</button>`:"—"}</td></tr>`).join("")}</tbody></table>`:requestTable()}</div>`);
}
function approveRequest(id){const r=requests.find(x=>x.id===id);if(r){r.status="APPROVED";showToast("Request approved");requestsPage();}}
function rejectRequest(id){const r=requests.find(x=>x.id===id);if(r){r.status="REJECTED";showToast("Request rejected");requestsPage();}}

function rewards(){
  currentPage="rewards";
  shell(`<div class="page-head"><div><h1>Reward Points</h1><p>Track points earned through successful contributions.</p></div></div>
  <div class="stats"><div class="stat"><small>Current Points</small><strong>250</strong></div><div class="stat"><small>Donations</small><strong>12</strong></div><div class="stat"><small>Successful</small><strong>8</strong></div><div class="stat"><small>This Month</small><strong>60</strong></div></div>
  <div class="card"><h2>Reward History</h2><table><thead><tr><th>Reason</th><th>Points</th><th>Date</th></tr></thead><tbody><tr><td>Successful donation</td><td>+20</td><td>20 Sep</td></tr><tr><td>Medicine contribution</td><td>+10</td><td>18 Sep</td></tr><tr><td>Successful donation</td><td>+20</td><td>15 Sep</td></tr></tbody></table></div>`);
}

function profile(){
  currentPage="profile"; shell(`<div class="page-head"><div><h1>Profile</h1><p>Manage your MediBridge account.</p></div></div><div class="card" style="max-width:650px"><div class="form-group"><label>Name</label><input value="${currentRole==="NGO"?"Helping Hands":"MediBridge User"}"></div><div class="form-group"><label>Email</label><input value="demo@medibridge.local"></div><div class="form-group"><label>Role</label><input value="${currentRole}" disabled></div><button class="btn btn-primary" onclick="showToast('Profile saved')">Save Changes</button></div>`);
}

function adminDashboard(){
  currentPage="dashboard";
  shell(`<div class="page-head"><div><h1>Admin Dashboard</h1><p>Manage users, medicines, requests and platform activity.</p></div></div>
  <div class="stats"><div class="stat"><small>Total Users</small><strong>24</strong></div><div class="stat"><small>Donors</small><strong>12</strong></div><div class="stat"><small>NGOs</small><strong>8</strong></div><div class="stat"><small>Medicines</small><strong>${medicines.length+52}</strong></div></div>
  <div class="grid-2"><div class="card"><h2>Pending Requests</h2>${requestTable()}</div><div class="card"><h2>Recent Activity</h2><p>▣ New medicine donated — Today</p><p>✓ Request approved — Yesterday</p><p>♙ New NGO registered — 18 Sep</p><p>★ Reward points issued — 17 Sep</p></div></div>`);
}

function users(){currentPage="users";shell(`<div class="page-head"><div><h1>Manage Users</h1><p>Admin view of MediBridge accounts.</p></div></div><div class="card"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody><tr><td>Rahul Sen</td><td>Donor</td><td><span class="badge available">Active</span></td></tr><tr><td>Helping Hands</td><td>NGO</td><td><span class="badge available">Verified</span></td></tr><tr><td>MediCare Pharmacy</td><td>Pharmacy</td><td><span class="badge available">Active</span></td></tr></tbody></table></div>`);}

//function switchRole(role){currentRole=role;localStorage.setItem("mb_role",role);navigate("dashboard");}
function navigate(page){
  currentPage=page;
  if(page==="dashboard")dashboard();
  else if(page==="donate")donate();
  else if(page==="medicines")medicinesPage();
  else if(page==="requests")requestsPage();
  else if(page==="rewards")rewards();
  else if(page==="profile")profile();
  else if(page==="users")users();
}
function goPublic(){home();}
function showToast(msg){const t=document.getElementById("toast");if(!t)return; t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}

home();