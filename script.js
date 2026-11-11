'use strict';
/* TagaTugon — frontend demo. Order: 1 data, 2 api (swap for backend), 3 helpers, 4 views, 5 events. */

/* ============ 1. DEMO DATA (clearly sample content, not real incidents) ============ */
const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const SYM = ['○', '◔', '◈', '◐', '●', '✕']; // symbol + text, so status never relies on colour alone
const CATS = ['Infrastructure', 'Sanitation and Waste Management', 'Utilities', 'Public Safety', 'Drainage and Flooding', 'Street Lighting', 'Local Ordinance Violations', 'Other Community Concerns'];
const DEPTS = ['Engineering and Infrastructure', 'Sanitation', 'Public Safety', 'Disaster Risk Reduction and Management', 'General Services', 'Barangay Office', 'Utilities Coordination'];
const ANN_CATS = ['Weather Advisory', 'Road Closure', 'Garbage Collection', 'Power or Water Interruption', 'Curfew Reminder', 'Community Event'];
const TREND = [['May', 18], ['Jun', 24], ['Jul', 31], ['Aug', 27], ['Sep', 38], ['Oct', 22]]; // sample data
// Demo accounts only. Real authentication and roles must be enforced by the backend.
const DEMO_USERS = {
  'citizen@tagatugon.ph': { pw: 'citizen123', role: 'citizen', name: 'Maria Santos', barangay: 'Zapote' },
  'admin@tagatugon.ph': { pw: 'admin123', role: 'admin', name: 'LGU Admin', barangay: 'City Hall' }
};
/* Timestamps are stored as local 'YYYY-MM-DDTHH:mm' (older date-only 'YYYY-MM-DD' values still display, date only). */
const pad2 = n => String(n).padStart(2, '0');
const toLocalISO = t => `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}T${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
const parseTS = s => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; };
const addMin = (s, n) => { const t = parseTS(s); t.setMinutes(t.getMinutes() + n); return toLocalISO(t); };
const nowISO = () => toLocalISO(new Date());
const fmtDT = s => {   // "Oct 22, 2026, 3:45 PM"
  const t = parseTS(s); if (!t) return s == null ? '' : String(s);
  const d = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return /[T ]\d{2}:\d{2}/.test(s) ? d + ', ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : d;
};
function mk(id, title, cat, date, loc, status, desc, owner, dept, support, x, y) {
  const last = status === 'Rejected' ? 1 : STATUSES.indexOf(status);
  const history = [...Array(last + 1).keys()].map(i => ({ s: STATUSES[i], d: addMin(date, i * 2880 + i * 137) }));
  if (status === 'Rejected') history.push({ s: 'Rejected', d: addMin(date, 4 * 1440 + 95) });
  return { id, title, cat, date, loc, status, desc, owner, dept, support, x, y, history, notes: [], upd: history.at(-1).d,
    resolution: status === 'Resolved' ? 'Repair completed and inspected by the assigned office.' : '' };
}
const SEED_REPORTS = [
  mk('TT-1001', 'Pothole near the public market entrance', 'Infrastructure', '2026-09-28T09:15', 'Market Road, Zapote', 'In Progress', 'A deep pothole has formed near the tricycle terminal and is a hazard for motorcycles at night.', 'me', DEPTS[0], 14, 28, 40),
  mk('TT-1002', 'Uncollected garbage along creek path', 'Sanitation and Waste Management', '2026-10-02T14:40', 'Creek Path, Purok 3', 'Assigned', 'Garbage has not been collected for over a week and is attracting pests.', 'me', DEPTS[1], 9, 62, 70),
  mk('TT-1003', 'Broken streetlight on school road', 'Street Lighting', '2026-09-10T08:05', 'Rizal Elementary School Road', 'Resolved', 'The streetlight outside the school gate has been out for two weeks.', 'me', DEPTS[6], 21, 45, 22),
  mk('TT-1004', 'Clogged drainage after heavy rain', 'Drainage and Flooding', '2026-10-15T16:20', 'Corner Mabini and Luna St.', 'Under Review', 'Water pools in front of houses for hours after rain. The canal appears blocked.', 'me', '', 17, 78, 48),
  mk('TT-1005', 'Exposed wires on electric post', 'Utilities', '2026-10-19T11:30', 'Sampaguita Street', 'Submitted', 'Loose wires hang low near a sari-sari store.', 'other', '', 6, 15, 68),
  mk('TT-1006', 'Unlit footbridge at night', 'Public Safety', '2026-08-30T19:10', 'Footbridge, Barangay Hall side', 'Resolved', 'Residents feel unsafe crossing after 7 PM.', 'other', DEPTS[2], 31, 85, 25),
  mk('TT-1007', 'Noise from videoke past curfew', 'Local Ordinance Violations', '2026-10-08T21:45', 'Purok 5', 'Rejected', 'Loud karaoke until 2 AM on weeknights.', 'other', '', 3, 52, 85),
  mk('TT-1008', 'Leaning tree beside the covered court', 'Public Safety', '2026-10-21T07:50', 'Covered Court', 'Submitted', 'A large tree leans toward the court after the last typhoon.', 'other', '', 11, 36, 55)
];
const SEED_ANN = [
  { id: 'A1', title: 'Heavy rain advisory for the weekend', cat: 'Weather Advisory', date: '2026-10-22T08:00', priority: 'High', status: 'Published', body: 'Prepare go-bags and avoid low-lying areas. Check barangay channels for updates.' },
  { id: 'A2', title: 'Partial closure of Mabini Street', cat: 'Road Closure', date: '2026-10-20T17:30', priority: 'Medium', status: 'Published', body: 'Road repair from 9 PM to 4 AM. Use Luna Street as an alternate route.' },
  { id: 'A3', title: 'Updated garbage collection schedule', cat: 'Garbage Collection', date: '2026-10-18T10:00', priority: 'Normal', status: 'Published', body: 'Biodegradable waste: Mon and Thu. Recyclables: Wed. Residual: Sat.' },
  { id: 'A4', title: 'Scheduled water interruption', cat: 'Power or Water Interruption', date: '2026-10-17T13:15', priority: 'High', status: 'Published', body: 'Water service will pause from 8 AM to 2 PM on Tuesday for pipe maintenance.' },
  { id: 'A5', title: 'Curfew hours for minors reminder', cat: 'Curfew Reminder', date: '2026-10-12T09:00', priority: 'Normal', status: 'Published', body: 'Minors must be home by 10 PM. Parents and guardians are asked to cooperate.' },
  { id: 'A6', title: 'Barangay clean-up drive', cat: 'Community Event', date: '2026-10-10T15:45', priority: 'Normal', status: 'Published', body: 'Join neighbors this Saturday at 6 AM at the covered court. Gloves provided.' }
];
const FAQ = [
  ['How do I report a concern?', 'Create a citizen account, choose Report, describe the problem, mark the location and submit. It takes about a minute.'],
  ['Who sees my report?', 'Public lists never show your name. Only assigned officials see the full report details.'],
  ['Can I track my report?', 'Yes. Every report has a status timeline from Submitted to Resolved.'],
  ['Does it work on my phone?', 'Yes. The layout is built for phones, tablets and desktops.'],
  ['What can I report?', 'Road damage, drainage and flooding, street lighting, sanitation, utilities, public safety and other community concerns.'],
  ['How do I get updates?', 'Follow your report timeline, and read advisories and schedules from your barangay on the Announcements page.']
];
const SEED_LOG = [
  { d: '2026-10-21T07:50', action: 'Report created', actor: 'Citizen', detail: 'TT-1008 submitted' },
  { d: '2026-10-20T17:30', action: 'Announcement published', actor: 'Admin', detail: 'A2 Partial closure of Mabini Street' },
  { d: '2026-10-19T13:05', action: 'Status changed', actor: 'Admin', detail: 'TT-1002 to Assigned' },
  { d: '2026-10-18T09:30', action: 'Assignment', actor: 'Admin', detail: 'TT-1001 to Engineering and Infrastructure' },
  { d: '2026-10-15T16:20', action: 'Report created', actor: 'Citizen', detail: 'TT-1004 submitted' }
];
const NOTIFS = ['Your report TT-1001 is now In Progress.', 'New announcement: Heavy rain advisory.', 'TT-1003 was marked Resolved. Thank you for reporting!'];

/* ============ 2. API LAYER — replace each body with fetch() to the backend later ============ */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('tagatugon.v2.' + k)); return v ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem('tagatugon.v2.' + k, JSON.stringify(v)); }
};
const api = {
  // TODO(backend): POST /auth/login. The server must return the role; never trust the client.
  login(email, pw) {
    const u = DEMO_USERS[email.toLowerCase()];
    return u && u.pw === pw ? { email, role: u.role, name: u.name, barangay: u.barangay } : null;
  },
  // TODO(backend): POST /auth/register. Never store passwords on the client.
  register(f) { return { email: f.email, role: 'citizen', name: f.name, barangay: f.barangay }; },
  // TODO(backend): GET /reports
  getReports() { return store.get('reports', SEED_REPORTS); },
  // TODO(backend): POST /reports (multipart with photo)
  createReport(r) {
    const list = api.getReports(); const id = 'TT-' + (1001 + list.length);
    const rep = { ...mk(id, r.title, r.cat, nowISO(), r.loc, 'Submitted', r.desc, 'me', '', 0, r.x, r.y), media: r.media || null };   // TODO(backend): upload the file itself (multipart); only its type and name are kept here
    store.set('reports', [rep, ...list]); api.log('Report created', 'Citizen', id + ' submitted'); return rep;
  },
  // TODO(backend): PATCH /reports/:id (status, notes, resolution) with role checks
  updateReport(id, patch) {
    const list = api.getReports(), r = list.find(x => x.id === id);
    if (patch.status && patch.status !== r.status) { r.history.push({ s: patch.status, d: nowISO() }); api.log('Status changed', 'Admin', `${id} to ${patch.status}`); }
    if (patch.dept && patch.dept !== r.dept) api.log('Assignment', 'Admin', `${id} to ${patch.dept}`);
    if (patch.note) r.notes.push({ d: nowISO(), t: patch.note });
    Object.assign(r, { status: patch.status, dept: patch.dept, resolution: patch.resolution }); r.upd = nowISO();
    store.set('reports', list);
  },
  support(id, delta) { const list = api.getReports(); list.find(r => r.id === id).support += delta; store.set('reports', list); },
  // TODO(backend): GET /announcements
  getAnnouncements() { return store.get('ann', SEED_ANN); },
  saveAnnouncements(l) { store.set('ann', l); },
  getLog() { return store.get('log', SEED_LOG); },
  log(action, actor, detail) { store.set('log', [{ d: nowISO(), action, actor, detail }, ...api.getLog()]); },
  // TODO(backend): GET /analytics. Computed here from the sample records.
  getAnalytics() {
    const r = api.getReports(), by = (fn) => r.filter(fn).length;
    return { total: r.length, pending: by(x => ['Submitted', 'Under Review', 'Assigned'].includes(x.status)), progress: by(x => x.status === 'In Progress'), resolved: by(x => x.status === 'Resolved'),
      byCat: CATS.map(c => [c, by(x => x.cat === c)]), byDept: DEPTS.map(d => [d, by(x => x.dept === d && x.status !== 'Resolved')]) };
  }
};

/* ============ 3. HELPERS ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getSession = () => { try { return JSON.parse(sessionStorage.getItem('tt.session') || localStorage.getItem('tt.session')); } catch { return null; } };
const badge = s => `<span class="badge s${STATUSES.indexOf(s)}"><span aria-hidden="true">${SYM[STATUSES.indexOf(s)]}</span>${s}</span>`;
const CAT_KEY = { 'Infrastructure': 'roads', 'Drainage and Flooding': 'drain', 'Street Lighting': 'light', 'Public Safety': 'safety', 'Sanitation and Waste Management': 'waste', 'Local Ordinance Violations': 'noise', 'Utilities': 'facil', 'Other Community Concerns': 'other' };
const tag = c => CAT_KEY[c] ? `<span class="tag cat" data-cat="${CAT_KEY[c]}">${esc(c)}</span>` : `<span class="tag">${esc(c)}</span>`;
const catBar = () => `<div class="catbar" role="group" aria-label="Filter by category"><button type="button" class="catchip all" data-act="catpick" data-cat-val="" aria-pressed="${!F.cat}">All categories</button>${CATS.map(c => `<button type="button" class="catchip" data-cat="${CAT_KEY[c]}" data-act="catpick" data-cat-val="${esc(c)}" aria-pressed="${F.cat === c}"><span class="cdot" aria-hidden="true"></span>${esc(c)}</button>`).join('')}</div>`;
function syncCatUI() { document.querySelectorAll('.catchip').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.catVal || '') === F.cat))); const sl = $('#cat'); if (sl) sl.value = F.cat; }
const fld = (id, label, ctrl, hint = '') => `<div class="fld"><label for="${id}">${label}</label>${ctrl}${hint ? `<small>${hint}</small>` : ''}<p class="err" id="e-${id}" role="alert"></p></div>`;
const inp = (id, type = 'text', x = '') => `<input id="${id}" name="${id}" type="${type}" ${x}>`;
const sel = (id, opts, first, cur) => `<select id="${id}" name="${id}">${first !== undefined ? `<option value="">${first}</option>` : ''}${opts.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
function validate(rules) {
  let ok = true, first = null;
  for (const [id, [test, msg]] of Object.entries(rules)) {
    const el = $('#' + id), bad = !test(el.value ? el.value.trim() : '', el);
    $('#e-' + id).textContent = bad ? msg : ''; el.setAttribute('aria-invalid', bad);
    if (bad) { ok = false; first = first || el; }
  }
  if (first) first.focus(); return ok;
}
function toast(msg, bad) {
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, 3800);
}
const dlg = $('#dlg');
function openDlg(title, body) {
  dlg.innerHTML = `<div class="dlg-h"><h2 id="dlgTitle">${title}</h2><button class="x" data-act="close" aria-label="Close dialog">×</button></div><div class="dlg-b">${body}</div>`;
  dlg.showModal();
}
function confirmDlg(msg, fn) {
  openDlg('Please confirm', `<p>${msg}</p><div class="row"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" id="yes">Confirm</button></div>`);
  $('#yes').onclick = () => { dlg.close(); fn(); };
}
/* Live base map (Leaflet + OpenStreetMap): zoom with the +/- buttons, mouse wheel or pinch; drag to pan.
   Hover (or tap) a pin to see the report's details; click it to open the full report.
   Reports keep their x/y position (percent of the city frame below); these helpers convert to/from real coordinates.
   TODO(backend): store lat/lng directly on each report instead of x/y. */
