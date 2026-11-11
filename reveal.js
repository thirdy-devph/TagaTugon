/* Reveal — scroll-triggered entrances for every page (no library, one IntersectionObserver).
   - cards, panels, lists, headings and hero content fade + rise in a short stagger as they enter the viewport
     (whatever is already on screen when a page opens plays straight away: that is the page-load entrance)
   - stat numbers and bar-chart values count up
   - bars and monthly columns grow from zero
   Plays once per element. Skipped entirely under prefers-reduced-motion, so everything is simply visible.
   Used by route():  TTReveal.kill()  before the page is replaced,  TTReveal.init(viewName)  after it is rendered. */
(function () {
  const DASH = new Set(['dashboard', 'admin', 'adminlogs']);   // only these get the phone dashboard layout hook
  const TARGETS = [
    '.stat, .panel, .row-card, .notifs, .page h2',                                                             // dashboards (original set)
    '.page > .wrap > h1, .page > .wrap > .lead, .page > .wrap > .st-track, .filters, .catbar, .scroll, .empty', // page headers + controls
    '.hero > *, .band, .feat, .chips, .blk h2, .blk > .wrap > .lead, .blk > .wrap > p, .blk .stepper',          // home
    '.auth, .pf-card'                                                                                          // register + profile
  ].join(', ');
  const STEP = 70, MAX_STAGGER = 6;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  let io = null, token = 0;

  function count(el, delay, tk) {
    const raw = (el.dataset.rvFinal || el.textContent).trim();
    if (!/^\d+$/.test(raw) || +raw === 0) return;
    el.dataset.rvFinal = raw;
    const end = +raw, dur = 800 + Math.min(end, 100) * 4;
    el.textContent = '0';
    const t0 = performance.now() + delay;
    const step = now => {
      if (tk !== token || !el.isConnected) return;
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = t < 1 ? String(Math.round(end * easeOut(t))) : raw;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function enter(el, i, tk) {
    el.style.setProperty('--rv-i', Math.min(i, MAX_STAGGER));
    el.classList.add('in');
    const delay = Math.min(i, MAX_STAGGER) * STEP;
    if (el.matches('.stat')) { const b = el.querySelector('b'); if (b) count(b, delay + 120, tk); }
    // bars and columns inside a panel: stagger each one, and count the bar values up
    el.querySelectorAll('.bar-row').forEach((row, k) => {
      row.style.setProperty('--bi', k);
      const b = row.querySelector(':scope > b'); if (b) count(b, delay + 160 + k * STEP, tk);
    });
    el.querySelectorAll('.col').forEach((c, k) => c.style.setProperty('--bi', k));
  }

  function kill() {
    token++;
    if (io) { io.disconnect(); io = null; }
    const app = document.getElementById('app');
    if (app) app.classList.remove('rv-on');
  }

  function init(view) {
    const app = document.getElementById('app');
    if (!app) return;
    app.toggleAttribute('data-dash', DASH.has(view));   // phone layout hook (see style.css)
    kill();
    if (reduced() || !('IntersectionObserver' in window)) return;
    // a target inside another target moves with its parent, so only the outer one animates
    const tk = token, els = [...app.querySelectorAll(TARGETS)].filter(el => !el.parentElement.closest(TARGETS));
    if (!els.length) return;
    try {
      io = new IntersectionObserver(entries => {
        const hits = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        hits.forEach((e, i) => { io.unobserve(e.target); enter(e.target, i, tk); });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      els.forEach(el => { el.classList.add('rv'); io.observe(el); });
      app.classList.add('rv-on');
    } catch (err) { kill(); els.forEach(el => el.classList.remove('rv')); }
  }

  window.TTReveal = { init, kill };
})();