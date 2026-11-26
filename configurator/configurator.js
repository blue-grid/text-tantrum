/* The configurator: one state object, a panel of controls drawn from SECTIONS, a live preview,
   and a code generator that writes out only the options that differ from the defaults. */
(function () {
  'use strict';

  const { h, builders, randomColor, snap } = UI;
  const DEF = TextTantrum.defaults;
  const SCRIPT_SRC = 'https://cdn.jsdelivr.net/gh/blue-grid/text-tantrum@1.0.1/text-tantrum.min.js';   // bump the version with each release
  const STORE_KEY = 'text-tantrum-config-v1';

  const FONTS = {
    system: ['System sans', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],
    helvetica: ['Helvetica', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
    serif: ['Serif', 'Georgia, "Times New Roman", serif'],
    mono: ['Mono', 'ui-monospace, Menlo, Consolas, monospace'],
    impact: ['Impact', 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'],
    comic: ['Comic (why not)', '"Comic Sans MS", "Comic Neue", cursive']
  };
  const GLYPH_FONTS = [['', 'Same as the text'], ...Object.values(FONTS).map(([n, v]) => [v, n])];

  const CHAR_SETS = [
    ['Original', DEF.chars], ['Binary', '01'], ['Numbers', '0123456789'], ['Hex', '0123456789ABCDEF'],
    ['Letters', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['Katakana', 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ'], ['Blocks', '░▒▓█▀▄▌▐'],
    ['Arrows', '←↑→↓↖↗↘↙'], ['Math', '∑∏∫√∞≈≠±÷×∂∆'], ['Shapes', '●○◆◇■□▲△★☆'], ['Hearts', '♥♡❤'], ['Emoji', '🔥💥✨⚡😵🤯👀']
  ];

  const LOOK0 = { text: 'Hover over me to see the effect.\nThen play around with the settings to explore new possibilities.', font: 'helvetica', size: 72, weight: 200, spacing: -0.03, color: '#ffffff', bg: '#07080a', align: 'left' };

  const OLD_TEXTS = ['Poke me. I dare you.\nEvery letter here has feelings.', 'Say hello to your letters.\nEach one has a little mood.'];

  /* ---------- state ---------- */
  const fresh = () => ({ look: { ...LOOK0 }, sparkSame: false, opts: TextTantrum.merge(DEF, {}) });
  let state = load() || fresh();

  const getPath = p => p.split('.').reduce((o, k) => o[k], state);
  const setPath = (p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], state)[last] = v; };
  const defPath = p => {
    if (p.startsWith('opts.')) return p.slice(5).split('.').reduce((o, k) => o[k], DEF);
    if (p.startsWith('look.')) return LOOK0[p.slice(5)];
    return false;
  };

  /* ---------- what the panel holds ---------- */
  const sparksOn = () => state.opts.sparks.enabled;
  const SECTIONS = [
    { title: 'Your text', items: [
      { type: 'text', key: 'look.text', label: 'Text', multiline: true, rebuild: true },
      { type: 'select', key: 'look.font', label: 'Font', options: Object.entries(FONTS).map(([k, [n]]) => [k, n]) },
      { type: 'slider', key: 'look.size', label: 'Size', min: 16, max: 180, step: 1, unit: 'px' },
      { type: 'slider', key: 'look.weight', label: 'Weight', min: 100, max: 900, step: 100 },
      { type: 'slider', key: 'look.spacing', label: 'Letter spacing', min: -0.1, max: 0.3, step: 0.005, unit: 'em' },
      { type: 'radio', key: 'look.align', label: 'Align', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
      { type: 'row', items: [
        { type: 'color', key: 'look.color', label: 'Text colour', rebuild: true },   // letters remember their colour for "keep text colour"
        { type: 'color', key: 'look.bg', label: 'Background' }
      ] },
      { type: 'note', text: 'These only style the preview and the demo page. On your site, your own CSS styles the text.' }
    ] },
    { title: 'Signs', items: [
      { type: 'chars', key: 'opts.chars', label: 'Signs the letters turn into', sets: CHAR_SETS },
      { type: 'knobs', items: [
        { type: 'knob', key: 'opts.glyphScale', label: 'Sign size', min: 0.3, max: 1.6, step: 0.05, unit: '×' },
        { type: 'knob', key: 'opts.jitter', label: 'Wobble', min: 0, max: 0.3, step: 0.005, unit: 'em' },
        { type: 'knob', key: 'opts.rgbSplit', label: 'RGB split', min: 0, max: 0.2, step: 0.005, unit: 'em' }
      ] },
      { type: 'select', key: 'opts.glyphFont', label: 'Sign font', options: GLYPH_FONTS },
      { type: 'select', key: 'opts.glyphWeight', label: 'Sign weight', options: [['', 'Same as the text'], ['100', 'Thin'], ['300', 'Light'], ['400', 'Regular'], ['700', 'Bold'], ['900', 'Black']] }
    ] },
    { title: 'Colours', items: [
      { type: 'colors', key: 'opts.colors', label: 'Sign colours' },
      { type: 'radio', key: 'opts.colorMode', label: 'Pick colours', options: [['random', 'Random'], ['cycle', 'In order'], ['original', 'Keep text colour']] },
      { type: 'colors', key: 'opts.splitColors', label: 'RGB split colours', fixed: true, when: () => state.opts.rgbSplit > 0 }
    ] },
    { title: 'Behaviour', items: [
      { type: 'radio', key: 'opts.trigger', label: 'Starts on', options: [['hover', 'Hover'], ['click', 'Click'], ['both', 'Both'], ['none', 'Nothing']] },
      { type: 'range', key: 'opts.duration', label: 'Tantrum length', min: 30, max: 2000, step: 10, unit: 'ms' },
      { type: 'range', key: 'opts.flicker', label: 'Sign swap speed', min: 10, max: 300, step: 2, unit: 'ms' },
      { type: 'slider', key: 'opts.neighbours', label: 'Neighbours that catch it', min: 0, max: 8, step: 1 },
      { type: 'knobs', when: () => state.opts.neighbours > 0, items: [
        { type: 'knob', key: 'opts.spill', label: 'Catch chance', min: 0, max: 1, step: 0.05 }
      ] },
      { type: 'range', key: 'opts.spillDuration', label: 'Neighbour tantrum length', min: 30, max: 2000, step: 10, unit: 'ms', when: () => state.opts.neighbours > 0 },
      { type: 'toggle', key: 'opts.touch', label: 'Tap scrambles on touch screens' },
      { type: 'toggle', key: 'opts.auto', label: 'Throws tantrums on its own' },
      { type: 'range', key: 'opts.autoEvery', label: 'Every', min: 50, max: 5000, step: 50, unit: 'ms', when: () => state.opts.auto },
      { type: 'toggle', key: 'opts.reveal', label: 'Scramble in when the page loads', rebuild: true },
      { type: 'slider', key: 'opts.revealDuration', label: 'Reveal length', min: 100, max: 3000, step: 50, unit: 'ms', when: () => state.opts.reveal, rebuild: true },
      { type: 'slider', key: 'opts.revealStagger', label: 'Delay per letter', min: 0, max: 120, step: 1, unit: 'ms', when: () => state.opts.reveal, rebuild: true },
      { type: 'toggle', key: 'opts.respectReducedMotion', label: 'Stay calm for people who prefer less motion' }
    ] },
    { title: 'Sparks', items: [
      { type: 'toggle', key: 'opts.sparks.enabled', label: 'Sparks' },
      { type: 'slider', key: 'opts.sparks.count', label: 'Sparks per letter', min: 1, max: 60, step: 1, when: sparksOn },
      { type: 'radio', key: 'opts.sparks.shape', label: 'Shape', options: [['circle', 'Dot'], ['square', 'Square'], ['line', 'Streak'], ['star', 'Twinkle'], ['glyph', 'Sign']], when: sparksOn },
      { type: 'radio', key: 'opts.sparks.blend', label: 'Blend', options: [['add', 'Glow (dark pages)'], ['normal', 'Normal']], when: sparksOn },
      { type: 'toggle', key: 'sparkSame', label: 'Same colours as the signs', when: sparksOn },
      { type: 'colors', key: 'opts.sparks.colors', label: 'Spark colours', when: () => sparksOn() && !state.sparkSame },
      { type: 'range', key: 'opts.sparks.speed', label: 'Speed', min: 0, max: 1500, step: 10, unit: 'px/s', when: sparksOn },
      { type: 'range', key: 'opts.sparks.follow', label: 'Follow the pointer', min: 0, max: 2000, step: 10, unit: 'px/s', when: sparksOn },
      { type: 'range', key: 'opts.sparks.life', label: 'Life', min: 0.05, max: 4, step: 0.05, unit: 's', when: sparksOn },
      { type: 'range', key: 'opts.sparks.size', label: 'Size', min: 0.5, max: 24, step: 0.1, unit: 'px', when: sparksOn },
      { type: 'slider', key: 'opts.sparks.gravity', label: 'Gravity (minus floats up)', min: -1500, max: 1500, step: 10, unit: 'px/s²', when: sparksOn },
      { type: 'knobs', when: sparksOn, items: [
        { type: 'knob', key: 'opts.sparks.drag', label: 'Drag', min: 0, max: 10, step: 0.1 },
        { type: 'knob', key: 'opts.sparks.scatter', label: 'Scatter', min: 0, max: 1, step: 0.01, unit: 'em' },
        { type: 'knob', key: 'opts.sparks.fade', label: 'Fade', min: 0.2, max: 5, step: 0.1 },
        { type: 'knob', key: 'opts.sparks.opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.05 },
        { type: 'knob', key: 'opts.sparks.glow', label: 'Glow', min: 0, max: 30, step: 1, unit: 'px' }
      ] },
      { type: 'toggle', key: 'opts.sparks.shrink', label: 'Shrink as they fade', when: sparksOn },
      { type: 'slider', key: 'opts.sparks.max', label: 'Most sparks at once', min: 100, max: 5000, step: 100, when: sparksOn }
    ] }
  ];

  /* ---------- build the panel ---------- */
  const panel = document.getElementById('panel'), controls = [];
  function make(c) {
    if (c.type === 'note') return h('p', { class: 'note', text: c.text });
    if (c.type === 'row' || c.type === 'knobs') {
      const el = h('div', { class: c.type === 'row' ? 'ctl-row' : 'knob-row' }, c.items.map(make));
      if (c.when) controls.push({ el, c, refresh() {} });
      return el;
    }
    const el = builders[c.type](c, () => getPath(c.key), v => change(c, v), () => defPath(c.key));
    controls.push({ el, c, refresh: el.refresh });
    return el;
  }
  SECTIONS.forEach((s, i) => panel.appendChild(h('details', { class: 'sec', open: i < 3 || null },
    h('summary', null, h('span', { text: s.title })), h('div', { class: 'sec-body' }, s.items.map(make)))));

  function refreshAll() {
    controls.forEach(x => { x.el.hidden = x.c.when ? !x.c.when() : false; x.refresh(); });
  }

  /* ---------- preview ---------- */
  const stage = document.getElementById('stage'), target = document.getElementById('target'), hint = document.getElementById('hint');
  let inst = null;

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const textHTML = () => esc(state.look.text).replace(/\n/g, '<br>');

  function liveOpts() {
    const o = TextTantrum.merge(state.opts, {});
    if (state.sparkSame) o.sparks.colors = null;
    return o;
  }
  function styleTarget() {
    const L = state.look;
    stage.style.setProperty('--bg', L.bg);
    stage.classList.toggle('light', luminance(L.bg) > 0.5);
    Object.assign(target.style, { fontFamily: FONTS[L.font][1], fontSize: `min(${L.size}px, ${(L.size / 9).toFixed(2)}vw)`, fontWeight: L.weight,
      letterSpacing: L.spacing + 'em', color: L.color, textAlign: L.align });
  }
  function rebuild() {
    if (inst) inst.destroy();
    target.innerHTML = textHTML();
    inst = TextTantrum(target, { ...liveOpts(), respectReducedMotion: false });   // the preview always plays
  }
  function updateHint() {
    hint.textContent = { hover: 'Move your pointer over the text', click: 'Click or tap the text', both: 'Hover, click or tap the text',
      none: state.opts.auto ? 'It goes off by itself' : 'Nothing starts it here. Use “Poke it all”, or call burst() from your code' }[state.opts.trigger];
  }

  let saveT = 0;
  function change(c, v) {
    setPath(c.key, v);
    styleTarget();
    if (c.rebuild) rebuild(); else inst.update({ ...liveOpts(), respectReducedMotion: false });
    if (c.key === 'opts.reveal' && v) inst.reveal();
    controls.forEach(x => { if (x.c.when) x.el.hidden = !x.c.when(); });
    if (c.key === 'sparkSame' || c.key === 'opts.rgbSplit') refreshAll();
    updateHint();
    clearTimeout(saveT);
    saveT = setTimeout(save, 300);
  }

  function applyAll(reveal) {
    styleTarget(); rebuild(); refreshAll(); updateHint(); save();
    if (reveal) inst.burst(500, 8);
  }

  /* ---------- presets, shake, reset ---------- */
  const presetSel = document.getElementById('preset');
  presetSel.appendChild(h('option', { value: '', text: 'Pick a mood…' }));
  Object.entries(PRESETS).forEach(([k, p]) => presetSel.appendChild(h('option', { value: k, text: p.name })));
  presetSel.addEventListener('change', () => {
    const p = PRESETS[presetSel.value];
    if (!p) return;
    state = { look: { ...LOOK0, ...p.look, text: state.look.text }, sparkSame: !!p.sparkSame, opts: TextTantrum.merge(DEF, p.opts) };
    applyAll(true);
  });

  document.getElementById('reset').addEventListener('click', () => {
    state = { ...fresh(), look: { ...LOOK0, text: state.look.text } };
    presetSel.value = '';
    applyAll(true);
    toast('Back to the original');
  });

  document.getElementById('shake').addEventListener('click', () => {
    const r = (a, b) => a + Math.random() * (b - a);
    const walk = items => items.forEach(c => {
      if (c.items) return walk(c.items);
      if (!c.key || !c.key.startsWith('opts.') || /respectReducedMotion|reveal|trigger|touch|max$|glyphFont|glyphWeight|chars/.test(c.key)) return;
      if (c.type === 'slider' || c.type === 'knob') setPath(c.key, snap(r(c.min, c.max), c));
      if (c.type === 'range') { const a = snap(r(c.min, c.max), c), b = snap(r(c.min, c.max), c); setPath(c.key, [Math.min(a, b), Math.max(a, b)]); }
      if (c.type === 'radio') setPath(c.key, c.options[Math.random() * c.options.length | 0][0]);
      if (c.type === 'toggle') setPath(c.key, Math.random() < 0.5);
      if (c.type === 'colors' && !c.fixed) setPath(c.key, Array.from({ length: 2 + (Math.random() * 4 | 0) }, randomColor));
    });
    SECTIONS.forEach(s => walk(s.items));
    const o = state.opts;
    o.sparks.enabled = Math.random() < 0.85;
    o.chars = CHAR_SETS[Math.random() * CHAR_SETS.length | 0][1];
    o.duration = [snap(r(150, 500), { min: 0, step: 10 }), snap(r(500, 1000), { min: 0, step: 10 })];       // keep it watchable
    o.flicker = [snap(r(15, 60), { min: 0, step: 2 }), snap(r(60, 140), { min: 0, step: 2 })];
    o.sparks.life = [snap(r(0.2, 0.6), { min: 0, step: 0.05 }), snap(r(0.7, 1.8), { min: 0, step: 0.05 })];
    o.sparks.max = 1500;
    o.sparks.glow = Math.random() < 0.7 ? 0 : o.sparks.glow;
    state.sparkSame = Math.random() < 0.4;
    presetSel.value = '';
    applyAll(true);
    toast('Shaken, not stirred');
  });

  document.getElementById('poke').addEventListener('click', () => inst.burst());

  /* ---------- code generation ---------- */
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function diff(o, d) {
    const out = {};
    for (const k in o) {
      if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) { const sub = diff(o[k], d[k]); if (Object.keys(sub).length) out[k] = sub; }
      else if (!same(o[k], d[k])) out[k] = o[k];
    }
    return out;
  }
  function userOpts() {
    const o = diff(state.opts, DEF);
    if (state.sparkSame && state.opts.sparks.enabled) (o.sparks = o.sparks || {}).colors = null;
    return o;
  }
  const num = v => +(+v).toFixed(4);
  const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  function js(v, ind) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return '[' + v.map(x => js(x, ind)).join(', ') + ']';
    if (typeof v === 'object') {
      const ks = Object.keys(v);
      if (!ks.length) return '{}';
      const pad = '  '.repeat(ind + 1);
      return '{\n' + ks.map(k => pad + k + ': ' + js(v[k], ind + 1)).join(',\n') + '\n' + '  '.repeat(ind) + '}';
    }
    if (typeof v === 'number') return String(num(v));
    if (typeof v === 'string') return q(v);
    return String(v);
  }
  const selector = document.getElementById('selector');
  const sel = () => selector.value.trim() || '.tantrum';
  const cls = () => { const m = sel().match(/^\.([\w-]+)$/); return m ? ` class="${m[1]}"` : sel().match(/^#([\w-]+)$/) ? ` id="${sel().slice(1)}"` : ' class="tantrum"'; };
  const initCall = () => { const o = userOpts(); return `TextTantrum(${q(sel())}${Object.keys(o).length ? ', ' + js(o, 1) : ''});`; };
  const css = () => {
    const L = state.look;
    return `body{margin:0;min-height:100vh;display:grid;place-items:center;background:${L.bg}}\n` +
      `${sel()}{margin:0;padding:2rem;max-width:16em;font-family:${FONTS[L.font][1]};font-size:min(${L.size}px, ${(L.size / 9).toFixed(2)}vw);` +
      `font-weight:${L.weight};line-height:1.05;letter-spacing:${L.spacing}em;color:${L.color};text-align:${L.align}}`;
  };

  /* the whole library as one file, with the chosen settings written into its DEFAULTS. Each option keeps its
     comment, so the file reads as a settings sheet people can go on editing by hand. */
  function customSource() {
    const src = TextTantrum.factorySource, start = src.indexOf('var DEFAULTS = {'), end = src.indexOf('\n  };', start);
    const o = TextTantrum.merge(state.opts, {}), path = [];
    if (state.sparkSame) o.sparks.colors = null;
    const lines = src.slice(start, end).split('\n').map((line, n) => {
      if (!n) return line;
      let m = line.match(/^\s*(\w+): \{\s*$/);
      if (m) { path.push(m[1]); return line; }
      if (/^\s*\},?\s*$/.test(line)) { path.pop(); return line; }
      m = line.match(/^(\s*)(\w+): (.*?)(,?)(\s*\/\/.*)?$/);
      if (!m) return line;
      const v = [...path, m[2]].reduce((a, k) => a == null ? undefined : a[k], o);
      if (v === undefined) return line;
      let s = m[1] + m[2] + ': ' + js(v, 0) + m[4];
      if (m[5]) s = s.padEnd(Math.max(s.length + 2, Math.min(line.indexOf('//'), m[1].length + 28))) + m[5].trim();
      return s;
    });
    const body = src.slice(0, start) + lines.join('\n') + src.slice(end);
    return `/*!\n * Text Tantrum v${TextTantrum.version}, set up with the Text Tantrum configurator.\n` +
      ` * Your settings are in DEFAULTS below. Every option has a comment: change anything you like.\n` +
      ` * The last lines start it on your page.\n * No dependencies. MIT License. Copyright (c) 2026 Omid Akbari\n *\n` +
      ` * Made by Omid Akbari, senior product designer and creative technologist based in Düsseldorf, Germany.\n` +
      ` * https://omid-akbari.com\n * Configurator and source: https://github.com/blue-grid/text-tantrum\n */\n` +
      `(function (root, factory) {\n  var lib = factory();\n  lib.factorySource = String(factory);\n` +
      `  if (typeof module === 'object' && module.exports) module.exports = lib;\n  else root.TextTantrum = lib;\n` +
      `})(typeof self !== 'undefined' ? self : this, ${body});\n\n` +
      `/* Start it on your text. Change the selector to match your page, or delete this and call TextTantrum('.your-text') yourself.\n` +
      `   You can also pass options here to override the ones above, e.g. TextTantrum('h1', { trigger: 'click' }). */\n` +
      `(function start() {\n  if (document.readyState === 'loading') return document.addEventListener('DOMContentLoaded', start);\n` +
      `  TextTantrum(${q(sel())});\n})();\n`;
  }

  const TABS = {
    script: {
      note: 'The whole effect in one file with your settings built in. Every setting has a comment, so you can keep tweaking it by hand. Add it to your page with <script src="text-tantrum.js"></script> before the closing body tag.',
      code: () => customSource()
    },
    snippet: {
      note: 'The original file plus your settings as options. Put it before the closing body tag. Any element works: headings, paragraphs, links, buttons.',
      code: () => `<h1${cls()}>${textHTML()}</h1>\n\n<script src="${SCRIPT_SRC}"></script>\n<script>\n  ${initCall()}\n</script>`
    },
    attr: {
      note: 'No script of your own: put the settings on the element and include the file. Handy for site builders.',
      code: () => {
        const o = userOpts(), json = Object.keys(o).length ? JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;') : '';
        return `<h1 data-text-tantrum${json ? `='${json}'` : ''}>${textHTML()}</h1>\n\n<script src="${SCRIPT_SRC}"></script>`;
      }
    },
    page: {
      note: 'A whole page to try it out. The downloaded file has your script built in, so it works on its own.',
      code: inline => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
        `<title>Text Tantrum</title>\n<style>\n${css()}\n</style>\n</head>\n<body>\n<h1${cls()}>${textHTML()}</h1>\n\n` +
        (inline ? `<script>\n${customSource().replace(/<\/script/gi, '<\\/script')}</script>` : `<script src="text-tantrum.js"></script>  <!-- your script from the first tab -->`) + `\n</body>\n</html>\n`
    }
  };

  const modal = document.getElementById('modal'), codeEl = document.getElementById('code'), noteEl = document.getElementById('tab-note');
  let tab = 'script';
  const showCode = () => { codeEl.textContent = TABS[tab].code(); noteEl.textContent = TABS[tab].note; };
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    showCode();
  }));
  selector.addEventListener('input', showCode);
  document.getElementById('generate').addEventListener('click', () => { showCode(); modal.showModal(); });

  document.getElementById('copy').addEventListener('click', () => copy(codeEl.textContent, 'Copied'));
  document.getElementById('share').addEventListener('click', () => {
    const url = location.href.split('#')[0] + '#' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
    copy(url, 'Link copied');
  });

  document.getElementById('dl-lib').addEventListener('click', () => download('text-tantrum.js', customSource(), 'text/javascript'));
  document.getElementById('dl-page').addEventListener('click', () => download('text-tantrum-demo.html', TABS.page.code(true), 'text/html'));

  function download(name, text, type) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) {
      const t = h('textarea', null); t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove(); toast(msg);
    }
  }
  let toastT = 0;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600);
  }

  /* ---------- saving ---------- */
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function load() {
    let raw = null;
    try {
      if (location.hash.length > 1) raw = decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(1)))));
      else raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const look = { ...LOOK0, ...s.look };
      if (OLD_TEXTS.includes(look.text)) look.text = LOOK0.text;      // an earlier default, not something the visitor wrote
      return { look, sparkSame: !!s.sparkSame, opts: TextTantrum.merge(DEF, s.opts) };   // fills in options added in later versions
    } catch (e) { return null; }
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
  }

  /* ---------- go ---------- */
  applyAll(false);
  inst.burst(600, 10);
  TextTantrum('#logo', { respectReducedMotion: false, sparks: { count: 8 } });
})();
