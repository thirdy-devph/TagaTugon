/* PulseHeart — vanilla JS port of the React Bits <PulseHeart /> (no React, no icon package: the heart is an inline SVG path).
   The button is plain markup, so it can sit inside lists that are re-rendered with innerHTML:
       TTPulse.html({ id: 'TT-1001', liked: false, count: 14, label: 'Support this issue', action: 'support' })
   Presses are handled by your own click handler, which calls:
       const res = TTPulse.press(buttonEl, e.detail !== 0);   // -> { liked, count } or null while a run is in progress
   Colours come from CSS variables (--ph-pill, --ph-idle, --ph-liked, --ph-text) so light/dark mode just works. */
(function () {
  const OUT = 0.4, DURATION = 560, DOT = 0.3, OVERSHOOT = 1.7, BEAT = 3, ROLL = 350;
  const HEART = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';
  const back = (k, c) => { const u = k - 1; return 1 + (c + 1) * u ** 3 + c * u ** 2; };
  const swellOf = (t, c) => (t <= 0 ? 0 : t < OUT ? 1 - (1 - t / OUT) ** 3 : 1 - back((t - OUT) / (1 - OUT), c));
  const fmt = n => new Intl.NumberFormat().format(n);
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cells = text => [...text].map(ch => `<span>${esc(ch)}</span>`).join('');
  const slot = (top, bottom) => `<span class="pulse-heart__slot"><span class="pulse-heart__roll"><span>${esc(top)}</span><span>${esc(bottom)}</span></span></span>`;

  function html(o) {
    const size = o.size || 26, label = o.label || 'Like';
    return `<button type="button" class="pulse-heart" ${o.action ? `data-act="${esc(o.action)}"` : ''} data-id="${esc(o.id)}" data-liked="${!!o.liked}" data-count="${+o.count || 0}" aria-pressed="${!!o.liked}" data-label="${esc(label)}"
      style="--ph-size:${size}px;--ph-corner:${o.corner || 16}px;--ph-stroke:${(1.5 * size / 24).toFixed(2)}px">
      <span class="pulse-heart__pill"><span class="pulse-heart__heart" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="${HEART}" vector-effect="non-scaling-stroke"/></g></svg></span>
      <span class="pulse-heart__count" aria-hidden="true">${cells(fmt(+o.count || 0))}</span><span class="pulse-heart__sr">${esc(label)}, ${fmt(+o.count || 0)}</span></span></button>`;
  }

  function startRoll(btn, from, to) {
    if (from === to) return;
    const box = btn.querySelector('.pulse-heart__count'); if (!box) return;
    const a = fmt(from), b = fmt(to), up = to > from;
    const changed = a.length === b.length ? [...b].flatMap((ch, i) => (ch !== a[i] ? [i] : [])) : [];
    const at = changed.length === 1 ? changed[0] : -1;
    box.innerHTML = at === -1 ? slot(up ? a : b, up ? b : a)
      : [...b].map((ch, i) => (i === at ? slot(up ? a[i] : ch, up ? ch : a[i]) : `<span>${esc(ch)}</span>`)).join('');
    const roll = box.querySelector('.pulse-heart__roll');
    roll.style.transition = 'none'; roll.style.transform = `translateY(${up ? '0' : '-1em'})`; void roll.offsetHeight;
    roll.style.transition = ''; roll.style.transform = `translateY(${up ? '-1em' : '0'})`;
    clearTimeout(btn._rollTimer);
    btn._rollTimer = setTimeout(() => { box.innerHTML = cells(fmt(+btn.dataset.count)); }, ROLL + 30);
  }

  function showNow(btn, liked, count) {
    btn.dataset.liked = String(liked);
    const box = btn.querySelector('.pulse-heart__count'); if (box) box.innerHTML = cells(fmt(count));
    const sr = btn.querySelector('.pulse-heart__sr'); if (sr) sr.textContent = `${btn.dataset.label}, ${fmt(count)}`;
  }

  function run(btn, nextLiked, nextCount, prevCount) {
    const pill = btn.querySelector('.pulse-heart__pill'), heart = btn.querySelector('.pulse-heart__heart'), glyph = btn.querySelector('svg g');
    btn.dataset.running = '';
    let swapped = false, prev = 0;
    const t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / DURATION), step = prev ? now - prev : 1000 / 60; prev = now;
      const s = swellOf(t, OVERSHOOT), k = 1 - (1 - DOT) * s;
      if (glyph) glyph.setAttribute('transform', `translate(12 12) scale(${k}) translate(-12 -12)`);
      pill.style.transform = `scale(${1 - (BEAT / 100) * s})`;
      if (!swapped && t + step / 2 / DURATION >= OUT) {   // the flip: colour changes while the glyph is at its smallest
        swapped = true; btn.dataset.liked = String(nextLiked); startRoll(btn, prevCount, nextCount);
      }
      if (t < 1) { btn._raf = requestAnimationFrame(tick); return; }
      btn._raf = 0;
      if (glyph) glyph.removeAttribute('transform');
      heart.style.transform = ''; pill.style.transform = ''; delete btn.dataset.running;
    };
    btn._raf = requestAnimationFrame(tick);
  }

  /* Toggle one button. `pointer` = true for mouse/touch (plays the animation); keyboard and reduced-motion update instantly. */
  function press(btn, pointer) {
    if (!btn || btn.disabled || btn._raf) return null;
    const liked = btn.dataset.liked === 'true', count = +btn.dataset.count || 0;
    const nextLiked = !liked, nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
    btn.dataset.count = String(nextCount);
    btn.setAttribute('aria-pressed', String(nextLiked));
    const sr = btn.querySelector('.pulse-heart__sr'); if (sr) sr.textContent = `${btn.dataset.label}, ${fmt(nextCount)}`;
    if (pointer && !reduced()) run(btn, nextLiked, nextCount, count);
    else { btn.dataset.instant = ''; showNow(btn, nextLiked, nextCount); requestAnimationFrame(() => { delete btn.dataset.instant; }); }
    return { liked: nextLiked, count: nextCount };
  }

  /* pressed-in feel while the pointer is down */
  const clearPressed = () => document.querySelectorAll('.pulse-heart[data-pressed]').forEach(b => delete b.dataset.pressed);
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.pulse-heart');
    if (b && e.button === 0 && !b.disabled && !reduced()) b.dataset.pressed = '';
  });
  document.addEventListener('pointerup', clearPressed);
  document.addEventListener('pointercancel', clearPressed);
  document.addEventListener('pointerout', e => { const b = e.target.closest && e.target.closest('.pulse-heart'); if (b && !b.contains(e.relatedTarget)) delete b.dataset.pressed; });

  window.TTPulse = { html, press };
})();