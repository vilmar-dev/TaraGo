//Tangina nyo wla kayong makukuha dito bwakanang shit
const ADMIN_EMAILS = [
  "ammasivilmar2@gmail.com"
 
];


let currentUser = null;
let isAdmin = false;
let allCommuters = {};      
let allUsers = {};          
let currentView = "feed";   


const authPanel = document.getElementById("authPanel");
const dashboard = document.getElementById("dashboard");
const adminDashboard = document.getElementById("adminDashboard");
const bannedPanel = document.getElementById("bannedPanel");
const authStatus = document.getElementById("authStatus");
const riderCountEl = document.getElementById("riderCount");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const adminForm = document.getElementById("adminForm");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");
const adminError = document.getElementById("adminError");

const adminSearch = document.getElementById("adminSearch");
const adminUserTableBody = document.getElementById("adminUserTableBody");
const statTotalUsers = document.getElementById("statTotalUsers");
const statActiveCommuters = document.getElementById("statActiveCommuters");
const statBannedUsers = document.getElementById("statBannedUsers");

const commuteForm = document.getElementById("commuteForm");
const formHint = document.getElementById("formHint");
const removeMyPostBtn = document.getElementById("removeMyPostBtn");

const pickupSelect = document.getElementById("pickupSelect");
const pickupOther = document.getElementById("pickupOther");
const dropoffSelect = document.getElementById("dropoffSelect");
const dropoffOther = document.getElementById("dropoffOther");

const liveFeed = document.getElementById("liveFeed");
const matchPanel = document.getElementById("matchPanel");

const filterRoute = document.getElementById("filterRoute");
const filterTime = document.getElementById("filterTime");

const contactModal = document.getElementById("contactModal");
const closeModalBtn = document.getElementById("closeModal");

const toastEl = document.getElementById("toast");

// =====================================================
// AUTH TAB SWITCHING (Login / Sign Up)
// =====================================================
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab + "Form").classList.add("active");
  });
});

// =====================================================
// SIGN UP
// =====================================================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name) {
    signupError.textContent = "Please enter a display name.";
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    // Record this signup in users/ so admins can see total registrations
    // even for people who never post a commute.
    await db.ref("users/" + cred.user.uid).set({
      uid: cred.user.uid,
      name: name,
      email: email,
      createdAt: Date.now(),
      banned: false
    });
 
  } catch (err) {
    signupError.textContent = friendlyAuthError(err);
  }
});


loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
  }
});


adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminError.textContent = "";

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!ADMIN_EMAILS.includes(email)) {
    adminError.textContent = "This email is not registered as an administrator.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
   
  } catch (err) {
    adminError.textContent = friendlyAuthError(err);
  }
});

function friendlyAuthError(err) {
  switch (err.code) {
    case "auth/email-already-in-use": return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password should be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Incorrect email or password.";
    default: return err.message || "Something went wrong. Please try again.";
  }
}


auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  if (!user) {
    isAdmin = false;
    authPanel.classList.remove("hidden");
    dashboard.classList.add("hidden");
    adminDashboard.classList.add("hidden");
    bannedPanel.classList.add("hidden");
    authStatus.innerHTML = "";
    stopCommutersListener();
    stopUsersListener();
    return;
  }

  isAdmin = ADMIN_EMAILS.includes(user.email);

  if (isAdmin) {
 
    authPanel.classList.add("hidden");
    bannedPanel.classList.add("hidden");
    dashboard.classList.add("hidden");
    adminDashboard.classList.remove("hidden");

    renderAuthStatus();
    startUsersListener();
    startCommutersListener(); 
    return;
  }

 
  const userSnap = await db.ref("users/" + user.uid).once("value");
  const userRecord = userSnap.val();

  if (userRecord && userRecord.banned) {
    authPanel.classList.add("hidden");
    dashboard.classList.add("hidden");
    adminDashboard.classList.add("hidden");
    bannedPanel.classList.remove("hidden");
    authStatus.innerHTML = "";
    return;
  }

  authPanel.classList.add("hidden");
  adminDashboard.classList.add("hidden");
  bannedPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");

  renderAuthStatus();
  startCommutersListener();
  loadMyExistingPost();
});

