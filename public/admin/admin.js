const ADMIN_USER = "admin";
const ADMIN_PASS = "refuge2024";

let reservations = [];
let rooms = [];
let events = [];
let services = [];
let settings = { currency: "EUR", currencySymbol: "EUR" };
let clients = [];
let pets = [];
let currentView = "dashboard";

// AUTH
function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem("adminAuth", "1");
    showSplashThenApp();
  } else {
    document.getElementById("loginError").textContent = "Identifiants incorrects";
  }
}
function handleLogout() { sessionStorage.removeItem("adminAuth"); location.reload(); }
function showApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  attachNavListeners();
  loadAllData().then(() => loadView("dashboard"));
}
function toggleSidebar() { document.querySelector(".sidebar").classList.toggle("active"); }

// DATA
async function loadAllData() {
  try {
    const [r, s, rm, ev, sv, cl, pt] = await Promise.all([
      fetch("/api/reservations").then(x => x.json()),
      fetch("/api/settings").then(x => x.json()),
      fetch("/api/rooms").then(x => x.json()),
      fetch("/api/events").then(x => x.json()),
      fetch("/api/services").then(x => x.json()),
      fetch("/api/clients").then(x => x.json()).catch(() => []),
      fetch("/api/pets").then(x => x.json()).catch(() => [])
    ]);
    reservations = Array.isArray(r) ? r : [];
    settings = s || settings;
    rooms = Array.isArray(rm) ? rm : [];
    events = Array.isArray(ev) ? ev : [];
    services = Array.isArray(sv) ? sv : [];
    clients = Array.isArray(cl) ? cl : [];
    pets = Array.isArray(pt) ? pt : [];
    updateBadges();
    if (currentView) loadView(currentView);
  } catch (e) { console.error(e); showToast("Erreur de chargement", "error"); }
}
function updateBadges() {
  const p = reservations.filter(r => r.status === "pending").length;
  const b = document.getElementById("pendingBadge");
  if (b) b.textContent = p;
}

// NAV
function attachNavListeners() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = function() {
      const v = this.getAttribute("data-view");
      if (v) { loadView(v); if (window.innerWidth < 992) toggleSidebar(); }
    };
  });
}
function loadView(view) {
  currentView = view;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const nav = document.querySelector('[data-view="' + view + '"]');
  if (nav) nav.classList.add("active");
  const titles = { dashboard:"Tableau de bord", reservations:"Reservations", calendar:"Calendrier", rooms:"Chambres", services:"Services", clients:"Clients", pets:"Animaux", finances:"Finances", settings:"Parametres" };
  document.getElementById("pageTitle").textContent = titles[view] || view;
  const R = { dashboard:renderDashboard, reservations:renderReservations, calendar:renderCalendar, rooms:renderRooms, services:renderServices, clients:renderClients, pets:renderPets, finances:renderFinances, settings:renderSettings };
  document.getElementById("content").innerHTML = R[view] ? R[view]() : "<div class='card'>404</div>";
  window.scrollTo(0, 0);
}

// HELPERS
const CS = () => settings.currencySymbol || "EUR";
const getServicePrice = (key) => { const s = services.find(x => x.key === key); return s ? s.price : 0; };
const price = (v) => (v || 0) + " " + CS();
function serviceName(key) {
  const s = services.find(x => x.key === key);
  return s ? (s.icon + " " + s.name) : (key || "-");
}
function statusBadge(s) {
  const l = { pending:"En attente", confirmed:"Confirmee", completed:"Terminee", cancelled:"Annulee" };
  const icons = { pending:"&#9203;", confirmed:"&#9989;", completed:"&#127942;", cancelled:"&#10060;" };
  return '<span class="badge badge-' + (s || 'pending') + '">' + (icons[s]||"&#9203;") + ' ' + (l[s] || "En attente") + '</span>';
}
function formatDate(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); } catch(e) { return "-"; }
}
function formatDateShort(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }); } catch(e) { return "-"; }
}
function emptyState(icon, title, desc) {
  return '<div class="empty"><div class="empty-icon">' + icon + '</div><div class="empty-title">' + title + '</div><div>' + (desc || "") + '</div></div>';
}
function showToast(msg, type) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + (type || "");
  setTimeout(() => { t.className = "toast"; }, 3000);
}
function openModal(html) {
  document.getElementById("modalContent").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
  document.body.style.overflow = "";
}
function statCard(color, icon, value, label) {
  return '<div class="stat-card ' + color + '"><div class="stat-header"><div class="stat-icon-lg">' + icon + '</div></div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
}
function esc(str) { return (str||"").replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ================================================
// ROOM AVAILABILITY HELPERS
// ================================================
function getAvailableRoomsForDate(dateStr) {
  // Check room-level blocks
  return rooms.filter(r => {
    if (r.status === "maintenance" || r.status === "unavailable") return false;
    const blocked = r.blockedDates || [];
    const isBlocked = blocked.some(b => dateStr >= b.from && dateStr <= b.to);
    return !isBlocked;
  });
}

function getDayAvailability(dateStr) {
  const total = rooms.length;
  if (total === 0) return { status: "empty", available: 0, total: 0, percent: 0 };
  const fullEvent = events.find(e => e.date === dateStr && e.fullDay);
  if (fullEvent) return { status: "full", available: 0, total, percent: 0 };
  const available = getAvailableRoomsForDate(dateStr).length;
  const percent = Math.round((available / total) * 100);
  if (available === 0) return { status: "full", available: 0, total, percent: 0 };
  if (available === total) return { status: "available", available, total, percent: 100 };
  return { status: "partial", available, total, percent };
}

function getRoomStatus(room) {
  const today = new Date().toISOString().split("T")[0];
  const blocked = room.blockedDates || [];
  const isBlockedToday = blocked.some(b => today >= b.from && today <= b.to);
  if (room.status === "maintenance") return "maintenance";
  if (room.status === "unavailable") return "unavailable";
  if (isBlockedToday || room.occupied) return "occupied";
  return "available";
}

function getRoomStatusLabel(status) {
  const labels = { available:"&#9989; Disponible", occupied:"&#128054; Occupee", maintenance:"&#128295; Maintenance", unavailable:"&#128683; Indisponible" };
  return labels[status] || labels.available;
}
function getRoomStatusClass(status) {
  return "badge-" + (status || "available");
}
function getRoomSchedule(room) {
  const today = new Date().toISOString().split("T")[0];
  return (room.blockedDates || []).filter(b => b.to >= today).sort((a,b) => a.from.localeCompare(b.from));
}

// ================================================
// DASHBOARD
// ================================================
function renderDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const todayCount = reservations.filter(r => r.createdAt && r.createdAt.startsWith(today)).length;
  const pending = reservations.filter(r => r.status === "pending").length;
  const dayAvail = getDayAvailability(today);
  const revenue = reservations.filter(r => r.status !== "cancelled").reduce((s,r) => s + getServicePrice(r.service), 0);
  const recent = reservations.slice().reverse().slice(0, 5);

  let h = '<div class="stats-grid">';
  h += statCard("orange", "&#128197;", todayCount, "Reservations aujourd'hui");
  h += statCard("blue", "&#9203;", pending, "En attente");
  h += statCard("green", "&#127968;", dayAvail.available + "/" + dayAvail.total, "Chambres disponibles");
  h += statCard("purple", "&#128176;", revenue + " " + CS(), "Revenu estime");
  h += '</div>';

  // Room status overview
  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#127968; Etat des chambres</h3><button class="btn btn-secondary btn-sm" onclick="loadView(\'rooms\')">Gerer &#8594;</button></div>';
  if (rooms.length) {
    h += '<div class="room-status-overview">';
    rooms.forEach(r => {
      const st = getRoomStatus(r);
      h += '<div class="room-status-chip ' + st + '">';
      h += '<strong>' + r.name + '</strong>';
      h += '<span class="room-chip-badge ' + getRoomStatusClass(st) + '">' + getRoomStatusLabel(st) + '</span>';
      if (r.occupied && r.occupantName) h += '<small>&#128054; ' + r.occupantName + '</small>';
      h += '</div>';
    });
    h += '</div>';
  }
  h += '</div>';

  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#128203; Reservations recentes</h3><button class="btn btn-secondary btn-sm" onclick="loadView(\'reservations\')">Voir tout &#8594;</button></div>';
  h += recent.length ? resTable(recent, false) : emptyState("&#128203;", "Aucune reservation");
  h += '</div>';
  return h;
}

