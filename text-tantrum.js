/*!
 * Text Tantrum v1.0.2
 * Letters that throw a little fit when you poke them: they turn into random signs
 * in loud colours for a moment, spit sparks, and snap back.
 * No dependencies. MIT License. Copyright (c) 2026 Omid Akbari
 *
 * Made by Omid Akbari, senior product designer and creative technologist based in Düsseldorf, Germany.
 * https://omid-akbari.com
 * Configurator and source: https://github.com/blue-grid/text-tantrum
 */
(function (root, factory) {
  var lib = factory();
  lib.factorySource = String(factory);          // lets the configurator rebuild this file for download
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.TextTantrum = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.2';

  /* Every option, with the values that make the original effect. Ranges are [min, max]; a random value
     between the two is picked each time. Times are in ms unless the name says otherwise. */
  var DEFAULTS = {
    chars: '!<>-_\\/[]{}=+*^?#$%&@01:;~|',     // the signs a letter can turn into
    colors: ['#ff2a55', '#00e5ff', '#39ff7a', '#ffffff', '#ffe14a', '#b56cff'],
    colorMode: 'random',        // 'random' | 'cycle' (go through the list in order) | 'original' (keep the text colour)
    trigger: 'hover',           // 'hover' | 'click' | 'both' | 'none' (only auto, reveal or burst())
    duration: [260, 420],       // how long a letter keeps scrambling
    flicker: [28, 60],          // time between two signs while it scrambles
    neighbours: 1,              // letters on each side that can catch it
    spill: 0.5,                 // chance (0 to 1) that each neighbour catches it
    spillDuration: [120, 240],
    jitter: 0.05,               // how far the sign wobbles off its place, in em
    glyphScale: 0.8,            // size of the sign compared with the letter
    glyphFont: '',              // '' uses the text's own font
    glyphWeight: '',            // '' uses the text's own weight
    rgbSplit: 0.05,             // offset of the colour-split shadow on the sign, in em (0 turns it off)
    splitColors: ['#ff003c', '#00e5ff', '#2bff6a'],
    touch: true,                // a tap scrambles the letters under the finger
    auto: false,                // letters throw tantrums on their own now and then
    autoEvery: [500, 1500],
    reveal: false,              // scramble everything once when it starts, then settle letter by letter
    revealDuration: 700,
    revealStagger: 18,          // extra delay per letter during the reveal
    respectReducedMotion: true, // do nothing for people who asked their system for less motion
    sparks: {
      enabled: true,
      count: 16,                // sparks per letter hit
      colors: ['#ff1438', '#1aff59', '#1f59ff', '#00e5ff', '#ffffff'],   // null uses the letter colours
      shape: 'circle',          // 'circle' | 'square' | 'line' | 'star' | 'glyph'
      blend: 'add',             // 'add' (glows, best on dark backgrounds) | 'normal'
      speed: [120, 620],        // px per second, in a random direction
      follow: [200, 900],       // extra speed in the direction the pointer moves
      life: [0.35, 0.95],       // seconds
      size: [2.2, 4.6],         // px
      drag: 3.4,                // how fast they slow down
      gravity: 0,               // px per second², negative floats up
      scatter: 0.18,            // how far from the pointer they start, in em
      fade: 1.4,                // how they fade out: 1 even, higher fades sooner
      opacity: 0.9,
      glow: 0,                  // soft halo around each spark, in px
      shrink: false,            // get smaller as they fade
      max: 1500,                // most sparks on screen at once
      zIndex: 2147483000
    }
  };

  var CSS =
    '.tt-w{display:inline-block;white-space:nowrap}' +
    '.tt-c{position:relative;display:inline-block}' +
    '.tt-c.tt-g{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' +
    '.tt-c.tt-g::after{content:attr(data-tt);position:absolute;left:50%;top:50%;pointer-events:none;white-space:pre;letter-spacing:0;line-height:1;' +
    'transform:translate(calc(-50% + var(--tt-x,0em)),calc(-50% + var(--tt-y,0em)));font-size:var(--tt-scale,.8em);' +
    'font-family:var(--tt-font,inherit);font-weight:var(--tt-weight,inherit);font-style:normal;' +
    'color:var(--tt-col,#fff);-webkit-text-fill-color:var(--tt-col,#fff);text-shadow:var(--tt-shadow,none)}' +
    '.tt-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}';

  var instances = [], active = new Map(), parts = [];
  var quality = 1;          // 0.1 to 1: the share of sparks actually made. Drops when frames run slow, recovers when they're quick
  var canvas = null, ctx = null, raf = 0, last = 0, cycle = 0;
  var reduceMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  var segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

  /* ---------- helpers ---------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function val(v) { return Array.isArray(v) ? rand(+v[0], +v[1]) : +v; }
  function pick(a) { return a[Math.random() * a.length | 0]; }
  function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73; }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, over) {
    var out = {}, k;
    over = over || {};
    for (k in base) out[k] = isObj(base[k]) ? merge(base[k], over[k]) : Array.isArray(base[k]) ? base[k].slice() : base[k];
    for (k in over) if (!isObj(base[k]) && over[k] !== undefined) out[k] = Array.isArray(over[k]) ? over[k].slice() : over[k];
    return out;
  }
  function graphemes(s) {
    if (!segmenter) return Array.from(s);
    var out = [];
    for (var it of segmenter.segment(s)) out.push(it.segment);
    return out;
  }
  function resolve(target) {
    if (typeof target === 'string') return Array.prototype.slice.call(document.querySelectorAll(target));
    if (target && target.nodeType === 1) return [target];
    if (target && typeof target.length === 'number') return Array.prototype.slice.call(target);
    return [];
  }
  function injectCSS() {
    if (document.getElementById('text-tantrum-style')) return;
    var s = document.createElement('style');
    s.id = 'text-tantrum-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* every letter becomes its own box, words stay together so lines still wrap between words */
  function split(root) {
    var letters = [], nodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentNode.closest('script,style,textarea,noscript,[data-tantrum-skip],.tt-sr') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'tt-w';
        w.setAttribute('aria-hidden', 'true');
        graphemes(part).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'tt-c';
          c.textContent = ch;
          w.appendChild(c);
          letters.push(c);
        });
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return letters;
  }

  /* ---------- the shared animation loop: scrambling letters and sparks ---------- */
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  function glitch(el, ms, now) {
    if (!el || !el._tt) return;
    now = now || performance.now();
    var g = active.get(el);
    active.set(el, { end: Math.max(g ? g.end : 0, now + ms), next: g ? g.next : 0, inst: el._tt });
    wake();
  }

  function colorFor(o, el) {
    if (o.colorMode === 'original') return el._ttc || (el._ttc = getComputedStyle(el).color);
    var c = o.colors && o.colors.length ? o.colors : ['#fff'];
    if (o.colorMode === 'cycle') return c[cycle++ % c.length];
    return pick(c);
  }

  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    active.forEach(function (g, el) {
      if (!el.isConnected || now >= g.end) { el.classList.remove('tt-g'); active.delete(el); return; }
      if (now < g.next) return;
      var o = g.inst.opts;
      g.next = now + val(o.flicker);
      var col = colorFor(o, el);                  // read before the letter is hidden, so 'original' sees its real colour
      el.setAttribute('data-tt', pick(g.inst._chars));
      el.classList.add('tt-g');
      el.style.setProperty('--tt-col', col);
      el.style.setProperty('--tt-x', (gauss() * o.jitter).toFixed(3) + 'em');
      el.style.setProperty('--tt-y', (gauss() * o.jitter * 0.8).toFixed(3) + 'em');
    });
    drawSparks(dt);
    if (active.size || parts.length) wake(); else last = 0;
  }

  function ensureCanvas(z) {
    if (canvas) { canvas.style.zIndex = z; return; }
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:' + z;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function spawn(inst, x, y, ux, uy, fs, n) {
    var s = inst.opts.sparks;
    n = Math.round(n * quality + Math.random() - 0.5);
    if (!s.enabled || n <= 0) return;
    ensureCanvas(s.zIndex);
    var cols = s.colors && s.colors.length ? s.colors : inst.opts.colors;
    for (var j = 0; j < n; j++) {
      var a = Math.random() * 6.2832, v = val(s.speed), f = val(s.follow);
      parts.push({
        x: x + gauss() * fs * s.scatter, y: y + gauss() * fs * s.scatter * 1.6,
        vx: Math.cos(a) * v + ux * f, vy: Math.sin(a) * v + uy * f,
        life: 0, max: Math.max(0.02, val(s.life)), sz: val(s.size), c: pick(cols),
        ch: s.shape === 'glyph' ? pick(inst._chars) : '', s: s
      });
    }
    if (parts.length > s.max) parts.splice(0, parts.length - s.max);
    wake();
  }

  function drawSparks(dt) {
    if (!canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!parts.length) { quality = Math.min(1, quality + 0.05); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t0 = performance.now(), n = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], s = p.s;
      p.life += dt;
      if (p.life >= p.max) continue;
      var q = Math.exp(-dt * s.drag);
      p.vx *= q; p.vy *= q; p.vy += s.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      var k = 1 - p.life / p.max, r = p.sz * (s.shrink ? 0.25 + 0.75 * k : 1), a = Math.pow(k, s.fade) * s.opacity;
      ctx.globalCompositeOperation = s.blend === 'add' ? 'lighter' : 'source-over';
      if (s.glow > 0) {                          // the halo: a ready-made soft disc, stamped behind the spark
        var d = r + s.glow * 2;
        ctx.globalAlpha = a * 0.55;
        ctx.drawImage(glowSprite(p.c), p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = ctx.strokeStyle = p.c;
      drawShape(s.shape, p, r);
      parts[n++] = p;
    }
    parts.length = n;
    ctx.globalAlpha = 1;
    // speed guard: a slow frame means too many sparks for this device, so drop the oldest half and make fewer from now on
    var took = performance.now() - t0;
    if (took > 12) { quality = Math.max(0.1, quality * 0.6); parts.splice(0, parts.length >> 1); }
    else if (took < 5) quality = Math.min(1, quality + 0.01);
  }

  /* One soft disc per colour, drawn once and reused. The canvas's own shadowBlur would do the same
     but costs so much per spark that a fast stroke with glow on could freeze the page. */
  var glows = {}, glowCount = 0;
  function glowSprite(c) {
    if (glows[c]) return glows[c];
    if (glowCount > 64) { glows = {}; glowCount = 0; }
    var g = document.createElement('canvas'), x = g.getContext('2d');
    g.width = g.height = 64;
    var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'source-in';   // tint the white disc, so its edge fades to the colour, not to grey
    x.fillStyle = c;
    x.fillRect(0, 0, 64, 64);
    glowCount++;
    return (glows[c] = g);
  }

  function drawShape(shape, p, r) {
    switch (shape) {
      case 'square':
        ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
        break;
      case 'line':
        var sp = Math.hypot(p.vx, p.vy) || 1, l = Math.max(r, Math.min(sp * 0.03, r * 8));
        ctx.lineWidth = Math.max(0.6, r * 0.45);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx / sp * l, p.y - p.vy / sp * l);
        ctx.stroke();
        break;
      case 'star':
        var t = r * 0.18;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + t, p.y - t); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x + t, p.y + t);
        ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - t, p.y + t); ctx.lineTo(p.x - r, p.y); ctx.lineTo(p.x - t, p.y - t);
        ctx.closePath();
        ctx.fill();
        break;
      case 'glyph':
        ctx.font = (r * 3).toFixed(1) + 'px ui-monospace, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.ch, p.x, p.y);
        break;
      default:
        ctx.beginPath();
        ctx.arc(p.x, p.y, r / 2, 0, 6.2832);
        ctx.fill();
    }
  }

  /* ---------- one tantrum: a set of elements sharing options ---------- */
  function Tantrum(target, options) {
    this.roots = resolve(target);
    this.opts = merge(DEFAULTS, options);
    this.letters = [];
    this._saved = [];
    this._off = [];
    this._autoT = 0;
    this._last = null;
    this.idle = !!(this.opts.respectReducedMotion && reduceMQ && reduceMQ.matches);
    if (this.idle) return;
    injectCSS();
    var self = this;
    this.roots.forEach(function (root) {
      self._saved.push({ root: root, html: root.innerHTML });
      var text = root.textContent.replace(/\s+/g, ' ').trim();
      split(root).forEach(function (l) { l._tt = self; l._i = self.letters.length; self.letters.push(l); });
      var sr = document.createElement('span');
      sr.className = 'tt-sr';
      sr.textContent = text;
      root.insertBefore(sr, root.firstChild);
      self._listen(root);
    });
    this._apply();
    instances.push(this);
    if (this.opts.reveal) this.reveal();
  }

  Tantrum.prototype._apply = function () {
    var o = this.opts, sh = 'none';
    this._chars = graphemes(String(o.chars || '#'));
    if (o.rgbSplit > 0) {
      var s = +o.rgbSplit, c = o.splitColors || [];
      sh = (-s) + 'em 0 ' + (c[0] || 'transparent') + ',' + s + 'em 0 ' + (c[1] || 'transparent') + ',0 ' + (s * 0.6).toFixed(3) + 'em ' + (c[2] || 'transparent');
    }
    this.roots.forEach(function (r) {
      r.style.setProperty('--tt-scale', o.glyphScale + 'em');
      r.style.setProperty('--tt-shadow', sh);
      if (o.glyphFont) r.style.setProperty('--tt-font', o.glyphFont); else r.style.removeProperty('--tt-font');
      if (o.glyphWeight) r.style.setProperty('--tt-weight', o.glyphWeight); else r.style.removeProperty('--tt-weight');
    });
    this._schedule();
  };

  Tantrum.prototype._listen = function (root) {
    var self = this;
    function move(e) { self._move(e, root); }
    function leave() { self._last = null; }
    function down(e) { self._down(e, root); }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointerdown', down);
    this._off.push(function () {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('pointerdown', down);
    });
  };

  /* a hit letter scrambles, throws sparks, and may pass it on to its neighbours */
  Tantrum.prototype._hit = function (el, x, y, ux, uy, fs, sparks, ms) {
    var o = this.opts, now = performance.now();
    glitch(el, ms || val(o.duration), now);
    spawn(this, x, y, ux, uy, fs, sparks);
    for (var k = 1; k <= o.neighbours; k++) {
      var a = this.letters[el._i - k], b = this.letters[el._i + k];
      if (a && Math.random() < o.spill) glitch(a, val(o.spillDuration), now);
      if (b && Math.random() < o.spill) glitch(b, val(o.spillDuration), now);
    }
  };

  /* every letter along the path the pointer just travelled, however fast it went */
  Tantrum.prototype._move = function (e, root) {
    var t = this.opts.trigger;
    if ((t !== 'hover' && t !== 'both') || e.pointerType === 'touch') return;
    var now = performance.now(), l = this._last && now - this._last.t < 120 ? this._last : { x: e.clientX, y: e.clientY };
    var dx = e.clientX - l.x, dy = e.clientY - l.y, d = Math.hypot(dx, dy);
    var fs = parseFloat(getComputedStyle(root).fontSize) || 32;
    var n = Math.min(40, Math.ceil(d / Math.max(6, fs * 0.22)));
    var ux = d > 1 ? dx / d : 0, uy = d > 1 ? dy / d : 0;
    for (var i = 0; i <= n; i++) {
      var k = n ? i / n : 1, x = l.x + dx * k, y = l.y + dy * k, el = document.elementFromPoint(x, y);
      // one pointer move never throws more than a quarter of the spark cap, however many letters it crosses
      var per = Math.min(this.opts.sparks.count, Math.floor(this.opts.sparks.max / 4 / (n + 1)) || 1);
      if (el && el._tt === this) this._hit(el, x, y, ux, uy, fs, per);
    }
    this._last = { x: e.clientX, y: e.clientY, t: now };
  };

  /* a tap or click scrambles a small patch of letters around the point */
  Tantrum.prototype._down = function (e, root) {
    var t = this.opts.trigger, touch = e.pointerType !== 'mouse';
    var ok = t === 'click' || t === 'both' || (touch && this.opts.touch && t === 'hover');
    if (!ok) return;
    var fs = parseFloat(getComputedStyle(root).fontSize) || 32, seen = new Set();
    var n = Math.max(1, Math.round(this.opts.sparks.count * 0.62));
    for (var i = -3; i <= 3; i++) for (var j = -1; j <= 1; j++) {
      var x = e.clientX + i * fs * 0.34, y = e.clientY + j * fs * 0.5, el = document.elementFromPoint(x, y);
      if (!el || el._tt !== this || seen.has(el)) continue;
      seen.add(el);
      this._hit(el, x, y, 0, 0, fs, n, val(this.opts.duration) * 1.3 - Math.abs(i) * 40);
    }
  };

  Tantrum.prototype._schedule = function () {
    clearTimeout(this._autoT);
    if (!this.opts.auto || !this.letters.length) return;
    var self = this;
    this._autoT = setTimeout(function () {
      var el = pick(self.letters), r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) {
        var fs = parseFloat(getComputedStyle(el).fontSize) || 32;
        self._hit(el, r.left + r.width / 2, r.top + r.height / 2, 0, 0, fs, Math.round(self.opts.sparks.count * 0.5));
      }
      self._schedule();
    }, val(this.opts.autoEvery));
  };

  /* ---------- public methods ---------- */
  Tantrum.prototype.update = function (options) {
    if (this.idle) return this;
    this.opts = merge(this.opts, options);
    this._apply();
    return this;
  };

  /* scramble every letter at once; ms is how long, stagger adds a delay per letter */
  Tantrum.prototype.burst = function (ms, stagger) {
    var now = performance.now(), self = this;
    ms = ms == null ? val(this.opts.duration) : ms;
    stagger = stagger || 0;
    this.letters.forEach(function (l, i) { glitch(l, ms + i * stagger + Math.random() * 60, now); });
    return self;
  };

  Tantrum.prototype.reveal = function () {
    return this.burst(this.opts.revealDuration, this.opts.revealStagger);
  };

  Tantrum.prototype.destroy = function () {
    clearTimeout(this._autoT);
    this._off.forEach(function (f) { f(); });
    this.letters.forEach(function (l) { active.delete(l); });
    this._saved.forEach(function (s) {
      s.root.innerHTML = s.html;
      ['--tt-scale', '--tt-shadow', '--tt-font', '--tt-weight'].forEach(function (p) { s.root.style.removeProperty(p); });
    });
    this.letters = []; this._saved = []; this._off = [];
    var i = instances.indexOf(this);
    if (i >= 0) instances.splice(i, 1);
    if (!instances.length && canvas) {
      parts.length = 0;
      canvas.remove();
      canvas = ctx = null;
    }
  };

  /* ---------- entry point ---------- */
  function TextTantrum(target, options) { return new Tantrum(target, options); }
  TextTantrum.version = VERSION;
  TextTantrum.defaults = DEFAULTS;
  TextTantrum.merge = merge;

  /* elements with a data-text-tantrum attribute start by themselves; the attribute may hold JSON options */
  TextTantrum.auto = function () {
    return Array.prototype.map.call(document.querySelectorAll('[data-text-tantrum]:not([data-tantrum-started])'), function (el) {
      el.setAttribute('data-tantrum-started', '');
      var raw = el.getAttribute('data-text-tantrum'), o = {};
      if (raw) try { o = JSON.parse(raw); } catch (err) { console.warn('Text Tantrum: the options in data-text-tantrum are not valid JSON', el); }
      return new Tantrum(el, o);
    });
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', TextTantrum.auto);
    else setTimeout(TextTantrum.auto, 0);
  }

  return TextTantrum;
});