const MAP_BOX = { w: 120.88, e: 121.01, s: 14.27, n: 14.385 };
const MAP_HOME = [14.3294, 120.9367], MAP_ZOOM = 13;
const xyToLL = (x, y) => [MAP_BOX.n - (y / 100) * (MAP_BOX.n - MAP_BOX.s), MAP_BOX.w + (x / 100) * (MAP_BOX.e - MAP_BOX.w)];
const llToXY = ll => [+((ll.lng - MAP_BOX.w) / (MAP_BOX.e - MAP_BOX.w) * 100).toFixed(2), +((MAP_BOX.n - ll.lat) / (MAP_BOX.n - MAP_BOX.s) * 100).toFixed(2)];

/* ---- Dasmariñas-only: the map is locked to the city. The real boundary is fetched once from OpenStreetMap (Nominatim)
   and cached; until it arrives (or if the request fails) the rectangle above is used. ---- */
const CITY = { bounds: null, rings: null, ready: false, waiters: [] };
CITY.bounds = () => L.latLngBounds([MAP_BOX.s, MAP_BOX.w], [MAP_BOX.n, MAP_BOX.e]);
const ringHas = (ring, lat, lng) => { let in_ = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [yi, xi] = ring[i], [yj, xj] = ring[j]; if ((xi > lng) !== (xj > lng) && lat < (yj - yi) * (lng - xi) / (xj - xi) + yi) in_ = !in_; } return in_; };
const inCity = ll => {
  ll = L.latLng(ll);
  if (!CITY.rings) return CITY.bounds().contains(ll);
  return CITY.rings.some(poly => ringHas(poly[0], ll.lat, ll.lng) && !poly.slice(1).some(h => ringHas(h, ll.lat, ll.lng)));
};
function loadCity() {
  const apply = polys => {   // polys: [[ [ [lat,lng]... ], hole... ], ...]
    CITY.rings = polys; const all = polys.flatMap(p => p[0]);
    const b = L.latLngBounds(all); CITY.bounds = () => b; CITY.ready = true;
    CITY.waiters.splice(0).forEach(fn => fn());
  };
  const fromGeo = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map(p => p.map(r => r.map(([lng, lat]) => [lat, lng])));
  try { const c = JSON.parse(localStorage.getItem('tt.cityShape') || 'null'); if (c && c.length) return apply(c); } catch (e) {}
  fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&polygon_threshold=0.0005&limit=5&countrycodes=ph&q=' + encodeURIComponent('Dasmariñas, Cavite'), { headers: { Accept: 'application/json' } })
    .then(r => r.json()).then(list => {
      const hit = list.find(x => x.geojson && /Polygon/.test(x.geojson.type) && x.addresstype !== 'suburb' && (x.addresstype === 'city' || x.type === 'administrative'));
      if (!hit) return; const polys = fromGeo(hit.geojson);
      try { localStorage.setItem('tt.cityShape', JSON.stringify(polys)); } catch (e) {}
      apply(polys);
    }).catch(() => {});
}

const MAPDATA = {}; let mapSeq = 0, liveMaps = [];
function mapHTML(list, pick) {
  const id = 'lm' + (++mapSeq); MAPDATA[id] = { list: list.filter(r => r.x != null), pick: !!pick };
  return `<div><div class="map live ${pick ? 'pick' : ''}" id="${id}" data-live="${id}" role="group" aria-label="Interactive map of Dasmariñas City, Cavite. Use the plus and minus buttons to zoom."></div>
    <p class="map-note">${pick ? 'Search for a place or zoom in and click the map to drop a pin. Pins can only be placed inside Dasmariñas City.' : 'Search a place, scroll or use + / − to zoom, drag to move. Hover a pin for details, click it to open the report.'}</p></div>`;
}
function tipHTML(r) {
  const d = String(r.desc || ''), short = d.length > 110 ? d.slice(0, 107).trimEnd() + '…' : d;
  return `<div class="mt-tip"><span class="mt-id">${esc(r.id)}</span><b class="mt-title">${esc(r.title)}</b>${tag(r.cat)} ${badge(r.status)}
    <span class="mt-line">${esc(r.loc)}</span><span class="mt-line">Submitted ${esc(fmtDT(r.date))} · ${r.support} supporter${r.support === 1 ? '' : 's'}</span>${short ? `<span class="mt-desc">${esc(short)}</span>` : ''}<span class="mt-hint">Click for full details</span></div>`;
}
function killMaps() { liveMaps.forEach(m => { try { m.remove(); } catch (e) {} }); liveMaps = []; }

/* Keep a hover tooltip fully inside the map: flip it below the pin when there is no room above, and nudge it sideways
   near the left/right edges (the little arrow keeps pointing at the pin). */
function fitTooltip(map, tt) {
  const el = tt && tt.getElement(); if (!el || !map.getContainer().isConnected) return;
  const box = map.getContainer().getBoundingClientRect(), pad = 8;
  el.style.maxWidth = Math.max(160, Math.min(300, box.width - pad * 2)) + 'px';
  el.style.translate = ''; el.classList.remove('lm-flip'); el.style.removeProperty('--lm-dx');
  const src = tt._source, icon = src && src._icon; if (!icon) return;
  const pin = icon.getBoundingClientRect(), r = el.getBoundingClientRect();
  const above = pin.top - box.top - pad, below = box.bottom - pin.bottom - pad;
  let dy = 0, dx = 0;
  if (r.top < box.top + pad) {                     // not enough room above the pin
    if (below >= r.height + 6 || below > above) { el.classList.add('lm-flip'); dy = (pin.bottom + 10) - r.top; }
    else dy = box.top + pad - r.top;               // tiny map: slide down so the card is never cut off
  }
  if (r.left < box.left + pad) dx = box.left + pad - r.left;
  else if (r.right > box.right - pad) dx = box.right - pad - r.right;
  if (el.classList.contains('lm-flip')) { const r2 = el.getBoundingClientRect(); if (r2.bottom + dy > box.bottom - pad && dy > 0) dy = Math.max(0, box.bottom - pad - r2.bottom); }
  if (dx || dy) el.style.translate = `${dx}px ${dy}px`;
  el.style.setProperty('--lm-dx', dx + 'px');
}

/* Search box (OpenStreetMap Nominatim, limited to Dasmariñas). Returns a Leaflet control. */
function searchControl(onPick) {
  const Ctl = L.Control.extend({
    options: { position: 'topright' },
    onAdd(map) {
      const wrap = L.DomUtil.create('div', 'lm-search');
      wrap.innerHTML = `<button type="button" class="lm-fab" aria-label="Search places in Dasmariñas" aria-expanded="false" title="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>
        <div class="lm-panel"><div class="lm-search-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
        <input type="text" class="lm-q" placeholder="Search in Dasmariñas…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-label="Search a place in Dasmariñas City">
        <button type="button" class="lm-clear" aria-label="Close search">×</button></div>
        <ul class="lm-results" role="listbox" hidden></ul><p class="lm-msg" role="status" hidden></p></div>`;
      L.DomEvent.disableClickPropagation(wrap); L.DomEvent.disableScrollPropagation(wrap);
      ['input', 'change', 'keyup', 'keypress'].forEach(t => wrap.addEventListener(t, e => e.stopPropagation()));
      const fab = wrap.querySelector('.lm-fab'), panel = wrap.querySelector('.lm-panel'), q = wrap.querySelector('.lm-q'), ul = wrap.querySelector('.lm-results'), msg = wrap.querySelector('.lm-msg'), clr = wrap.querySelector('.lm-clear');
      let items = [], act = -1, timer = 0, ctrl = null, last = '';
      const size = () => { panel.style.width = Math.max(180, Math.min(320, map.getContainer().clientWidth - 40)) + 'px'; };
      size(); map.on('resize', size);
      const say = t => { msg.textContent = t || ''; msg.hidden = !t; };
      const close = () => { ul.hidden = true; q.setAttribute('aria-expanded', 'false'); act = -1; };
      const mark = i => { act = i; [...ul.children].forEach((li, k) => li.classList.toggle('on', k === i)); if (i >= 0) { q.setAttribute('aria-activedescendant', ul.children[i].id); ul.children[i].scrollIntoView({ block: 'nearest' }); } else q.removeAttribute('aria-activedescendant'); };
      const choose = i => { const it = items[i]; if (!it) return; say(''); collapse(); onPick(L.latLng(it.lat, it.lng), it); };
      const expand = () => { wrap.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); size(); setTimeout(() => q.focus({ preventScroll: true }), 30); };
      const collapse = () => { clearTimeout(timer); if (ctrl) ctrl.abort(); wrap.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); q.value = ''; last = ''; items = []; ul.innerHTML = ''; close(); say(''); };
      fab.addEventListener('click', expand);
      map.on('click', () => { if (wrap.classList.contains('open')) collapse(); });
      const render = () => {
        ul.innerHTML = items.map((it, i) => `<li role="option" id="lmr${mapSeq}-${i}-${Math.random().toString(36).slice(2, 6)}" data-i="${i}"><b>${esc(it.title)}</b><span>${esc(it.sub)}</span></li>`).join('');
        ul.hidden = !items.length; q.setAttribute('aria-expanded', String(!!items.length)); act = -1;
      };
      ul.addEventListener('pointerdown', e => e.preventDefault());      // keep focus in the input
      ul.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) choose(+li.dataset.i); });
      const run = text => {
        if (ctrl) ctrl.abort(); ctrl = new AbortController(); say('Searching…');
        const b = CITY.bounds();
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&countrycodes=ph&accept-language=en&bounded=1'
          + `&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}&q=` + encodeURIComponent(text);
        fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } }).then(r => r.json()).then(list => {
          items = list.map(x => { const p = String(x.display_name).split(',').map(t => t.trim()).filter(t => t && !/^(philippines|calabarzon|region iv|\d{4})/i.test(t));
            return { lat: +x.lat, lng: +x.lon, title: x.name || p[0] || text, sub: p.slice(x.name ? 0 : 1, 4).filter(t => t !== (x.name || p[0])).join(', ') }; })
            .filter(it => inCity([it.lat, it.lng])).slice(0, 6);
          render(); say(items.length ? '' : 'No places found inside Dasmariñas. Try a street, barangay or landmark.');
        }).catch(err => { if (err.name !== 'AbortError') say('Search is unavailable right now. You can still click the map.'); });
      };
      q.addEventListener('input', () => {
        const v = q.value.trim(); clearTimeout(timer);
        if (v.length < 3) { items = []; render(); say(''); if (ctrl) ctrl.abort(); return; }
        if (v === last) return; last = v; timer = setTimeout(() => run(v), 450);   // Nominatim asks for ≤1 request/second
      });
      q.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (act >= 0) choose(act); else if (items.length) choose(0); else if (q.value.trim().length >= 3) { clearTimeout(timer); last = q.value.trim(); run(last); } }   // never submit the report form
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); mark((act + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length); }
        else if (e.key === 'Escape') { e.stopPropagation(); collapse(); fab.focus({ preventScroll: true }); }
      });
      q.addEventListener('focus', () => { if (items.length) { ul.hidden = false; q.setAttribute('aria-expanded', 'true'); } });
      q.addEventListener('blur', () => setTimeout(close, 120));
      clr.addEventListener('click', () => { collapse(); fab.focus({ preventScroll: true }); });
      return wrap;
    }
  });
  return new Ctl();
}