function resTable(items, withActions) {
  let h = '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Client</th><th>Animal</th><th>Service</th><th>Prix</th><th>Statut</th>';
  if (withActions) h += '<th>Actions</th>';
  h += '</tr></thead><tbody>';
  items.forEach(r => {
    h += '<tr><td>' + formatDate(r.createdAt) + '</td>';
    h += '<td><strong>' + (r.name || "-") + '</strong><br><span style="font-size:0.8rem;color:#8c7a3b">' + (r.email || "") + '</span></td>';
    h += '<td>&#128054; ' + (r.petName || "-") + '</td>';
    h += '<td>' + serviceName(r.service) + '</td>';
    h += '<td><strong>' + price(getServicePrice(r.service)) + '</strong></td>';
    h += '<td>' + statusBadge(r.status) + '</td>';
    if (withActions) {
      h += '<td><div style="display:flex;gap:5px;flex-wrap:wrap">';
      h += '<button class="btn btn-secondary btn-sm" onclick="viewRes(\'' + r.id + '\')">&#128065;</button>';
      if (r.status === "pending") h += '<button class="btn btn-success btn-sm" onclick="updateRes(\'' + r.id + '\',\'confirmed\')">&#10004;</button>';
      if (r.status === "confirmed") h += '<button class="btn btn-primary btn-sm" onclick="updateRes(\'' + r.id + '\',\'completed\')">&#127942;</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="deleteRes(\'' + r.id + '\')">&#128465;</button>';
      h += '</div></td>';
    }
    h += '</tr>';
  });
  return h + '</tbody></table></div>';
}

// ================================================
// RESERVATIONS
// ================================================
let resFilter = "all";
function renderReservations() {
  const f = resFilter === "all" ? reservations : reservations.filter(r => r.status === resFilter);
  const c = { all: reservations.length, pending: reservations.filter(r=>r.status==='pending').length, confirmed: reservations.filter(r=>r.status==='confirmed').length, completed: reservations.filter(r=>r.status==='completed').length };
  let h = '<div class="filters">';
  h += '<div class="filter-chip ' + (resFilter==='all'?'active':'') + '" onclick="setResFilter(\'all\')">Toutes (' + c.all + ')</div>';
  h += '<div class="filter-chip ' + (resFilter==='pending'?'active':'') + '" onclick="setResFilter(\'pending\')">&#9203; En attente (' + c.pending + ')</div>';
  h += '<div class="filter-chip ' + (resFilter==='confirmed'?'active':'') + '" onclick="setResFilter(\'confirmed\')">&#9989; Confirmees (' + c.confirmed + ')</div>';
  h += '<div class="filter-chip ' + (resFilter==='completed'?'active':'') + '" onclick="setResFilter(\'completed\')">&#127942; Terminees (' + c.completed + ')</div>';
  h += '</div><div class="card">';
  h += f.length ? resTable(f.slice().reverse(), true) : emptyState("&#128203;", "Aucune reservation");
  h += '</div>';
  return h;
}
function setResFilter(f) { resFilter = f; loadView("reservations"); }
function viewRes(id) {
  const r = reservations.find(x => x.id === id); if (!r) return;
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button><h2>&#128203; Details</h2>';
  h += '<div class="detail-row"><span class="detail-label">Client:</span><span class="detail-value">' + r.name + '</span></div>';
  h += '<div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">' + r.email + '</span></div>';
  h += '<div class="detail-row"><span class="detail-label">Telephone:</span><span class="detail-value">' + (r.phone || "-") + '</span></div>';
  h += '<div class="detail-row"><span class="detail-label">Animal:</span><span class="detail-value">&#128054; ' + (r.petName || "-") + '</span></div>';
  h += '<div class="detail-row"><span class="detail-label">Service:</span><span class="detail-value">' + serviceName(r.service) + '</span></div>';
  h += '<div class="detail-row"><span class="detail-label">Prix:</span><span class="detail-value"><strong>' + price(getServicePrice(r.service)) + '</strong></span></div>';
  h += '<div class="detail-row"><span class="detail-label">Statut:</span><span class="detail-value">' + statusBadge(r.status) + '</span></div>';
  if (r.message) h += '<div style="margin-top:15px"><strong>Message:</strong><p style="margin-top:8px;padding:12px;background:#f7f3e8;border-radius:10px">' + r.message + '</p></div>';
  h += '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">';
  h += '<a href="mailto:' + r.email + '" class="btn btn-primary">&#128231; Email</a>';
  if (r.phone) h += '<a href="tel:' + r.phone + '" class="btn btn-success">&#128222; Appeler</a>';
  h += '<button class="btn btn-secondary" onclick="closeModal()">Fermer</button></div>';
  openModal(h);
}
async function updateRes(id, status) {
  await fetch("/api/reservations/" + id, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
  await loadAllData(); showToast("Statut mis a jour", "success");
}
async function deleteRes(id) {
  if (!confirm("Supprimer ?")) return;
  await fetch("/api/reservations/" + id, { method:"DELETE" });
  await loadAllData(); showToast("Supprimee", "success");
}

// ================================================
// CALENDAR - Green/Yellow/Red with room counts
// ================================================
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function renderCalendar() {
  const months = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  const dayNames = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  let cells = "";
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-day other-month"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = calYear + "-" + String(calMonth+1).padStart(2,'0') + "-" + String(d).padStart(2,'0');
    const avail = getDayAvailability(dateStr);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;

    let dayClass = "cal-day";
    if (isToday) dayClass += " cal-today";
    if (isPast) dayClass += " cal-past";

    // Color class based on availability
    if (avail.status === "full") dayClass += " cal-full";
    else if (avail.status === "partial") dayClass += " cal-partial";
    else if (avail.status === "available") dayClass += " cal-available";
    else dayClass += " cal-empty-day";

    cells += '<div class="' + dayClass + '" onclick="openDayModal(\'' + dateStr + '\')" title="' + avail.available + '/' + avail.total + ' chambres disponibles">';
    cells += '<div class="cal-day-num">' + d + '</div>';

    // Availability indicator
    if (rooms.length > 0) {
      if (avail.status === "full") {
        cells += '<div class="cal-avail-badge cal-badge-full">&#128683; 0</div>';
      } else if (avail.status === "partial") {
        cells += '<div class="cal-avail-badge cal-badge-partial">&#9888; ' + avail.available + '</div>';
      } else {
        cells += '<div class="cal-avail-badge cal-badge-available">&#9989; ' + avail.available + '</div>';
      }
    }

    // Custom events
    const customEvents = events.filter(e => e.date === dateStr && !e.fullDay);
    customEvents.slice(0,1).forEach(e => {
      cells += '<div class="cal-event-tag">&#128204; ' + e.title + '</div>';
    });

    cells += '</div>';
  }

  // Legend
  let h = '<div class="cal-legend">';
  h += '<div class="cal-legend-item"><span class="cal-legend-dot cal-dot-green"></span> Disponible</div>';
  h += '<div class="cal-legend-item"><span class="cal-legend-dot cal-dot-yellow"></span> Partiel</div>';
  h += '<div class="cal-legend-item"><span class="cal-legend-dot cal-dot-red"></span> Complet</div>';
  h += '<div class="cal-legend-item"><span class="cal-legend-dot cal-dot-today"></span> Aujourd\'hui</div>';
  h += '</div>';

  // Quick actions
  h += '<div class="cal-quick-actions">';
  h += '<button class="btn btn-danger btn-sm" onclick="bulkBlockDates()">&#128683; Bloquer des dates</button>';
  h += '<button class="btn btn-success btn-sm" onclick="bulkFreeDates()">&#9989; Liberer des dates</button>';
  h += '</div>';

  h += '<div class="calendar-wrap"><div class="cal-header-bar">';
  h += '<button class="btn btn-secondary btn-sm" onclick="prevMonth()">&#9664; Prec.</button>';
  h += '<h3 class="cal-month-title">' + months[calMonth] + ' ' + calYear + '</h3>';
  h += '<button class="btn btn-secondary btn-sm" onclick="todayCal()">Aujourd\'hui</button>';
  h += '<button class="btn btn-secondary btn-sm" onclick="nextMonth()">Suiv. &#9654;</button>';
  h += '</div><div class="cal-grid-new">';
  dayNames.forEach(d => { h += '<div class="cal-day-name-new">' + d + '</div>'; });
  h += cells;
  h += '</div></div>';

  // Monthly summary
  h += '<div class="card" style="margin-top:20px"><div class="card-header"><h3 class="card-title">&#128202; Resume du mois</h3></div>';
  h += '<div class="month-summary">';
  let fullDays = 0, partialDays = 0, availDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = calYear + "-" + String(calMonth+1).padStart(2,'0') + "-" + String(d).padStart(2,'0');
    const a = getDayAvailability(ds);
    if (a.status === "full") fullDays++;
    else if (a.status === "partial") partialDays++;
    else availDays++;
  }
  h += '<div class="summary-item green-bg"><strong>' + availDays + '</strong> jours disponibles</div>';
  h += '<div class="summary-item yellow-bg"><strong>' + partialDays + '</strong> jours partiels</div>';
  h += '<div class="summary-item red-bg"><strong>' + fullDays + '</strong> jours complets</div>';
  h += '</div></div>';

  return h;
}

function prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } loadView("calendar"); }
function nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } loadView("calendar"); }
function todayCal() { const n = new Date(); calMonth = n.getMonth(); calYear = n.getFullYear(); loadView("calendar"); }

// Bulk block dates
function bulkBlockDates() {
  const today = new Date().toISOString().split("T")[0];
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>&#128683; Bloquer des dates (toutes chambres)</h2>';
  h += '<form onsubmit="confirmBulkBlock(event)">';
  h += '<div class="form-row"><div class="form-group"><label>Du</label><input type="date" id="bb_from" value="' + today + '" required></div>';
  h += '<div class="form-group"><label>Au</label><input type="date" id="bb_to" required></div></div>';
  h += '<div class="form-group"><label>Raison</label><select id="bb_reason">';
  h += '<option value="Fermeture">&#128274; Fermeture</option>';
  h += '<option value="Complet">&#128683; Complet</option>';
  h += '<option value="Evenement">&#127881; Evenement</option>';
  h += '<option value="Maintenance">&#128295; Maintenance generale</option>';
  h += '</select></div>';
  h += '<div class="form-group"><label>Chambres a bloquer</label>';
  h += '<div class="checkbox-grid">';
  h += '<label class="checkbox-item"><input type="checkbox" id="bb_all" onchange="toggleAllRoomChecks(this.checked)" checked> <strong>Toutes les chambres</strong></label>';
  rooms.forEach(r => {
    h += '<label class="checkbox-item"><input type="checkbox" class="room-check" value="' + r.id + '" checked> ' + r.name + '</label>';
  });
  h += '</div></div>';
  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-danger" style="flex:1">&#128683; Bloquer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}
function toggleAllRoomChecks(checked) {
  document.querySelectorAll('.room-check').forEach(c => c.checked = checked);
}
async function confirmBulkBlock(e) {
  e.preventDefault();
  const from = document.getElementById("bb_from").value;
  const to = document.getElementById("bb_to").value;
  const reason = document.getElementById("bb_reason").value;
  if (from > to) { showToast("Dates invalides", "error"); return; }
  const selectedRooms = [...document.querySelectorAll('.room-check:checked')].map(c => c.value);
  if (selectedRooms.length === 0) { showToast("Selectionnez au moins une chambre", "error"); return; }

  for (const roomId of selectedRooms) {
    const room = rooms.find(x => x.id === roomId);
    if (!room) continue;
    const blocked = room.blockedDates || [];
    blocked.push({ from, to, reason, type: "blocked" });
    await fetch("/api/rooms/" + roomId, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ blockedDates: blocked }) });
  }
  closeModal(); await loadAllData();
  showToast(selectedRooms.length + " chambre(s) bloquee(s)", "success");
}

// Bulk free dates
function bulkFreeDates() {
  const today = new Date().toISOString().split("T")[0];
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>&#9989; Liberer des dates</h2>';
  h += '<p style="color:#8c7a3b;margin-bottom:15px">Retirera tous les blocages qui chevauchent cette periode.</p>';
  h += '<form onsubmit="confirmBulkFree(event)">';
  h += '<div class="form-row"><div class="form-group"><label>Du</label><input type="date" id="bf_from" value="' + today + '" required></div>';
  h += '<div class="form-group"><label>Au</label><input type="date" id="bf_to" required></div></div>';
  h += '<div class="form-group"><label>Chambres a liberer</label>';
  h += '<div class="checkbox-grid">';
  h += '<label class="checkbox-item"><input type="checkbox" id="bf_all" onchange="toggleAllFreeChecks(this.checked)" checked> <strong>Toutes</strong></label>';
  rooms.forEach(r => {
    h += '<label class="checkbox-item"><input type="checkbox" class="room-free-check" value="' + r.id + '" checked> ' + r.name + '</label>';
  });
  h += '</div></div>';
  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-success" style="flex:1">&#9989; Liberer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}
function toggleAllFreeChecks(checked) {
  document.querySelectorAll('.room-free-check').forEach(c => c.checked = checked);
}
async function confirmBulkFree(e) {
  e.preventDefault();
  const from = document.getElementById("bf_from").value;
  const to = document.getElementById("bf_to").value;
  const selectedRooms = [...document.querySelectorAll('.room-free-check:checked')].map(c => c.value);
  if (selectedRooms.length === 0) { showToast("Selectionnez au moins une chambre", "error"); return; }

  // Also remove fullDay events in range
  for (const ev of events) {
    if (ev.fullDay && ev.date >= from && ev.date <= to) {
      await fetch("/api/events/" + ev.id, { method:"DELETE" });
    }
  }

  for (const roomId of selectedRooms) {
    const room = rooms.find(x => x.id === roomId);
    if (!room) continue;
    let blocked = room.blockedDates || [];
    blocked = blocked.filter(b => !(from <= b.to && to >= b.from));
    const updates = { blockedDates: blocked };
    if (room.occupantFrom && from <= room.occupantTo && to >= room.occupantFrom) {
      updates.occupied = false; updates.occupantName = ""; updates.occupantFrom = ""; updates.occupantTo = "";
    }
    await fetch("/api/rooms/" + roomId, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(updates) });
  }
  closeModal(); await loadAllData();
  showToast("Dates liberees", "success");
}

// Day modal
function openDayModal(dateStr) {
  const avail = getDayAvailability(dateStr);
  const customEvents = events.filter(e => e.date === dateStr);
  const fullEvent = customEvents.find(e => e.fullDay);
  const resEvents = reservations.filter(r => r.createdAt && r.createdAt.startsWith(dateStr) && r.status !== "cancelled");
  const d = new Date(dateStr);
  const dateLabel = d.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  // Per-room status
  const roomStatuses = rooms.map(r => {
    const blocked = r.blockedDates || [];
    const blockInfo = blocked.find(b => dateStr >= b.from && dateStr <= b.to);
    const available = !blockInfo && r.status !== "maintenance" && r.status !== "unavailable";
    return { room: r, available, blockInfo };
  });

  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>&#128197; ' + dateLabel + '</h2>';

  // Availability bar
  const barColor = avail.status === "full" ? "#ef5350" : avail.status === "partial" ? "#f2c94c" : "#4caf50";
  h += '<div class="day-avail-header">';
  h += '<div class="day-avail-info">';
  h += '<div class="day-avail-number" style="color:' + barColor + '">' + avail.available + '/' + avail.total + '</div>';
  h += '<div>chambres disponibles</div>';
  h += '</div>';
  h += '<div class="day-avail-bar"><div class="day-avail-fill" style="width:' + avail.percent + '%;background:' + barColor + '"></div></div>';
  h += '<div class="day-avail-actions">';
  if (fullEvent) {
    h += '<button class="btn btn-success btn-sm" onclick="removeFullDay(\'' + fullEvent.id + '\',\'' + dateStr + '\')">&#9989; Retirer COMPLET</button>';
  } else {
    h += '<button class="btn btn-danger btn-sm" onclick="markFullDay(\'' + dateStr + '\')">&#128683; Marquer COMPLET</button>';
  }
  h += '</div></div>';

  // Room-by-room grid
  h += '<h3 class="modal-section-title">&#127968; Chambres</h3>';
  h += '<div class="day-rooms-grid">';
  roomStatuses.forEach(rs => {
    const bgc = rs.available ? "#e8f5e9" : "#fce4ec";
    const bdc = rs.available ? "#4caf50" : "#ef5350";
    h += '<div class="day-room-card" style="background:' + bgc + ';border-color:' + bdc + '">';
    h += '<div class="day-room-name">' + rs.room.name + '</div>';
    if (rs.available) {
      h += '<div class="day-room-status available">&#9989; Libre</div>';
      h += '<button class="btn btn-primary btn-xs" onclick="quickBlockRoom(\'' + rs.room.id + '\',\'' + dateStr + '\')">&#128274; Bloquer</button>';
    } else {
      h += '<div class="day-room-status blocked">&#128274; ' + (rs.blockInfo ? rs.blockInfo.reason : "Indisponible") + '</div>';
      h += '<button class="btn btn-success btn-xs" onclick="quickFreeRoom(\'' + rs.room.id + '\',\'' + dateStr + '\')">&#128275; Liberer</button>';
    }
    h += '</div>';
  });
  h += '</div>';

  // Events
  h += '<h3 class="modal-section-title">&#128204; Evenements</h3>';
  const nonFull = customEvents.filter(e => !e.fullDay);
  if (nonFull.length) {
    nonFull.forEach(e => {
      h += '<div class="day-event-item"><div><strong>' + e.title + '</strong>';
      if (e.description) h += '<br><small>' + e.description + '</small>';
      h += '</div><button class="btn btn-danger btn-xs" onclick="deleteEvent(\'' + e.id + '\',\'' + dateStr + '\')">&#128465;</button></div>';
    });
  } else h += '<p class="muted-text">Aucun evenement</p>';

  h += '<form onsubmit="addEvent(event, \'' + dateStr + '\')" class="day-event-form">';
  h += '<input type="text" id="ev_title" required placeholder="Titre de l\'evenement...">';
  h += '<input type="text" id="ev_desc" placeholder="Description (optionnel)">';
  h += '<button type="submit" class="btn btn-primary btn-sm">&#10133; Ajouter</button></form>';

  // Reservations
  if (resEvents.length) {
    h += '<h3 class="modal-section-title">&#128203; Reservations (' + resEvents.length + ')</h3>';
    resEvents.forEach(r => {
      h += '<div class="day-res-item"><strong>' + r.name + '</strong> &#128054; ' + (r.petName || "?") + ' - ' + serviceName(r.service) + ' ' + statusBadge(r.status) + '</div>';
    });
  }

  openModal(h);
}

