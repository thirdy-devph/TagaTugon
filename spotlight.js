/* SpotlightCard — vanilla JS port of the React Bits <SpotlightCard /> component.
   Usage:  const s = TTSpotlight.attach(el, { spotlightColor: t => (t === 'dark' ? '#7fd197' : '#2E6B41') });
           s.update({ intensity: .2 });  s.destroy();
   `theme` can be 'dark', 'light' or 'auto' (follows <html data-theme>, and reacts when it changes).
   `spotlightColor`, `intensity` and `borderGlow` can each be a plain value or a function(theme). */
(function () {
  const THEMES = {
    dark: { light: '#ffffff', fill: 1, edge: 1 },
    light: { light: '#18181b', fill: 0.28, edge: 0.7 }
  };
  const SHAPES = ['circle', 'beam'];
  const NOISE =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  const DEFAULTS = {
    spotlightColor: undefined, intensity: 0.15, spotlightSize: 240, softness: 0.7, shape: 'circle',
    borderGlow: 0.6, proximity: 80, smoothing: 0.3, ambient: false, flare: true, grain: 0, theme: 'auto'
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pick = (v, theme) => (typeof v === 'function' ? v(theme) : v);   // any number option may be a function(theme)

  const falloff = (color, softness) => {
    const soft = clamp(softness, 0, 1);
    const core = Math.pow(1 - soft, 1.5) * 0.85;
    const stop = (alpha, at) =>
      `color-mix(in srgb, ${color} ${(alpha * 100).toFixed(2)}%, transparent) ${(at * 100).toFixed(2)}%`;
    const list = [stop(1, 0)];
    for (let i = 0; i <= 14; i++) {
      const t = core + ((1 - core) * i) / 14;
      const g = (t - core) / (1 - core);
      const smooth = 1 - g * g * (3 - 2 * g);
      const glow = Math.exp(-4.6 * g * g) * (1 - Math.pow(g, 6));
      list.push(stop(smooth + (glow - smooth) * soft, t));
    }
    return list.join(', ');
  };

  const span = cls => {
    const el = document.createElement('span');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return el;
  };

  function attach(root, opts) {
    if (!root) return null;
    const o = Object.assign({}, DEFAULTS, opts || {});
    const light = span('spotlight-card__light');
    const noise = span('spotlight-card__grain');
    noise.style.backgroundImage = NOISE;
    const border = span('spotlight-card__border');
    const edge = span('spotlight-card__edge');
    root.classList.add('spotlight-card');
    root.insertBefore(noise, root.firstChild);
    root.insertBefore(light, root.firstChild);
    root.appendChild(border);
    root.appendChild(edge);

    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
    const state = { x: 0, y: 0, presence: 0, flare: 0, time: Math.random() * 60, pressed: false, visible: true };
    const pointer = { x: 0, y: 0, active: false };
    const drawn = { light: '', edge: '', noise: '' };
    let focus = null, raf = 0, last = 0, alive = true, settings;

    const currentTheme = () => {
      if (o.theme === 'light' || o.theme === 'dark') return o.theme;
      return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    };

    const compute = () => {
      const theme = currentTheme();
      const palette = THEMES[theme];
      const picked = typeof o.spotlightColor === 'function' ? o.spotlightColor(theme) : o.spotlightColor;
      const color = picked || palette.light;
      settings = {
        shape: SHAPES.indexOf(o.shape) >= 0 ? o.shape : 'circle',
        fill: falloff(color, o.softness),
        edge: falloff(color, 1),
        size: Math.max(20, o.spotlightSize),
        intensity: clamp(pick(o.intensity, theme), 0, 1) * palette.fill,
        borderGlow: clamp(pick(o.borderGlow, theme), 0, 1) * palette.edge,
        proximity: Math.max(0, o.proximity),
        smoothing: clamp(o.smoothing, 0, 1),
        ambient: !!o.ambient,
        flare: !!o.flare,
        grain: clamp(o.grain, 0, 1)
      };
    };

    const gradient = (s, size, x, y, stops) => {
      if (s.shape === 'beam') {
        const reach = Math.max(size * 0.6, y + size * 0.55);
        return `radial-gradient(${(size * 0.55).toFixed(1)}px ${reach.toFixed(1)}px at ${x.toFixed(1)}px 0px, ${stops})`;
      }
      return `radial-gradient(circle ${size.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${stops})`;
    };

    const paint = s => {
      const size = s.size * (1 + 0.2 * state.flare);
      const boost = 1 + 0.7 * state.flare;
      const fill = gradient(s, size, state.x, state.y, s.fill);
      const rim = gradient(s, size * 0.6, state.x, s.shape === 'beam' ? 0 : state.y, s.edge);
      if (fill !== drawn.light) { drawn.light = fill; light.style.background = fill; }
      if (rim !== drawn.edge) { drawn.edge = rim; edge.style.background = rim; }
      light.style.opacity = String(Math.min(1, state.presence * s.intensity * boost));
      edge.style.opacity = String(Math.min(1, state.presence * s.borderGlow * boost));
      const grainy = s.grain > 0 ? gradient(s, size, state.x, state.y, '#000 0%, transparent 100%') : 'none';
      if (grainy !== drawn.noise) {
        drawn.noise = grainy;
        noise.style.webkitMaskImage = grainy;
        noise.style.maskImage = grainy;
      }
      noise.style.opacity = String(state.presence * s.grain);
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const s = settings;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const rect = root.getBoundingClientRect();
      let tx = state.x, ty = state.y, target = 0;
      if (focus && root.contains(focus)) {
        const box = focus.getBoundingClientRect();
        tx = box.left + box.width / 2 - rect.left;
        ty = box.top + box.height / 2 - rect.top;
        target = 1;
      } else if (pointer.active) {
        tx = pointer.x - rect.left;
        ty = pointer.y - rect.top;
        const gap = Math.hypot(Math.max(0, -tx, tx - rect.width), Math.max(0, -ty, ty - rect.height));
        if (gap === 0) target = 1;
        else if (s.proximity > 0) target = Math.pow(Math.max(0, 1 - gap / s.proximity), 2);
      }
      if (target < 0.6 && s.ambient && state.visible) {
        if (!reduce) state.time += dt;
        const drift = 0.6 - target;
        tx += (rect.width * (0.5 + 0.34 * Math.sin(state.time * 0.43)) - tx) * (drift / 0.6);
        ty += (rect.height * (0.5 + 0.3 * Math.sin(state.time * 0.61 + 1.3)) - ty) * (drift / 0.6);
        target = 0.6;
      }
      if (state.presence < 0.02 && target > 0 && !s.ambient) { state.x = tx; state.y = ty; }
      const follow = reduce || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.015 + s.smoothing * 0.22));
      state.x += (tx - state.x) * follow;
      state.y += (ty - state.y) * follow;
      const fade = reduce ? 1 : 1 - Math.exp(-dt / (target > state.presence ? 0.1 : 0.32));
      state.presence += (target - state.presence) * fade;
      if (Math.abs(target - state.presence) < 0.002) state.presence = target;
      const press = state.pressed && s.flare && !reduce ? 1 : 0;
      state.flare += (press - state.flare) * (1 - Math.exp(-dt / (press ? 0.05 : 0.28)));
      if (Math.abs(press - state.flare) < 0.002) state.flare = press;
      paint(s);
      const moving = Math.abs(tx - state.x) > 0.1 || Math.abs(ty - state.y) > 0.1;
      const settled = !moving && state.presence === target && state.flare === press;
      if (!settled || (s.ambient && state.visible && !reduce)) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = e => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (state.presence > 0 || settings.proximity > 0 || root.contains(e.target)) wake();
    };
    const onOut = e => { if (e.relatedTarget) return; pointer.active = false; wake(); };
    const onDown = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; state.pressed = true; wake(); };
    const onUp = e => {
      if (e.pointerType !== 'mouse') pointer.active = false;
      if (!state.pressed && e.pointerType === 'mouse') return;
      state.pressed = false;
      wake();
    };
    const onFocusIn = e => {
      if (!(e.target instanceof Element) || !e.target.matches(':focus-visible')) return;
      focus = e.target;
      wake();
    };
    const onFocusOut = e => { if (root.contains(e.relatedTarget)) return; focus = null; wake(); };
    const onScroll = () => { if (pointer.active || state.presence > 0) wake(); };

    const io = new IntersectionObserver(entries => {
      state.visible = entries.some(en => en.isIntersecting);
      if (state.visible) wake();
    });
    io.observe(root);
    // repaint when the site's light/dark theme is switched
    const mo = new MutationObserver(() => { compute(); drawn.light = drawn.edge = ''; wake(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('pointerout', onOut);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    compute();
    wake();

    return {
      update(patch) { Object.assign(o, patch || {}); compute(); drawn.light = drawn.edge = drawn.noise = ''; wake(); },
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        io.disconnect();
        mo.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('scroll', onScroll, { capture: true });
        document.removeEventListener('pointerout', onOut);
        root.removeEventListener('pointerdown', onDown);
        root.removeEventListener('focusin', onFocusIn);
        root.removeEventListener('focusout', onFocusOut);
        [light, noise, border, edge].forEach(el => el.parentNode && el.parentNode.removeChild(el));
        root.classList.remove('spotlight-card');
      }
    };
  }

  window.TTSpotlight = { attach };
})();