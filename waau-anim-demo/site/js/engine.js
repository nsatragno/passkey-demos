/*
 * A tiny manim-flavoured animation engine for SVG.
 *
 * Scenes are async builder functions that receive a `Ctx`. They create
 * mobjects (`ctx.rect`, `ctx.text`, ...) and `await ctx.play(...)`
 * animations sequentially. Because builders are deterministic, any point in
 * time can be reached by re-running the builder in "seek" mode, where
 * animations ending before the target time are applied instantly. That makes
 * every scene scrubbable like a video.
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const CANCEL = { cancelled: true };

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const Ease = {
    smooth: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    linear: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    back: (t) => {
      const c1 = 1.4, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    thereBack: (t) => Ease.smooth(t < 0.5 ? 2 * t : 2 - 2 * t),
  };

  const C = {
    bg: '#0b0c10',
    blue: '#58C4DD',
    blueD: '#29ABCA',
    yellow: '#F4D345',
    gold: '#F0AC5F',
    green: '#83C167',
    red: '#FC6255',
    teal: '#5CD0B3',
    maroon: '#C55F73',
    white: '#ECECEC',
    light: '#BBBBBB',
    grey: '#888888',
    dim: '#4A4F57',
    dark: '#1B1E24',
  };

  function hex2rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r) {
    return '#' + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function lerpColor(a, b, t) {
    if (!a || a === 'none' || !b || b === 'none') return t < 0.5 ? a : b;
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A.map((v, i) => lerp(v, B[i], t)));
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const FONTS = {
    serif: "'CMU Serif','Computer Modern Serif','Latin Modern Roman','Source Serif 4',Georgia,serif",
    sans: "'Inter','Helvetica Neue',Arial,sans-serif",
    mono: "'JetBrains Mono','SFMono-Regular',Menlo,monospace",
  };

  /* ------------------------------------------------------------------ */
  /* Mobjects                                                            */
  /* ------------------------------------------------------------------ */

  class Mob {
    constructor(ctx, g) {
      this.ctx = ctx;
      this.g = g;
      this.x = 0; this.y = 0; this.s = 1; this.r = 0; this.o = 1;
      this.parent = null;
      this.apply();
    }
    apply() {
      this.g.setAttribute('transform',
        `translate(${this.x.toFixed(2)} ${this.y.toFixed(2)}) rotate(${this.r.toFixed(2)}) scale(${this.s.toFixed(4)})`);
      this.g.setAttribute('opacity', clamp(this.o).toFixed(3));
    }
    at(x, y) { this.x = x; this.y = y; this.apply(); return this; }
    set(p) { Object.assign(this, p); this.apply(); return this; }
    add(...ms) {
      for (const m of ms.flat()) { if (!m) continue; this.g.appendChild(m.g); m.parent = this; }
      return this;
    }
    front() { if (this.g.parentNode) this.g.parentNode.appendChild(this.g); return this; }
    back() { if (this.g.parentNode) this.g.parentNode.insertBefore(this.g, this.g.parentNode.firstChild); return this; }
    get attached() { return this.g.isConnected && this.ctx.layer.contains(this.g); }
    /** Position in layer coordinates (ignores rotation). */
    gpos() {
      let x = this.x, y = this.y, p = this.parent;
      while (p) { x = p.x + x * p.s; y = p.y + y * p.s; p = p.parent; }
      return { x, y };
    }
    bbox() {
      const tmp = !this.g.isConnected;
      if (tmp) this.ctx.measure.appendChild(this.g);
      const b = this.g.getBBox();
      if (tmp) this.g.remove();
      return b;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Animations                                                          */
  /* An animation is { dur, begin(), update(t) } with t in [0, 1] raw.   */
  /* ------------------------------------------------------------------ */

  function anim(dur, begin, update, ease = Ease.smooth, end) {
    let ended = false;
    return {
      dur,
      begin() { ended = false; if (begin) begin(); },
      update(t) {
        update(ease(clamp(t)), clamp(t));
        if (t >= 1 && !ended) { ended = true; if (end) end(); }
      },
    };
  }

  function ensure(m) {
    if (!m.g.isConnected || !m.ctx.layer.contains(m.g)) {
      const root = rootOf(m);
      if (!root.g.isConnected || !m.ctx.layer.contains(root.g)) m.ctx.layer.appendChild(root.g);
    }
  }
  function rootOf(m) { while (m.parent) m = m.parent; return m; }

  const GEOM = 'path,rect,circle,ellipse,line,polyline,polygon';

  function partsOf(m) {
    const parts = [];
    const walk = (node) => {
      for (const c of node.children) {
        const tag = c.tagName.toLowerCase();
        if (c.dataset && c.dataset.nodraw) continue;
        if (GEOM.split(',').includes(tag)) parts.push({ kind: 'geom', e: c });
        else if (tag === 'text') {
          const spans = c.querySelectorAll('tspan.ch');
          if (spans.length) spans.forEach((s) => parts.push({ kind: 'glyph', e: s, text: c }));
          else parts.push({ kind: 'fade', e: c });
        } else if (tag === 'g') walk(c);
      }
    };
    walk(m.g);
    return parts;
  }

  function computedFill(e) {
    let n = e;
    while (n && n.getAttribute) {
      const f = n.getAttribute('fill');
      if (f && f !== 'inherit') return f;
      n = n.parentNode;
    }
    return '#ffffff';
  }

  /** DrawBorderThenFill / Write, depending on what's inside. */
  function create(m, o = {}) {
    const dur = o.dur ?? 1.2;
    const lagMax = o.lag ?? 0.75;
    let parts = [];
    const drawPart = (p, q) => {
      if (p.kind === 'geom') {
        const e = p.e;
        e.setAttribute('stroke-dashoffset', (p.L * (1 - clamp(q / 0.7))).toFixed(2));
        if (p.fo > 0) e.setAttribute('fill-opacity', (p.fo * clamp((q - 0.45) / 0.55)).toFixed(3));
        if (q >= 1) {
          e.removeAttribute('stroke-dasharray');
          e.removeAttribute('stroke-dashoffset');
          if (p.fo > 0) e.setAttribute('fill-opacity', p.fo);
        }
      } else if (p.kind === 'glyph') {
        const e = p.e;
        e.setAttribute('stroke-dashoffset', (p.D * (1 - clamp(q / 0.6))).toFixed(1));
        e.setAttribute('fill-opacity', (p.fo * clamp((q - 0.35) / 0.65)).toFixed(3));
        e.setAttribute('stroke-opacity', (1 - clamp((q - 0.6) / 0.4)).toFixed(3));
        if (q >= 1) {
          e.removeAttribute('stroke'); e.removeAttribute('stroke-width');
          e.removeAttribute('stroke-dasharray'); e.removeAttribute('stroke-dashoffset');
          e.removeAttribute('stroke-opacity');
          e.setAttribute('fill-opacity', p.fo);
        }
      } else {
        p.e.setAttribute('opacity', clamp(q).toFixed(3));
      }
    };
    return anim(dur, () => {
      ensure(m);
      m.o = o.o ?? (m.o > 0 ? m.o : 1);
      m.apply();
      parts = partsOf(m);
      for (const p of parts) {
        const e = p.e;
        if (p.kind === 'geom') {
          let L = 600;
          try { L = e.getTotalLength(); } catch (err) { /* ignore */ }
          p.L = Math.max(1, L);
          const fill = e.getAttribute('fill');
          p.fo = fill && fill !== 'none' ? parseFloat(e.dataset.fo ?? e.getAttribute('fill-opacity') ?? 1) : 0;
          e.dataset.fo = p.fo;
          e.setAttribute('stroke-dasharray', `${p.L.toFixed(2)} ${p.L.toFixed(2)}`);
        } else if (p.kind === 'glyph') {
          const size = parseFloat(p.text.getAttribute('font-size') || 24);
          p.D = size * 5;
          p.fo = 1;
          e.setAttribute('stroke', computedFill(e));
          e.setAttribute('stroke-width', Math.max(0.6, size * 0.035).toFixed(2));
          e.setAttribute('stroke-dasharray', `${p.D} ${p.D}`);
        }
        drawPart(p, 0);
      }
    }, (a) => {
      const n = parts.length;
      if (!n) return;
      const w = n === 1 ? 1 : clamp(Math.max(1 - lagMax, 3.5 / n), 0.12, 1);
      parts.forEach((p, i) => {
        const st = n === 1 ? 0 : (i / (n - 1)) * (1 - w);
        drawPart(p, clamp((a - st) / w));
      });
    }, o.ease ?? Ease.linear);
  }

  function uncreate(m, o = {}) {
    const dur = o.dur ?? 0.8;
    let parts = [];
    return anim(dur, () => {
      parts = partsOf(m).filter((p) => p.kind === 'geom');
      for (const p of parts) {
        try { p.L = p.e.getTotalLength(); } catch (e) { p.L = 600; }
        p.L = Math.max(1, p.L);
        p.e.setAttribute('stroke-dasharray', `${p.L} ${p.L}`);
        const fill = p.e.getAttribute('fill');
        p.fo = fill && fill !== 'none' ? parseFloat(p.e.dataset.fo ?? p.e.getAttribute('fill-opacity') ?? 1) : 0;
      }
      m.o0 = m.o;
    }, (a) => {
      for (const p of parts) {
        p.e.setAttribute('stroke-dashoffset', (p.L * a).toFixed(2));
        if (p.fo) p.e.setAttribute('fill-opacity', (p.fo * (1 - clamp(a * 2))).toFixed(3));
      }
      m.o = m.o0 * (1 - clamp((a - 0.6) / 0.4)); m.apply();
    }, Ease.smooth, () => {
      rootOf(m) === m ? m.g.remove() : (m.o = 0, m.apply());
      for (const p of parts) {
        p.e.removeAttribute('stroke-dasharray'); p.e.removeAttribute('stroke-dashoffset');
        if (p.fo) p.e.setAttribute('fill-opacity', p.fo);
      }
    });
  }

  function fadeIn(m, o = {}) {
    let x1, y1, s1, o1;
    return anim(o.dur ?? 0.8, () => {
      ensure(m);
      x1 = m.x; y1 = m.y; s1 = m.s; o1 = o.o ?? 1;
    }, (a) => {
      m.x = x1 - (o.dx || 0) * (1 - a);
      m.y = y1 - (o.dy || 0) * (1 - a);
      m.s = s1 * lerp(o.scale ?? 1, 1, a);
      m.o = o1 * a;
      m.apply();
    }, o.ease ?? Ease.smooth);
  }

  function fadeOut(m, o = {}) {
    let x0, y0, s0, o0;
    return anim(o.dur ?? 0.6, () => { x0 = m.x; y0 = m.y; s0 = m.s; o0 = m.o; }, (a) => {
      m.x = x0 + (o.dx || 0) * a;
      m.y = y0 + (o.dy || 0) * a;
      m.s = s0 * lerp(1, o.scale ?? 1, a);
      m.o = o0 * (1 - a);
      m.apply();
    }, o.ease ?? Ease.smooth, () => {
      if (!o.keep) { if (m.parent) { m.o = 0; m.apply(); } else m.g.remove(); }
      m.x = x0; m.y = y0; m.s = s0; m.apply();
    });
  }

  /** Move/scale/rotate/fade to the given props. o.arc bends the path. */
  function to(m, props, o = {}) {
    let from;
    return anim(o.dur ?? 1, () => {
      ensure(m);
      from = { x: m.x, y: m.y, s: m.s, r: m.r, o: m.o };
    }, (a) => {
      for (const k in props) if (k in from) m[k] = lerp(from[k], props[k], a);
      if (o.arc && ('x' in props || 'y' in props)) {
        const tx = props.x ?? from.x, ty = props.y ?? from.y;
        const dx = tx - from.x, dy = ty - from.y;
        const bulge = Math.sin(Math.PI * a) * o.arc * 0.5;
        m.x += -dy * bulge; m.y += dx * bulge;
      }
      m.apply();
    }, o.ease ?? Ease.smooth);
  }

  function colorTargets(m) {
    const out = [];
    const all = [m.g, ...m.g.querySelectorAll('*')];
    for (const e of all) {
      if (e.dataset && e.dataset.cs) out.push({ e, a: 'stroke' });
      if (e.dataset && e.dataset.cf) out.push({ e, a: 'fill' });
    }
    return out;
  }

  function recolor(m, color, o = {}) {
    let targets;
    return anim(o.dur ?? 0.8, () => {
      targets = colorTargets(m).map((t) => ({ ...t, from: t.e.getAttribute(t.a) }));
    }, (a) => {
      for (const t of targets) t.e.setAttribute(t.a, lerpColor(t.from, color, a));
    }, o.ease ?? Ease.smooth);
  }

  function indicate(m, o = {}) {
    let targets, s0;
    const color = o.color ?? C.yellow;
    const scale = o.scale ?? 1.15;
    return anim(o.dur ?? 1, () => {
      s0 = m.s;
      targets = colorTargets(m).map((t) => ({ ...t, from: t.e.getAttribute(t.a) }));
    }, (a) => {
      m.s = s0 * lerp(1, scale, a); m.apply();
      for (const t of targets) t.e.setAttribute(t.a, lerpColor(t.from, color, a));
    }, Ease.thereBack, () => {
      m.s = s0; m.apply();
      for (const t of targets) t.e.setAttribute(t.a, t.from);
    });
  }

  function wiggle(m, o = {}) {
    let r0, s0;
    return anim(o.dur ?? 1, () => { r0 = m.r; s0 = m.s; }, (a, raw) => {
      const env = Math.sin(Math.PI * raw);
      m.r = r0 + Math.sin(raw * Math.PI * 8) * (o.angle ?? 8) * env;
      m.s = s0 * (1 + 0.1 * env);
      m.apply();
    }, Ease.linear, () => { m.r = r0; m.s = s0; m.apply(); });
  }

  /** Move a mobject along an SVG geometry element (in layer coords). */
  function along(m, pathEl, o = {}) {
    let L;
    return anim(o.dur ?? 1.2, () => {
      ensure(m);
      L = pathEl.getTotalLength();
    }, (a) => {
      const from = o.reverse ? 1 - a : a;
      const pt = pathEl.getPointAtLength(L * from);
      m.x = pt.x; m.y = pt.y; m.apply();
    }, o.ease ?? Ease.smooth);
  }

  function counter(textMob, from, to2, o = {}) {
    const fmt = o.fmt ?? ((v) => Math.round(v).toLocaleString());
    return anim(o.dur ?? 1.5, null, (a) => {
      const t = textMob.g.querySelector('text');
      t.textContent = fmt(lerp(from, to2, a));
    }, o.ease ?? Ease.smooth);
  }

  function waitAnim(s) { return anim(s, null, () => {}, Ease.linear); }

  /** Run instant code at the start of a play() step. */
  function call(fn) { return anim(0.0001, fn, () => {}, Ease.linear); }

  function lagged(anims, o = {}) {
    anims = anims.flat().filter(Boolean);
    const lag = o.lag ?? 0.15;
    const each = Math.max(...anims.map((a) => a.dur), 0.001);
    const total = o.dur ?? each + lag * each * (anims.length - 1);
    const scale = total / (each + lag * each * (anims.length - 1));
    const starts = anims.map((_, i) => i * lag * each * scale);
    const begun = anims.map(() => false);
    return {
      dur: total,
      begin() { begun.fill(false); },
      update(t) {
        const time = t * total;
        anims.forEach((a, i) => {
          if (time >= starts[i] || t >= 1) {
            if (!begun[i]) { begun[i] = true; a.begin(); }
            a.update(clamp((time - starts[i]) / (a.dur * scale)));
          }
        });
      },
    };
  }

  function succession(anims) {
    anims = anims.flat().filter(Boolean);
    const total = anims.reduce((s, a) => s + a.dur, 0);
    const begun = anims.map(() => false);
    return {
      dur: total,
      begin() { begun.fill(false); },
      update(t) {
        const time = t * total;
        let acc = 0;
        anims.forEach((a, i) => {
          if (time >= acc || t >= 1) {
            if (!begun[i]) { begun[i] = true; a.begin(); }
            a.update(clamp((time - acc) / a.dur));
          }
          acc += a.dur;
        });
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ctx: per-run scene API                                              */
  /* ------------------------------------------------------------------ */

  class Ctx {
    constructor(stage, gen, target) {
      this.stage = stage;
      this.gen = gen;
      this.t = 0;
      this.target = target;
      this.active = null;
      this.marks = [];
      this.layer = el('g', { class: 'layer' });
      this.measure = stage.measure;
      this.W = 1280; this.H = 720;
    }
    alive() { return this.gen === this.stage.gen; }

    play(...list) {
      if (!this.alive()) return Promise.reject(CANCEL);
      const anims = list.flat().filter(Boolean);
      const dur = Math.max(0.0001, ...anims.map((a) => a.dur));
      const start = this.t;
      anims.forEach((a) => a.begin());
      const step = (elapsed) => anims.forEach((a) => a.update(Math.min(1, elapsed / a.dur)));
      if (start + dur <= this.target) {
        step(dur);
        this.t = start + dur;
        return Promise.resolve();
      }
      if (this.target > start) this.t = this.target;
      step(this.t - start);
      this.stage.onSeekSettled(this);
      return new Promise((res, rej) => { this.active = { anims, start, dur, step, res, rej }; });
    }
    wait(s = 1) { return this.play(waitAnim(s)); }
    sync(targetT) {
      if (this.t < targetT) return this.wait(targetT - this.t);
      return Promise.resolve();
    }

    say(html) {
      if (!this.alive()) return;
      const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
      this.marks.push({ t: this.t, html, text });
      this.stage.setCaption(html, this.t < this.target);
    }

    /* ---- primitives (detached until added / animated in) ---- */
    g(...children) {
      const m = new Mob(this, el('g'));
      m.add(...children);
      return m;
    }
    add(...ms) { for (const m of ms.flat()) { this.layer.appendChild(rootOf(m).g); } return ms[0]; }
    remove(...ms) { for (const m of ms.flat()) m.g.remove(); }

    _style(e, o, defStroke) {
      const stroke = o.stroke ?? (o.color ?? defStroke);
      const fill = o.fill ?? 'none';
      e.setAttribute('stroke', stroke ?? 'none');
      e.setAttribute('fill', fill);
      if (fill !== 'none') e.setAttribute('fill-opacity', o.fo ?? 1);
      e.setAttribute('stroke-width', o.sw ?? 3);
      e.setAttribute('stroke-linecap', 'round');
      e.setAttribute('stroke-linejoin', 'round');
      if (o.dash) e.setAttribute('data-dash', o.dash);
      if (stroke && stroke !== 'none' && o.follow !== false) e.dataset.cs = 1;
      if (fill !== 'none' && o.follow !== false && o.fillFollow !== false) e.dataset.cf = 1;
      if (o.nodraw) e.dataset.nodraw = 1;
      return e;
    }
    rect(w, h, o = {}) {
      const g = el('g');
      this._style(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: o.rx ?? 8 }, g), o, C.white);
      return new Mob(this, g);
    }
    circle(r, o = {}) {
      const g = el('g');
      this._style(el('circle', { cx: 0, cy: 0, r }, g), o, C.white);
      return new Mob(this, g);
    }
    path(d, o = {}) {
      const g = el('g');
      const p = this._style(el('path', { d }, g), o, C.white);
      const m = new Mob(this, g);
      m.pathEl = p;
      return m;
    }
    line(x1, y1, x2, y2, o = {}) {
      return this.path(`M${x1} ${y1} L${x2} ${y2}`, o);
    }
    poly(points, o = {}) {
      const g = el('g');
      this._style(el('polygon', { points: points.map((p) => p.join(',')).join(' ') }, g), o, C.white);
      return new Mob(this, g);
    }
    /** Arrow from (x1,y1) to (x2,y2). o.bend in px bows the line sideways. */
    arrow(x1, y1, x2, y2, o = {}) {
      const color = o.color ?? C.white;
      const head = o.head ?? 14;
      const bend = o.bend ?? 0;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
      // tangent at end
      let tx = x2 - cx, ty = y2 - cy;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const ex = x2 - tx * head * 0.8, ey = y2 - ty * head * 0.8;
      const g = el('g');
      const d = bend ? `M${x1} ${y1} Q${cx} ${cy} ${ex} ${ey}` : `M${x1} ${y1} L${ex} ${ey}`;
      const p = this._style(el('path', { d }, g), { ...o, stroke: color, fill: 'none' });
      if (o.dash) p.setAttribute('stroke-dasharray', o.dash), p.dataset.nodraw = 1;
      const nx = -ty, ny = tx;
      const pts = [
        [x2, y2],
        [x2 - tx * head + nx * head * 0.5, y2 - ty * head + ny * head * 0.5],
        [x2 - tx * head - nx * head * 0.5, y2 - ty * head - ny * head * 0.5],
      ];
      if (!o.nohead) this._style(el('polygon', { points: pts.map((q) => q.join(',')).join(' ') }, g), { stroke: color, fill: color, sw: 1.5 });
      const m = new Mob(this, g);
      m.pathEl = p;
      return m;
    }
    /**
     * Text. `str` may be a string or an array of segments: [text, {color, font, weight, italic, size}].
     * o: size, color, font, anchor ('start'|'middle'|'end'), weight, italic, glyphs (default true).
     */
    text(str, o = {}) {
      const g = el('g');
      const size = o.size ?? 26;
      const t = el('text', {
        x: 0, y: 0,
        'font-size': size,
        'font-family': FONTS[o.font ?? 'serif'] ?? o.font,
        'font-weight': o.weight ?? 400,
        'font-style': o.italic ? 'italic' : 'normal',
        'text-anchor': o.anchor ?? 'middle',
        'dominant-baseline': 'central',
        fill: o.color ?? C.white,
        'letter-spacing': o.ls ?? 0,
      }, g);
      t.style.whiteSpace = 'pre';
      if (o.follow !== false) t.dataset.cf = 1;
      const segs = Array.isArray(str) ? str : [[String(str), {}]];
      const glyphs = o.glyphs !== false;
      for (const seg of segs) {
        const [s, so = {}] = Array.isArray(seg) ? seg : [seg, {}];
        const attrs = {};
        if (so.color) attrs.fill = so.color;
        if (so.font) attrs['font-family'] = FONTS[so.font] ?? so.font;
        if (so.weight) attrs['font-weight'] = so.weight;
        if (so.italic) attrs['font-style'] = 'italic';
        if (so.size) attrs['font-size'] = so.size;
        if (glyphs) {
          for (const ch of Array.from(s)) {
            const sp = el('tspan', { ...attrs, class: 'ch' }, t);
            if (so.color && o.follow !== false) sp.dataset.cf = 1;
            sp.textContent = ch;
          }
        } else {
          const sp = el('tspan', attrs, t);
          sp.textContent = s;
        }
      }
      const m = new Mob(this, g);
      m.textEl = t;
      return m;
    }
    /** Multi-line text block, left aligned at x=0, first line at y=0. */
    lines(rows, o = {}) {
      const lh = o.lh ?? (o.size ?? 22) * 1.45;
      const m = this.g();
      m.rows = rows.map((r, i) => {
        const tm = this.text(r, { anchor: 'start', ...o }).at(0, i * lh);
        m.add(tm);
        return tm;
      });
      return m;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Stage: UI + clock                                                   */
  /* ------------------------------------------------------------------ */

  const stages = [];
  let lastTs = null;

  function fmtTime(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  class Stage {
    constructor(fig, build) {
      this.fig = fig;
      this.build = build;
      this.svg = fig.querySelector('svg');
      this.measure = el('g', { opacity: 0, 'aria-hidden': 'true' }, this.svg);
      this.captionEl = fig.querySelector('.caption');
      this.btn = fig.querySelector('.pp');
      this.range = fig.querySelector('input[type=range]');
      this.timeEl = fig.querySelector('.time');
      this.marksEl = fig.querySelector('.marks');
      this.speedBtn = fig.querySelector('.speed');
      this.muteBtn = fig.querySelector('.mute');
      this.fsBtn = fig.querySelector('.fs');
      this.speed = 1;
      this.gen = 0;
      this.ctx = null;
      this.playing = false;
      this.total = 1;
      this.started = false;
      this.name = fig.dataset.scene;
      this.muted = false;

      // Audio narration element
      if (this.name) {
        this.audio = new Audio(`audio/${this.name}.mp3`);
        this.audio.preload = 'auto';
      }

      stages.push(this);

      this.btn.addEventListener('click', () => this.toggle());
      this.svg.addEventListener('click', () => this.toggle());
      this.range.addEventListener('input', () => {
        this.started = true;
        const target = parseFloat(this.range.value);
        this.seek(target, false);
        if (this.audio) {
          try { this.audio.currentTime = Math.min(target, this.audio.duration || target); } catch (e) {}
        }
      });
      this.speedBtn.addEventListener('click', () => {
        const opts = [1, 1.5, 2, 0.5];
        this.speed = opts[(opts.indexOf(this.speed) + 1) % opts.length];
        this.speedBtn.textContent = `${this.speed}×`;
        if (this.audio) this.audio.playbackRate = this.speed;
      });
      if (this.muteBtn) {
        this.muteBtn.addEventListener('click', () => {
          this.muted = !this.muted;
          this.muteBtn.setAttribute('data-muted', String(this.muted));
          if (this.audio) {
            this.audio.muted = this.muted;
            if (!this.muted && this.playing) this.audio.play().catch(() => {});
          }
        });
      }
      if (this.fsBtn) {
        this.fsBtn.addEventListener('click', () => {
          if (!document.fullscreenElement) {
            this.fig.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });
      }
      fig.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'k') { e.preventDefault(); this.toggle(); }
        if (e.key === 'm') { e.preventDefault(); if (this.muteBtn) this.muteBtn.click(); }
        if (e.key === 'f') { e.preventDefault(); if (this.fsBtn) this.fsBtn.click(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.seek(this.ctx.t + 5, this.playing); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.seek(this.ctx.t - 5, this.playing); }
      });
    }

    /** Dry-run to measure duration and collect caption marks. */
    async init(at = 0) {
      await this.seek(Infinity, false, true);
      this.total = this.ctx.t;
      this.cues = this.ctx.marks;
      this.range.max = this.total;
      this.range.step = 0.01;
      if (this.marksEl) {
        this.marksEl.innerHTML = '';
        for (const m of this.ctx.marks) {
          const t = typeof m === 'number' ? m : m.t;
          if (t <= 0.01) continue;
          const d = document.createElement('i');
          d.style.left = `${(t / this.total) * 100}%`;
          this.marksEl.appendChild(d);
        }
      }
      this.endState = true;
      if (at !== null) await this.seek(at, false);
      this.ui();
    }

    seek(target, play, dry) {
      target = Math.max(0, Math.min(target, dry ? Infinity : this.total));
      this.gen++;
      if (this.ctx && this.ctx.active) { this.ctx.active.rej(CANCEL); this.ctx.active = null; }
      if (this.ctx) this.ctx.layer.remove();
      const ctx = new Ctx(this, this.gen, target);
      this.ctx = ctx;
      this.svg.insertBefore(ctx.layer, this.measure);
      this.playing = play;
      this.finished = false;
      this.captionEl.classList.remove('show');
      this._pendingCaption = '';

      if (!dry && this.audio) {
        try {
          this.audio.currentTime = Math.min(target, this.audio.duration || target);
          if (play && !this.muted) {
            this.audio.playbackRate = this.speed;
            this.audio.play().catch(() => {});
          } else {
            this.audio.pause();
          }
        } catch (e) {}
      }

      const p = Promise.resolve(this.build(ctx)).then(() => {
        if (ctx.alive()) {
          this.finished = true;
          this.playing = false;
          if (this.audio) this.audio.pause();
          this.flushCaption();
          this.ui();
        }
      }, (e) => { if (e !== CANCEL) console.error(e); });
      return p;
    }

    onSeekSettled() { this.flushCaption(); }

    setCaption(html, seeking) {
      this._pendingCaption = html;
      if (!seeking) this.flushCaption();
    }
    flushCaption() {
      const html = this._pendingCaption;
      if (html === this._shownCaption && this.captionEl.classList.contains('show')) return;
      this._shownCaption = html;
      this.captionEl.classList.remove('show');
      void this.captionEl.offsetWidth;
      this.captionEl.innerHTML = html || '';
      if (html) this.captionEl.classList.add('show');
    }

    toggle() {
      this.started = true;
      if (this.finished) { this.seek(0, true); this.ui(); return; }
      this.playing = !this.playing;
      if (this.audio) {
        if (this.playing) {
          try {
            this.audio.currentTime = Math.min(this.ctx.t, this.audio.duration || this.ctx.t);
            this.audio.playbackRate = this.speed;
            if (!this.muted) this.audio.play().catch(() => {});
          } catch (e) {}
        } else {
          this.audio.pause();
        }
      }
      this.ui();
    }
    autoplay() {
      if (this.started) return;
      this.started = true;
      this.seek(0, true);
      this.ui();
    }
    pause() {
      if (this.playing) {
        this.playing = false;
        if (this.audio) this.audio.pause();
        this.ui();
      }
    }

    tick(dt) {
      const ctx = this.ctx;
      if (!ctx || !this.playing || !ctx.active) return;
      ctx.t += dt * this.speed;
      if (this.audio && !this.audio.paused && this.audio.duration) {
        const drift = this.audio.currentTime - ctx.t;
        if (Math.abs(drift) > 0.4) {
          try { this.audio.currentTime = ctx.t; } catch (e) {}
        }
      }
      const a = ctx.active;
      const elapsed = ctx.t - a.start;
      if (elapsed >= a.dur) {
        a.step(a.dur);
        ctx.t = a.start + a.dur;
        ctx.active = null;
        a.res();
      } else a.step(elapsed);
    }

    ui() {
      const t = this.ctx ? this.ctx.t : 0;
      this.range.value = t;
      this.range.style.setProperty('--p', `${(t / this.total) * 100}%`);
      this.timeEl.textContent = `${fmtTime(t)} / ${fmtTime(this.total)}`;
      const state = this.finished ? 'replay' : this.playing ? 'pause' : 'play';
      this.btn.dataset.state = state;
      this.btn.setAttribute('aria-label', state);
      this.fig.classList.toggle('is-playing', this.playing);
    }
  }

  function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    for (const s of stages) {
      s.tick(dt);
      if (s.playing || s._dirty) s.ui();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.Anim = {
    C, Ease, FONTS, Stage, Ctx, Mob, el, lerp, clamp, lerpColor,
    create, uncreate, write: create, fadeIn, fadeOut, to, recolor, indicate, wiggle, along,
    counter, wait: waitAnim, call, lagged, succession, anim,
  };
})();