async function quickBlockRoom(roomId, dateStr) {
  const room = rooms.find(x => x.id === roomId);
  const blocked = room.blockedDates || [];
  blocked.push({ from: dateStr, to: dateStr, reason: "Bloque manuellement", type: "blocked" });
  await fetch("/api/rooms/" + roomId, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ blockedDates: blocked }) });
  closeModal(); await loadAllData();
  openDayModal(dateStr);
  showToast("Chambre bloquee", "success");
}

async function quickFreeRoom(roomId, dateStr) {
  const room = rooms.find(x => x.id === roomId);
  let blocked = room.blockedDates || [];
  blocked = blocked.filter(b => !(dateStr >= b.from && dateStr <= b.to));
  const updates = { blockedDates: blocked };
  if (room.occupantFrom && dateStr >= room.occupantFrom && dateStr <= room.occupantTo) {
    updates.occupied = false; updates.occupantName = ""; updates.occupantFrom = ""; updates.occupantTo = "";
  }
  await fetch("/api/rooms/" + roomId, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(updates) });
  closeModal(); await loadAllData();
  openDayModal(dateStr);
  showToast("Chambre liberee", "success");
}

async function markFullDay(date) {
  await fetch("/api/events", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ date, title:"COMPLET", description:"Journee complete", fullDay:true }) });
  closeModal(); await loadAllData();
  showToast("Journee marquee complete", "success");
}
async function removeFullDay(id, dateStr) {
  await fetch("/api/events/" + id, { method:"DELETE" });
  closeModal(); await loadAllData();
  if (dateStr) openDayModal(dateStr);
  showToast("COMPLET retire", "success");
}
async function addEvent(e, date) {
  e.preventDefault();
  await fetch("/api/events", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ date, title: document.getElementById("ev_title").value, description: document.getElementById("ev_desc").value }) });
  closeModal(); await loadAllData();
  openDayModal(date);
  showToast("Evenement ajoute", "success");
}
async function deleteEvent(id, dateStr) {
  await fetch("/api/events/" + id, { method:"DELETE" });
  closeModal(); await loadAllData();
  if (dateStr) openDayModal(dateStr);
  showToast("Supprime", "success");
}

// ================================================
// ROOMS
// ================================================
function renderRooms() {
  const total = rooms.length;
  const available = rooms.filter(r => getRoomStatus(r) === "available").length;
  const occupied = rooms.filter(r => getRoomStatus(r) === "occupied").length;
  const maint = rooms.filter(r => getRoomStatus(r) === "maintenance" || getRoomStatus(r) === "unavailable").length;

  let h = '<div class="stats-grid">';
  h += statCard("orange", "&#127968;", total, "Total");
  h += statCard("green", "&#9989;", available, "Disponibles");
  h += statCard("blue", "&#128054;", occupied, "Occupees");
  h += statCard("purple", "&#128295;", maint, "Maintenance");
  h += '</div>';

  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#127968; Chambres</h3>';
  h += '<button class="btn btn-primary" onclick="openRoomModal()">&#10133; Nouvelle chambre</button></div>';
  if (rooms.length) {
    h += '<div class="rooms-grid-admin">';
    rooms.forEach(r => {
      const st = getRoomStatus(r);
      const emoji = r.type==="royal"?"&#128081;":r.type==="cat"?"&#128049;":r.type==="special"?"&#11088;":"&#128054;";
      const schedule = getRoomSchedule(r);

      h += '<div class="room-admin-card ' + (st==="available"?"available":"occupied") + '">';
      h += '<div class="room-photo">';
      if (r.photo) h += '<img src="' + r.photo + '">';
      else h += emoji;
      h += '<span class="room-status-badge ' + getRoomStatusClass(st) + '">' + getRoomStatusLabel(st) + '</span></div>';
      h += '<div class="room-admin-body">';
      h += '<div class="room-admin-name">' + r.name + '</div>';
      h += '<div class="room-admin-info"><span>Type:</span><strong>' + (r.type||"-") + '</strong></div>';
      h += '<div class="room-admin-info"><span>Capacite:</span><span>' + (r.capacity||"-") + '</span></div>';
      h += '<div class="room-admin-price">' + price(r.price) + ' <span style="font-size:0.7rem;color:#8c7a3b">/nuit</span></div>';
      if (r.description) h += '<div style="font-size:0.85rem;color:#8c7a3b;margin-bottom:8px">' + r.description + '</div>';
      if (r.occupied && r.occupantName) {
        h += '<div class="occupant-info">&#128054; <strong>' + r.occupantName + '</strong>';
        if (r.occupantFrom) h += '<br><small>' + formatDateShort(r.occupantFrom) + ' &#8594; ' + formatDateShort(r.occupantTo) + '</small>';
        h += '</div>';
      }
      if (schedule.length) {
        h += '<div class="room-schedule"><div class="schedule-title">&#128197; Indisponibilites:</div>';
        schedule.slice(0,3).forEach(b => {
          h += '<div class="schedule-item"><span class="schedule-dates">' + formatDateShort(b.from) + ' &#8594; ' + formatDateShort(b.to) + '</span>';
          h += '<span class="schedule-reason">' + (b.reason||"Bloque") + '</span>';
          h += '<button class="btn btn-danger btn-xs" onclick="removeBlockedDate(\'' + r.id + '\',\'' + b.from + '\',\'' + b.to + '\')">&#10005;</button></div>';
        });
        h += '</div>';
      }
      h += '<div class="room-admin-actions">';
      h += '<div class="status-dropdown"><button class="btn btn-secondary btn-sm" onclick="toggleStatusMenu(\'' + r.id + '\')">&#9881; Statut &#9660;</button>';
      h += '<div class="status-menu" id="statusMenu_' + r.id + '">';
      h += '<div class="status-option" onclick="setRoomStatus(\'' + r.id + '\',\'available\')">&#9989; Disponible</div>';
      h += '<div class="status-option" onclick="openOccupyModal(\'' + r.id + '\')">&#128054; Occuper</div>';
      h += '<div class="status-option" onclick="setRoomStatus(\'' + r.id + '\',\'maintenance\')">&#128295; Maintenance</div>';
      h += '<div class="status-option" onclick="setRoomStatus(\'' + r.id + '\',\'unavailable\')">&#128683; Indisponible</div>';
      h += '</div></div>';
      h += '<button class="btn btn-primary btn-sm" onclick="openBlockDatesModal(\'' + r.id + '\')">&#128197;</button>';
      h += '<button class="btn btn-secondary btn-sm" onclick="openRoomModal(\'' + r.id + '\')">&#9998;</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="deleteRoom(\'' + r.id + '\')">&#128465;</button>';
      h += '</div></div></div>';
    });
    h += '</div>';
  } else h += emptyState("&#127968;", "Aucune chambre");
  h += '</div>';
  return h;
}