document.getElementById("bannedLogoutBtn").addEventListener("click", () => auth.signOut());

function renderAuthStatus() {
  authStatus.innerHTML = `
    <span class="user-chip">
      ${escapeHtml(currentUser.displayName || currentUser.email)}
      ${isAdmin ? '<span class="admin-badge">Admin</span>' : ""}
    </span>
    <button class="btn-text" id="logoutBtn">Log Out</button>
  `;
  document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());
}


pickupSelect.addEventListener("change", () => {
  pickupOther.classList.toggle("hidden", pickupSelect.value !== "Other");
});
dropoffSelect.addEventListener("change", () => {
  dropoffOther.classList.toggle("hidden", dropoffSelect.value !== "Other");
});


let commutersRef = null;

function startCommutersListener() {
  commutersRef = db.ref("commuters");
  commutersRef.on("value", (snapshot) => {
    allCommuters = snapshot.val() || {};
    riderCountEl.textContent = Object.keys(allCommuters).length;
    if (isAdmin) {
      renderAdminDashboard();
    } else {
      renderFeed();
      renderMatches();
    }
  });
}

function stopCommutersListener() {
  if (commutersRef) commutersRef.off();
  allCommuters = {};
}


let usersRef = null;

function startUsersListener() {
  usersRef = db.ref("users");
  usersRef.on("value", (snapshot) => {
    allUsers = snapshot.val() || {};
    renderAdminDashboard();
  });
}

function stopUsersListener() {
  if (usersRef) usersRef.off();
  allUsers = {};
}


commuteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formHint.textContent = "";
  formHint.classList.remove("error");

  const pickup = pickupSelect.value === "Other" ? pickupOther.value.trim() : pickupSelect.value;
  const dropoff = dropoffSelect.value === "Other" ? dropoffOther.value.trim() : dropoffSelect.value;
  const time = document.getElementById("travelTime").value;
  const courseYear = document.getElementById("courseYear").value.trim();
  const contact = document.getElementById("contactInfo").value.trim();

  if (!pickup || !dropoff || !time) {
    formHint.textContent = "Please fill in pickup, drop-off, and travel time.";
    formHint.classList.add("error");
    return;
  }

  const entry = {
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email.split("@")[0],
    courseYear: courseYear || "",
    pickup,
    dropoff,
    time,
    contact: contact || "",
    updatedAt: Date.now()
  };

  try {
    await db.ref("commuters/" + currentUser.uid).set(entry);
    formHint.textContent = "Your commute profile is live!";
    removeMyPostBtn.classList.remove("hidden");
    showToast("Posted! You're now visible to other commuters.");
  } catch (err) {
    formHint.textContent = "Could not post: " + err.message;
    formHint.classList.add("error");
  }
});

removeMyPostBtn.addEventListener("click", async () => {
  await db.ref("commuters/" + currentUser.uid).remove();
  removeMyPostBtn.classList.add("hidden");
  commuteForm.reset();
  pickupOther.classList.add("hidden");
  dropoffOther.classList.add("hidden");
  showToast("Your post has been removed.");
});

function loadMyExistingPost() {
  db.ref("commuters/" + currentUser.uid).once("value", (snap) => {
    const data = snap.val();
    if (data) {
      removeMyPostBtn.classList.remove("hidden");
      document.getElementById("courseYear").value = data.courseYear || "";
      document.getElementById("travelTime").value = data.time || "";
      document.getElementById("contactInfo").value = data.contact || "";
      setSelectOrOther(pickupSelect, pickupOther, data.pickup);
      setSelectOrOther(dropoffSelect, dropoffOther, data.dropoff);
    }
  });
}

function setSelectOrOther(selectEl, otherEl, value) {
  const optionExists = Array.from(selectEl.options).some(o => o.value === value);
  if (optionExists) {
    selectEl.value = value;
    otherEl.classList.add("hidden");
  } else {
    selectEl.value = "Other";
    otherEl.value = value;
    otherEl.classList.remove("hidden");
  }
}


document.querySelectorAll(".view-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view-content").forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    currentView = tab.dataset.view;
    document.getElementById(currentView + "View").classList.add("active");
  });
});


filterRoute.addEventListener("input", renderFeed);
filterTime.addEventListener("change", renderFeed);

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeOfDayBucket(minutes) {
  if (minutes === null) return "";
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
}