function initMaps() {
  if (!window.L) return;
  liveMaps = liveMaps.filter(m => { if (m.getContainer().isConnected) return true; try { m.remove(); } catch (e) {} return false; });
  document.querySelectorAll('.map[data-live]').forEach(el => {
    const d = MAPDATA[el.dataset.live]; if (!d || el._lf) return; el._lf = true;
    const b0 = CITY.bounds();
    const map = L.map(el, { center: MAP_HOME, zoom: MAP_ZOOM, minZoom: 12, maxZoom: 19, scrollWheelZoom: true, zoomControl: true, attributionControl: true,
      maxBounds: b0.pad(0.12), maxBoundsViscosity: 1 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);

    // outline of the city + a soft veil over everything outside it
    let outline = null, veil = null, fitted = false;
    const paintCity = () => {
      if (outline) { outline.remove(); outline = null; } if (veil) { veil.remove(); veil = null; }
      const b = CITY.bounds(); map.setMaxBounds(b.pad(0.12));
      const polys = CITY.rings || [[[b.getSouthWest(), b.getNorthWest(), b.getNorthEast(), b.getSouthEast()].map(p => [p.lat, p.lng])]];
      outline = L.polygon(polys, { className: 'lm-city', color: '#286B43', weight: 2.5, fillOpacity: 0, interactive: false }).addTo(map);
      const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
      veil = L.polygon([world, ...polys.map(p => p[0])], { className: 'lm-veil', stroke: false, fillOpacity: 1, interactive: false }).addTo(map);
      map.setMinZoom(Math.max(10, map.getBoundsZoom(b.pad(0.1), true)));
    };
    paintCity();
    if (!CITY.ready) CITY.waiters.push(() => { if (map._container && map.getContainer().isConnected) { paintCity(); if (!fitted) { map.fitBounds(CITY.bounds(), { padding: [10, 10] }); } } });

    const pts = [];
    d.list.forEach(r => {
      const ll = xyToLL(r.x, r.y); pts.push(ll);
      const icon = L.divIcon({ className: 'lpin-wrap', html: `<span class="lpin" data-st="${STATUSES.indexOf(r.status)}"></span>`, iconSize: [26, 26], iconAnchor: [13, 26], tooltipAnchor: [0, -28] });
      const mk = L.marker(ll, { icon, title: r.title, keyboard: true, riseOnHover: true }).addTo(map);
      mk.bindTooltip(tipHTML(r), { direction: 'top', className: 'lm-tooltip', opacity: 1, offset: [0, -2] });
      mk.on('click', () => openDlg(esc(r.title), detailHTML(r, false)));
    });
    // reposition the open tooltip so it always fits, also while the map is being moved or zoomed
    let openTip = null;
    map.on('tooltipopen', e => { openTip = e.tooltip; fitTooltip(map, openTip); requestAnimationFrame(() => openTip && fitTooltip(map, openTip)); });
    map.on('tooltipclose', () => { openTip = null; });
    map.on('move zoomend resize', () => { if (openTip) fitTooltip(map, openTip); });

    // search: fly to the result; in the report form it also drops the pin there
    let found = null, place = null;
    const sc = searchControl((ll, it) => {
      if (!inCity(ll)) return toast('That place is outside Dasmariñas City.', true);
      map.flyTo(ll, Math.max(map.getZoom(), 17), { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.8 });
      if (d.pick && place) { place(ll); const loc = $('#loc'); if (loc && !loc.value.trim()) { loc.value = it.title + (it.sub ? ', ' + it.sub.split(',')[0] : ''); loc.dispatchEvent(new Event('input', { bubbles: true })); } }
      else { if (found) found.setLatLng(ll); else found = L.marker(ll, { icon: L.divIcon({ className: 'lpin-wrap', html: '<span class="lpin lpin-found"></span>', iconSize: [26, 26], iconAnchor: [13, 26] }), interactive: false, keyboard: false }).addTo(map); }
    });
    sc.addTo(map);

    if (d.pick) {
      let drop = null;
      place = ll => {
        ll = L.latLng(ll);
        if (!inCity(ll)) { toast('Pins can only be placed inside Dasmariñas City.', true); return false; }
        if (drop) drop.setLatLng(ll); else drop = L.marker(ll, { icon: L.divIcon({ className: 'lpin-wrap', html: '<span class="lpin"></span>', iconSize: [26, 26], iconAnchor: [13, 26] }), interactive: false }).addTo(map);
        const [x, y] = llToXY(ll); $('#mapX').value = x; $('#mapY').value = y; $('#coords').textContent = `Pin set: ${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
        return true;
      };
      el._place = place;
      map.on('click', e => place(e.latlng));
      if ($('#mapX') && $('#mapX').value) place(L.latLng(xyToLL(+$('#mapX').value, +$('#mapY').value)));
    }
    if (d.pick) { const p = $('#mapX') && $('#mapX').value; if (!p) map.fitBounds(CITY.bounds(), { padding: [10, 10] }); else map.setView(xyToLL(+$('#mapX').value, +$('#mapY').value), 16); fitted = true; }
    else if (pts.length > 1) { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 }); fitted = true; }
    else if (pts.length === 1) { map.setView(pts[0], 15); fitted = true; }
    else map.fitBounds(CITY.bounds(), { padding: [10, 10] });
    liveMaps.push(map);
    setTimeout(() => map.invalidateSize(), 80);   // the pane may still be laying out (stepper / list)
  });
}
if (window.L) loadCity();
/* the stepper hides the Location pane until its step is open; resize the map when it becomes visible */
document.addEventListener('click', () => setTimeout(() => liveMaps.forEach(m => m.invalidateSize()), 120));

/* ---- Minimal line icons (1.6 stroke, inherit text colour) ---- */
const IC = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  login: '<path d="M14 4h5v16h-5"/><path d="M4 12h11M11 8l4 4-4 4"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', pin: '<path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'
};
const ico = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---- Stepper + segmented control (vanilla port of the React Bits Stepper setup) ---- */
const RULE = {
  title: [v => v.length >= 5, 'Title needs at least 5 characters.'], desc: [v => v.length >= 20, 'Describe the concern in at least 20 characters.'],
  rcat: [v => v, 'Choose a category.'], loc: [v => v, 'Enter the location.'], rName: [v => v.length > 1, 'Enter your full name.'],
  rEmail: [v => /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email address.'], rPw: [v => v.length >= 8, 'Use at least 8 characters.'],
  rPw2: [v => v === $('#rPw').value && v, 'Passwords do not match.'], rBrgy: [v => v, 'Enter your barangay or locality.'],
  rTerms: [(v, el) => el.checked, 'Please accept the terms to continue.']
};
const pick = (...k) => Object.fromEntries(k.map(x => [x, RULE[x]]));
const STEP_RULES = { reportForm: { 1: pick('title', 'desc', 'rcat'), 2: pick('loc') }, regForm: { 1: pick('rName', 'rEmail', 'rPw', 'rPw2'), 2: pick('rBrgy', 'rTerms') } };
const stepper = (titles, panes, final) => `<div class="stepper" data-step="1" data-n="${titles.length}" data-final="${final}">
  <div class="st-track" role="list"><span class="st-glider" aria-hidden="true"></span>${titles.map((t, i) => `<button type="button" class="st-seg" role="listitem" data-act="stgo" data-i="${i + 1}"><span class="st-badge">${i + 1}</span><span class="st-title">${t}</span></button>`).join('')}</div>
  <div class="st-body">${panes.map((p, i) => `<div class="st-pane" data-pane="${i + 1}">${p}</div>`).join('')}</div>
  <div class="st-foot"><button type="button" class="btn ghost" data-act="stback">${ico('back')}Back</button><button type="button" class="btn st-next" data-act="stnext"><span>Continue</span>${ico('arrow')}</button></div></div>`;
const seg = (items, cur, act) => `<div class="st-track" role="group"><span class="st-glider" aria-hidden="true"></span>${items.map(([v, l, ic]) => `<button type="button" class="st-seg" data-act="${act}" data-v="${v}" aria-pressed="${v === cur}" ${v === cur ? 'data-on' : ''}>${ico(ic)}<span class="st-title">${l}</span></button>`).join('')}</div>`;
function placeGliders() {
  document.querySelectorAll('.st-track').forEach(t => {
    const g = t.querySelector('.st-glider'), a = t.querySelector('[data-on]'); if (!g || !a) return;
    g.style.width = a.offsetWidth + 'px'; g.style.height = a.offsetHeight + 'px'; g.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`;
    requestAnimationFrame(() => g.classList.add('ready'));
  });
}
function stepTo(st, n) {
  const N = +st.dataset.n, form = st.closest('form'); n = Math.max(1, Math.min(N, n)); st.dataset.step = n;
  st.querySelectorAll('.st-pane').forEach(p => { p.hidden = +p.dataset.pane !== n; });
  st.querySelectorAll('.st-seg').forEach((b, i) => {
    b.toggleAttribute('data-on', i + 1 === n); b.toggleAttribute('data-done', i + 1 < n); b.querySelector('.st-badge').innerHTML = i + 1 < n ? ico('check') : i + 1;
    if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  st.querySelector('[data-act=stback]').style.visibility = n === 1 ? 'hidden' : 'visible';
  const nx = st.querySelector('.st-next'); nx.type = form && n === N ? 'submit' : 'button'; nx.querySelector('span').textContent = n === N ? st.dataset.final : 'Continue';
  if (n < N) nx.setAttribute('data-act', 'stnext'); else if (form) nx.removeAttribute('data-act'); else nx.setAttribute('data-act', 'stdone');
  const r = $('#review', st); if (r && n === N) { const v = id => esc($('#' + id).value || '-'); r.innerHTML = `<dl class="meta"><dt>Title</dt><dd>${v('title')}</dd><dt>Category</dt><dd>${v('rcat')}</dd><dt>Location</dt><dd>${v('loc')}</dd><dt>Attachment</dt><dd>${($('#mtype').value === 'video' ? 'Video: ' : 'Photo: ') + esc($($('#mtype').value === 'video' ? '#video' : '#photo').files[0]?.name || 'None')}</dd></dl>`; }
  placeGliders();
}
function nextStep(st) {
  const n = +st.dataset.step, form = st.closest('form'), rules = form && STEP_RULES[form.id]?.[n];
  if (rules && !validate(rules)) return; stepTo(st, n + 1);
}

/* ---- Decorative phone mockups for the hero (sample screens, not real data) ---- */
const phone = (cls, title, body) => `<div class="phone ${cls}"><span class="ph-notch"></span><div class="ph-screen"><p class="ph-title">${title}</p>${body}</div></div>`;
const PHONE_REPORT = '<span class="ph-field">Pothole near the market</span><span class="ph-field">Describe what you saw...</span><div class="ph-chips"><b>Roads</b><b>Drainage</b><b>Lighting</b><b>Safety</b></div><span class="ph-field">Market Road, Zapote</span><i class="ph-btn">Submit report</i>';
const PHONE_MAP = '<div class="ph-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><g fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2"><path d="M0 60C25 45 45 75 100 40"/><path d="M30 0C35 40 25 70 40 100"/><path d="M70 0L65 100"/></g></svg><i class="ph-pin" style="left:30%;top:40%"></i><i class="ph-pin done" style="left:64%;top:28%"></i><i class="ph-pin" style="left:55%;top:68%"></i></div><div class="ph-card"><b>Clogged drainage</b><span>Under review · 17 supports</span></div><div class="ph-card"><b>Broken streetlight</b><span>Resolved</span></div>';
const PHONE_LIST = '<div class="ph-card"><b>Broken streetlight</b><span>● Resolved</span></div><div class="ph-card"><b>Pothole on market road</b><span>◐ In progress</span></div><div class="ph-card"><b>Garbage along creek</b><span>◈ Assigned</span></div><div class="ph-card"><b>Exposed wires</b><span>○ Submitted</span></div>';

/* ============ LOGIN POP-UP: a lanyard ID. Front = citizen, back = admin. The form sits ON the card. ============ */
let loginRole = 'citizen', loginOpen = false, lanyard = null, lanyardTok = 0, lastRoute = 'home';
const ROLE_UI = {
  citizen: { name: 'Citizen', links: 'New here? <a href="#/register">Create a citizen account</a>', u: 'citizen@tagatugon.ph', p: 'citizen123' },
  admin: { name: 'Admin', links: 'Admin accounts are issued by the LGU.', u: 'admin@tagatugon.ph', p: 'admin123' }
};
/* Card artwork, drawn in code (header band + blank body where the form is pinned). */
function idArt(role) {
  const W = 1024, H = 1440, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), admin = role === 'admin', F = (w, px) => `${w} ${px}px Poppins, system-ui, sans-serif`;
  x.fillStyle = admin ? '#eef1f5' : '#f3f7f3'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, W, 430);
  if (admin) { g.addColorStop(0, '#243445'); g.addColorStop(1, '#0f1720'); } else { g.addColorStop(0, '#286B43'); g.addColorStop(1, '#1c4b2f'); }
  x.fillStyle = g; x.fillRect(0, 0, W, 430);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(W * .92, 120, 300, 0, 7); x.fill();
  x.fillStyle = admin ? '#77C995' : '#a9dcb9'; x.fillRect(0, 430, W, 10);
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#fff';
  x.beginPath(); x.arc(112, 252, 24, 0, 7); x.fillStyle = '#fff'; x.fill();
  x.beginPath(); x.arc(112, 252, 9, 0, 7); x.fillStyle = admin ? '#243445' : '#286B43'; x.fill();
  x.fillStyle = '#fff'; x.font = F(600, 54); x.fillText('TagaTugon', 158, 270);
  x.font = F(700, 104); x.fillText(admin ? 'Admin' : 'Citizen', 100, 385);
  x.textAlign = 'center'; x.fillStyle = '#5b6b61'; x.font = F(300, 30);
  x.fillText(admin ? 'Flip the card to log in as a citizen' : 'Flip the card to log in as admin', W / 2, 1396);
  return c.toDataURL('image/png');
}
function strapArt() {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 192; const x = c.getContext('2d');
  x.fillStyle = '#286B43'; x.fillRect(0, 0, 1600, 192); x.fillStyle = '#fff'; x.font = '700 54px Poppins, system-ui, sans-serif'; x.textBaseline = 'middle';
  x.fillText('TAGATUGON  ·  BARANGAY  ·  TAGATUGON  ·  BARANGAY  ·  ', 20, 98);
  return c.toDataURL('image/png');
}
function ensureLogin() {
  if ($('#loginOverlay')) return;
  document.body.insertAdjacentHTML('beforeend', `<div id="loginOverlay" class="lo" hidden role="dialog" aria-modal="true" aria-label="Log in">
    <button type="button" class="lo-close" data-act="closelogin" aria-label="Close log in">&times;</button>
    <div id="lanyard" class="lanyard-host"><div id="idForm" class="id-form">
      <div class="id-head"><b>TagaTugon</b><span id="idRole">Citizen</span></div>
      <form id="loginForm" data-role="citizen" novalidate>${fld('email', 'Email or username', inp('email', 'text', 'autocomplete="username"'))}
        ${fld('password', 'Password', `<div class="id-pw">${inp('password', 'password', 'autocomplete="current-password"')}<button type="button" class="btn ghost sm" data-act="pw" aria-label="Show or hide password">Show</button></div>`)}
        <p class="id-row"><label class="id-chk"><input type="checkbox" id="remember"> Remember me</label><a href="#/forgot" data-act="forgot">Forgot password?</a></p>
        <button class="btn" type="submit">Log in</button><p class="err" id="e-form" role="alert"></p></form>
      <p class="id-links"><span id="roleLinks"></span><br><button type="button" class="id-demo" id="demoBtn" data-act="fill">Use demo account</button></p>
    </div></div>
    <div class="lo-foot"><div class="role-switch" role="group" aria-label="Log in as"><button type="button" data-act="role" data-role="citizen" aria-pressed="true">Citizen</button><button type="button" data-act="role" data-role="admin" aria-pressed="false">Admin</button></div><p>Drag the ID. Click it to flip it over.</p></div></div>`);
}
function applyRole(role, force) {
  role = role === 'admin' ? 'admin' : 'citizen';
  if (role === loginRole && !force) return;
  loginRole = role; const u = ROLE_UI[role], f = $('#loginForm'); if (!f) return;
  document.querySelectorAll('.role-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  f.dataset.role = role; $('#idRole').textContent = u.name; $('#roleLinks').innerHTML = u.links;
  const d = $('#demoBtn'); d.dataset.u = u.u; d.dataset.p = u.p;
  ['email', 'password'].forEach(k => { $('#' + k).value = ''; const e = $('#e-' + k); if (e) e.textContent = ''; }); $('#e-form').textContent = '';
}
/* Maps the form's flat box onto the card's four on-screen corners (a perspective transform). */
function cardMatrix(q, RW, RH) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, d, e, g = 0, h = 0;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) { a = x1 - x0; b = x3 - x0; d = y1 - y0; e = y3 - y0; }
  else { const det = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / det; h = (dx1 * dy3 - dx3 * dy1) / det; a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; }
  return `matrix3d(${[a / RW, d / RW, 0, g / RW, b / RH, e / RH, 0, h / RH, 0, 0, 1, 0, x0, y0, 0, 1].map(n => +n.toFixed(6)).join(',')})`;
}
function cardFrame({ back, facing, quad }) {
  const el = $('#idForm'); if (!el) return;
  if (back !== (loginRole === 'admin')) applyRole(back ? 'admin' : 'citizen');   // content swaps while the card is edge-on
  el.style.transform = cardMatrix(quad, 320, 450);
  const o = Math.min(1, Math.max(0, (facing - .3) / .35));
  el.style.opacity = o; el.style.visibility = o > .02 ? 'visible' : 'hidden';
  if (o > .02 && !el.hasAttribute('data-in')) el.setAttribute('data-in', '');   // first time the form is visible this open: its contents stagger in (see motion block in style.css)
}
const closeLogin = () => { location.hash = '#/' + (lastRoute || 'home'); };
function showLogin() {
  ensureLogin();
  if (!$('#app').firstElementChild) { current = 'home'; $('#app').innerHTML = VIEWS.home(); refresh(); initSV(); document.title = 'TagaTugon · home'; }   // page behind the pop-up
  current = 'login'; renderNav();
  if (loginOpen) return; loginOpen = true;
  $('#loginOverlay').hidden = false; document.body.style.overflow = 'hidden';
  document.querySelectorAll('main,.top,.foot').forEach(el => { el.inert = true; });
  applyRole('citizen', true); initLanyard();
}
function hideLogin() {
  if (!loginOpen) return; loginOpen = false; lanyardTok++;
  if (lanyard) { lanyard.destroy(); lanyard = null; }
  const o = $('#loginOverlay'); if (o) o.hidden = true;
  const idf = $('#idForm'); if (idf) idf.removeAttribute('data-in');
  document.body.style.overflow = ''; document.querySelectorAll('main,.top,.foot').forEach(el => { el.inert = false; });
}
async function initLanyard() {
  const host = $('#lanyard'); if (!host || lanyard) return;
  const tok = ++lanyardTok, box = $('#loginOverlay'); box.classList.remove('no3d');
  try { if (document.fonts) await document.fonts.load('700 64px Poppins'); } catch (e) {}
  if (tok !== lanyardTok) return;
  const inst = window.TTLanyard ? await window.TTLanyard.create(host, {
    frontImage: idArt('citizen'), backImage: idArt('admin'), strapImage: strapArt(),
    size: 0.66, strapLength: 0.5, cornerRadius: 0.3, finish: 'glossy', metal: 'silver',
    onFrame: cardFrame, onMiss: closeLogin
  }) : null;
  if (tok !== lanyardTok) { if (inst) inst.destroy(); return; }
  if (!inst) { box.classList.add('no3d'); const idf = $('#idForm'); if (idf) idf.setAttribute('data-in', ''); return; }   // no WebGL / offline: plain ID card with the same form
  lanyard = inst;
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => { if (loginOpen && tok === lanyardTok) $('#email').focus({ preventScroll: true }); }, 700);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && loginOpen) closeLogin(); });

