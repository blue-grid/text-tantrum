/* Small form controls for the configurator: slider, min–max range, knob, toggle, radio, select,
   text, colour list and sign picker. Each one is built from a plain description and reads and writes
   its value through get/set, so the page can redraw them all after a preset or a shake. */
(function () {
  'use strict';

  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => c != null && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const decimals = step => (String(step).split('.')[1] || '').length;
  const snap = (v, c) => +(Math.round((v - c.min) / c.step) * c.step + c.min).toFixed(decimals(c.step));
  const fmt = (v, c) => (+v).toFixed(decimals(c.step)) + (c.unit || '');
  let uid = 0;
  const id = () => 'c' + (++uid);

  const builders = {
    slider(c, get, set) {
      const i = id(), out = h('output', { class: 'val', for: i });
      const input = h('input', { type: 'range', id: i, min: c.min, max: c.max, step: c.step,
        oninput: () => { set(+input.value); out.textContent = fmt(input.value, c); paint(); } });
      const paint = () => input.style.setProperty('--p', ((input.value - c.min) / (c.max - c.min) * 100) + '%');
      const el = h('div', { class: 'ctl slider' }, h('div', { class: 'row' }, h('label', { for: i, text: c.label }), out), input);
      el.refresh = () => { input.value = get(); out.textContent = fmt(get(), c); paint(); };
      return el;
    },

    range(c, get, set) {
      const out = h('output', { class: 'val' });
      const lo = h('input', { type: 'range', min: c.min, max: c.max, step: c.step, 'aria-label': c.label + ', lowest' });
      const hi = h('input', { type: 'range', min: c.min, max: c.max, step: c.step, 'aria-label': c.label + ', highest' });
      const fill = h('span', { class: 'fill' });
      const paint = () => {
        const a = +lo.value, b = +hi.value, p = v => (v - c.min) / (c.max - c.min) * 100;
        fill.style.left = p(a) + '%'; fill.style.width = (p(b) - p(a)) + '%';
        out.textContent = a === b ? fmt(a, c) : fmt(a, { step: c.step }) + ' – ' + fmt(b, c);
      };
      const change = which => {
        let a = +lo.value, b = +hi.value;
        if (a > b) { if (which === lo) hi.value = b = a; else lo.value = a = b; }
        set([a, b]); paint();
      };
      lo.addEventListener('input', () => change(lo));
      hi.addEventListener('input', () => change(hi));
      const el = h('div', { class: 'ctl range' }, h('div', { class: 'row' }, h('span', { class: 'lbl', text: c.label }), out),
        h('div', { class: 'dual' }, h('span', { class: 'track' }), fill, lo, hi));
      el.refresh = () => { const v = get(); lo.value = v[0]; hi.value = v[1]; paint(); };
      return el;
    },

    /* a round knob: drag up or down, turn the wheel, use the arrow keys; a double click goes back to the default */
    knob(c, get, set, def) {
      const R = 15, L = 2 * Math.PI * R * 0.75;
      const svg = new DOMParser().parseFromString(
        `<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="k-track" cx="20" cy="20" r="${R}" stroke-dasharray="${L} 999" transform="rotate(135 20 20)"/>` +
        `<circle class="k-val" cx="20" cy="20" r="${R}" stroke-dasharray="0 999" transform="rotate(135 20 20)"/>` +
        `<line class="k-dot" x1="20" y1="20" x2="20" y2="9"/></svg>`, 'image/svg+xml').documentElement;
      const out = h('output', { class: 'val' });
      const dial = h('div', { class: 'dial', tabindex: 0, role: 'slider', 'aria-label': c.label, 'aria-valuemin': c.min, 'aria-valuemax': c.max });
      dial.appendChild(document.importNode(svg, true));
      const put = v => { v = snap(clamp(v, c.min, c.max), c); set(v); paint(v); };
      const paint = v => {
        const t = (v - c.min) / (c.max - c.min);
        dial.querySelector('.k-val').setAttribute('stroke-dasharray', (t * L) + ' 999');
        dial.querySelector('.k-dot').setAttribute('transform', `rotate(${-135 + t * 270} 20 20)`);
        dial.setAttribute('aria-valuenow', v); dial.setAttribute('aria-valuetext', fmt(v, c));
        out.textContent = fmt(v, c);
      };
      let drag = null;
      dial.addEventListener('pointerdown', e => { dial.setPointerCapture(e.pointerId); drag = { y: e.clientY, v: get() }; dial.focus(); e.preventDefault(); });
      dial.addEventListener('pointermove', e => {
        if (!drag) return;
        const span = (c.max - c.min) * (e.shiftKey ? 0.2 : 1);
        put(drag.v + (drag.y - e.clientY) / 160 * span);
      });
      const stop = () => { drag = null; };
      dial.addEventListener('pointerup', stop); dial.addEventListener('pointercancel', stop);
      dial.addEventListener('wheel', e => { e.preventDefault(); put(get() + (e.deltaY < 0 ? 1 : -1) * c.step * (e.shiftKey ? 1 : 3)); }, { passive: false });
      dial.addEventListener('keydown', e => {
        const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (k) { e.preventDefault(); put(get() + k * c.step); }
        if (e.key === 'Home') put(c.min); if (e.key === 'End') put(c.max);
      });
      dial.addEventListener('dblclick', () => put(def()));
      const el = h('div', { class: 'ctl knob', title: 'Drag up or down. Shift for fine steps. Double click to reset.' }, dial, h('span', { class: 'lbl', text: c.label }), out);
      el.refresh = () => paint(get());
      return el;
    },

    toggle(c, get, set) {
      const i = id(), input = h('input', { type: 'checkbox', id: i, role: 'switch', onchange: () => set(input.checked) });
      const el = h('div', { class: 'ctl toggle' }, h('label', { for: i }, input, h('span', { class: 'sw' }), h('span', { text: c.label })));
      el.refresh = () => { input.checked = !!get(); };
      return el;
    },

    radio(c, get, set) {
      const name = id(), inputs = [];
      const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': c.label },
        c.options.map(([v, t]) => {
          const input = h('input', { type: 'radio', name, value: v, onchange: () => set(v) });
          inputs.push(input);
          return h('label', null, input, h('span', { text: t }));
        }));
      const el = h('div', { class: 'ctl radio' }, h('span', { class: 'lbl', text: c.label }), group);
      el.refresh = () => inputs.forEach(i => { i.checked = String(i.value) === String(get()); });
      return el;
    },

    select(c, get, set) {
      const i = id(), sel = h('select', { id: i, onchange: () => set(sel.value) }, c.options.map(([v, t]) => h('option', { value: v, text: t })));
      const el = h('div', { class: 'ctl select' }, h('label', { for: i, text: c.label }), sel);
      el.refresh = () => { sel.value = get(); };
      return el;
    },

    text(c, get, set) {
      const i = id(), tag = c.multiline ? 'textarea' : 'input';
      const input = h(tag, { id: i, type: c.multiline ? null : 'text', rows: c.multiline ? 3 : null, spellcheck: 'false', oninput: () => set(input.value) });
      const el = h('div', { class: 'ctl text' }, h('label', { for: i, text: c.label }), input);
      el.refresh = () => { if (input.value !== get()) input.value = get(); };
      return el;
    },

    color(c, get, set) {
      const i = id(), input = h('input', { type: 'color', id: i, oninput: () => set(input.value) });
      const el = h('div', { class: 'ctl color' }, h('label', { for: i, text: c.label }), input);
      el.refresh = () => { input.value = get(); };
      return el;
    },

    /* an editable list of colours; c.fixed keeps the number of swatches as it is */
    colors(c, get, set) {
      const list = h('div', { class: 'swatches' });
      const draw = () => {
        list.textContent = '';
        get().forEach((col, n) => {
          const input = h('input', { type: 'color', value: col, 'aria-label': `${c.label}, colour ${n + 1}`,
            oninput: () => { const a = get().slice(); a[n] = input.value; set(a); } });
          const sw = h('span', { class: 'sw-item' }, input);
          if (!c.fixed && get().length > 1)
            sw.appendChild(h('button', { type: 'button', class: 'x', 'aria-label': `Remove colour ${n + 1}`, text: '×',
              onclick: () => { const a = get().slice(); a.splice(n, 1); set(a); draw(); } }));
          list.appendChild(sw);
        });
        if (!c.fixed && get().length < 12)
          list.appendChild(h('button', { type: 'button', class: 'add', 'aria-label': 'Add a colour', text: '+',
            onclick: () => { const a = get().slice(); a.push(randomColor()); set(a); draw(); } }));
      };
      const el = h('div', { class: 'ctl colors' }, h('span', { class: 'lbl', text: c.label }), list);
      el.refresh = draw;
      return el;
    },

    /* the signs: a text field plus ready-made sets to tap */
    chars(c, get, set) {
      const i = id(), input = h('input', { type: 'text', id: i, spellcheck: 'false', class: 'mono', oninput: () => set(input.value) });
      const chips = h('div', { class: 'chips' }, c.sets.map(([name, chars]) =>
        h('button', { type: 'button', class: 'chip', title: chars, text: name, onclick: e => {
          const v = e.shiftKey ? get() + chars : chars;
          set(v); input.value = v;
        } })));
      const el = h('div', { class: 'ctl chars' }, h('label', { for: i, text: c.label }), input, chips,
        h('p', { class: 'note', text: 'Shift + click a set to add it to what is there.' }));
      el.refresh = () => { if (input.value !== get()) input.value = get(); };
      return el;
    }
  };

  function randomColor() {
    const hue = Math.random() * 360, s = 0.85, l = 0.6;
    const f = n => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  window.UI = { h, builders, randomColor, snap };
})();
