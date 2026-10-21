/*
 * Reusable visual vocabulary for the scenes: keys, credentials, devices...
 * Copied from waau-anim-demo/site/js/kit.js, plus a few slide-only helpers
 * at the bottom (picker sheet, chips, capability cards, shatter).
 */
(function () {
  'use strict';
  const { C, fadeIn, fadeOut, along, create, to, anim, Ease } = Anim;

  const K = {};

  /** A key glyph, ~56px wide, centered. */
  K.key = (s, color = C.blue, o = {}) => {
    const sw = o.sw ?? 3.5;
    const bow = s.circle(11, { color, sw, fill: color, fo: 0.15 }).at(-15, 0);
    const hole = s.circle(3.2, { color, sw: 2, fill: color, fo: 1 }).at(-15, 0);
    const shaft = s.path('M -4 0 H 26 M 17 0 V 8 M 23 0 V 6', { color, sw });
    return s.g(bow, hole, shaft);
  };

  /** Credential card: key + "cred X" + algorithm. */
  K.card = (s, { id, alg, color, w = 176, h = 62, tag } = {}) => {
    const box = s.rect(w, h, { color, sw: 2.5, fill: color, fo: 0.1, rx: 12 });
    const key = K.key(s, color).at(-w / 2 + 34, 0).set({ s: 0.78 });
    const label = s.text([['cred ', { color: C.light }], [id, { color: C.white, italic: true }]],
      { size: 24, anchor: 'start' }).at(-w / 2 + 64, -10);
    const algT = s.text(alg, { size: 14, font: 'mono', color, anchor: 'start' }).at(-w / 2 + 65, 15);
    const m = s.g(box, key, label, algT);
    if (tag) {
      const t = s.text(tag, { size: 15, color: C.grey, anchor: 'end', italic: true }).at(w / 2 - 10, -h / 2 + 13);
      m.add(t); m.tagT = t;
    }
    m.box = box; m.keyM = key; m.label = label; m.algT = algT; m.id = id; m.w = w; m.h = h;
    return m;
  };

  K.cardA = (s, tag) => K.card(s, { id: 'A', alg: 'ECDSA P-256', color: C.blue, tag });
  K.cardB = (s, tag) => K.card(s, { id: 'B', alg: 'ML-DSA-44', color: C.yellow, tag });

  /** Rounded panel with a title. */
  K.panel = (s, w, h, title, o = {}) => {
    const box = s.rect(w, h, { color: o.color ?? C.dim, sw: 2, fill: C.dark, fo: 0.55, rx: 18 });
    const m = s.g(box);
    if (title) {
      const t = s.text(title, { size: o.size ?? 20, color: o.titleColor ?? C.light, anchor: 'start', italic: o.italic ?? false })
        .at(-w / 2 + 20, -h / 2 + 24);
      m.add(t); m.title = t;
    }
    m.box = box; m.w = w; m.h = h;
    return m;
  };

  K.phone = (s, label) => {
    const body = s.rect(112, 196, { color: C.light, sw: 3, rx: 22, fill: '#111317', fo: 1 });
    const screen = s.rect(94, 150, { color: C.dim, sw: 1.5, rx: 8 }).at(0, -4);
    const btn = s.circle(5, { color: C.dim, sw: 1.5 }).at(0, 86);
    const m = s.g(body, screen, btn);
    if (label) { const t = s.text(label, { size: 20, color: C.light }).at(0, 128); m.add(t); m.label = t; }
    return m;
  };

  K.secKey = (s, label, o = {}) => {
    const conn = s.rect(38, 34, { color: C.grey, sw: 2.5, rx: 4 }).at(0, -80);
    const body = s.rect(72, 130, { color: C.light, sw: 3, rx: 18, fill: '#111317', fo: 1 });
    const pad = s.circle(15, { color: o.pad ?? C.gold, sw: 2.5, fill: o.pad ?? C.gold, fo: 0.2 }).at(0, 22);
    const hole = s.circle(7, { color: C.dim, sw: 2 }).at(0, -40);
    const m = s.g(conn, body, pad, hole);
    if (label) { const t = s.text(label, { size: 20, color: C.light }).at(0, 96); m.add(t); m.label = t; }
    m.pad = pad;
    return m;
  };

  K.browser = (s, w = 220, h = 150, label = 'browser') => {
    const box = s.rect(w, h, { color: C.light, sw: 2.5, rx: 12, fill: '#111317', fo: 1 });
    const bar = s.line(-w / 2, -h / 2 + 26, w / 2, -h / 2 + 26, { color: C.dim, sw: 2 });
    const dots = [0, 1, 2].map((i) => s.circle(4, { color: [C.red, C.gold, C.green][i], sw: 1.5, fill: [C.red, C.gold, C.green][i], fo: 0.8 })
      .at(-w / 2 + 16 + i * 14, -h / 2 + 13));
    const m = s.g(box, bar, ...dots);
    if (w >= 200) {
      const url = s.rect(Math.min(150, w - 90), 14, { color: C.dim, sw: 1, fill: C.dim, fo: 0.35, rx: 7 }).at(18, -h / 2 + 13);
      m.add(url);
    }
    if (label) { const t = s.text(label, { size: 20, color: C.light }).at(0, h / 2 + 24); m.add(t); m.label = t; }
    m.w = w; m.h = h;
    return m;
  };

  K.server = (s, label, color = C.teal) => {
    const m = s.g();
    for (let i = 0; i < 3; i++) {
      const y = (i - 1) * 40;
      m.add(s.rect(130, 32, { color: C.light, sw: 2.5, rx: 6, fill: '#111317', fo: 1 }).at(0, y));
      m.add(s.circle(4.5, { color, sw: 1.5, fill: color, fo: 1 }).at(46, y));
      m.add(s.line(-48, y, -14, y, { color: C.dim, sw: 3 }));
    }
    if (label) { const t = s.text(label, { size: 22, color, font: 'mono' }).at(0, 84); m.add(t); m.label = t; }
    return m;
  };

  /** RP database row: "alice →  [card]". Returns group with .slot position. */
  K.db = (s, title = 'credential database', o = {}) => {
    const w = o.w ?? 300, h = o.h ?? 112;
    const box = s.rect(w, h, { color: C.dim, sw: 2, fill: C.dark, fo: 0.7, rx: 12 });
    const t = s.text(title, { size: 15, color: C.grey, anchor: 'start', italic: true }).at(-w / 2 + 14, -h / 2 + 16);
    const user = s.text('alice', { size: 22, color: C.white, font: 'mono', anchor: 'start' }).at(-w / 2 + 16, 12);
    const arr = s.path(`M ${-w / 2 + 90} 12 h 24`, { color: C.grey, sw: 2 });
    const m = s.g(box, t, user, arr);
    m.slotX = -w / 2 + 90 + 24 + 82; m.slotY = 12;
    return m;
  };

  /** A message pill with monospace text. */
  K.pill = (s, text, color = C.white, o = {}) => {
    const size = o.size ?? 16;
    const len = Array.isArray(text) ? text.reduce((n, t) => n + (Array.isArray(t) ? t[0] : t).length, 0) : text.length;
    const w = o.w ?? len * size * 0.62 + 28;
    const h = o.h ?? size * 2.1;
    const box = s.rect(w, h, { color, sw: 2, fill: color, fo: 0.13, rx: h / 2 });
    const t = s.text(text, { size, color, font: 'mono' });
    const m = s.g(box, t);
    m.w = w; m.h = h; m.box = box; m.t = t;
    return m;
  };

  K.check = (s, color = C.green, sz = 1) =>
    s.path(`M ${-14 * sz} ${0} L ${-4 * sz} ${10 * sz} L ${16 * sz} ${-12 * sz}`, { color, sw: 5 * Math.sqrt(sz) });
  K.cross = (s, color = C.red, sz = 1) =>
    s.path(`M ${-11 * sz} ${-11 * sz} L ${11 * sz} ${11 * sz} M ${11 * sz} ${-11 * sz} L ${-11 * sz} ${11 * sz}`, { color, sw: 5 * Math.sqrt(sz) });

  K.bolt = (s, color = C.red) =>
    s.poly([[6, -34], [-14, 4], [0, 4], [-8, 34], [16, -8], [2, -8], [12, -34]], { color, fill: color, fo: 0.25, sw: 2.5 });

  K.finger = (s, color = C.green) => {
    const d = [
      'M -14 6 C -14 -14 14 -14 14 6',
      'M -9 12 C -9 -6 9 -6 9 8 L 9 16',
      'M -4 18 C -4 0 4 0 4 10',
      'M -19 12 C -21 -22 21 -22 19 10',
      'M 0 4 L 0 22',
    ];
    return s.g(...d.map((p) => s.path(p, { color, sw: 2.5 })));
  };

  /** Signature seal: σ in a circle. */
  K.seal = (s, color = C.blue, label = 'σ') => {
    const c = s.circle(22, { color, sw: 2.5, fill: color, fo: 0.2 });
    const ring = s.circle(16, { color, sw: 1.2, dash: '3 3' });
    const t = s.text(label, { size: 24, italic: true, color });
    return s.g(c, ring, t);
  };

  /** A small cursor pointer. */
  K.cursor = (s) => s.poly([[0, 0], [0, 26], [7, 20], [12, 31], [17, 29], [12, 18], [21, 18]], { color: C.white, fill: C.white, fo: 0.9, sw: 1.5 });

  /** Invisible route through points, for `along`. */
  K.route = (s, pts, bend = 0) => {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
    const m = s.path(d, { stroke: 'none', nodraw: true });
    m.o = 0; m.apply();
    s.add(m);
    return m.pathEl;
  };

  /** Fade in a pill at pts[0], travel along pts, optionally fade out at end. */
  K.travel = async (s, m, pts, o = {}) => {
    m.at(pts[0][0], pts[0][1]);
    const r = K.route(s, pts);
    await s.play(fadeIn(m, { dur: o.fade ?? 0.35, scale: 0.6 }));
    await s.play(along(m, r, { dur: o.dur ?? 1.4 }));
    if (o.out) await s.play(fadeOut(m, { dur: 0.35, scale: 0.6 }));
  };

  /** Dashed channel line between two points. */
  K.channel = (s, x1, y1, x2, y2) => {
    const m = s.path(`M ${x1} ${y1} L ${x2} ${y2}`, { color: C.dim, sw: 2 });
    m.pathEl.setAttribute('stroke-dasharray', '6 8');
    m.pathEl.dataset.nodraw = 1;
    return m;
  };

  /** Instantly set the color of a mobject's color-following parts. */
  K.tint = (m, color) => {
    const all = [m.g, ...m.g.querySelectorAll('*')];
    for (const e of all) {
      if (e.dataset && e.dataset.cs) e.setAttribute('stroke', color);
      if (e.dataset && e.dataset.cf) e.setAttribute('fill', color);
    }
  };

  /** Radial burst of short lines (manim's Flash). */
  K.flash = (s, x, y, color = C.yellow, o = {}) => {
    const n = o.n ?? 10, r1 = o.r1 ?? 26, r2 = o.r2 ?? 52;
    const lines = [];
    const g = s.g().at(x, y);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const l = s.line(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, { color, sw: 3 });
      l.pathEl.dataset.nodraw = 1;
      lines.push(l);
      g.add(l);
    }
    return anim(o.dur ?? 0.7, () => { s.add(g); }, (a) => {
      for (const l of lines) {
        const L = r2 - r1;
        const head = Anim.clamp(a * 2) * L, tail = Anim.clamp(a * 2 - 1) * L;
        l.pathEl.setAttribute('stroke-dasharray', `0 ${tail} ${Math.max(0.01, head - tail)} 999`);
      }
    }, Ease.out, () => g.g.remove());
  };

  /** Draw a rectangle around a box (x,y,w,h centered) then fade it. */
  K.surround = (s, x, y, w, h, color = C.yellow) => {
    const r = s.rect(w, h, { color, sw: 3, rx: 12 }).at(x, y);
    return r;
  };

  /** Sine wave running vertically, centered at x=0. */
  K.wave = (s, color, y0 = 120, y1 = 660, amp = 14) => {
    let d = '';
    for (let y = y0; y <= y1; y += 6) d += `${d ? 'L' : 'M'} ${(Math.sin(y / 22) * amp).toFixed(1)} ${y} `;
    return s.path(d, { color, sw: 3.5 });
  };

  /* ------------------------------------------------------------------ */
  /* Slide-only helpers                                                  */
  /* ------------------------------------------------------------------ */

  /** Rounded chip with monospace text. */
  K.chip = (s, text, color = C.light, o = {}) => {
    const w = o.w ?? 250, h = o.h ?? 40;
    const box = s.rect(w, h, { color, sw: 1.8, fill: color, fo: o.fo ?? 0.08, rx: h / 2 });
    const t = s.text(text, { size: o.size ?? 16, font: 'mono', color });
    const m = s.g(box, t);
    m.box = box; m.t = t;
    return m;
  };

  /** Tiny icons for picker rows. */
  K.icons = {
    phone: (s) => s.g(s.rect(15, 24, { color: C.light, sw: 2, rx: 3 }), s.line(-3, 8, 3, 8, { color: C.light, sw: 1.5 })),
    key: (s) => K.key(s, C.gold, { sw: 3 }).set({ s: 0.55, r: -30 }),
    laptop: (s) => s.g(s.rect(24, 15, { color: C.light, sw: 2, rx: 2 }).at(0, -3), s.line(-15, 8, 15, 8, { color: C.light, sw: 2 })),
  };

  /**
   * Platform authenticator picker sheet ("Choose where to save your passkey").
   * Returns the group with .rows (one per option) for highlighting.
   */
  K.picker = (s, options, o = {}) => {
    const w = o.w ?? 320, rowH = 50;
    const h = 64 + options.length * rowH + 14;
    const box = s.rect(w, h, { color: C.light, sw: 2.5, fill: '#15181e', fo: 1, rx: 16 });
    const title = s.text(o.title ?? 'Choose where to save', { size: 18, color: C.white, anchor: 'start', font: 'sans' })
      .at(-w / 2 + 20, -h / 2 + 28);
    const m = s.g(box, title);
    m.rows = options.map(([icon, label], i) => {
      const y = -h / 2 + 64 + i * rowH + rowH / 2 - 4;
      const bg = s.rect(w - 28, rowH - 8, { color: C.dim, sw: 1.5, fill: C.dim, fo: 0.18, rx: 10 });
      const ic = (typeof icon === 'function' ? icon(s) : s.text(icon, { size: 20, color: C.light })).at(-w / 2 + 44, 0);
      const lb = s.text(label, { size: 17, color: C.light, anchor: 'start', font: 'sans' }).at(-w / 2 + 70, 0);
      const row = s.g(bg, ic, lb).at(0, y);
      row.bg = bg;
      m.add(row);
      return row;
    });
    m.w = w; m.h = h;
    return m;
  };

  /** Big capability card: number, title, subtitle and an extension name. */
  K.capCard = (s, { n, title, sub, ext, color, w = 470, h = 300 }) => {
    const box = s.rect(w, h, { color, sw: 3, fill: color, fo: 0.07, rx: 22 });
    const num = s.text(n, { size: 40, color }).at(-w / 2 + 44, -h / 2 + 46);
    const t = s.text(title, { size: 32, color: C.white, anchor: 'start' }).at(-w / 2 + 80, -h / 2 + 46);
    const sb = s.lines(sub.map((l) => [[l, { color: C.light }]]), { size: 19, lh: 28 }).at(-w / 2 + 34, -h / 2 + 104);
    const ex = K.chip(s, ext, color, { w: 260, size: 18 }).at(0, h / 2 - 44);
    const m = s.g(box, num, t, sb, ex);
    m.box = box; m.ext = ex; m.w = w; m.h = h;
    return m;
  };

  /**
   * Shatter a mobject: hide it and send `n` small fragments flying from its
   * position, falling and fading. Returns an animation.
   */
  K.shatter = (s, m, color = C.red, o = {}) => {
    const n = o.n ?? 9;
    const frags = [];
    const g = s.g();
    let x0 = 0, y0 = 0;
    for (let i = 0; i < n; i++) {
      const sz = 8 + ((i * 37) % 11);
      const f = s.poly([[-sz / 2, -sz / 3], [sz / 2, -sz / 2], [sz / 3, sz / 2], [-sz / 2, sz / 3]], { color, fill: color, fo: 0.35, sw: 1.8 });
      const ang = (i / n) * Math.PI * 2 + 0.4;
      f.vx = Math.cos(ang) * (70 + ((i * 53) % 60));
      f.vy = Math.sin(ang) * 60 - 40;
      f.vr = ((i % 2) ? 1 : -1) * (120 + i * 25);
      frags.push(f);
      g.add(f);
    }
    return anim(o.dur ?? 1.2, () => {
      const p = m.gpos();
      x0 = p.x; y0 = p.y;
      m.o = 0; m.apply();
      s.add(g);
    }, (a) => {
      for (const f of frags) {
        f.x = x0 + f.vx * a;
        f.y = y0 + f.vy * a + 260 * a * a;
        f.r = f.vr * a;
        f.o = 1 - Anim.clamp((a - 0.45) / 0.55);
        f.apply();
      }
    }, Ease.out, () => g.g.remove());
  };

  window.K = K;
})();