/* ============ SPOTLIGHT CARDS (profile view) ============ */
let spots = [];
function killSpots() { spots.forEach(x => x.destroy()); spots = []; }
function initSpots() {
  if (!window.TTSpotlight) return;
  const touch = matchMedia('(pointer: coarse)').matches;
  document.querySelectorAll('#app [data-spot]').forEach(el => {
    const hero = el.dataset.spot === 'hero';   // the ID-style profile card: dark green in dark mode, soft white-green in light mode
    const sp = window.TTSpotlight.attach(el, hero
      ? { theme: 'auto', spotlightColor: t => (t === 'dark' ? '#ffffff' : '#286B43'), intensity: t => (t === 'dark' ? 0.28 : 0.8), spotlightSize: 300, softness: 0.7, borderGlow: t => (t === 'dark' ? 0.9 : 1), proximity: 90, smoothing: 0.3, flare: true, ambient: true }
      : { theme: 'auto', spotlightColor: t => (t === 'dark' ? '#77C995' : '#286B43'),
          // the light theme dims the light (x0.28), so it needs a much higher value to read on the pale cards
          intensity: t => (t === 'dark' ? 0.32 : 0.85), spotlightSize: 320, softness: 0.7, shape: 'circle', borderGlow: t => (t === 'dark' ? 0.9 : 1),
          proximity: 80, smoothing: 0.3, flare: true, grain: 0, ambient: touch });
    if (sp) spots.push(sp);
  });
}

/* ============ PROFILE PHOTO (stored per account on this device; TODO(backend): upload to the server) ============ */
let pendingPhoto;   // undefined = unchanged, null = remove, string = new photo (data URL)
const photoKey = u => 'photo.' + String((u && u.email) || '').toLowerCase();
const getPhoto = u => { const v = store.get(photoKey(u), null); return typeof v === 'string' && v.startsWith('data:image/') ? v : null; };
const initials = n => (String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
function renderPhPrev() {
  const box = $('#phPrev'); if (!box) return; const u = getSession();
  const ph = pendingPhoto !== undefined ? pendingPhoto : getPhoto(u);
  box.innerHTML = ph ? `<img src="${esc(ph)}" alt="Profile photo preview">` : `<span aria-hidden="true">${esc(initials(u.name))}</span>`;
  const rm = $('#phRemove'); if (rm) rm.disabled = !ph;
}
function handlePhoto(file) {
  const err = $('#e-phFile'); if (err) err.textContent = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { err.textContent = 'Please choose an image file.'; return; }
  if (file.size > 8 * 1024 * 1024) { err.textContent = 'That image is over 8 MB. Please choose a smaller one.'; return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const S = 320, c = document.createElement('canvas'), x = c.getContext('2d'), m = Math.min(img.width, img.height);
    c.width = c.height = S; x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
    x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);   // centre-crop to a square
    URL.revokeObjectURL(url); pendingPhoto = c.toDataURL('image/jpeg', 0.86); renderPhPrev();
  };
  img.onerror = () => { URL.revokeObjectURL(url); err.textContent = 'That file could not be read as an image. Try a JPG or PNG.'; };
  img.src = url;
}

/* ============ SQUISH SWITCHES (notification preferences) ============ */
let switches = [];
function killSwitches() { switches.forEach(x => x.destroy()); switches = []; }
function initSwitches() {
  if (!window.TTSwitch) return;
  document.querySelectorAll('#app .squish-switch').forEach(btn => {
    const key = btn.dataset.pref;
    const sw = window.TTSwitch.attach(btn, { width: 52, height: 30, radius: 15, onChange: on => {
      const p = store.get('prefs', { sms: true, push: true, email: false }); p[key] = on; store.set('prefs', p); toast('Preference saved.');
    } });
    if (sw) switches.push(sw);
  });
}

/* ============ GLIDE SELECTS (report attachment type) ============ */
const MEDIA_OPTS = [{ value: 'photo', label: 'Photo', tag: 'JPG, PNG' }, { value: 'video', label: 'Video', tag: 'MP4, MOV' }];
let glides = [];
function killGlides() { glides.forEach(g => g.destroy()); glides = []; }
function setMediaType(t) {
  const v = t === 'video' ? 'video' : 'photo', other = v === 'video' ? 'photo' : 'video';
  $('#mtype').value = v; $('#mediaPhoto').hidden = v !== 'photo'; $('#mediaVideo').hidden = v !== 'video';
  const f = $('#' + other), box = $('#' + (other === 'video' ? 'pvV' : 'pvP')), er = $('#e-' + other);
  if (f) f.value = ''; if (box) box.innerHTML = ''; if (er) er.textContent = '';   // only one attachment per report
}
function initGlides() {
  if (!window.TTGlide) return;
  document.querySelectorAll('#app [data-glide=media]').forEach(el => {
    const g = window.TTGlide.attach(el, { options: MEDIA_OPTS, value: $('#mtype') ? $('#mtype').value : 'photo', ariaLabel: 'Attachment type', size: 'lg', radius: 14, onChange: setMediaType });
    if (g) glides.push(g);
  });
}

