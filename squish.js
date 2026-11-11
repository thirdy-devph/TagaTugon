/* SquishSwitch — vanilla JS port of the React Bits <SquishSwitch /> (the `motion` library is replaced by a tiny spring solver).
   Markup:  <button id="x" type="button" role="switch" aria-checked="true" class="squish-switch">
              <span class="squish-switch__track"><span class="squish-switch__thumb"></span></span></button>
   Usage:   const sw = TTSwitch.attach(buttonEl, { width: 52, height: 30, onChange: on => {...} });
            sw.setChecked(true);  sw.destroy();
   Colours come from CSS variables (--ss-track, --ss-track-on, --ss-thumb-color, --ss-thumb-on) so light/dark mode just works. */
(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const FLOW = { k: 320, c: 40, m: 0.6 };
  const SWELL = { k: 520, c: 34, m: 0.6 };
  const MAX_STRETCH = 0.4, STRETCH_SPEED = 600, TAP_SLOP = { fine: 4, coarse: 8 };

  function attach(btn, opts) {
    if (!btn) return null;
    const o = Object.assign({ width: 52, height: 30, radius: 15, speed: 50, stretch: 36, hoverScale: 1.035, onChange: null }, opts || {});
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const inset = Math.max(3, Math.round(o.height * 0.11));
    const thumbSize = o.height - inset * 2;
    const min = inset, max = o.width - inset - thumbSize, mid = (min + max) / 2;
    const trackR = Math.min(o.radius, o.height / 2), thumbR = Math.max(2, trackR - inset);
    const set = (k, v) => btn.style.setProperty(k, v);
    set('--ss-w', o.width + 'px'); set('--ss-h', o.height + 'px'); set('--ss-inset', inset + 'px');
    set('--ss-thumb', thumbSize + 'px'); set('--ss-r', trackR + 'px'); set('--ss-thumb-r', thumbR + 'px');

    const track = btn.querySelector('.squish-switch__track');
    const thumb = btn.querySelector('.squish-switch__thumb');
    let on = btn.getAttribute('aria-checked') === 'true';
    let dragging = false, grip = null, skipClick = false, raf = 0, last = 0, alive = true;

    const gain = reduce ? 0 : clamp(o.stretch, 0, 100) / 100;
    const stretchOf = v => 1 + Math.min(MAX_STRETCH, Math.abs(v) / STRETCH_SPEED) * gain;
    const K = 170 - (50 - clamp(o.speed, 0, 100)) * 1.1, C = 21.5, M = 0.9;   // settle spring
    const sim = { x: on ? max : min, vx: 0, frameX: on ? max : min, flow: 0, flowV: 0, swell: 1, swellV: 0, swellT: 1 };

    const isDisabled = () => btn.getAttribute('aria-disabled') === 'true';
    const reflect = () => {
      btn.setAttribute('aria-checked', String(on));
      if (on) btn.setAttribute('data-on', ''); else btn.removeAttribute('data-on');
    };
    const render = () => {
      const sx = stretchOf(sim.flow) * sim.swell, sy = sim.swell / stretchOf(sim.flow);
      thumb.style.transform = `translateX(${sim.x.toFixed(3)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
      last = now;
      const target = on ? max : min;
      const n = Math.ceil(dt / (1 / 240)), h = dt / n;
      const dragVel = (sim.x - sim.frameX) / dt;
      for (let i = 0; i < n; i++) {
        if (!dragging) {
          if (reduce) { sim.x = target; sim.vx = 0; }
          else { const a = (-K * (sim.x - target) - C * sim.vx) / M; sim.vx += a * h; sim.x += sim.vx * h; }
        }
        const vel = dragging ? dragVel : sim.vx;
        const fa = (-FLOW.k * (sim.flow - vel) - FLOW.c * sim.flowV) / FLOW.m;
        sim.flowV += fa * h; sim.flow += sim.flowV * h;
        const sa = (-SWELL.k * (sim.swell - sim.swellT) - SWELL.c * sim.swellV) / SWELL.m;
        sim.swellV += sa * h; sim.swell += sim.swellV * h;
      }
      sim.frameX = sim.x;
      const settled = !dragging && Math.abs(sim.x - target) < 0.001 && Math.abs(sim.vx) < 0.01 &&
        Math.abs(sim.flow) < 0.01 && Math.abs(sim.flowV) < 0.01 && Math.abs(sim.swell - sim.swellT) < 0.0005 && Math.abs(sim.swellV) < 0.005;
      if (settled) { sim.x = target; sim.vx = 0; sim.flow = 0; sim.flowV = 0; sim.swell = sim.swellT; sim.swellV = 0; sim.frameX = target; }
      render();
      if (!settled) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (raf || !alive) return; last = performance.now(); raf = requestAnimationFrame(tick); };

    const commit = next => {
      if (next === on) return;
      on = next; reflect(); wake();
      if (typeof o.onChange === 'function') o.onChange(on);
    };

    const localX = clientX => {
      const rect = track.getBoundingClientRect();
      const scale = rect.width / (track.offsetWidth || rect.width) || 1;
      return (clientX - rect.left) / scale;
    };
    const down = e => {
      if (isDisabled() || grip || e.button !== 0) return;
      grip = { id: e.pointerId, grab: null, moved: false, startX: e.clientX, onAtPress: on, slop: e.pointerType === 'touch' ? TAP_SLOP.coarse : TAP_SLOP.fine };
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      dragging = true; btn.setAttribute('data-held', ''); wake();
    };
    const move = e => {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      const lx = localX(e.clientX);
      if (g.grab === null) { g.grab = lx - sim.x; return; }
      if (!g.moved && Math.abs(e.clientX - g.startX) > g.slop) g.moved = true;
      if (!g.moved) return;
      sim.x = clamp(lx - g.grab, min, max);
      commit(sim.x > mid);
      wake();
    };
    const up = (e, cancelled) => {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      grip = null;
      try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
      if (cancelled) commit(g.onAtPress);
      else if (!g.moved) commit(!on);
      skipClick = true;
      setTimeout(() => { skipClick = false; }, 0);
      dragging = false; btn.removeAttribute('data-held'); sim.vx = 0; wake();
    };
    const onUp = e => up(e, false), onCancel = e => up(e, true);
    const onEnter = e => { if (e.pointerType === 'mouse' && !isDisabled()) { sim.swellT = o.hoverScale; wake(); } };
    const onLeave = () => { sim.swellT = 1; wake(); };
    const onKey = e => { if (e.key === 'Escape' && grip) up({ pointerId: grip.id }, true); };
    const onClick = () => {
      if (skipClick) { skipClick = false; return; }
      if (!isDisabled()) commit(!on);   // keyboard (Space / Enter) and label clicks land here
    };

    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointermove', move);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onCancel);
    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('pointerleave', onLeave);
    btn.addEventListener('keydown', onKey);
    btn.addEventListener('click', onClick);

    reflect();
    render();   // rest position, no animation on first paint

    return {
      setChecked(v) { v = !!v; if (v === on) return; on = v; reflect(); wake(); },
      isChecked() { return on; },
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        btn.removeEventListener('pointerdown', down);
        btn.removeEventListener('pointermove', move);
        btn.removeEventListener('pointerup', onUp);
        btn.removeEventListener('pointercancel', onCancel);
        btn.removeEventListener('pointerenter', onEnter);
        btn.removeEventListener('pointerleave', onLeave);
        btn.removeEventListener('keydown', onKey);
        btn.removeEventListener('click', onClick);
      }
    };
  }

  window.TTSwitch = { attach };
})();