function toggleStatusMenu(id) {
  document.querySelectorAll('.status-menu.show').forEach(m => { if (m.id !== 'statusMenu_'+id) m.classList.remove('show'); });
  const menu = document.getElementById('statusMenu_' + id);
  if (menu) menu.classList.toggle('show');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.status-dropdown')) document.querySelectorAll('.status-menu.show').forEach(m => m.classList.remove('show'));
});

async function setRoomStatus(id, status) {
  const data = { status };
  if (status === "available") { data.occupied = false; data.occupantName = ""; data.occupantFrom = ""; data.occupantTo = ""; }
  await fetch("/api/rooms/" + id, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
  await loadAllData(); showToast("Statut: " + status, "success");
}

function openOccupyModal(id) {
  const room = rooms.find(x => x.id === id); if (!room) return;
  const today = new Date().toISOString().split("T")[0];
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>&#128054; Occuper: ' + room.name + '</h2>';
  h += '<form onsubmit="confirmOccupy(event, \'' + id + '\')">';
  h += '<div class="form-group"><label>Nom animal / client</label><input type="text" id="occ_name" required></div>';
  h += '<div class="form-row"><div class="form-group"><label>Arrivee</label><input type="date" id="occ_from" value="' + today + '" required></div>';
  h += '<div class="form-group"><label>Depart</label><input type="date" id="occ_to" required></div></div>';
  h += '<div class="form-group"><label>Notes</label><textarea id="occ_notes" rows="2"></textarea></div>';
  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-primary" style="flex:1">&#9989; Confirmer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}
async function confirmOccupy(e, id) {
  e.preventDefault();
  const name = document.getElementById("occ_name").value;
  const from = document.getElementById("occ_from").value;
  const to = document.getElementById("occ_to").value;
  const notes = document.getElementById("occ_notes").value;
  if (from > to) { showToast("Dates invalides", "error"); return; }
  const room = rooms.find(x => x.id === id);
  const blocked = room.blockedDates || [];
  blocked.push({ from, to, reason: "&#128054; " + name + (notes?" - "+notes:""), type: "occupied" });
  await fetch("/api/rooms/" + id, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ occupied:true, occupantName:name, occupantFrom:from, occupantTo:to, status:"available", blockedDates:blocked }) });
  closeModal(); await loadAllData(); showToast("Chambre occupee", "success");
}

function openBlockDatesModal(id) {
  const room = rooms.find(x => x.id === id); if (!room) return;
  const today = new Date().toISOString().split("T")[0];
  const schedule = getRoomSchedule(room);
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>&#128197; Bloquer: ' + room.name + '</h2>';
  if (schedule.length) {
    h += '<div class="existing-blocks"><h4>Periodes existantes:</h4>';
    schedule.forEach(b => {
      h += '<div class="block-item"><div><strong>' + formatDateShort(b.from) + ' &#8594; ' + formatDateShort(b.to) + '</strong><br><small>' + (b.reason||"") + '</small></div>';
      h += '<button class="btn btn-danger btn-xs" onclick="removeBlockedDate(\'' + id + '\',\'' + b.from + '\',\'' + b.to + '\')">&#128465;</button></div>';
    });
    h += '</div>';
  }
  h += '<form onsubmit="addBlockedDates(event,\'' + id + '\')" class="block-form">';
  h += '<div class="form-row"><div class="form-group"><label>Du</label><input type="date" id="block_from" value="' + today + '" required></div>';
  h += '<div class="form-group"><label>Au</label><input type="date" id="block_to" required></div></div>';
  h += '<div class="form-group"><label>Raison</label><select id="block_reason"><option value="Reservation">Reservation</option><option value="Maintenance">Maintenance</option><option value="Renovation">Renovation</option><option value="Autre">Autre</option></select></div>';
  h += '<div class="form-group"><label>Details</label><input type="text" id="block_details"></div>';
  h += '<button type="submit" class="btn btn-primary">&#128274; Bloquer</button></form>';
  h += '<button class="btn btn-secondary" onclick="closeModal()" style="margin-top:10px">Fermer</button>';
  openModal(h);
}
async function addBlockedDates(e, id) {
  e.preventDefault();
  const from = document.getElementById("block_from").value;
  const to = document.getElementById("block_to").value;
  const reason = document.getElementById("block_reason").value;
  const details = document.getElementById("block_details").value;
  if (from > to) { showToast("Dates invalides", "error"); return; }
  const room = rooms.find(x => x.id === id);
  const blocked = room.blockedDates || [];
  blocked.push({ from, to, reason: reason + (details?" - "+details:""), type: reason.toLowerCase() });
  await fetch("/api/rooms/" + id, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ blockedDates: blocked }) });
  closeModal(); await loadAllData(); showToast("Dates bloquees", "success");
}
async function removeBlockedDate(roomId, from, to) {
  if (!confirm("Retirer ?")) return;
  const room = rooms.find(x => x.id === roomId);
  let blocked = (room.blockedDates||[]).filter(b => !(b.from===from && b.to===to));
  const updates = { blockedDates: blocked };
  if (room.occupantFrom===from && room.occupantTo===to) { updates.occupied=false; updates.occupantName=""; updates.occupantFrom=""; updates.occupantTo=""; }
  await fetch("/api/rooms/" + roomId, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(updates) });
  await loadAllData(); showToast("Retire", "success");
}

function openRoomModal(id) {
  const r = id ? rooms.find(x => x.id === id) : { name:"", type:"comfort", price:35, capacity:"", description:"", photo:"", status:"available" };
  const edit = !!id;
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>' + (edit?"&#9998; Modifier":"&#10133; Nouvelle chambre") + '</h2>';
  h += '<form onsubmit="saveRoom(event,\'' + (id||"") + '\')">';
  h += '<div class="form-group"><label>Nom</label><input type="text" id="rn" value="' + esc(r.name) + '" required></div>';
  h += '<div class="form-row"><div class="form-group"><label>Type</label><select id="rt">';
  [{v:"comfort",l:"Confort"},{v:"royal",l:"Royal"},{v:"cat",l:"Chat"},{v:"special",l:"Special"}].forEach(t => {
    h += '<option value="'+t.v+'"'+(r.type===t.v?" selected":"")+'>'+t.l+'</option>';
  });
  h += '</select></div><div class="form-group"><label>Prix/nuit</label><input type="number" id="rp" value="'+(r.price||0)+'" min="0" step="0.01" required></div></div>';
  h += '<div class="form-row"><div class="form-group"><label>Capacite</label><input type="text" id="rc" value="'+esc(r.capacity)+'" placeholder="8m2"></div>';
  h += '<div class="form-group"><label>Statut</label><select id="rs">';
  [{v:"available",l:"Disponible"},{v:"maintenance",l:"Maintenance"},{v:"unavailable",l:"Indisponible"}].forEach(s => {
    h += '<option value="'+s.v+'"'+((r.status||"available")===s.v?" selected":"")+'>'+s.l+'</option>';
  });
  h += '</select></div></div>';
  h += '<div class="form-group"><label>Description</label><textarea id="rd" rows="3">'+esc(r.description)+'</textarea></div>';
  h += '<div class="form-group"><label>Photo</label>';
  h += '<label class="photo-upload" for="rph"><div>&#128247; Ajouter photo</div>';
  h += '<img class="photo-preview" id="rpv"'+(r.photo?' src="'+r.photo+'"':' style="display:none"')+'></label>';
  h += '<input type="file" id="rph" accept="image/*" onchange="previewImg(event,\'rpv\',\'rphd\')" style="display:none"></div>';
  h += '<input type="hidden" id="rphd" value="'+(r.photo||"")+'">';
  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-primary" style="flex:1">&#128190; Enregistrer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}
function previewImg(e, imgId, dataId) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById(dataId).value = ev.target.result; const img = document.getElementById(imgId); img.src = ev.target.result; img.style.display = "block"; };
  reader.readAsDataURL(f);
}
async function saveRoom(e, id) {
  e.preventDefault();
  const d = { name:document.getElementById("rn").value, type:document.getElementById("rt").value, price:parseFloat(document.getElementById("rp").value)||0, capacity:document.getElementById("rc").value, description:document.getElementById("rd").value, photo:document.getElementById("rphd").value, status:document.getElementById("rs").value };
  if (id) await fetch("/api/rooms/"+id, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(d) });
  else { d.occupied=false; d.occupantName=""; d.blockedDates=[]; await fetch("/api/rooms", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(d) }); }
  closeModal(); await loadAllData(); showToast(id?"Modifiee":"Ajoutee", "success");
}
async function deleteRoom(id) {
  if (!confirm("Supprimer ?")) return;
  await fetch("/api/rooms/"+id, { method:"DELETE" });
  await loadAllData(); showToast("Supprimee", "success");
}