function passesFilters(c) {
  const routeQuery = filterRoute.value.trim().toLowerCase();
  const timeBucket = filterTime.value;

  if (routeQuery) {
    const haystack = (c.pickup + " " + c.dropoff).toLowerCase();
    if (!haystack.includes(routeQuery)) return false;
  }
  if (timeBucket) {
    if (timeOfDayBucket(timeToMinutes(c.time)) !== timeBucket) return false;
  }
  return true;
}


function renderFeed() {
  const entries = Object.entries(allCommuters).filter(([uid, c]) => passesFilters(c));

  if (entries.length === 0) {
    liveFeed.innerHTML = `<p class="empty-state">No commuters match right now. Try adjusting filters, or be the first to post!</p>`;
    return;
  }

  // Sort soonest-time first
  entries.sort((a, b) => (timeToMinutes(a[1].time) ?? 9999) - (timeToMinutes(b[1].time) ?? 9999));

  liveFeed.innerHTML = entries.map(([uid, c]) => renderCard(uid, c)).join("");
  attachCardHandlers(liveFeed);
}


function computeMatches() {
  if (!currentUser) return [];
  const me = allCommuters[currentUser.uid];
  if (!me) return [];

  const myTime = timeToMinutes(me.time);
  const results = [];

  for (const [uid, c] of Object.entries(allCommuters)) {
    if (uid === currentUser.uid) continue;

    const sameDropoff = c.dropoff.toLowerCase() === me.dropoff.toLowerCase();
    const samePickup = c.pickup.toLowerCase() === me.pickup.toLowerCase();
    const theirTime = timeToMinutes(c.time);
    const timeDiff = (myTime !== null && theirTime !== null) ? Math.abs(myTime - theirTime) : Infinity;
    const withinTimeWindow = timeDiff <= 30;

    if (!sameDropoff && !samePickup && !withinTimeWindow) continue; 

    
    let score = 0;
    if (sameDropoff) score += 50;
    if (samePickup) score += 35;
    if (withinTimeWindow) score += Math.max(0, 15 - Math.floor(timeDiff / 2)); 

    if (score === 0) continue;

    results.push({ uid, c, score: Math.min(100, score), sameDropoff, samePickup, withinTimeWindow, timeDiff });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function renderMatches() {
  if (!currentUser) return;
  const myPost = allCommuters[currentUser.uid];

  if (!myPost) {
    matchPanel.innerHTML = `<p class="empty-state">Post your commute profile to see your matches here.</p>`;
    return;
  }

  const matches = computeMatches();
  if (matches.length === 0) {
    matchPanel.innerHTML = `<p class="empty-state">No matches yet for your route. Check back as more students post!</p>`;
    return;
  }

  matchPanel.innerHTML = matches.map(m => renderCard(m.uid, m.c, m.score)).join("");
  attachCardHandlers(matchPanel);
}


function renderCard(uid, c, matchScore = null) {
  const isMine = currentUser && uid === currentUser.uid;

  return `
    <div class="commuter-card" data-uid="${uid}" tabindex="0">
      ${matchScore !== null ? `<span class="match-badge">${matchScore}% match</span>` : ""}
      <div class="card-top">
        <div>
          <div class="card-name">
            ${escapeHtml(c.name)} ${isMine ? '<span class="you-tag">You</span>' : ""}
          </div>
          <div class="card-course">${escapeHtml(c.courseYear || "")}</div>
        </div>
      </div>
      <div class="card-route">
        <span class="route-dot"></span>
        <span class="route-label">${escapeHtml(c.pickup)}</span>
        <span class="route-line"></span>
        <span class="route-dot end"></span>
        <span class="route-label">${escapeHtml(c.dropoff)}</span>
      </div>
      <div class="card-time">🕒 ${formatTime(c.time)}</div>
    </div>
  `;
}

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function attachCardHandlers(container) {
  container.querySelectorAll(".commuter-card").forEach(card => {
    card.addEventListener("click", () => openContactModal(card.dataset.uid));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openContactModal(card.dataset.uid);
      }
    });
  });
}


