/* GlideSelect — vanilla JS port of the React Bits <GlideSelect /> (no React, no icon package: the two icons are inline SVG).
   Usage:  const g = TTGlide.attach(hostEl, { options: [{ value: 'photo', label: 'Photo', tag: 'JPG, PNG' }, ...], value: 'photo',
                                              ariaLabel: 'Attachment type', size: 'lg', onChange: (value, option) => {} });
           g.setValue('video');  g.getValue();  g.destroy();
   Colours come from CSS variables (--gs-surface, --gs-highlight, --gs-text, --gs-accent) so light/dark mode just works. */
(function () {
  const SIZES = { sm: { chip: 28, row: 26, font: 12 }, md: { chip: 32, row: 30, font: 13 }, lg: { chip: 44, row: 40, font: 14 } };
  const PAD = 4, GAP = 1, MENU_GAP = 6;
  const CHEVRON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let uid = 0;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = o => (typeof o === 'string' ? { value: o, label: o } : o);

  function attach(host, opts) {
    if (!host) return null;
    const o = Object.assign({ options: [], value: undefined, onChange: null, placeholder: 'Select…', showTags: true, size: 'md', radius: 10,
      menuWidth: 176, placement: 'bottom', align: 'left', popDuration: 180, glideDuration: 220, rememberPosition: true, disabled: false, ariaLabel: 'Select' }, opts || {});
    const items = o.options.map(norm);
    const S = SIZES[o.size] || SIZES.md, step = S.row + GAP, popOut = Math.round(o.popDuration * 2 / 3);
    const id = 'gs' + (++uid);
    let current = o.value ?? '', phase = 'closed', active = null, side = o.placement, instant = false, timer = 0, scrub = null, menu = null, pill = null, list = null;
    const selected = () => items.findIndex(it => it.value === current);

    const root = document.createElement('div');
    root.className = 'glide-select';
    root.dataset.size = o.size;
    if (o.disabled) root.dataset.disabled = '';
    const set = (k, v) => root.style.setProperty(k, v);
    set('--gs-radius', o.radius + 'px'); set('--gs-inner-radius', Math.max(3, o.radius - 4) + 'px');
    set('--gs-chip', S.chip + 'px'); set('--gs-row', S.row + 'px'); set('--gs-font', S.font + 'px');
    set('--gs-menu-w', o.menuWidth + 'px'); set('--gs-pop', o.popDuration + 'ms'); set('--gs-pop-out', popOut + 'ms'); set('--gs-glide', o.glideDuration + 'ms');

    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'glide-select__trigger'; trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', id + '-list');
    trigger.setAttribute('aria-label', o.ariaLabel); trigger.disabled = !!o.disabled;
    const label = document.createElement('span'); label.className = 'glide-select__label';
    const chev = document.createElement('span'); chev.className = 'glide-select__chevron'; chev.setAttribute('aria-hidden', 'true'); chev.innerHTML = CHEVRON;
    trigger.append(label, chev); root.append(trigger); host.append(root);

    const paintLabel = () => {
      const i = selected();
      label.textContent = i >= 0 ? String(items[i].label) : o.placeholder;
      if (i < 0) label.dataset.empty = ''; else delete label.dataset.empty;
    };
    paintLabel();

    const applyActive = () => {
      if (!pill) return;
      trigger.setAttribute('aria-expanded', String(phase === 'open'));
      if (active !== null) { trigger.setAttribute('aria-activedescendant', `${id}-${active}`); list.dataset.live = ''; } else { trigger.removeAttribute('aria-activedescendant'); delete list.dataset.live; }
      if (phase !== 'open') return;
      if (active === null) { pill.style.opacity = '0'; return; }
      const jump = instant || pill.style.opacity !== '1';
      pill.style.transitionDuration = jump ? '0ms, 150ms' : '';
      pill.style.transform = `translateY(${active * step}px)`;
      pill.style.opacity = '1';
      instant = false;
    };
    const setActive = i => { active = i; applyActive(); };

    function buildMenu() {
      menu = document.createElement('div'); menu.className = 'glide-select__menu'; menu.dataset.state = 'open'; menu.dataset.side = side; menu.dataset.align = o.align;
      menu.innerHTML = `<div id="${id}-list" role="listbox" aria-label="${esc(o.ariaLabel)}" class="glide-select__list"><span class="glide-select__pill" aria-hidden="true"></span>` +
        items.map((it, i) => `<div id="${id}-${i}" role="option" aria-selected="${i === selected()}" data-index="${i}" class="glide-select__option"><span class="glide-select__name">${esc(it.label)}</span>${o.showTags && it.tag ? `<span class="glide-select__tag">${esc(it.tag)}</span>` : ''}<span class="glide-select__check"${i === selected() ? ' data-on' : ''} aria-hidden="true">${TICK}</span></div>`).join('') + '</div>';
      root.append(menu); list = menu.firstElementChild; pill = list.querySelector('.glide-select__pill');
      list.addEventListener('pointerover', onOver); list.addEventListener('pointerleave', onLeave); list.addEventListener('pointerdown', onListDown);
      list.addEventListener('pointermove', onListMove); list.addEventListener('pointerup', onListUp); list.addEventListener('pointercancel', onListUp); list.addEventListener('lostpointercapture', onListUp);
    }
    function dropMenu() { if (menu) menu.remove(); menu = pill = list = null; }

    function open(viaKey) {
      if (o.disabled || phase === 'open') return;
      clearTimeout(timer); dropMenu();
      instant = true; active = selected() >= 0 ? selected() : viaKey ? 0 : null; phase = 'open';
      buildMenu();
      // flip to the other side when the menu would leave the viewport
      const r = root.getBoundingClientRect(), need = menu.offsetHeight + MENU_GAP;
      side = o.placement === 'bottom' && r.bottom + need > innerHeight ? 'top' : o.placement === 'top' && r.top - need < 0 ? 'bottom' : o.placement;
      menu.dataset.side = side; set('--gs-origin', `${side === 'bottom' ? 'top' : 'bottom'} ${o.align}`);
      menu.style.transitionDuration = '0ms'; menu.dataset.state = 'closed'; void menu.offsetHeight;
      menu.style.transitionDuration = ''; menu.dataset.state = 'open';
      pill.style.transition = 'none'; pill.style.transform = `translateY(${Math.max(0, selected()) * step}px)`; pill.style.opacity = '0'; void pill.offsetHeight; pill.style.transition = '';
      applyActive();
      document.addEventListener('pointerdown', onOutside, true);
    }
    function close(mode) {
      if (phase === 'closed') return;
      document.removeEventListener('pointerdown', onOutside, true);
      active = null; applyActive(); clearTimeout(timer);
      if (mode === 'instant' || !menu) { phase = 'closed'; trigger.setAttribute('aria-expanded', 'false'); dropMenu(); return; }
      menu.style.transitionDuration = ''; menu.dataset.state = 'closed'; phase = 'closing'; trigger.setAttribute('aria-expanded', 'false');
      timer = setTimeout(() => { phase = 'closed'; dropMenu(); }, popOut + 20);
    }
    function pick(i, viaKey) {
      const it = items[i];
      if (!it) { close('instant'); return; }
      if (it.value !== current) {
        current = it.value; paintLabel();
        if (!viaKey) root.dataset.swap = '';
        if (typeof o.onChange === 'function') o.onChange(it.value, it);
      }
      close('instant'); trigger.focus({ preventScroll: true });
    }

    const onOutside = e => { if (!root.contains(e.target)) close('pop'); };
    const rowAt = y => { if (!scrub) return null; const i = Math.floor((y - scrub.top - PAD) / step); return i >= 0 && i < items.length ? i : null; };
    function onListDown(e) {
      if (scrub) return;
      try { list.setPointerCapture(e.pointerId); } catch (err) {}
      scrub = { id: e.pointerId, top: list.getBoundingClientRect().top }; instant = true; setActive(rowAt(e.clientY));
    }
    function onListMove(e) { if (!scrub || scrub.id !== e.pointerId) return; const i = rowAt(e.clientY); if (i !== active) setActive(i); }
    function onListUp(e) {
      if (!scrub || scrub.id !== e.pointerId) return;
      const i = e.type === 'pointerup' ? rowAt(e.clientY) : null;
      scrub = null;
      if (i !== null) pick(i, false); else if (!o.rememberPosition) setActive(null);
    }
    function onOver(e) {
      if (e.pointerType === 'touch' || scrub) return;
      const row = e.target.closest('[data-index]'); if (!row) return;
      const i = Number(row.dataset.index); if (i !== active) setActive(i);
    }
    function onLeave() { if (!scrub && !o.rememberPosition) setActive(null); }

    const typeahead = (from, ch) => {
      const c = ch.toLowerCase(), n = items.length;
      for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (String(items[i].label).toLowerCase().startsWith(c)) return i; }
      return from;
    };
    const onDown = e => {
      if (e.button !== 0 || o.disabled) return;
      trigger.focus({ preventScroll: true });
      if (phase === 'open') close('pop'); else open(false);
    };
    const onKey = e => {
      const k = e.key, n = items.length, cur = active ?? Math.max(0, selected());
      if (phase !== 'open') {
        if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); open(true); }
        return;
      }
      const go = i => { e.preventDefault(); instant = true; setActive(Math.min(n - 1, Math.max(0, i))); };
      if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1));
      else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1);
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(cur, true); }
      else if (k === 'Escape' || k === 'Tab') { if (k === 'Escape') e.preventDefault(); close('instant'); }
      else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeahead(cur, k));
    };
    const onAnimEnd = e => { if (e.animationName === 'gs-swap') delete root.dataset.swap; };
    trigger.addEventListener('pointerdown', onDown);
    trigger.addEventListener('keydown', onKey);
    root.addEventListener('animationend', onAnimEnd);

    return {
      getValue() { return current; },
      setValue(v) { current = v; paintLabel(); },   // outside changes never animate
      destroy() {
        clearTimeout(timer); document.removeEventListener('pointerdown', onOutside, true);
        trigger.removeEventListener('pointerdown', onDown); trigger.removeEventListener('keydown', onKey); root.removeEventListener('animationend', onAnimEnd);
        root.remove();
      }
    };
  }

  window.TTGlide = { attach };
})();