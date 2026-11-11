/* TagaTugon chat assistant — floating widget, bottom-right.
   Works out of the box with a built-in knowledge base about the site (no server needed).
   To plug in a real AI later, point it at your own backend (never put an API key in this file):
       TTChat.configure({ endpoint: '/api/chat' });
   The endpoint receives POST { messages: [{role:'user'|'assistant', content:'...'}] } and must answer { reply: '...' }.
   If the request fails, the built-in answers are used instead. */
(function () {
  'use strict';
  if (window.TTChat) return;

  const KEY = 'tt.chat';
  const MAX_SAVED = 40;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let endpoint = null;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = t => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((#\/[a-z]+)\)/g, '<a href="$2" data-nav>$1</a>')
    .replace(/\n/g, '<br>');
  const session = () => { try { return JSON.parse(sessionStorage.getItem('tt.session') || localStorage.getItem('tt.session')); } catch (e) { return null; } };

  /* ---------------------------------------------------------------- knowledge base */
  const CATS = ['Infrastructure', 'Sanitation and Waste Management', 'Utilities', 'Public Safety', 'Drainage and Flooding', 'Street Lighting', 'Local Ordinance Violations', 'Other Community Concerns'];
  const ANN = ['Weather Advisory', 'Road Closure', 'Garbage Collection', 'Power or Water Interruption', 'Curfew Reminder', 'Community Event'];
  const Q = {
    report: 'How do I report a problem?', status: 'What do the statuses mean?', cats: 'What can I report?',
    ann: 'Where are the announcements?', contact: 'Contact the barangay', emerg: 'Emergency help', acct: 'How do I create an account?',
    priv: 'Is my identity private?', comm: 'See community reports'
  };

  const INTENTS = [
    { id: 'emergency', k: [[/\b(emergency|fire|sunog|accident|crime|robbery|holdup|trapped|injured|ambulance|police|pulis|bomba|911|shooting|gun)\b/, 10]],
      a: () => '**If anyone is in danger, call 911 right now.** TagaTugon is for community concerns, not real-time emergencies.\n\nOnce everyone is safe, you can file a report under **Public Safety** so the barangay can follow up.',
      c: [Q.report, Q.contact] },
    { id: 'greet', k: [[/\b(hi|hello|hey|kumusta|good (morning|afternoon|evening)|magandang (umaga|hapon|gabi))\b/, 3]],
      a: () => 'Hello! I\'m the TagaTugon assistant. I can help you report a concern, understand a report\'s status, find announcements, or reach the barangay. What do you need?',
      c: [Q.report, Q.status, Q.contact] },
    { id: 'thanks', k: [[/\b(thanks|thank you|salamat|ty)\b/, 4]], a: () => 'You\'re welcome! Ask me anything else about TagaTugon anytime.', c: [] },
    { id: 'bye', k: [[/\b(bye|goodbye|paalam|see you)\b/, 4]], a: () => 'Take care! Stay safe, and thank you for helping your community.', c: [] },
    { id: 'help', k: [[/\b(what can you do|help|tulong|options|menu)\b/, 2]],
      a: () => 'I can answer questions about:\n• Reporting a concern and its categories\n• Tracking a report and what each status means\n• Announcements and community reports\n• Accounts, privacy and contact details',
      c: [Q.report, Q.status, Q.ann] },
    { id: 'about', k: [[/\b(what is tagatugon|about|who are you|ano ang tagatugon|purpose)\b/, 3], [/\btagatugon\b/, 1]],
      a: () => '**TagaTugon** connects residents with their Local Government Unit and Barangay officials. You can report problems, follow their progress, and read local announcements. Learn more on the [About](#/about) page.',
      c: [Q.report, Q.comm] },
    { id: 'report', k: [[/\b(report|submit|file|complain\w*|reklamo|ireport|mag-?report|ulat|concern|problem|issue|pothole|broken)\b/, 3], [/\b(how|paano)\b/, 1]],
      a: () => {
        const s = session();
        if (s && s.role === 'admin') return 'Citizens submit reports from their own accounts. As an admin you can review and update them from [Reports](#/adminreports).';
        const first = s ? 'You\'re already logged in, so you can start right away.' : '1. **Log in** or [create an account](#/register)\n';
        return `Reporting takes a few short steps:\n${s ? first + '\n' : first}${s ? '1' : '2'}. Open [Report](#/submit) and fill in **Details**, **Location**, then **Review**\n${s ? '2' : '3'}. Submit it and follow its progress in [My Reports](#/myreports)\n\nChoose the category that fits best, for example Infrastructure, Drainage and Flooding or Street Lighting.`;
      },
      c: [Q.cats, Q.status] },
    { id: 'cats', k: [[/\b(categor(y|ies)|types?|kinds? of|what can i report|ano ang pwede)\b/, 4]],
      a: () => 'You can report concerns in these categories:\n' + CATS.map(c => '• ' + c).join('\n'),
      c: [Q.report] },
    { id: 'status', k: [[/\b(track|status|statuses|progress|update|follow|my reports?|check|mean|meaning|under review|assigned|in progress|resolved|rejected|submitted)\b/, 3]],
      a: () => 'Every report moves through these statuses:\n**Submitted**: we received it\n**Under Review**: officials are checking it\n**Assigned**: sent to the responsible office\n**In Progress**: work is underway\n**Resolved**: completed and inspected\n**Rejected**: it could not be acted on (see the report\'s notes)\n\nSee your own reports and their timelines in [My Reports](#/myreports).',
      c: [Q.comm, 'How long does it take?'] },
    { id: 'time', k: [[/\b(how long|response time|when will|gaano katagal|how fast|timeline)\b/, 4]],
      a: () => 'I don\'t have a fixed timeline, because it depends on the concern and the office handling it. Check the status timeline on your report in [My Reports](#/myreports) for the latest step. For anything urgent, call the Barangay Hall, or **911** in an emergency.',
      c: [Q.status, Q.contact] },
    { id: 'community', k: [[/\b(community|map|neighbou?rs?|others|public reports?)\b/, 3]],
      a: () => 'Open [Community Reports](#/community) to see what your neighbors are raising, in list or map view. You can filter by category and status. Reporter names are never shown in public lists.',
      c: [Q.priv, Q.report] },
    { id: 'ann', k: [[/\b(announce\w*|advisory|news|curfew|road closure|garbage|collection|brownout|power|interruption|event|abiso)\b/, 3]],
      a: () => 'Read the latest notices on the [Announcements](#/announcements) page. Categories include:\n' + ANN.map(c => '• ' + c).join('\n') + '\n\nYou can filter or search them.',
      c: [Q.report, Q.contact] },
    { id: 'acct', k: [[/\b(register|sign ?up|create (an )?account|account|get started|new user)\b/, 3]],
      a: () => session() ? 'You\'re already logged in. You can manage your details in your [Profile](#/profile).' : 'Create a free account on the [Get Started](#/register) page. It has two short steps, **Account** and **Locality**. Already registered? Use **Login** in the menu.',
      c: [Q.report, Q.priv] },
    { id: 'login', k: [[/\b(log ?in|sign ?in|password|forgot|log ?out|logout)\b/, 3]],
      a: () => session() ? 'You\'re logged in. To log out, open your [Profile](#/profile) and use the log out button.' : 'Use **Login** in the top menu. I can\'t reset passwords in chat. If you\'re locked out, contact the Barangay Hall at help@tagatugon.example.',
      c: [Q.acct, Q.contact] },
    { id: 'priv', k: [[/\b(privacy|private|anonymous|identity|confidential|secure|safe)\b/, 3], [/\b(my name|data)\b/, 2]],
      a: () => 'Your privacy matters. Reporter names are **never shown in public lists**, and only assigned officials can see the full details of a report.',
      c: [Q.report, Q.comm] },
    { id: 'contact', k: [[/\b(contact|phone|number|email|address|office|hall|hours|where is|call)\b/, 3]],
      a: () => '**Barangay Hall**\nMain Street\nPhone: 0000-000-0000\nEmail: help@tagatugon.example\n\nFor emergencies, call **911**.',
      c: [Q.emerg, Q.report] },
    { id: 'dept', k: [[/\b(who (handles|fix\w*|responds?)|department|official|assigned to)\b/, 3]],
      a: () => 'Reports are routed to the right office, such as Engineering and Infrastructure, Sanitation, Public Safety, Disaster Risk Reduction and Management, General Services, the Barangay Office or Utilities Coordination. You\'ll see the assignment on your report\'s timeline.',
      c: [Q.status] },
    { id: 'notif', k: [[/\b(notif\w*|alert|bell)\b/, 3]],
      a: () => 'When you\'re logged in, updates about your reports and new announcements appear in your notifications. You can adjust them in your [Profile](#/profile).',
      c: [Q.ann] },
    { id: 'theme', k: [[/\b(dark|light|theme|mode|night)\b/, 3]],
      a: () => 'Use the sun/moon button at the top right of the menu to switch between light and dark mode. The site remembers your choice.',
      c: [] }
  ];

  const FALLBACK = {
    t: 'I\'m not sure I understood that. I can help with reporting, report statuses, announcements, accounts and contact details. You can also reach the Barangay Hall at help@tagatugon.example.',
    c: [Q.report, Q.status, Q.contact]
  };

  function localAnswer(text) {
    const idm = text.match(/\bTT-?\s?(\d{3,6})\b/i);
    if (idm) return { t: `I can't look up individual reports in chat yet. Open [My Reports](#/myreports) or [Community Reports](#/community) and find **TT-${idm[1]}** to see its status timeline.`, c: [Q.status] };
    const q = ' ' + text.toLowerCase().replace(/[^\p{L}\p{N}\s\-]/gu, ' ') + ' ';
    let best = null, top = 0;
    for (const it of INTENTS) {
      let s = 0;
      for (const [re, w] of it.k) if (re.test(q)) s += w;
      if (s > top) { top = s; best = it; }
    }
    return best ? { t: best.a(), c: best.c } : FALLBACK;
  }

  async function respond(history) {
    const last = history[history.length - 1].t;
    if (endpoint) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t })) })
        });
        if (r.ok) { const d = await r.json(); if (d && d.reply) return { t: String(d.reply), c: [] }; }
      } catch (e) { /* fall back to the built-in answers */ }
    }
    return localAnswer(last);
  }

  /* ---------------------------------------------------------------- UI */
  const ICON = {
    chat: '<svg class="cb-i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 20.5l1.5-4.6A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="2.4"/></svg>',
    x: '<svg class="cb-i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>'
  };

  const root = document.createElement('div');
  root.className = 'cb';
  root.innerHTML = `
    <section class="cb-panel" id="cbPanel" role="dialog" aria-label="TagaTugon assistant" inert>
      <header class="cb-head">
        <span class="cb-av" aria-hidden="true"><img src="mainlogofordarkmode.png" alt=""></span>
        <div class="cb-ttl"><b>TagaTugon Assistant</b><span>Online</span></div>
        <button type="button" class="cb-hbtn" data-reset aria-label="Start a new chat" title="New chat">${ICON.reset}</button>
      </header>
      <div class="cb-log" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <form class="cb-form" autocomplete="off">
        <input class="cb-in" type="text" maxlength="300" placeholder="Ask a question..." aria-label="Type your question" enterkeyhint="send">
        <button class="cb-send" type="submit" aria-label="Send" disabled>${ICON.send}</button>
      </form>
      <p class="cb-note">Automated assistant. In an emergency, call 911.</p>
    </section>
    <button type="button" class="cb-fab" aria-label="Open chat assistant" aria-expanded="false" aria-controls="cbPanel">${ICON.chat}${ICON.x}</button>`;
  document.body.appendChild(root);

  const $ = s => root.querySelector(s);
  const fab = $('.cb-fab'), panel = $('.cb-panel'), log = $('.cb-log'), form = $('.cb-form'), input = $('.cb-in'), send = $('.cb-send');
  let msgs = [], busy = false;

  try { msgs = JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { msgs = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-MAX_SAVED))); } catch (e) {} };
  const toBottom = () => { log.scrollTop = log.scrollHeight; };

  function bubble(role, text) {
    const row = document.createElement('div');
    row.className = 'cb-msg ' + (role === 'u' ? 'cb-user' : 'cb-bot');
    const b = document.createElement('div');
    b.className = 'cb-bub';
    b.innerHTML = md(text);
    row.appendChild(b);
    log.appendChild(row);
    toBottom();
    return row;
  }
  function clearChips() { log.querySelectorAll('.cb-chips').forEach(n => n.remove()); }
  function chips(list) {
    clearChips();
    if (!list || !list.length) return;
    const w = document.createElement('div');
    w.className = 'cb-chips';
    list.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cb-chip'; b.textContent = t;
      b.addEventListener('click', () => ask(t));
      w.appendChild(b);
    });
    log.appendChild(w);
    toBottom();
  }
  function typing() {
    const row = document.createElement('div');
    row.className = 'cb-msg cb-bot cb-typing';
    row.setAttribute('aria-label', 'Assistant is typing');
    row.innerHTML = '<div class="cb-bub"><i></i><i></i><i></i></div>';
    log.appendChild(row);
    toBottom();
    return row;
  }

  function greet() {
    const r = localAnswer('hello');
    msgs.push({ r: 'b', t: r.t });
    bubble('b', r.t);
    chips(r.c);
    save();
  }
  function restore() {
    log.innerHTML = '';
    if (!msgs.length) return greet();
    msgs.forEach(m => bubble(m.r, m.t));
    chips([Q.report, Q.status, Q.contact]);
  }

  async function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    clearChips();
    msgs.push({ r: 'u', t: text });
    bubble('u', text);
    input.value = ''; send.disabled = true;
    const dots = typing();
    const started = Date.now();
    const res = await respond(msgs);
    const wait = reduce ? 0 : Math.max(0, Math.min(1100, 450 + res.t.length * 4) - (Date.now() - started));
    setTimeout(() => {
      dots.remove();
      msgs.push({ r: 'b', t: res.t });
      bubble('b', res.t);
      chips(res.c);
      save();
      busy = false;
      send.disabled = !input.value.trim();
    }, wait);
  }

  function open() {
    root.setAttribute('data-open', '');
    panel.removeAttribute('inert');
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Close chat assistant');
    toBottom();
    if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => input.focus(), 120);
  }
  function close(returnFocus) {
    root.removeAttribute('data-open');
    panel.setAttribute('inert', '');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Open chat assistant');
    if (returnFocus) fab.focus();
  }
  const isOpen = () => root.hasAttribute('data-open');

  fab.addEventListener('click', () => (isOpen() ? close(false) : open()));
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  $('[data-reset]').addEventListener('click', () => { if (busy) return; msgs = []; save(); restore(); input.focus(); });
  log.addEventListener('click', e => {
    const a = e.target.closest('a[data-nav]');
    if (a && matchMedia('(max-width: 560px)').matches) close(false);   // reveal the page on phones
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(true); });
  document.addEventListener('pointerdown', e => {
    if (isOpen() && !root.contains(e.target) && matchMedia('(max-width: 560px)').matches) close(false);
  });

  restore();
  window.TTChat = {
    open, close: () => close(false), ask,
    configure(o) { if (o && typeof o.endpoint === 'string') endpoint = o.endpoint || null; }
  };
})();