function openContactModal(uid) {
  const c = allCommuters[uid];
  if (!c) return;

  document.getElementById("modalName").textContent = c.name;
  document.getElementById("modalRoute").textContent = `${c.pickup} → ${c.dropoff}`;
  document.getElementById("modalTime").textContent = `Travel time: ${formatTime(c.time)}`;

  const modalContact = document.getElementById("modalContact");
  const modalNote = document.getElementById("modalNote");
  const requestBtn = document.getElementById("requestJoinBtn");

  if (c.contact) {
    modalContact.textContent = `📞 ${c.contact}`;
    modalContact.classList.remove("hidden");
  } else {
    modalContact.textContent = "This student hasn't shared contact info.";
    modalContact.classList.remove("hidden");
  }

  if (uid === currentUser.uid) {
    requestBtn.classList.add("hidden");
    modalNote.textContent = "This is your own post.";
  } else {
    requestBtn.classList.remove("hidden");
    modalNote.textContent = "";
    requestBtn.onclick = () => {
      showToast(`Request sent to ${c.name}! Coordinate via the contact info above.`);
      contactModal.classList.add("hidden");
    };
  }

  contactModal.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", () => contactModal.classList.add("hidden"));
contactModal.addEventListener("click", (e) => {
  if (e.target === contactModal) contactModal.classList.add("hidden");
});


adminSearch.addEventListener("input", renderAdminDashboard);

function renderAdminDashboard() {
  if (!isAdmin) return;

  const userEntries = Object.entries(allUsers);
  const bannedCount = userEntries.filter(([uid, u]) => u.banned).length;
  const activeCommuterCount = Object.keys(allCommuters).length;

  statTotalUsers.textContent = userEntries.length;
  statActiveCommuters.textContent = activeCommuterCount;
  statBannedUsers.textContent = bannedCount;

  const query = adminSearch.value.trim().toLowerCase();
  let filtered = userEntries;
  if (query) {
    filtered = userEntries.filter(([uid, u]) =>
      (u.name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query)
    );
  }


  filtered.sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  if (filtered.length === 0) {
    adminUserTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No users found.</td></tr>`;
    return;
  }

  adminUserTableBody.innerHTML = filtered.map(([uid, u]) => {
    const banned = !!u.banned;
    const hasPost = !!allCommuters[uid];
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—";

    return `
      <tr data-uid="${uid}">
        <td>${escapeHtml(u.name || "—")}</td>
        <td>${escapeHtml(u.email || "—")}</td>
        <td>${joined}</td>
        <td><span class="status-pill ${banned ? "banned" : "active"}">${banned ? "Banned" : "Active"}</span></td>
        <td>${hasPost ? "Yes" : "No"}</td>
        <td class="admin-actions">
          ${banned
            ? `<button class="admin-btn unban" data-action="unban" data-uid="${uid}">Unban</button>`
            : `<button class="admin-btn ban" data-action="ban" data-uid="${uid}">Ban &amp; Remove</button>`
          }
          ${hasPost ? `<button class="admin-btn remove-post" data-action="remove-post" data-uid="${uid}">Remove Post Only</button>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  adminUserTableBody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => handleAdminAction(btn.dataset.action, btn.dataset.uid));
  });
}

async function handleAdminAction(action, uid) {
  const u = allUsers[uid];
  if (!u) return;

  if (action === "ban") {
    const ok = confirm(
      `Ban "${u.name || u.email}"?\n\nThis will:\n- Remove their commute post (if any)\n- Block them from logging in or posting again\n\nNote: this does not delete their Firebase Auth account (that requires server-side access), but it fully disables their access to the app.`
    );
    if (!ok) return;
    await db.ref("users/" + uid + "/banned").set(true);
    await db.ref("commuters/" + uid).remove();
    showToast(`${u.name || u.email} has been banned and removed.`);
  }

  if (action === "unban") {
    await db.ref("users/" + uid + "/banned").set(false);
    showToast(`${u.name || u.email} has been unbanned.`);
  }

  if (action === "remove-post") {
    await db.ref("commuters/" + uid).remove();
    showToast(`${u.name || u.email}'s commute post was removed.`);
  }
}


let toastTimeout = null;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.classList.remove("hidden");
  requestAnimationFrame(() => toastEl.classList.add("show"));

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, 3000);
}


function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