/* ============ 4. VIEWS ============ */
let F = { q: '', cat: '', status: '', sort: 'new' }, current = 'home', commView = 'list';
const reportLink = () => { const s = getSession(); return !s ? '#/login' : s.role === 'admin' ? '#/adminreports' : '#/submit'; };
const filt = l => l.filter(r => (!F.q || (r.title + r.loc + r.id).toLowerCase().includes(F.q.toLowerCase())) && (!F.cat || r.cat === F.cat) && (!F.status || r.status === F.status))
  .sort((a, b) => F.sort === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
const filterBar = (cats, withStatus, withSort) => `${cats === CATS ? catBar() : ''}<div class="filters" role="search"><div><label class="sr" for="q">Search</label><input id="q" data-f="q" type="search" placeholder="Search…" value="${esc(F.q)}"></div>
  <div><label class="sr" for="cat">Category</label>${sel('cat', cats, 'All categories', F.cat).replace('<select', '<select data-f="cat"')}</div>
  ${withStatus ? `<div><label class="sr" for="status">Status</label>${sel('status', STATUSES, 'All statuses', F.status).replace('<select', '<select data-f="status"')}</div>` : ''}
  ${withSort ? `<div><label class="sr" for="sort">Sort</label><select id="sort" data-f="sort"><option value="new">Newest first</option><option value="old" ${F.sort === 'old' ? 'selected' : ''}>Oldest first</option></select></div>` : ''}</div>`;
function rowHTML(r, mode) {
  const supported = store.get('supports', []).includes(r.id);
  return `<article class="row-card" data-cat="${CAT_KEY[r.cat] || 'other'}"><div><span class="id">${r.id}</span><h3>${esc(r.title)}</h3><p class="meta-line">${tag(r.cat)} · ${esc(r.loc)} · Submitted ${fmtDT(r.date)} · Updated ${fmtDT(r.upd)}</p>${mode === 'admin' ? `<p class="meta-line">Assigned: ${esc(r.dept || 'Unassigned')}</p>` : ''}</div>
  <div class="side">${badge(r.status)}<button class="btn sm ghost" data-act="view" data-id="${r.id}" ${mode === 'admin' ? 'data-admin="1"' : ''}>${mode === 'admin' ? 'Manage' : 'View Details'}</button>
  ${mode === 'community' ? TTPulse.html({ id: r.id, liked: supported, count: r.support, label: 'Support this issue', action: 'support', size: 26 }) : ''}</div></article>`;
}
const LISTS = {
  myreports: () => { const l = filt(api.getReports().filter(r => r.owner === 'me')); return l.length ? l.map(r => rowHTML(r)).join('') : '<p class="empty">No reports match. Try clearing filters or submit a new report.</p>'; },
  community: () => { const l = filt(api.getReports()); if (!l.length) return '<p class="empty">No reports match your filters.</p>'; return commView === 'map' ? mapHTML(l) + l.map(r => rowHTML(r, 'community')).join('') : l.map(r => rowHTML(r, 'community')).join(''); },
  adminreports: () => { const l = filt(api.getReports()); return l.length ? l.map(r => rowHTML(r, 'admin')).join('') : '<p class="empty">No reports match.</p>'; },
  announcements: () => annList(false), adminann: () => annList(true)
};
function annList(admin) {
  const l = api.getAnnouncements().filter(a => (admin || a.status === 'Published') && (!F.cat || a.cat === F.cat) && (!F.q || (a.title + a.body).toLowerCase().includes(F.q.toLowerCase())));
  if (!l.length) return '<p class="empty">No announcements found.</p>';
  return l.map(a => `<article class="panel ann ann-${a.priority === 'High' ? 'high' : 'info'} ${a.priority === 'High' ? 'pri' : ''}" style="margin-bottom:1rem"><p class="meta-line">${tag(a.cat)} · ${fmtDT(a.date)} · Priority: ${a.priority}${admin ? ' · ' + a.status : ''}</p><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>
    ${admin ? `<div class="row"><button class="btn sm ghost" data-act="editann" data-id="${a.id}">Edit</button><button class="btn sm ghost" data-act="togann" data-id="${a.id}">${a.status === 'Published' ? 'Archive' : 'Publish'}</button><button class="btn sm danger" data-act="delann" data-id="${a.id}">Delete</button></div>` : ''}</article>`).join('');
}
function detailHTML(r, admin) {
  const resolved = r.status === 'Resolved';
  return `<p>${badge(r.status)} ${tag(r.cat)}</p><p>${esc(r.desc)}</p>
  <dl class="meta"><dt>Report ID</dt><dd>${r.id}</dd><dt>Location</dt><dd>${esc(r.loc)}</dd><dt>Submitted</dt><dd>${fmtDT(r.date)}</dd><dt>Last updated</dt><dd>${fmtDT(r.upd)}</dd><dt>Assigned office</dt><dd>${esc(r.dept || 'Not yet assigned')}</dd></dl>
  <h3>Status timeline</h3><ol class="tl">${r.history.map(h => `<li><span class="st-badge" data-done>${ico('check')}</span><b>${h.s}</b><time datetime="${h.d}">${fmtDT(h.d)}</time></li>`).join('')}</ol>
  <h3>Photo or video</h3><div class="ph">${r.media ? `${r.media.type === 'video' ? 'Video' : 'Photo'} attached: ${esc(r.media.name)}` : 'No photo or video attached'}</div>
  ${r.resolution ? `<h3>Resolution details</h3><p>${esc(r.resolution)}</p>` : ''}
  ${resolved ? '<div class="grid g2"><div class="ph">Before photo</div><div class="ph">After photo</div></div>' : ''}
  ${!admin ? '' : manageForm(r)}`;
}
function manageForm(r) {
  return `<hr><h3>Manage report</h3><form id="manageForm" data-id="${r.id}" novalidate>
  ${fld('mDept', 'Assign to department', sel('mDept', DEPTS, 'Unassigned', r.dept))}${fld('mStatus', 'Status', sel('mStatus', STATUSES, undefined, r.status))}
  ${fld('mNote', 'Internal note (staff only)', '<textarea id="mNote" name="mNote"></textarea>')}${r.notes.map(n => `<p class="meta-line">${fmtDT(n.d)}: ${esc(n.t)}</p>`).join('')}
  ${fld('mRes', 'Resolution details', `<textarea id="mRes" name="mRes">${esc(r.resolution)}</textarea>`)}
  ${fld('mBefore', 'Before photo', '<input id="mBefore" type="file" accept="image/*" data-preview="pvB">')}<div id="pvB"></div>${fld('mAfter', 'After photo', '<input id="mAfter" type="file" accept="image/*" data-preview="pvA">')}<div id="pvA"></div>
  <button class="btn" type="submit">Save changes</button></form>`;
}
const TONE = { 'Resolved': 'done', 'Pending': 'info', 'In progress': 'prog' };
const barRows = (items, max, mode) => items.map(([l, v]) => {
  const ck = mode === 'cat' ? CAT_KEY[l] : '', tone = mode === 'status' ? TONE[l] : '';
  return `<div class="bar-row"${ck ? ` data-cat="${ck}"` : ''}${tone ? ` data-tone="${tone}"` : ''}><span>${ck ? '<span class="cdot" aria-hidden="true"></span>' : ''}${esc(l)}</span><i style="--w:${max ? v / max * 100 : 0}%"></i><b>${v}</b></div>`;
}).join('');
/* a log entry belongs to a category when its detail mentions a report id (TT-1002 ...) */
const logCat = l => { const m = /TT-\d+/.exec(l.detail || ''), r = m && api.getReports().find(x => x.id === m[0]); return r ? { key: CAT_KEY[r.cat] || 'other', name: r.cat } : null; };
const stats = a => `<div class="grid g4"><div class="stat"><b>${a.total}</b><span>Total reports</span></div><div class="stat"><b>${a.pending}</b><span>Pending</span></div><div class="stat"><b>${a.progress}</b><span>In progress</span></div><div class="stat"><b>${a.resolved}</b><span>Resolved</span></div></div>`;
const page = (title, body, intro = '') => `<div class="page"><div class="wrap"><h1>${title}</h1>${intro ? `<p class="lead">${intro}</p>` : ''}${body}</div></div>`;

const VIEWS = {
  home() {
    const reps = api.getReports(), a = api.getAnalytics(), anns = api.getAnnouncements().filter(x => x.status === 'Published').slice(0, 2);
    return `<div class="wrap hero"><p class="eyebrow">Citizen engagement for your barangay</p><h1>Your Community. Your Voice. Our Response.</h1>
      <p class="lead">TagaTugon connects residents with their Local Government Unit and Barangay officials. Report a problem, follow its progress, and see what your neighbors are raising.</p>
      <div class="row"><a class="btn cta" href="${reportLink()}">Report a Concern</a><a class="btn ghost" href="#/community">Explore Community Reports</a></div>
      <div class="phones" aria-hidden="true">${phone('side', 'Report a concern', PHONE_REPORT)}${phone('mid', 'Community map', PHONE_MAP)}${phone('side', 'My reports', PHONE_LIST)}</div>
      </div>
    <section class="blk band-sec"><div class="wrap"><div class="band"><div><b>24/7</b><span>Report concerns anytime, anywhere</span></div><div><b>Clear status</b><span>Follow every step from submitted to resolved</span></div><div><b>Open records</b><span>See which office handled it and what was done</span></div></div></div></section>
    <section class="blk"><div class="wrap"><h2>How TagaTugon works</h2>${stepper(['Report', 'Track', 'Resolve'], ['<h3>Report a concern</h3><p>Describe the problem, add a photo and mark the location. It takes about a minute.</p>', '<h3>Follow the progress</h3><p>See each status change from review to assignment to repair, with dates.</p>', '<h3>See it resolved</h3><p>The assigned office acts and records what was done, with before-and-after photos.</p>'], 'Start a report')}</div></section>
    <section class="blk"><div class="wrap"><h2>Everything your barangay needs, in one place.</h2><div class="grid g3">${[['Report with photos', 'Describe the concern, attach a photo and mark the spot.'], ['Track every step', 'Follow a clear timeline from submitted to resolved.'], ['See the neighborhood', 'Browse community reports on a map or list, without names.'], ['Stay informed', 'Read advisories, road closures and schedules from your LGU.'], ['Support issues', 'Confirm problems neighbors raised so priorities are clear.'], ['Private by design', 'Reporter names are never shown in public lists.']].map(([t, d], i) => `<article class="feat"><span class="num">0${i + 1}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div></div></section>
    <section class="blk"><div class="wrap"><h2>What you can report</h2><div class="chips">${CATS.map(c => `<span class="chip cat-chip" data-cat="${CAT_KEY[c]}"><span class="cdot" aria-hidden="true"></span>${c}</span>`).join('')}</div></div></section>
    <section class="blk"><div class="wrap"><h2>Recent community reports</h2>${reps.slice(0, 3).map(r => rowHTML(r, 'preview').replace(/<button class="btn sm ghost"[^>]*>.*?<\/button>/, '')).join('')}<p><a href="#/community">See all community reports</a></p></div></section>
    <section class="blk"><div class="wrap grid g2"><div><h2>Open about the work</h2><p class="lead">Every report shows who is handling it and when it changed. Names of reporters are never shown publicly.</p></div>
      <div class="grid g2"><div class="stat"><b>${a.resolved} of ${a.total}</b><span>Reports resolved</span></div><div class="stat"><b>${a.progress}</b><span>Reports in progress</span></div></div></div></section>
    <section class="blk faq-sec"><div class="wrap"><h2>Frequently asked questions</h2><p class="lead">Quick answers to what residents ask most.</p></div><div class="sv" aria-hidden="true"><div class="sv-row" data-o="0" data-v="40"><div class="sv-track"></div></div><div class="sv-row" data-o="3" data-v="-40"><div class="sv-track"></div></div></div><dl class="sr">${FAQ.map(([q, a]) => `<dt>${q}</dt><dd>${a}</dd>`).join('')}</dl></section>
    <section class="blk"><div class="wrap"><h2>Latest announcements</h2>${anns.map(x => `<article class="panel ann ann-${x.priority === 'High' ? 'high' : 'info'}" style="margin-bottom:1rem"><p class="meta-line">${tag(x.cat)} · ${fmtDT(x.date)}</p><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></article>`).join('')}<a href="#/announcements">All announcements</a></div></section>`;
  },
  about: () => page('About TagaTugon', `<div class="grid g2"><div class="panel"><h3>Our goal</h3><p>Better communication, transparency and accountability between citizens and local government, with a focus on infrastructure maintenance and public safety.</p></div><div class="panel"><h3>Your privacy</h3><p>Reporter names are never shown in public lists. Only assigned officials can see the full details of a report.</p></div></div>`),
  login: () => '',   // the log-in pop-up is built by showLogin()
  register: () => page('Create an account', `<div class="auth panel"><form id="regForm" novalidate>${stepper(['Account', 'Locality'], [
    fld('rName', 'Full name', inp('rName', 'text', 'autocomplete="name"')) + fld('rEmail', 'Email', inp('rEmail', 'email', 'autocomplete="email"')) + fld('rPw', 'Password', inp('rPw', 'password', 'autocomplete="new-password"'), 'At least 8 characters.') + fld('rPw2', 'Confirm password', inp('rPw2', 'password', 'autocomplete="new-password"')),
    fld('rBrgy', 'Barangay or locality', inp('rBrgy')) + '<div class="fld"><label><input type="checkbox" id="rTerms"> I accept the terms and privacy notice</label><p class="err" id="e-rTerms" role="alert"></p></div>'], 'Create account')}</form>
    <p>Already registered? <a href="#/login">Log in</a></p></div>`),
  dashboard() {
    const s = getSession(), mine = api.getReports().filter(r => r.owner === 'me'), c = x => mine.filter(r => x.includes(r.status)).length;
    return page(`Welcome, ${esc(s.name.split(' ')[0])}`, `<p><a class="btn" href="#/submit">Submit a report</a></p>
    <div class="grid g4"><div class="stat"><b>${mine.length}</b><span>Submitted</span></div><div class="stat"><b>${c(['Submitted', 'Under Review', 'Assigned'])}</b><span>Pending</span></div><div class="stat"><b>${c(['In Progress'])}</b><span>In progress</span></div><div class="stat"><b>${c(['Resolved'])}</b><span>Resolved</span></div></div>
    <div class="grid g2" style="margin-top:2rem"><div><h2>Recent reports</h2>${mine.slice(0, 3).map(r => rowHTML(r)).join('') || '<p class="empty">No reports yet.</p>'}</div>
    <div><h2>Notifications</h2><ul class="notifs">${NOTIFS.map(n => `<li>${n}</li>`).join('')}</ul><h2>Announcements</h2>${api.getAnnouncements().filter(a => a.status === 'Published').slice(0, 2).map(a => `<p><b>${esc(a.title)}</b><br><span class="meta-line">${fmtDT(a.date)}</span></p>`).join('')}</div></div>`);
  },
  submit: () => page('Submit a community report', `<form id="reportForm" class="panel" novalidate>${stepper(['Details', 'Location', 'Review'], [
    fld('title', 'Report title', inp('title')) + fld('desc', 'Description', '<textarea id="desc" name="desc"></textarea>', 'Describe what you saw and when.') + fld('rcat', 'Category', sel('rcat', CATS, 'Choose a category')) + '<div class="fld"><span class="lbl">Attachment (optional)</span><div class="gs-host" data-glide="media"></div><input type="hidden" id="mtype" value="photo"></div>' +
    '<div id="mediaPhoto">' + fld('photo', 'Photo', '<input id="photo" type="file" accept="image/*" data-preview="pvP">') + '<div id="pvP"></div></div>' +
    '<div id="mediaVideo" hidden>' + fld('video', 'Video', '<input id="video" type="file" accept="video/*" data-preview="pvV">', 'MP4, MOV or WebM, up to 50 MB. Keep it short and steady.') + '<div id="pvV"></div></div>',
    fld('loc', 'Location', inp('loc', 'text', 'placeholder="Street, purok or barangay"')) + '<p><button type="button" class="btn ghost sm" data-act="gps">Use my current location</button> <span id="coords" class="meta-line"></span></p>' + fld('landmark', 'Nearby landmark (optional)', inp('landmark')) + '<input type="hidden" id="mapX"><input type="hidden" id="mapY">' + mapHTML([], true),
    '<div id="review"></div>'], 'Submit report')}</form>`),
  myreports: () => page('My reports', filterBar(CATS, true, true) + '<div id="list"></div>'),
  community: () => page('Community reports', `${seg([['list', 'List', 'list'], ['map', 'Map', 'map']], commView, 'cview')}${filterBar(CATS, true, true)}<div id="list"></div>`, 'Reports from your neighborhood, shown without reporter names.'),
  announcements: () => page('Announcements', filterBar(ANN_CATS, false, false) + '<div id="list"></div>'),
  profile() {
    const s = getSession(), adm = s.role === 'admin', p = store.get('prefs', { sms: true, push: true, email: false }), mine = api.getReports().filter(r => r.owner === 'me');
    const an = adm ? api.getAnalytics() : null, ini = initials(s.name), photo = getPhoto(s);
    const nums = adm ? [[an.total, 'Total reports'], [an.pending, 'Pending'], [an.resolved, 'Resolved']]
      : [[mine.length, 'Reports'], [mine.filter(r => !['Resolved', 'Rejected'].includes(r.status)).length, 'Active'], [mine.filter(r => r.status === 'Resolved').length, 'Resolved']];
    return page('Your profile', `<div class="pf">
      <section class="pf-card" data-spot="hero" aria-label="Your profile">
        <button type="button" class="pf-out" data-act="logout" aria-label="Log out"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9"/></svg></button>
        <div class="pf-avwrap"><div class="pf-av">${photo ? `<img src="${esc(photo)}" alt="">` : `<span aria-hidden="true">${esc(ini)}</span>`}</div><button type="button" class="pf-cam" data-act="editprofile" aria-label="Change profile photo"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.6-2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg></button></div>
        <h2 class="pf-name">${esc(s.name)}</h2><p class="pf-mail">${esc(s.email)}</p>
        <div class="pf-tags"><span>${adm ? 'Administrator' : 'Citizen'}</span>${s.barangay ? `<span>${esc(s.barangay)}</span>` : ''}</div>
        <ul class="pf-stats">${nums.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join('')}</ul>
        <div class="pf-actions"><button type="button" class="pf-btn" data-act="editprofile">Edit profile</button><button type="button" class="pf-round" data-act="gotoprefs" aria-label="Notification preferences">${ico('bell')}</button></div>
      </section>
      <div class="pf-side">
        <div class="panel" data-spot id="prefsCard" tabindex="-1"><h3>Notification preferences</h3>${[['sms', 'SMS'], ['push', 'Push'], ['email', 'Email']].map(([k, n]) => `<div class="pref-row"><div class="squish-switch-root"><button id="pref-${k}" type="button" role="switch" aria-checked="${!!p[k]}" class="squish-switch" data-pref="${k}"><span class="squish-switch__track"><span class="squish-switch__thumb" aria-hidden="true"></span></span></button><label for="pref-${k}" class="squish-switch__label">${n} updates</label></div></div>`).join('')}</div>
        <div class="panel" data-spot><h3>Change password</h3><form id="pwForm">${fld('cpw', 'Current password', inp('cpw', 'password', 'disabled'))}${fld('npw', 'New password', inp('npw', 'password', 'disabled'))}<button class="btn sm" type="submit">Update password</button></form></div>
        ${adm ? '' : `<div class="panel" data-spot><h3>Reporting history</h3>${mine.length ? mine.map(r => `<p>${r.id} ${esc(r.title)} ${badge(r.status)}</p>`).join('') : '<p class="meta-line">No reports yet.</p>'}</div>`}
      </div></div>`);
  },
  admin() {
    const a = api.getAnalytics(), max = Math.max(...a.byCat.map(x => x[1]), 1), tmax = Math.max(...TREND.map(t => t[1]));
    return page('Admin dashboard', `${stats(a)}<div class="grid g2" style="margin-top:2rem"><div class="panel"><h3>Reports by category</h3>${barRows(a.byCat, max, 'cat')}</div>
    <div class="panel"><h3>Monthly trend</h3><div class="cols" role="img" aria-label="Monthly reports: ${TREND.map(t => t.join(' ')).join(', ')}">${TREND.map(([m, v]) => { const lo = Math.min(...TREND.map(t => t[1])), k = tmax > lo ? (v - lo) / (tmax - lo) : 1; return `<div class="col"${v === tmax ? ' data-peak' : ''}><b>${v}</b><i style="height:${v / tmax * 80}%;--p:${Math.round(32 + k * 68)}%"></i><span>${m}</span></div>`; }).join('')}</div></div>
    <div class="panel"><h3>Department workload (open reports)</h3>${barRows(a.byDept, Math.max(...a.byDept.map(x => x[1]), 1))}</div>
    <div class="panel"><h3>Recent activity</h3>${api.getLog().slice(0, 5).map(l => { const c = logCat(l); return `<p class="meta-line log-line"${c ? ` data-cat="${c.key}" title="${esc(c.name)}"` : ''}><span class="cdot" aria-hidden="true"></span><b>${fmtDT(l.d)}</b> ${l.action}: ${esc(l.detail)}</p>`; }).join('')}</div></div>
    <div class="panel map-panel" style="margin-top:2rem"><h3>Report locations in Dasmariñas City</h3>${mapHTML(api.getReports())}<p class="map-legend"><span data-tone="done"><i></i>Resolved</span><span data-tone="prog"><i></i>In progress</span><span data-tone="info"><i></i>Pending</span><span data-tone="bad"><i></i>Rejected</span></p></div>`);
  },
  adminreports: () => page('Report management', filterBar(CATS, true, true) + '<div id="list"></div>', 'Update statuses, assign offices and add notes.'),
  adminann: () => page('Manage announcements', `<p><button class="btn" data-act="newann">New announcement</button></p>${filterBar(ANN_CATS, false, false)}<div id="list"></div>`),
  adminlogs() {
    const a = api.getAnalytics();
    return page('Activity logs and analytics', `${stats(a)}<div class="grid g2" style="margin:2rem 0"><div class="panel"><h3>Resolved vs pending</h3>${barRows([['Resolved', a.resolved], ['Pending', a.pending], ['In progress', a.progress]], a.total, 'status')}</div><div class="panel"><h3>By category</h3>${barRows(a.byCat, Math.max(...a.byCat.map(x => x[1]), 1), 'cat')}</div></div>
    <h2>Activity log</h2><div class="scroll"><table><thead><tr><th>Date and time</th><th>Action</th><th>Actor</th><th>Detail</th></tr></thead><tbody>${api.getLog().map(l => { const c = logCat(l); return `<tr class="log-row"${c ? ` data-cat="${c.key}"` : ''}><td>${fmtDT(l.d)}</td><td>${l.action}</td><td>${esc(l.actor)}</td><td>${esc(l.detail)}${c ? ` ${tag(c.name)}` : ''}</td></tr>`; }).join('')}</tbody></table></div>
    <h2 style="margin-top:2rem">Status history</h2>${api.getReports().slice(0, 4).map(r => `<p class="meta-line"><b>${r.id}</b>: ${r.history.map(h => h.s).join(' → ')}</p>`).join('')}`);
  }
};
const ACCESS = { dashboard: 'citizen', submit: 'citizen', myreports: 'citizen', profile: '*', admin: 'admin', adminreports: 'admin', adminann: 'admin', adminlogs: 'admin' };

/* ============ 5. ROUTER, NAV, EVENTS ============ */
let navKey = '';
function renderNav() {
  const s = getSession(), key = s ? s.role : 'out';
  if (key !== navKey) {
    navKey = key;
    const items = !s ? [['home', 'Home', 'home'], ['community', 'Community Reports', 'map'], ['announcements', 'Announcements', 'bell'], ['about', 'About', 'info'], ['login', 'Login', 'login'], ['register', 'Get Started', 'arrow']]
      : s.role === 'admin' ? [['admin', 'Dashboard', 'grid'], ['adminreports', 'Reports', 'file'], ['adminann', 'Announcements', 'bell'], ['adminlogs', 'Logs', 'pulse'], ['community', 'Community', 'map'], ['profile', 'Profile', 'user']]
      : [['dashboard', 'Dashboard', 'grid'], ['submit', 'Report', 'plus'], ['myreports', 'My Reports', 'file'], ['community', 'Community', 'map'], ['announcements', 'Announcements', 'bell'], ['profile', 'Profile', 'user']];
    $('#nav').innerHTML = `<a class="pn-brand" href="#/home" aria-label="TagaTugon home"><img class="pn-mark pn-light" src="mainlogo.png" alt="" width="44" height="44"><img class="pn-mark pn-dark" src="mainlogofordarkmode.png" alt="" width="44" height="44"><img class="pn-wordmark pn-light" src="wordmarklogo.png" alt="TagaTugon" width="86" height="32"><img class="pn-wordmark pn-dark" src="workmarklogofordarkmode.png" alt="TagaTugon" width="86" height="32"></a>
      <div class="pn-bar"><div class="pn-track"><ul class="pn-list">${items.map(([r, t]) => `<li class="pn-slot"><a class="pn-item" href="#/${r}" data-r="${r}"><span class="pn-fill" aria-hidden="true"></span><span class="pn-face">${t}</span><span class="pn-alt" aria-hidden="true">${t}</span></a></li>`).join('')}</ul><span class="pn-dot" aria-hidden="true"></span></div></div>
      <button type="button" class="pn-toggle" aria-expanded="false" aria-controls="pnPanel" aria-label="Open menu"><span class="pn-burger" aria-hidden="true"><i></i><i></i></span></button>
      <div class="pn-panel" id="pnPanel"><ul>${items.map(([r, t, ic]) => `<li><a class="pn-row" href="#/${r}" data-r="${r}">${ico(ic)}${t}</a></li>`).join('')}</ul></div>`;
  }
  $('#nav').querySelectorAll('[data-r]').forEach(a => { if (a.dataset.r === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  placeDot();
}
/* Floating pill width = just the menu links (or the burger on small screens) + bar padding, so the width can animate smoothly */
function setPill() {
  const b = $('.pn-bar'), k = $('.pn-toggle'), el = b && b.offsetWidth ? b : k;
  if (el && el.offsetWidth) $('.top').style.setProperty('--pill-w', (el.offsetWidth + 22) + 'px');
}
function placeDot() {
  setPill();
  const d = $('.pn-dot'), a = $('.pn-bar [aria-current]'); if (!d) return;
  if (!a || !a.offsetWidth) { d.style.opacity = 0; return; }
  d.style.opacity = 1; d.style.transform = `translateX(${a.parentElement.offsetLeft + a.offsetWidth / 2}px)`; requestAnimationFrame(() => d.classList.add('ready'));
}
function route() {
  let name = location.hash.replace('#/', '') || 'home', s = getSession();
  if (name === 'forgot') { go('login'); toast('Password reset is not available yet.'); return; }
  if (!VIEWS[name]) name = 'home';
  const need = ACCESS[name];
  if (need && !s) { toast('Please log in first.', true); return go('login'); }
  if (need && need !== '*' && s.role !== need) { toast('You are not authorized to open that page.', true); return go(s.role === 'admin' ? 'admin' : 'dashboard'); }
  if (name === 'login') { if (s) return go(s.role === 'admin' ? 'admin' : 'dashboard'); setMenu(false); showLogin(); return; }
  hideLogin(); lastRoute = name; killSpots(); killSwitches(); killMaps(); killGlides(); TTReveal.kill();
  current = name; F = { q: '', cat: '', status: '', sort: 'new' };
  $('#app').innerHTML = VIEWS[name](); document.querySelectorAll('.stepper').forEach(s => stepTo(s, 1)); refresh(); renderNav(); initSV(); initSpots(); initSwitches(); initGlides(); TTReveal.init(name);
  setMenu(false); window.scrollTo(0, 0); document.title = 'TagaTugon · ' + name;
}
const go = n => { location.hash = '#/' + n; };
function refresh() { const el = $('#list'); if (el && LISTS[current]) el.innerHTML = LISTS[current](); placeGliders(); initMaps(); }
function login(user, remember) { (remember ? localStorage : sessionStorage).setItem('tt.session', JSON.stringify(user)); go(user.role === 'admin' ? 'admin' : 'dashboard'); }
function annForm(a = {}) {
  openDlg(a.id ? 'Edit announcement' : 'New announcement', `<form id="annForm" data-id="${a.id || ''}" novalidate>${fld('aTitle', 'Title', inp('aTitle', 'text', `value="${esc(a.title)}"`))}${fld('aCat', 'Category', sel('aCat', ANN_CATS, 'Choose', a.cat))}
    ${fld('aDate', 'Publication date and time', inp('aDate', 'datetime-local', `value="${esc((a.date && a.date.length === 10 ? a.date + 'T09:00' : a.date) || nowISO())}"`))}${fld('aPri', 'Priority', sel('aPri', ['Normal', 'Medium', 'High'], undefined, a.priority))}${fld('aBody', 'Description', `<textarea id="aBody">${esc(a.body)}</textarea>`)}<button class="btn" type="submit">Save announcement</button></form>`);
}
const acts = {
  close: () => dlg.close(),
  stback: t => { const st = t.closest('.stepper'); stepTo(st, +st.dataset.step - 1); },
  stnext: t => nextStep(t.closest('.stepper')),
  stgo: t => { const st = t.closest('.stepper'), i = +t.dataset.i, n = +st.dataset.step; if (i < n) stepTo(st, i); else if (i === n + 1) nextStep(st); },
  stdone: () => { location.hash = reportLink(); },
  view: t => { const r = api.getReports().find(x => x.id === t.dataset.id); openDlg(esc(r.title), detailHTML(r, !!t.dataset.admin)); },
  support: (t, e) => {
    if (!getSession()) return toast('Log in to support an issue.', true) || go('login');
    const res = window.TTPulse.press(t, e.detail !== 0);   // plays the pulse; null while the previous run is still going
    if (!res) return;
    const s = store.get('supports', []), id = t.dataset.id;
    store.set('supports', res.liked ? [...new Set([...s, id])] : s.filter(x => x !== id)); api.support(id, res.liked ? 1 : -1);
    toast(res.liked ? 'Thanks for confirming this issue.' : 'Support removed.');   // no refresh(): re-rendering the list would cut the animation short
  },
  catpick: t => { F.cat = t.dataset.catVal || ''; syncCatUI(); refresh(); },
  cview: t => { commView = t.dataset.v; VIEWS.community && ($('#app').innerHTML = VIEWS.community()); refresh(); },
  pw: t => { const i = $('#password'); i.type = i.type === 'password' ? 'text' : 'password'; t.textContent = i.type === 'password' ? 'Show' : 'Hide'; t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); },
  role: t => { const r = t.dataset.role; document.querySelectorAll('.role-switch button').forEach(b => b.setAttribute('aria-pressed', String(b === t))); if (lanyard) lanyard.flipTo(r === 'admin'); else applyRole(r); },
  closelogin: () => closeLogin(),
  gotoprefs: () => { const el = $('#prefsCard'); if (el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); el.focus({ preventScroll: true }); } },
  fill: t => { $('#email').value = t.dataset.u; $('#password').value = t.dataset.p; },
  gps: () => {
    if (!navigator.geolocation) return toast('Location is not supported on this device.', true);
    navigator.geolocation.getCurrentPosition(p => { const here = L.latLng(p.coords.latitude, p.coords.longitude), pm = document.querySelector('.map.pick'); if (!inCity(here)) { $('#coords').textContent = ''; return toast('Your current location is outside Dasmariñas City. Search or click the map instead.', true); } if (pm && pm._place) { pm._place(here); const mp = liveMaps.find(m => m.getContainer() === pm); if (mp) mp.flyTo(here, 17); } $('#coords').textContent = `Coordinates: ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (not a verified address)`; if (!$('#loc').value) $('#loc').value = `GPS ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`; },
      () => toast('Location permission was denied. Type the location instead.', true));
  },
  logout: () => confirmDlg('Log out of your account?', () => { sessionStorage.removeItem('tt.session'); localStorage.removeItem('tt.session'); toast('Logged out.'); go('home'); route(); }),
  editprofile: () => { const s = getSession(); pendingPhoto = undefined; openDlg('Edit profile', `<form id="profForm" novalidate>
    <div class="ph-edit"><div class="ph-prev" id="phPrev"></div>
      <div class="ph-side"><div class="row"><button type="button" class="btn ghost sm" data-act="phpick">Upload photo</button><button type="button" class="btn ghost sm" id="phRemove" data-act="phremove">Remove</button></div>
      <p class="meta-line">JPG, PNG or WebP. It is cropped to a square.</p><p class="err" id="e-phFile" role="alert"></p>
      <input type="file" id="phFile" accept="image/*" hidden></div></div>
    ${fld('pName', 'Full name', inp('pName', 'text', `value="${esc(s.name)}"`))}${fld('pBrgy', 'Barangay', inp('pBrgy', 'text', `value="${esc(s.barangay)}"`))}<button class="btn" type="submit">Save changes</button></form>`); renderPhPrev(); },
  phpick: () => $('#phFile').click(),
  phremove: () => { pendingPhoto = null; renderPhPrev(); },
  newann: () => annForm(),
  editann: t => annForm(api.getAnnouncements().find(a => a.id === t.dataset.id)),
  togann: t => { const l = api.getAnnouncements(), a = l.find(x => x.id === t.dataset.id); a.status = a.status === 'Published' ? 'Archived' : 'Published'; api.saveAnnouncements(l); api.log('Announcement ' + a.status.toLowerCase(), 'Admin', a.title); refresh(); toast(a.status + '.'); },
  delann: t => confirmDlg('Delete this announcement? This cannot be undone.', () => { api.saveAnnouncements(api.getAnnouncements().filter(a => a.id !== t.dataset.id)); api.log('Announcement deleted', 'Admin', t.dataset.id); refresh(); toast('Deleted.'); })
};
const forms = {
  loginForm(f) {
    const btn = f.querySelector('[type=submit]');
    if (btn && btn.getAttribute('aria-busy') === 'true') return;   // ignore double submits while loading
    if (!validate({ email: [v => v, 'Enter your email or username.'], password: [v => v, 'Enter your password.'] })) return;
    if (btn) btn.setAttribute('aria-busy', 'true');                 // loading state: only visible once api.login is a real network call
    const idle = () => { if (btn) btn.removeAttribute('aria-busy'); };
    const u = api.login($('#email').value.trim(), $('#password').value);
    if (!u) { idle(); $('#e-form').textContent = 'Incorrect email or password.'; return; }
    // TODO(backend): send the chosen role with POST /auth/login and let the server enforce it.
    if (u.role !== (f.dataset.role || 'citizen')) { idle(); $('#e-form').textContent = u.role === 'admin' ? 'That is an admin account. Flip the ID over to log in as admin.' : 'That is a citizen account. Flip the ID back to log in as a citizen.'; return; }
    login(u, $('#remember').checked);
  },
  regForm() {
    if (!validate({ ...STEP_RULES.regForm[1], ...STEP_RULES.regForm[2] })) return;
    login(api.register({ name: $('#rName').value.trim(), email: $('#rEmail').value.trim(), barangay: $('#rBrgy').value.trim() }), false); toast('Account created.');
  },
  reportForm() {
    if (!validate({ ...STEP_RULES.reportForm[1], ...STEP_RULES.reportForm[2] })) return;
    const x = $('#mapX').value, y = $('#mapY').value;
    const r = api.createReport({ title: $('#title').value.trim(), desc: $('#desc').value.trim(), cat: $('#rcat').value, loc: $('#loc').value.trim() + ($('#landmark').value ? ' near ' + $('#landmark').value.trim() : ''), x: x ? +x : null, y: y ? +y : null,
      media: (() => { const t = $('#mtype').value === 'video' ? 'video' : 'photo', f = $('#' + t).files[0]; return f ? { type: t, name: f.name } : null; })() });
    toast(`Report ${r.id} submitted.`); go('myreports');
  },
  manageForm(f) {
    api.updateReport(f.dataset.id, { dept: $('#mDept').value, status: $('#mStatus').value, note: $('#mNote').value.trim(), resolution: $('#mRes').value.trim() });
    dlg.close(); refresh(); toast('Report updated.');
  },
  annForm(f) {
    if (!validate({ aTitle: [v => v.length >= 5, 'Title needs at least 5 characters.'], aCat: [v => v, 'Choose a category.'], aDate: [v => v, 'Choose a date and time.'], aBody: [v => v.length >= 10, 'Add a short description.'] })) return;
    const l = api.getAnnouncements(), data = { title: $('#aTitle').value.trim(), cat: $('#aCat').value, date: $('#aDate').value, priority: $('#aPri').value, body: $('#aBody').value.trim() };
    if (f.dataset.id) Object.assign(l.find(a => a.id === f.dataset.id), data); else l.unshift({ id: 'A' + Date.now(), status: 'Published', ...data });
    api.saveAnnouncements(l); api.log(f.dataset.id ? 'Announcement edited' : 'Announcement published', 'Admin', data.title); dlg.close(); refresh(); toast('Announcement saved.');
  },
  profForm() {
    if (!validate({ pName: [v => v.length > 1, 'Enter your name.'], pBrgy: [v => v, 'Enter your barangay.'] })) return;
    const s = { ...getSession(), name: $('#pName').value.trim(), barangay: $('#pBrgy').value.trim() };
    if (pendingPhoto !== undefined) {
      try { if (pendingPhoto) store.set(photoKey(s), pendingPhoto); else localStorage.removeItem('tagatugon.v2.' + photoKey(s)); }
      catch (e) { toast('The photo could not be saved on this device.', true); }
      pendingPhoto = undefined;
    }
    (localStorage.getItem('tt.session') ? localStorage : sessionStorage).setItem('tt.session', JSON.stringify(s)); dlg.close(); route(); toast('Profile updated.');
  },
  pwForm() { toast('Password changes are not available yet.'); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (t) { if (t.dataset.act !== 'forgot') { e.preventDefault?.(); acts[t.dataset.act]?.(t, e); } else { e.preventDefault(); toast('Password reset is not available yet.'); } return; }
});
document.addEventListener('input', e => { const k = e.target.dataset.f; if (k) { F[k] = e.target.value; refresh(); } });
document.addEventListener('change', e => {
  const el = e.target, k = el.dataset.f;
  if (k) { F[k] = el.value; if (k === 'cat') syncCatUI(); refresh(); }
  if (el.id === 'phFile') { handlePhoto(el.files[0]); el.value = ''; return; }
  if (el.dataset.pref) { const p = store.get('prefs', { sms: true, push: true, email: false }); p[el.dataset.pref] = el.checked; store.set('prefs', p); toast('Preference saved.'); }
  if (el.dataset.preview) {
    const box = $('#' + el.dataset.preview), f = el.files[0], vid = el.accept.startsWith('video'), er = $('#e-' + el.id);
    box.innerHTML = ''; if (er) er.textContent = '';
    if (f) {
      if (!f.type.startsWith(vid ? 'video/' : 'image/')) { toast(vid ? 'Please choose a video file.' : 'Please choose an image file.', true); el.value = ''; return; }
      if (vid && f.size > 50 * 1024 * 1024) { if (er) er.textContent = 'That video is over 50 MB. Please choose a shorter clip.'; el.value = ''; return; }
      const url = URL.createObjectURL(f);
      if (vid) { const v = document.createElement('video'); v.className = 'preview preview-video'; v.controls = true; v.preload = 'metadata'; v.setAttribute('aria-label', 'Preview of the selected video'); v.src = url; box.append(v); }
      else { const img = new Image(); img.className = 'preview'; img.alt = 'Preview of the selected photo'; img.src = url; box.append(img); }
    }
  }
});
document.addEventListener('submit', e => { e.preventDefault(); const st = e.target.querySelector('.stepper'); if (st && +st.dataset.step < +st.dataset.n) return nextStep(st); forms[e.target.id]?.(e.target); });
/* Collapsed menu (PillNav port): burger opens a dropdown and blurs the page */
function setMenu(open) {
  document.body.toggleAttribute('data-menu', open);
  const b = $('.pn-toggle'); if (b) { b.setAttribute('aria-expanded', open); b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
}
const menuOpen = () => document.body.hasAttribute('data-menu');
document.addEventListener('click', e => { if (e.target.closest('.pn-toggle')) setMenu(!menuOpen()); else if (menuOpen() && e.target.closest('.pn-panel a')) setMenu(false); });
document.addEventListener('mousedown', e => { if (menuOpen() && !e.target.closest('.pn')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen()) { setMenu(false); $('.pn-toggle')?.focus(); } });
addEventListener('scroll', () => $('.top').classList.toggle('scrolled', scrollY > 50), { passive: true });
$('.top').classList.toggle('scrolled', scrollY > 50);
addEventListener('resize', () => { if (innerWidth > 1100) setMenu(false); placeDot(); placeGliders(); });
document.fonts?.ready?.then(() => { placeDot(); placeGliders(); });

/* Bento glow (vanilla port of React Bits MagicBento): edge glow near cursor, spotlight, click wave */
(() => {
  const SEL = '.stat,.step,.panel:not([data-spot])', still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let px = -1e5, py = -1e5, raf = 0; const wave = { x: 0, y: 0, t: -1 };
  const paint = () => {
    raf = 0; let wr = 0, wa = 0;
    if (wave.t >= 0) { const p = Math.min(1, (performance.now() - wave.t) / 1100); wr = 900 * (1 - Math.pow(1 - p, 2.2)); wa = Math.pow(1 - p, 1.3); if (p >= 1) wave.t = -1; }
    document.querySelectorAll(SEL).forEach(el => {
      const b = el.getBoundingClientRect(), d = Math.hypot(Math.max(b.left - px, 0, px - b.right), Math.max(b.top - py, 0, py - b.bottom)), s = el.style;
      s.setProperty('--mb-x', (px - b.left) + 'px'); s.setProperty('--mb-y', (py - b.top) + 'px');
      s.setProperty('--mb-near', Math.max(0, 1 - d / 180).toFixed(2)); s.setProperty('--mb-hot', d === 0 ? 1 : 0);
      s.setProperty('--mb-wx', (wave.x - b.left) + 'px'); s.setProperty('--mb-wy', (wave.y - b.top) + 'px'); s.setProperty('--mb-wr', wr.toFixed(0) + 'px'); s.setProperty('--mb-wa', wa.toFixed(2));
    });
    if (wave.t >= 0) raf = requestAnimationFrame(paint);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(paint); };
  document.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; go(); }, { passive: true });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) { px = py = -1e5; go(); } });
  document.addEventListener('click', e => { if (!still && e.target.closest(SEL)) { wave.x = e.clientX; wave.y = e.clientY; wave.t = performance.now(); go(); } });
})();

/* Theme: dark or light. Saved in localStorage; first visit follows the system setting (see inline script in index.html). */
function setTheme(t, save) {
  if (save) { const h = document.documentElement; h.classList.add('tt-theming'); clearTimeout(window.__ttTheme); window.__ttTheme = setTimeout(() => h.classList.remove('tt-theming'), 450); }
  document.documentElement.dataset.theme = t;
  if (save) { try { localStorage.setItem('tt.theme', t); } catch { /* storage unavailable */ } }
  const b = $('#themeBtn'); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); b.setAttribute('aria-pressed', t === 'light');
}
$('#themeBtn').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; setTheme(t, true); toast(`${t === 'light' ? 'Light' : 'Dark'} mode on.`); });
setTheme(document.documentElement.dataset.theme || 'dark', false);

/* Grainient background: vanilla WebGL2 port of React Bits Grainient (green palette, drifting waves, silk shading, film grain, cursor stir, click swirl) */
(() => {
  const cv = $('#bg'), gl = cv.getContext('webgl2', { alpha: false, antialias: false }); if (!gl) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vs = `#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const fs = `#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uTime,uFrame,uGrain,uReveal,uSettle;uniform vec3 uRamp[5];uniform vec4 uStir[8];uniform float uStirW[8];uniform vec4 uTwirl;
out vec4 o;
vec2 hash2(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.103,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy)*2.-1.;}
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);float a=dot(hash2(i),f),b=dot(hash2(i+vec2(1,0)),f-vec2(1,0)),c=dot(hash2(i+vec2(0,1)),f-vec2(0,1)),d=dot(hash2(i+vec2(1,1)),f-vec2(1,1));return .5+.5*mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
vec2 drift(vec2 p,float t){vec2 w1=vec2(noise(p*.85+vec2(t*.11,t*.07)),noise(p*.85+vec2(4.1,1.7)-vec2(t*.08,t*.12)));vec2 w2=vec2(noise(p*1.55+w1*1.8+vec2(1.3,7.1)+t*.05),noise(p*1.55+w1*1.8+vec2(6.4,2.2)-t*.06));return(w1-.5)*1.1+(w2-.5)*.55;}
const vec2 DIR=vec2(.8192,.5736);
float coord(vec2 p,float ext){vec2 q=p+vec2(-DIR.y,DIR.x)*uTime*.45;vec2 w=p+drift(q,uTime)*.9*uSettle;return dot(w,DIR)/ext+.5;}
void main(){
  float asp=uRes.x/uRes.y;vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(uv-.5)*vec2(asp,1.);
  for(int i=0;i<8;i++){float w=uStirW[i];if(w<=0.)continue;vec2 d=p-uStir[i].xy;p-=uStir[i].zw*w*exp(-dot(d,d)/.045);}
  if(uTwirl.z!=0.){vec2 d=p-uTwirl.xy;float a=uTwirl.z*exp(-dot(d,d)/(uTwirl.w*uTwirl.w));float c=cos(a),s=sin(a);p=uTwirl.xy+mat2(c,-s,s,c)*d;}
  float ext=asp*DIR.x+DIR.y;float raw=coord(p,ext);
  float r2=clamp(raw,0.,1.)*2.;float tt=fract(r2);if(mod(floor(r2),2.)>.5)tt=1.-tt;float s=tt*4.;int idx=int(min(floor(s),3.));float f=smoothstep(0.,1.,s-float(idx));
  vec3 col=mix(uRamp[idx],uRamp[idx+1],f);
  vec2 g=vec2(coord(p+vec2(.004,0.),ext)-raw,coord(p+vec2(0.,.004),ext)-raw)/.004;
  vec2 slope=g*sin(3.14159*clamp(raw,0.,1.))*1.4;vec3 n=normalize(vec3(-slope,1.));vec3 L=normalize(vec3(-DIR.y,DIR.x,1.2));float df=dot(n,L)-L.z;
  col=uRamp[0]+(col-uRamp[0])*(1.+(df*.35+max(df,0.)*df*.6)*.35);
  col=mix(uRamp[0],col,smoothstep(0.,1.,uReveal*1.5-length(uv-.5)*.6));
  vec2 px=gl_FragCoord.xy+uFrame*vec2(17.,59.);float grain=hash(px)+hash(px+7.13)-1.;
  float luma=dot(col,vec3(.2126,.7152,.0722));col+=grain*uGrain*(.45+2.2*luma*(1.-luma));
  o=vec4(clamp(col,0.,1.),1.);
}`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return; // no background if shaders fail; the site still works
  gl.useProgram(pr); gl.bindVertexArray(gl.createVertexArray());
  const U = n => gl.getUniformLocation(pr, n), u = { res: U('uRes'), time: U('uTime'), frame: U('uFrame'), grain: U('uGrain'), reveal: U('uReveal'), settle: U('uSettle'), ramp: U('uRamp'), stir: U('uStir'), stirW: U('uStirW'), twirl: U('uTwirl') };
  const PAL = { dark: ['#071B11', '#0b2417', '#10311f', '#1c4b2f', '#3d7a52'], light: ['#F4F7F1', '#e4f0e6', '#c7e3cf', '#9ccfae', '#6fb589'] };
  const ramp = new Float32Array(15), stirs = new Float32Array(32), sw = new Float32Array(8); let grain = .08;
  const setRamp = () => { const t = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; PAL[t].forEach((c, i) => ramp.set([1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16) / 255), i * 3)); grain = t === 'light' ? .06 : .08; };
  let trail = [], twirl = null, w = 1, h = 1, time = 0, intro = still ? 1 : 0, frameSeed = 0, gClock = 0, last = 0, raf = 0, ptr = null;
  const size = () => { const r = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5); w = cv.width = Math.round(innerWidth * r); h = cv.height = Math.round(innerHeight * r); gl.viewport(0, 0, w, h); };
  const draw = now => {
    raf = 0; const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
    if (!still) { time += dt * .16; intro = Math.min(1, intro + dt / 1.6); gClock += dt; if (gClock > 1 / 24) { gClock = 0; frameSeed = (frameSeed + 1) % 97; } }
    trail.forEach(s => { s.age += dt; }); trail = trail.filter(s => s.age < 1.3);
    stirs.fill(0); sw.fill(0); trail.forEach((s, i) => { const f = 1 - s.age / 1.3; stirs.set([s.x, s.y, s.vx, s.vy], i * 4); sw[i] = f * f * .05; });
    let tw = [0, 0, 0, .16];
    if (twirl) { twirl.age += dt; const k = twirl.age / 2.6; if (k >= 1) twirl = null; else tw = [twirl.x, twirl.y, twirl.dir * 2.4 * Math.min(1, twirl.age / .18) * (1 - k) * (1 - k), .16 + .1 * Math.min(1, twirl.age / .5)]; }
    gl.uniform2f(u.res, w, h); gl.uniform1f(u.time, time); gl.uniform1f(u.frame, frameSeed); gl.uniform1f(u.grain, grain); gl.uniform1f(u.reveal, intro); gl.uniform1f(u.settle, intro * intro * (3 - 2 * intro));
    gl.uniform3fv(u.ramp, ramp); gl.uniform4fv(u.stir, stirs); gl.uniform1fv(u.stirW, sw); gl.uniform4f(u.twirl, tw[0], tw[1], tw[2], tw[3]); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const wake = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };
  addEventListener('resize', () => { size(); wake(); });
  addEventListener('pointermove', e => {
    if (still) return; const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight, now = performance.now();
    if (ptr) { const dt = Math.max(.008, (now - ptr.t) / 1000), a = w / h, vx = (x - ptr.x) * a / dt, vy = (y - ptr.y) / dt, sp = Math.hypot(vx, vy);
      if (sp > .02) { const cap = Math.min(1, 2.2 / sp); trail.unshift({ x: (x - .5) * a, y: y - .5, vx: vx * cap, vy: vy * cap, age: 0 }); if (trail.length > 8) trail.pop(); } }
    ptr = { x, y, t: now }; wake();
  }, { passive: true });
  addEventListener('pointerdown', e => { if (still) return; twirl = { x: (e.clientX / innerWidth - .5) * w / h, y: .5 - e.clientY / innerHeight, age: 0, dir: Math.random() < .5 ? 1 : -1 }; wake(); }, { passive: true });
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(() => { setRamp(); wake(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  setRamp(); size(); wake();
})();

/* ScrollVelocity: vanilla port of React Bits ScrollVelocity (rows of repeating text that speed up, lean and stretch with scroll speed, and can be dragged and thrown) */
const SV = { rows: [], raf: 0, last: 0, y: 0, vel: 0 };
const svWrap = (min, max, v) => { const r = max - min; return (((v - min) % r) + r) % r + min; };
const svStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SV_IO = new IntersectionObserver(es => { es.forEach(e => { const r = SV.rows.find(x => x.el === e.target); if (r) r.vis = e.isIntersecting; }); svWake(); });
function svWake() { if (!SV.raf && !svStill && SV.rows.some(r => r.vis)) { SV.last = performance.now(); SV.y = scrollY; SV.raf = requestAnimationFrame(svTick); } }
function svTick(now) {
  SV.raf = 0;
  SV.rows = SV.rows.filter(r => r.el.isConnected); if (!SV.rows.length) return;
  const dt = Math.min(64, Math.max(1, now - SV.last)); SV.last = now;
  SV.vel += ((scrollY - SV.y) / (dt / 1000) - SV.vel) * (1 - Math.exp(-dt / 90)); SV.y = scrollY;
  const f = Math.max(-12, Math.min(12, SV.vel / 200)), surgeScroll = Math.tanh(Math.abs(SV.vel) / 1600);
  SV.rows.forEach(r => {
    if (!r.vis || !r.w) return;
    const grab = r.drag, secs = dt / 1000;
    r.pace += ((grab.on || r.hover ? 0 : 1) - r.pace) * (1 - Math.exp(-dt / 150));
    let move = r.dir * r.base * secs;
    if (f < 0) r.dir = -1; else if (f > 0) r.dir = 1;
    move += r.dir * move * f;
    let travel = move * r.pace;
    if (!grab.on && r.fling) { travel += r.fling * secs; r.fling *= Math.exp(-dt / 420); if (Math.abs(r.fling) < 4) r.fling = 0; }
    r.x += travel;
    const thrown = grab.on ? grab.v : r.fling, throwSurge = Math.tanh(Math.abs(thrown) / 2000), surge = Math.max(surgeScroll * r.pace, throwSurge);
    const heading = throwSurge > surgeScroll * r.pace ? Math.sign(thrown) : (Math.sign(travel) || r.dir * Math.sign(r.base)), ease = 1 - Math.exp(-dt / 110);
    r.skew += (-heading * 3 * surge - r.skew) * ease; r.scale += (1 + .015 * surge - r.scale) * ease;
    r.track.style.transform = `translate3d(${svWrap(-r.w, 0, r.x)}px,0,0) skewX(${r.skew.toFixed(2)}deg) scaleY(${r.scale.toFixed(3)})`;
  });
  if (SV.rows.some(r => r.vis)) SV.raf = requestAnimationFrame(svTick);
}
function initSV() {
  SV.rows.forEach(r => SV_IO.unobserve(r.el)); SV.rows = [];
  document.querySelectorAll('.sv-row').forEach(el => {
    const track = el.querySelector('.sv-track'), o = +el.dataset.o || 0, items = [...FAQ.slice(o), ...FAQ.slice(0, o)];
    const set = `<div class="sv-set">${items.map(([q, a]) => `<article class="sv-card"><h3>${esc(q)}</h3><p>${esc(a)}</p></article>`).join('')}</div>`;
    track.innerHTML = set.repeat(4);
    const row = { el, track, base: +el.dataset.v, dir: 1, x: 0, w: 0, skew: 0, scale: 1, pace: 1, fling: 0, vis: false, hover: false, drag: { on: false, id: -1, lastX: 0, lastT: 0, v: 0 } };
    new ResizeObserver(() => { row.w = track.firstElementChild.offsetWidth; if (svStill) track.style.transform = ''; }).observe(track.firstElementChild);
    el.addEventListener('pointerenter', () => { row.hover = true; }); el.addEventListener('pointerleave', () => { row.hover = false; });
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; const g = row.drag; g.on = true; g.id = e.pointerId; g.lastX = e.clientX; g.lastT = e.timeStamp; g.v = 0; row.fling = 0; el.setPointerCapture?.(e.pointerId); el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', e => { const g = row.drag; if (!g.on || e.pointerId !== g.id) return; const dx = e.clientX - g.lastX, dt = Math.max(e.timeStamp - g.lastT, 1); g.lastX = e.clientX; g.lastT = e.timeStamp; row.x += dx; g.v += ((dx / dt) * 1000 - g.v) * (1 - Math.exp(-dt / 50)); });
    const up = e => { const g = row.drag; if (!g.on || e.pointerId !== g.id) return; g.on = false; row.fling = e.timeStamp - g.lastT > 90 ? 0 : Math.max(-5000, Math.min(5000, g.v)); g.v = 0; if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId); el.style.cursor = 'grab'; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    SV.rows.push(row); SV_IO.observe(el);
  });
}

/* Glass refraction: vanilla port of React Bits GlassSurface (SVG-filter renderer). Chromium only; other browsers keep the frosted CSS glass. */
(() => {
  const ua = navigator.userAgent;
  if (/Firefox/.test(ua) || (/Safari/.test(ua) && !/Chrome/.test(ua))) return;
  const probe = document.createElement('div'); probe.style.backdropFilter = 'url(#probe)'; if (!probe.style.backdropFilter) return;
  const NS = 'http://www.w3.org/2000/svg', host = document.createElementNS(NS, 'svg');
  host.setAttribute('width', '0'); host.setAttribute('height', '0'); host.setAttribute('aria-hidden', 'true'); host.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  document.body.append(host);
  const O = { edge: .07, brightness: 50, opacity: .93, blur: 11, scale: -110, offs: [0, 10, 20], displace: .5 };
  const M = ['1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0'];
  const mapUrl = (w, h, r) => {
    const e = Math.min(w, h) * O.edge * .5;
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient><filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${O.blur}"/></filter></defs><rect width="${w}" height="${h}" fill="black"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#r)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#b)" style="mix-blend-mode:difference"/><rect x="${e}" y="${e}" width="${w - e * 2}" height="${h - e * 2}" rx="${r}" fill="hsl(0 0% ${O.brightness}% / ${O.opacity})" filter="url(#s)"/></svg>`);
  };
  const glassify = (el, id) => {
    const holder = document.createElementNS(NS, 'svg'); host.append(holder);
    holder.innerHTML = `<defs><filter id="${id}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%"><feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>` +
      M.map((m, i) => `<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" scale="${O.scale + O.offs[i]}" result="d${i}"/><feColorMatrix in="d${i}" type="matrix" values="${m}" result="c${i}"/>`).join('') +
      `<feBlend in="c0" in2="c1" mode="screen" result="rg"/><feBlend in="rg" in2="c2" mode="screen" result="out"/><feGaussianBlur in="out" stdDeviation="${O.displace}"/></filter></defs>`;
    const img = holder.querySelector('feImage');
    const upd = () => { const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return; const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20, w / 2, h / 2); img.setAttribute('href', mapUrl(w, h, r)); };
    new ResizeObserver(upd).observe(el); upd();
    el.style.setProperty('--gf', `url(#${id})`); el.setAttribute('data-refract', '');
  };
  glassify($('.top .bar'), 'glass-nav');
})();

window.addEventListener('hashchange', route);
route();