// ================================================
// SERVICES
// ================================================
function renderServices() {
  let h = '<div class="card"><div class="card-header"><h3 class="card-title">&#9881; Services</h3>';
  h += '<button class="btn btn-primary" onclick="openServiceModal()">&#10133; Nouveau</button></div>';
  if (services.length) {
    h += '<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Nom</th><th>Description</th><th>Prix</th><th>Unite</th><th>Actions</th></tr></thead><tbody>';
    services.forEach(s => {
      h += '<tr><td style="font-size:1.5rem">'+(s.icon||"")+'</td>';
      h += '<td><strong>'+s.name+'</strong><br><small style="color:#8c7a3b">'+s.key+'</small></td>';
      h += '<td style="font-size:0.85rem">'+(s.description||"-")+'</td>';
      h += '<td><strong>'+price(s.price)+'</strong></td><td>'+(s.unit||"-")+'</td>';
      h += '<td><button class="btn btn-secondary btn-sm" onclick="openServiceModal(\''+s.id+'\')">&#9998;</button> ';
      h += '<button class="btn btn-danger btn-sm" onclick="deleteService(\''+s.id+'\')">&#128465;</button></td></tr>';
    });
    h += '</tbody></table></div>';
  } else h += emptyState("&#9881;","Aucun service");
  h += '</div>'; return h;
}
function openServiceModal(id) {
  const s = id ? services.find(x=>x.id===id) : {name:"",key:"",icon:"",price:0,unit:"",description:""};
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>'+(id?"&#9998; Modifier":"&#10133; Nouveau service")+'</h2>';
  h += '<form onsubmit="saveService(event,\''+(id||"")+'\')">';
  h += '<div class="form-row"><div class="form-group"><label>Icone</label><input type="text" id="sIcon" value="'+esc(s.icon)+'" maxlength="4"></div>';
  h += '<div class="form-group"><label>Cle</label><input type="text" id="sKey" value="'+esc(s.key)+'" required></div></div>';
  h += '<div class="form-group"><label>Nom</label><input type="text" id="sName" value="'+esc(s.name)+'" required></div>';
  h += '<div class="form-row"><div class="form-group"><label>Prix</label><input type="number" id="sPrice" value="'+(s.price||0)+'" min="0" step="0.01"></div>';
  h += '<div class="form-group"><label>Unite</label><input type="text" id="sUnit" value="'+esc(s.unit)+'"></div></div>';
  h += '<div class="form-group"><label>Description</label><textarea id="sDesc" rows="3">'+esc(s.description)+'</textarea></div>';
  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-primary" style="flex:1">&#128190;</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}
async function saveService(e, id) {
  e.preventDefault();
  const d = { icon:document.getElementById("sIcon").value, key:document.getElementById("sKey").value, name:document.getElementById("sName").value, price:parseFloat(document.getElementById("sPrice").value)||0, unit:document.getElementById("sUnit").value, description:document.getElementById("sDesc").value };
  if (id) await fetch("/api/services/"+id, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  else await fetch("/api/services", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  closeModal(); await loadAllData(); showToast("OK","success");
}
async function deleteService(id) {
  if (!confirm("Supprimer ?")) return;
  await fetch("/api/services/"+id, { method:"DELETE" });
  await loadAllData(); showToast("Supprime","success");
}

// ================================================
// CLIENTS - Full CRUD with photos
// ================================================
function renderClients() {
  // Merge reservation-derived + manually added clients
  const resClients = {};
  reservations.forEach(r => {
    if (!r.email) return;
    if (!resClients[r.email]) resClients[r.email] = { name:r.name, email:r.email, phone:r.phone, count:0, total:0 };
    resClients[r.email].count++;
    if (r.status !== "cancelled") resClients[r.email].total += getServicePrice(r.service);
  });

  const allClients = [...clients];
  // Add reservation-derived clients not already in manual list
  Object.values(resClients).forEach(rc => {
    if (!allClients.find(c => c.email === rc.email)) {
      allClients.push({ ...rc, id: "res-" + rc.email, source: "reservation" });
    }
  });

  const totalSpent = allClients.reduce((s,c) => s + (resClients[c.email]?.total || 0), 0);
  const loyal = allClients.filter(c => (resClients[c.email]?.count || 0) >= 3).length;

  let h = '<div class="stats-grid">';
  h += statCard("blue", "&#128101;", allClients.length, "Clients");
  h += statCard("green", "&#128054;", pets.length, "Animaux");
  h += statCard("orange", "&#11088;", loyal, "Fideles (3+)");
  h += statCard("purple", "&#128176;", totalSpent + " " + CS(), "Total depenses");
  h += '</div>';

  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#128101; Clients</h3>';
  h += '<button class="btn btn-primary" onclick="openClientModal()">&#10133; Nouveau client</button></div>';

  if (allClients.length) {
    h += '<div class="clients-grid">';
    allClients.forEach(c => {
      const rc = resClients[c.email] || { count:0, total:0 };
      const clientPets = pets.filter(p => p.ownerId === c.id || p.ownerEmail === c.email);
      h += '<div class="client-card">';
      h += '<div class="client-card-header">';
      if (c.photo) h += '<img class="client-avatar" src="' + c.photo + '">';
      else h += '<div class="client-avatar-placeholder">&#128100;</div>';
      h += '<div class="client-card-info">';
      h += '<div class="client-name">' + (c.name||"-") + (rc.count>=3?' &#11088;':'') + '</div>';
      h += '<div class="client-email">&#128231; ' + (c.email||"-") + '</div>';
      if (c.phone) h += '<div class="client-phone">&#128222; ' + c.phone + '</div>';
      h += '</div></div>';

      if (c.address) h += '<div class="client-detail">&#128205; ' + c.address + '</div>';
      if (c.notes) h += '<div class="client-detail">&#128221; ' + c.notes + '</div>';

      // Client pets
      if (clientPets.length) {
        h += '<div class="client-pets-list">';
        clientPets.forEach(p => {
          h += '<span class="client-pet-chip">';
          if (p.photo) h += '<img src="' + p.photo + '" class="pet-chip-img">';
          h += '&#128054; ' + p.name + '</span>';
        });
        h += '</div>';
      }

      h += '<div class="client-stats">';
      h += '<span>&#128203; ' + rc.count + ' res.</span>';
      h += '<span>&#128176; ' + price(rc.total) + '</span>';
      h += '</div>';

      h += '<div class="client-actions">';
      if (c.email) h += '<a href="mailto:' + c.email + '" class="btn btn-primary btn-sm">&#128231;</a>';
      if (c.phone) h += '<a href="tel:' + c.phone + '" class="btn btn-success btn-sm">&#128222;</a>';
      if (!c.source) {
        h += '<button class="btn btn-secondary btn-sm" onclick="openClientModal(\'' + c.id + '\')">&#9998;</button>';
        h += '<button class="btn btn-danger btn-sm" onclick="deleteClient(\'' + c.id + '\')">&#128465;</button>';
      }
      h += '</div></div>';
    });
    h += '</div>';
  } else h += emptyState("&#128101;", "Aucun client");
  h += '</div>';
  return h;
}

function openClientModal(id) {
  const c = id ? clients.find(x => x.id === id) : { name:"", email:"", phone:"", address:"", notes:"", photo:"" };
  const edit = !!id;
  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>' + (edit?"&#9998; Modifier client":"&#10133; Nouveau client") + '</h2>';
  h += '<form onsubmit="saveClient(event,\'' + (id||"") + '\')">';

  // Photo
  h += '<div class="form-group" style="text-align:center">';
  h += '<label class="avatar-upload" for="cl_photo_input">';
  if (c.photo) h += '<img id="cl_photo_preview" src="' + c.photo + '" class="avatar-preview">';
  else h += '<div id="cl_photo_preview" class="avatar-preview-placeholder">&#128247;<br><small>Photo</small></div>';
  h += '</label>';
  h += '<input type="file" id="cl_photo_input" accept="image/*" onchange="previewClientPhoto(event)" style="display:none">';
  h += '<input type="hidden" id="cl_photo" value="' + (c.photo||"") + '">';
  h += '</div>';

  h += '<div class="form-row"><div class="form-group"><label>Nom complet</label><input type="text" id="cl_name" value="' + esc(c.name) + '" required></div>';
  h += '<div class="form-group"><label>Email</label><input type="email" id="cl_email" value="' + esc(c.email) + '" required></div></div>';
  h += '<div class="form-row"><div class="form-group"><label>Telephone</label><input type="tel" id="cl_phone" value="' + esc(c.phone) + '"></div>';
  h += '<div class="form-group"><label>Adresse</label><input type="text" id="cl_address" value="' + esc(c.address) + '"></div></div>';
  h += '<div class="form-group"><label>Notes</label><textarea id="cl_notes" rows="3" placeholder="Informations supplementaires...">' + esc(c.notes) + '</textarea></div>';

  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-primary" style="flex:1">&#128190; Enregistrer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}

function previewClientPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("cl_photo").value = ev.target.result;
    const preview = document.getElementById("cl_photo_preview");
    if (preview.tagName === "IMG") {
      preview.src = ev.target.result;
    } else {
      preview.outerHTML = '<img id="cl_photo_preview" src="' + ev.target.result + '" class="avatar-preview">';
    }
  };
  reader.readAsDataURL(f);
}

async function saveClient(e, id) {
  e.preventDefault();
  const d = { name:document.getElementById("cl_name").value, email:document.getElementById("cl_email").value, phone:document.getElementById("cl_phone").value, address:document.getElementById("cl_address").value, notes:document.getElementById("cl_notes").value, photo:document.getElementById("cl_photo").value };
  if (id) await fetch("/api/clients/"+id, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  else await fetch("/api/clients", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  closeModal(); await loadAllData(); showToast(id?"Client modifie":"Client ajoute", "success");
}
async function deleteClient(id) {
  if (!confirm("Supprimer ce client ?")) return;
  await fetch("/api/clients/"+id, { method:"DELETE" });
  await loadAllData(); showToast("Client supprime", "success");
}

// ================================================
// PETS - Full CRUD with photos & details
// ================================================
function renderPets() {
  const speciesCount = {};
  pets.forEach(p => { speciesCount[p.species||"Autre"] = (speciesCount[p.species||"Autre"]||0)+1; });

  let h = '<div class="stats-grid">';
  h += statCard("blue", "&#128054;", pets.length, "Total animaux");
  h += statCard("green", "&#128021;", speciesCount["Chien"]||0, "Chiens");
  h += statCard("orange", "&#128049;", speciesCount["Chat"]||0, "Chats");
  h += statCard("purple", "&#128056;", (pets.length - (speciesCount["Chien"]||0) - (speciesCount["Chat"]||0)), "Autres");
  h += '</div>';

  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#128054; Animaux</h3>';
  h += '<button class="btn btn-primary" onclick="openPetModal()">&#10133; Nouvel animal</button></div>';

  if (pets.length) {
    h += '<div class="pets-grid">';
    pets.forEach(p => {
      const owner = clients.find(c => c.id === p.ownerId);
      const speciesEmoji = p.species==="Chien"?"&#128021;":p.species==="Chat"?"&#128049;":p.species==="Oiseau"?"&#128038;":p.species==="Lapin"?"&#128048;":p.species==="Hamster"?"&#128057;":"&#128054;";

      h += '<div class="pet-card">';
      h += '<div class="pet-card-photo">';
      if (p.photo) h += '<img src="' + p.photo + '">';
      else h += '<div class="pet-photo-placeholder">' + speciesEmoji + '</div>';
      h += '</div>';
      h += '<div class="pet-card-body">';
      h += '<div class="pet-card-name">' + speciesEmoji + ' ' + p.name + '</div>';
      h += '<div class="pet-card-details">';
      if (p.species) h += '<span class="pet-detail-chip">&#128062; ' + p.species + '</span>';
      if (p.breed) h += '<span class="pet-detail-chip">&#128054; ' + p.breed + '</span>';
      if (p.age) h += '<span class="pet-detail-chip">&#128197; ' + p.age + '</span>';
      if (p.weight) h += '<span class="pet-detail-chip">&#9878; ' + p.weight + '</span>';
      if (p.gender) h += '<span class="pet-detail-chip">' + (p.gender==="Male"?"&#9794;":"&#9792;") + ' ' + p.gender + '</span>';
      if (p.color) h += '<span class="pet-detail-chip">&#127912; ' + p.color + '</span>';
      h += '</div>';

      if (owner) h += '<div class="pet-owner">&#128100; ' + owner.name + '</div>';
      else if (p.ownerName) h += '<div class="pet-owner">&#128100; ' + p.ownerName + '</div>';

      if (p.vaccinated) h += '<div class="pet-vaccinated">&#128137; Vaccine</div>';
      if (p.sterilized) h += '<div class="pet-sterilized">&#10004; Sterilise</div>';
      if (p.allergies) h += '<div class="pet-allergy">&#9888; Allergies: ' + p.allergies + '</div>';
      if (p.diet) h += '<div class="pet-diet">&#127860; Regime: ' + p.diet + '</div>';
      if (p.medications) h += '<div class="pet-meds">&#128138; Medicaments: ' + p.medications + '</div>';
      if (p.notes) h += '<div class="pet-notes">&#128221; ' + p.notes + '</div>';

      h += '<div class="pet-actions">';
      h += '<button class="btn btn-secondary btn-sm" onclick="openPetModal(\'' + p.id + '\')">&#9998; Modifier</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="deletePet(\'' + p.id + '\')">&#128465; Supprimer</button>';
      h += '</div></div></div>';
    });
    h += '</div>';
  } else h += emptyState("&#128054;", "Aucun animal", "Ajoutez votre premier animal");
  h += '</div>';
  return h;
}

function openPetModal(id) {
  const p = id ? pets.find(x => x.id === id) : { name:"", species:"Chien", breed:"", age:"", weight:"", gender:"", color:"", vaccinated:false, sterilized:false, allergies:"", diet:"", medications:"", notes:"", photo:"", ownerId:"", ownerName:"" };
  const edit = !!id;

  let h = '<button class="modal-close" onclick="closeModal()">&#10005;</button>';
  h += '<h2>' + (edit?"&#9998; Modifier":"&#10133; Nouvel animal") + '</h2>';
  h += '<form onsubmit="savePet(event,\'' + (id||"") + '\')">';

  // Photo
  h += '<div class="form-group" style="text-align:center">';
  h += '<label class="pet-photo-upload" for="pet_photo_input">';
  if (p.photo) h += '<img id="pet_photo_preview" src="' + p.photo + '" class="pet-upload-preview">';
  else h += '<div id="pet_photo_preview" class="pet-upload-placeholder">&#128247;<br><small>Photo de l\'animal</small></div>';
  h += '</label>';
  h += '<input type="file" id="pet_photo_input" accept="image/*" onchange="previewPetPhoto(event)" style="display:none">';
  h += '<input type="hidden" id="pet_photo" value="' + (p.photo||"") + '">';
  h += '</div>';

  h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="pet_name" value="' + esc(p.name) + '" required></div>';
  h += '<div class="form-group"><label>Espece *</label><select id="pet_species">';
  ["Chien","Chat","Oiseau","Lapin","Hamster","Reptile","Poisson","Autre"].forEach(s => {
    h += '<option value="'+s+'"'+(p.species===s?" selected":"")+'>'+s+'</option>';
  });
  h += '</select></div></div>';

  h += '<div class="form-row"><div class="form-group"><label>Race</label><input type="text" id="pet_breed" value="' + esc(p.breed) + '" placeholder="Ex: Labrador, Persan..."></div>';
  h += '<div class="form-group"><label>Couleur</label><input type="text" id="pet_color" value="' + esc(p.color) + '" placeholder="Ex: Noir, Roux..."></div></div>';

  h += '<div class="form-row"><div class="form-group"><label>Age</label><input type="text" id="pet_age" value="' + esc(p.age) + '" placeholder="Ex: 3 ans, 6 mois"></div>';
  h += '<div class="form-group"><label>Poids</label><input type="text" id="pet_weight" value="' + esc(p.weight) + '" placeholder="Ex: 12 kg"></div></div>';

  h += '<div class="form-row"><div class="form-group"><label>Genre</label><select id="pet_gender"><option value="">-</option>';
  ["Male","Femelle"].forEach(g => { h += '<option value="'+g+'"'+(p.gender===g?" selected":"")+'>'+g+'</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Proprietaire</label><select id="pet_owner">';
  h += '<option value="">- Aucun -</option>';
  clients.forEach(c => { h += '<option value="'+c.id+'"'+(p.ownerId===c.id?" selected":"")+'>'+c.name+'</option>'; });
  h += '</select></div></div>';

  // Health info
  h += '<div class="form-section-title">&#128137; Sante</div>';
  h += '<div class="form-row"><div class="form-group"><label class="checkbox-label"><input type="checkbox" id="pet_vacc"'+(p.vaccinated?" checked":"")+'> Vaccine</label></div>';
  h += '<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="pet_ster"'+(p.sterilized?" checked":"")+'> Sterilise</label></div></div>';

  h += '<div class="form-group"><label>Allergies</label><input type="text" id="pet_allergies" value="' + esc(p.allergies) + '" placeholder="Ex: Poulet, pollen..."></div>';
  h += '<div class="form-row"><div class="form-group"><label>Regime alimentaire</label><input type="text" id="pet_diet" value="' + esc(p.diet) + '" placeholder="Ex: Sans cereales, regime renal..."></div>';
  h += '<div class="form-group"><label>Medicaments</label><input type="text" id="pet_meds" value="' + esc(p.medications) + '" placeholder="Ex: Insuline 2x/jour"></div></div>';

  h += '<div class="form-group"><label>Notes supplementaires</label><textarea id="pet_notes" rows="3" placeholder="Comportement, besoins speciaux...">' + esc(p.notes) + '</textarea></div>';

  h += '<div style="display:flex;gap:10px;margin-top:20px"><button type="submit" class="btn btn-primary" style="flex:1">&#128190; Enregistrer</button>';
  h += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button></div></form>';
  openModal(h);
}

function previewPetPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("pet_photo").value = ev.target.result;
    const preview = document.getElementById("pet_photo_preview");
    if (preview.tagName === "IMG") { preview.src = ev.target.result; }
    else { preview.outerHTML = '<img id="pet_photo_preview" src="' + ev.target.result + '" class="pet-upload-preview">'; }
  };
  reader.readAsDataURL(f);
}

async function savePet(e, id) {
  e.preventDefault();
  const ownerId = document.getElementById("pet_owner").value;
  const owner = clients.find(c => c.id === ownerId);
  const d = {
    name: document.getElementById("pet_name").value,
    species: document.getElementById("pet_species").value,
    breed: document.getElementById("pet_breed").value,
    color: document.getElementById("pet_color").value,
    age: document.getElementById("pet_age").value,
    weight: document.getElementById("pet_weight").value,
    gender: document.getElementById("pet_gender").value,
    ownerId: ownerId,
    ownerName: owner ? owner.name : "",
    ownerEmail: owner ? owner.email : "",
    vaccinated: document.getElementById("pet_vacc").checked,
    sterilized: document.getElementById("pet_ster").checked,
    allergies: document.getElementById("pet_allergies").value,
    diet: document.getElementById("pet_diet").value,
    medications: document.getElementById("pet_meds").value,
    notes: document.getElementById("pet_notes").value,
    photo: document.getElementById("pet_photo").value
  };
  if (id) await fetch("/api/pets/"+id, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  else await fetch("/api/pets", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  closeModal(); await loadAllData(); showToast(id?"Animal modifie":"Animal ajoute", "success");
}

async function deletePet(id) {
  if (!confirm("Supprimer cet animal ?")) return;
  await fetch("/api/pets/"+id, { method:"DELETE" });
  await loadAllData(); showToast("Animal supprime", "success");
}

// ================================================
// FINANCES
// ================================================
function renderFinances() {
  const total = reservations.filter(r=>r.status!=="cancelled").reduce((s,r)=>s+getServicePrice(r.service),0);
  const paid = reservations.filter(r=>r.status==="completed").reduce((s,r)=>s+getServicePrice(r.service),0);
  const pendingRev = reservations.filter(r=>r.status==="pending"||r.status==="confirmed").reduce((s,r)=>s+getServicePrice(r.service),0);
  const byService = {};
  reservations.filter(r=>r.status!=="cancelled").forEach(r => { byService[r.service]=(byService[r.service]||0)+getServicePrice(r.service); });
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthRev = reservations.filter(r=>r.createdAt&&r.createdAt.startsWith(thisMonth)&&r.status!=="cancelled").reduce((s,r)=>s+getServicePrice(r.service),0);

  let h = '<div class="stats-grid">';
  h += statCard("green","&#128176;",total+" "+CS(),"Revenu total");
  h += statCard("blue","&#9989;",paid+" "+CS(),"Encaisse");
  h += statCard("orange","&#9203;",pendingRev+" "+CS(),"En attente");
  h += statCard("purple","&#128197;",monthRev+" "+CS(),"Ce mois");
  h += '</div>';
  h += '<div class="card"><div class="card-header"><h3 class="card-title">&#128202; Par service</h3></div>';
  h += '<div class="table-wrap"><table class="table"><thead><tr><th>Service</th><th>Nombre</th><th>Prix</th><th>Total</th></tr></thead><tbody>';
  services.forEach(s => {
    const count = reservations.filter(r=>r.service===s.key&&r.status!=="cancelled").length;
    h += '<tr><td>'+serviceName(s.key)+'</td><td>'+count+'</td><td>'+price(s.price)+'</td><td><strong>'+price(byService[s.key]||0)+'</strong></td></tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

// ================================================
// SETTINGS
// ================================================
function renderSettings() {
  let h = '<div class="card"><div class="card-header"><h3 class="card-title">&#9881; Parametres</h3></div>';
  h += '<form onsubmit="saveSettings(event)">';
  h += '<div class="form-group"><label>Nom</label><input type="text" id="s_hn" value="'+esc(settings.hotelName)+'" required></div>';
  h += '<div class="form-group"><label>Adresse</label><input type="text" id="s_ad" value="'+esc(settings.address)+'"></div>';
  h += '<div class="form-row"><div class="form-group"><label>Telephone</label><input type="tel" id="s_ph" value="'+esc(settings.phone)+'"></div>';
  h += '<div class="form-group"><label>Email</label><input type="email" id="s_em" value="'+esc(settings.email)+'"></div></div>';
  h += '<div class="form-group"><label>Horaires</label><input type="text" id="s_hr" value="'+esc(settings.hours)+'"></div>';
  h += '<div class="form-row"><div class="form-group"><label>Devise</label><select id="s_cu">';
  ["EUR","USD","GBP","MAD","CAD","CHF"].forEach(c => { h += '<option value="'+c+'"'+(settings.currency===c?" selected":"")+'>'+c+'</option>'; });
  h += '</select></div><div class="form-group"><label>Symbole</label><input type="text" id="s_cs" value="'+(settings.currencySymbol||"EUR")+'" required></div></div>';
  h += '<button type="submit" class="btn btn-primary">&#128190; Enregistrer</button></form></div>';
  return h;
}
async function saveSettings(e) {
  e.preventDefault();
  settings.hotelName=document.getElementById("s_hn").value; settings.address=document.getElementById("s_ad").value;
  settings.phone=document.getElementById("s_ph").value; settings.email=document.getElementById("s_em").value;
  settings.hours=document.getElementById("s_hr").value; settings.currency=document.getElementById("s_cu").value;
  settings.currencySymbol=document.getElementById("s_cs").value;
  await fetch("/api/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(settings) });
  showToast("Enregistre","success"); await loadAllData();
}

// INIT
window.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("adminAuth") === "1") showApp();
});
setInterval(() => {
  if (sessionStorage.getItem("adminAuth") === "1" && currentView === "dashboard") loadAllData();
}, 30000);
