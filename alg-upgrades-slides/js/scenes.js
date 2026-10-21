/*
 * Stepped scene scripts for the slides. Canvas: 1280×720.
 *
 * Most scenes are ported from waau-anim-demo/site/js/scenes.js: audio sync
 * calls are gone, and each narration line became `await s.step(notes)`, a
 * pause point whose notes describe the segment that follows. Anything before
 * the first step() plays automatically when the slide is entered; its notes
 * are set with s.notes().
 */
(function () {
  'use strict';
  const { C, create, uncreate, write, fadeIn, fadeOut, to, recolor, indicate, wiggle, along, lagged, succession,
    call, anim, Ease, lerp, lerpColor, clamp } = Anim;

  const SC = {};

  /* ---------------- shared helpers ---------------- */

  function rng(seed) {
    let x = seed >>> 0;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
  }

  const swap = (a, b) => [fadeOut(a, { scale: 0.6, dur: 0.6 }), fadeIn(b, { scale: 1.4, dur: 0.8 })];

  /** Mini card for databases. */
  const mini = (s, which, x, y, sc = 0.72) => (which === 'A' ? K.cardA(s) : K.cardB(s)).at(x, y).set({ s: sc });

  /** Standard authenticator-with-list layout used by several scenes. */
  function authList(s, o = {}) {
    const cx = o.cx ?? 425, cy = o.cy ?? 390;
    const panel = K.panel(s, o.w ?? 710, o.h ?? 300, o.title ?? 'authenticator').at(cx, cy);
    const chip = s.g(
      s.rect(214, 58, { color: C.grey, sw: 2, fill: C.dark, fo: 1, rx: 10 }),
      s.text([['{ ', { color: C.grey }], ['alice', { color: C.white }], [', ', { color: C.grey }], ['shrine.com', { color: C.teal }], [' }', { color: C.grey }]],
        { size: 16, font: 'mono' }),
    ).at(cx - 225, cy + 10);
    const arr = s.arrow(cx - 112, cy + 10, cx - 72, cy + 10, { color: C.grey, sw: 2.5, head: 11 });
    return { panel, chip, arr, cx, cy, y: cy + 10, xs: [cx + 40, cx + 230], slotX: cx + 135 };
  }

  function dashedRect(s, w, h, color = C.dim) {
    const m = s.rect(w, h, { color, sw: 2, rx: 14 });
    m.g.querySelector('rect').setAttribute('stroke-dasharray', '7 7');
    m.g.querySelector('rect').dataset.nodraw = 1;
    return m;
  }

  /** Send a pill most of the way, then lose it to a lightning bolt. */
  async function lose(s, pill, p0, p1) {
    const mid = [p0[0] + (p1[0] - p0[0]) * 0.55, p0[1] + (p1[1] - p0[1]) * 0.55];
    await K.travel(s, pill, [p0, mid], { dur: 1.1 });
    const bolt = K.bolt(s).at(mid[0], mid[1] - 46);
    await s.play(create(bolt, { dur: 0.4 }), K.flash(s, mid[0], mid[1] - 46, C.red), recolor(pill, C.red, { dur: 0.4 }));
    await s.play(to(pill, { y: mid[1] + 140, r: 40, o: 0 }, { dur: 1, ease: Ease.in }), fadeOut(bolt, { dur: 1 }));
    pill.g.remove();
  }

  /** A scanning highlight box that walks over candidate cards. */
  const scanBox = (s, x, y) => s.rect(196, 82, { color: C.yellow, sw: 3, rx: 15 }).at(x, y);

  /* ================================================================== */
  /* 2. threat                                                          */
  /* ================================================================== */
  SC.threat = async (s) => {
    const r = rng(7);
    const title = s.text([['ECDSA', { color: C.blue }], ['   ·   ', { color: C.dim }], ['EdDSA', { color: C.blue }], ['   ·   ', { color: C.dim }], ['RSA', { color: C.blue }]],
      { size: 36 }).at(640, 92);
    const keys = [];
    const cols = 12, rows = 5;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = 200 + i * 80 + (j % 2 ? 20 : -20), y = 200 + j * 78;
        const k = K.key(s, C.blue).at(x, y).set({ s: 0.85, r: -30 + (r() - 0.5) * 16 });
        k.x0 = x; k.y0 = y; k.r0 = k.r; k.dir = r() < 0.5 ? -1 : 1;
        keys.push(k);
      }
    }
    s.notes('Every passkey and security key credential today signs with <b>classical</b> cryptography. Billions of them.');
    await s.play(write(title, { dur: 1.4 }), lagged(keys.map((k) => fadeIn(k, { scale: 0.3, dur: 0.6 })), { dur: 2.6 }));

    await s.step('A large enough quantum computer breaks the math underneath. Every one of these signatures becomes <b>forgeable</b>.');
    const q = s.text('|ψ⟩', { size: 84, color: C.red }).at(1185, 360);
    await s.play(write(q, { dur: 1 }));
    const wave = K.wave(s, C.red, 150, 600).at(1150, 0);
    await s.play(create(wave, { dur: 0.6 }));
    const breakAt = (k, wx) => clamp((k.x0 - wx) / 110);
    const applyBreak = (k, d) => {
      K.tint(k, lerpColor(C.blue, C.red, d));
      k.y = k.y0 + 22 * Ease.smooth(d); k.r = k.r0 + 28 * d * k.dir; k.o = 1 - 0.62 * d; k.apply();
    };
    await s.play(anim(3.2, null, (a) => {
      wave.x = 1150 - a * 1100; wave.apply();
      for (const k of keys) applyBreak(k, breakAt(k, wave.x));
    }, Ease.linear));
    await s.play(fadeOut(wave, { dur: 0.5 }));

    await s.step('Now rewind. Suppose every credential first moved to a <b>post-quantum</b> algorithm like ML-DSA…');
    await s.play(anim(1.2, null, (a) => { for (const k of keys) applyBreak(k, 1 - a); }), fadeOut(q, { dur: 0.8 }));
    const title2 = s.text('ML-DSA-44', { size: 36, color: C.yellow }).at(640, 92);
    const sorted = [...keys].sort((a, b) => a.x0 - b.x0);
    await s.play(fadeOut(title, { dy: -20 }), fadeIn(title2, { dy: 20 }),
      lagged(sorted.map((k) => recolor(k, C.yellow, { dur: 0.5 })), { dur: 2.2 }));
    const q2 = s.text('|ψ⟩', { size: 84, color: C.red }).at(1185, 360);
    const wave2 = K.wave(s, C.red, 150, 600).at(1150, 0);
    await s.play(fadeIn(q2), create(wave2, { dur: 0.6 }));
    await s.play(anim(3, null, (a) => {
      wave2.x = 1150 - a * 1100; wave2.apply();
      for (const k of keys) {
        const d = (k.x0 - wave2.x) / 70;
        const bump = d > 0 && d < 1 ? Math.sin(d * Math.PI) : 0;
        k.y = k.y0 - 10 * bump; k.apply();
      }
      wave2.o = 1 - a * 0.7; wave2.apply();
    }, Ease.linear));
    await s.play(fadeOut(wave2), fadeOut(q2));

    await s.step('…then the same attack finds nothing to break. The hard part is the <b>move</b>: changing the key inside a credential people <em>already have</em>, without re-registering.');
    await s.play(lagged(keys.map((k) => fadeOut(k, { scale: 0.4, dur: 0.4 })), { dur: 1.4 }), fadeOut(title2));
    const a = K.cardA(s).at(380, 360).set({ s: 1.4 });
    const b = K.cardB(s).at(900, 360).set({ s: 1.4 });
    const arr = s.arrow(530, 360, 750, 360, { color: C.light, sw: 3 });
    const qm = s.text('?', { size: 52, color: C.light }).at(640, 305);
    await s.play(create(a));
    await s.play(create(arr, { dur: 0.7 }), write(qm, { dur: 0.7 }));
    await s.play(create(b));
  };

  /* ================================================================== */
  /* 4a. naive upgrade: the wrong authenticator                         */
  /* ================================================================== */
  SC.naiveWrongAuth = async (s) => {
    s.offset(0, -60);
    const phone = K.phone(s, 'phone').at(190, 262);
    const keyA = K.key(s, C.blue).at(190, 230).set({ s: 1.1, r: -30 });
    const aLbl = s.text('A', { size: 26, italic: true, color: C.blue }).at(190, 290);
    const sk = K.secKey(s, 'security key').at(190, 570);
    const br = K.browser(s, 240, 160, 'browser').at(640, 360);
    const sv = K.server(s, 'shrine.com').at(1090, 340);
    const ch1 = K.channel(s, 260, 262, 515, 345);
    const ch2 = K.channel(s, 240, 560, 515, 380);
    const ch3 = K.channel(s, 765, 360, 1018, 345);
    const prompts = s.text([['user prompts: ', { color: C.grey }], ['0', { color: C.white }]], { size: 18, font: 'mono' }).at(640, 230);
    const setPrompts = (n, color) => {
      const spans = prompts.textEl.querySelectorAll('tspan');
      spans[spans.length - 1].textContent = String(n);
      if (color) spans[spans.length - 1].setAttribute('fill', color);
    };

    s.notes('Without new APIs: alice has passkey <b>A</b> (ECDSA) on her phone. She also owns a security key.');
    await s.play(lagged([fadeIn(phone), fadeIn(sk), fadeIn(br), fadeIn(sv), fadeIn(ch1), fadeIn(ch2), fadeIn(ch3)], { dur: 1.6 }));
    await s.play(create(keyA), write(aLbl), fadeIn(prompts));

    await s.step('The RP signs alice in with an ordinary <code>get()</code>. One prompt, assertion signed by A.');
    const p1 = K.pill(s, 'get()', C.teal);
    await K.travel(s, p1, [[1018, 345], [640, 360], [262, 262]], { out: true, dur: 1.4 });
    const fing = K.finger(s, C.green).at(190, 330).set({ s: 0.9 });
    await s.play(create(fing, { dur: 0.6 }), call(() => setPrompts(1)), indicate(prompts, { color: C.white }));
    await s.play(fadeOut(fing, { dur: 0.3 }));
    const p2 = K.pill(s, 'assertion · A', C.blue);
    await K.travel(s, p2, [[262, 262], [640, 360], [1018, 345]], { out: true, dur: 1.4 });
    const ok = K.check(s).at(1090, 236);
    await s.play(create(ok, { dur: 0.5 }));

    await s.step('Then it calls <code>create()</code> for an ML-DSA credential.');
    await s.play(fadeOut(ok, { dur: 0.3 }));
    const p3 = K.pill(s, 'create()', C.yellow);
    await K.travel(s, p3, [[1018, 345], [640, 360]], { out: true, dur: 1 });

    await s.step('That is a <b>second</b> prompt: the platform asks <b>where</b> to save the new passkey. Nothing ties this choice to A.');
    const picker = K.picker(s, [[K.icons.phone, 'This phone'], [K.icons.key, 'Security key'], [K.icons.laptop, 'Another device']],
      { title: 'Save a passkey for shrine.com?' }).at(640, 390);
    await s.play(fadeIn(picker, { scale: 0.85, dur: 0.6 }));
    await s.play(call(() => setPrompts(2, C.red)), indicate(prompts, { color: C.red, scale: 1.25 }));

    await s.step('alice picks her <b>security key</b>, so B is created there, not on the phone that holds A.');
    const cur = K.cursor(s).at(760, 560);
    await s.play(fadeIn(cur, { dur: 0.4 }));
    const row = picker.rows[1];
    await s.play(to(cur, { x: 700, y: 396 }, { dur: 1 }));
    await s.play(indicate(row, { color: C.gold, scale: 1.05 }));
    await s.play(recolor(row, C.gold, { dur: 0.4 }));

    await s.play(fadeOut(picker, { scale: 0.9, dur: 0.5 }), fadeOut(cur, { dur: 0.4 }));
    const p4 = K.pill(s, 'create()', C.yellow);
    await K.travel(s, p4, [[640, 360], [240, 560]], { out: true, dur: 1 });
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }));
    const keyB = K.key(s, C.yellow).at(320, 560).set({ s: 1.1, r: -30 });
    const bLbl = s.text('B', { size: 26, italic: true, color: C.yellow }).at(320, 612);
    await s.play(create(keyB), write(bLbl), K.flash(s, 320, 560, C.yellow));
    const p5 = K.pill(s, 'new credential · B', C.yellow);
    await K.travel(s, p5, [[240, 560], [640, 360], [1018, 345]], { out: true, dur: 1.4 });
  };

  /* ================================================================== */
  /* 4b. naive upgrade: the credential never reaches the server         */
  /* ================================================================== */
  SC.naiveLost = async (s) => {
    const L = authList(s);
    const slot1 = dashedRect(s, 200, 86).at(L.xs[0], L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const db = K.db(s).at(1080, 480);
    const dbA = mini(s, 'A', 1080 + db.slotX, 480 + db.slotY);

    /* ---- continuity: start from slide 3's final frame (it is drawn with a
     * -60 vertical offset, so everything here is shifted by hand) ---- */
    const Y = -60;
    const body = s.rect(112, 196, { color: C.light, sw: 3, rx: 22, fill: '#111317', fo: 1 }).at(190, 262 + Y);
    const screen = s.rect(94, 150, { color: C.dim, sw: 1.5, rx: 8 }).at(190, 258 + Y);
    const btn = s.circle(5, { color: C.dim, sw: 1.5 }).at(190, 348 + Y);
    const phoneLbl = s.text('phone', { size: 20, color: C.light }).at(190, 390 + Y);
    const keyA = K.key(s, C.blue).at(190, 230 + Y).set({ s: 1.1, r: -30 });
    const aLbl = s.text('A', { size: 26, italic: true, color: C.blue }).at(190, 290 + Y);
    const sk = K.secKey(s, 'security key').at(190, 570 + Y);
    const keyB = K.key(s, C.yellow).at(320, 560 + Y).set({ s: 1.1, r: -30 });
    const bLbl = s.text('B', { size: 26, italic: true, color: C.yellow }).at(320, 612 + Y);
    const br = K.browser(s, 240, 160, 'browser').at(640, 360 + Y);
    const sv = K.server(s, 'shrine.com').at(1090, 340 + Y);
    const chs = [
      K.channel(s, 260, 262 + Y, 515, 345 + Y),
      K.channel(s, 240, 560 + Y, 515, 380 + Y),
      K.channel(s, 765, 360 + Y, 1018, 345 + Y),
    ];
    const prompts = s.text([['user prompts: ', { color: C.grey }], ['2', { color: C.red }]], { size: 18, font: 'mono' }).at(640, 230 + Y);
    const extras = [screen, btn, phoneLbl, aLbl, sk, keyB, bLbl, br, prompts, ...chs];
    s.add(body, ...extras, keyA, sv);

    s.notes('Even on the right authenticator there is a second problem. Today an authenticator stores <b>one</b> credential per <code>{ user id, RP ID }</code>.');
    // a) everything but the phone, its key and the server goes away
    await s.play(...extras.map((m) => fadeOut(m, { dur: 0.6 })));
    // b) the phone expands into the authenticator box; c) the server moves
    const r = body.g.querySelector('rect');
    const from = { x: body.x, y: body.y, w: 112, h: 196, rx: 22, sw: 3, fo: 1 };
    const goal = { x: L.cx, y: L.cy, w: 710, h: 300, rx: 18, sw: 2, fo: 0.55 };
    const morph = anim(1.3, null, (a) => {
      const w = lerp(from.w, goal.w, a), h = lerp(from.h, goal.h, a);
      r.setAttribute('x', (-w / 2).toFixed(2)); r.setAttribute('y', (-h / 2).toFixed(2));
      r.setAttribute('width', w.toFixed(2)); r.setAttribute('height', h.toFixed(2));
      r.setAttribute('rx', lerp(from.rx, goal.rx, a).toFixed(2));
      r.setAttribute('stroke-width', lerp(from.sw, goal.sw, a).toFixed(2));
      r.setAttribute('stroke', lerpColor(C.light, C.dim, a));
      r.setAttribute('fill', lerpColor('#111317', C.dark, a));
      r.setAttribute('fill-opacity', lerp(from.fo, goal.fo, a).toFixed(3));
      body.x = lerp(from.x, goal.x, a); body.y = lerp(from.y, goal.y, a); body.apply();
    });
    await s.play(morph,
      to(sv, { x: 1080, y: 240 }, { dur: 1.3 }),
      to(keyA, { x: A.x - A.w / 2 + 34, y: L.y, s: 0.78, r: 0 }, { dur: 1.3 }));
    // Swap the morphed outline for the real panel (identical geometry).
    L.panel.title.o = 0; L.panel.title.apply();
    await s.play(call(() => { body.g.remove(); s.add(L.panel); }));
    await s.play(fadeIn(L.panel.title, { dur: 0.5 }), fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot1),
      fadeIn(A, { dur: 0.6 }), fadeOut(keyA, { dur: 0.6 }), fadeIn(db), fadeIn(dbA));

    await s.step('shrine.com calls <code>create()</code> for an ML-DSA credential. It <b>overwrites</b> A, since there is one slot per user + RP.');
    const cr = K.pill(s, 'create()', C.yellow);
    await K.travel(s, cr, [[1010, 240], [L.xs[0], 130]], { dur: 1.3 });
    const B = K.cardB(s, 't₂').at(L.xs[0], 130);
    await s.play(fadeOut(cr, { scale: 0.6, dur: 0.4 }), fadeIn(B, { scale: 0.6, dur: 0.6 }));
    await s.play(to(B, { y: L.y }, { dur: 0.9, ease: Ease.back }),
      succession([Anim.wait(0.35), to(A, { y: L.y + 230, r: 24, o: 0 }, { dur: 0.9, ease: Ease.in })]),
      recolor(A, C.red, { dur: 0.6 }));
    A.g.remove();

    await s.step('The response carrying B heads to the server… and the connection drops. B is gone in transit.');
    const pb = mini(s, 'B', 0, 0, 0.55);
    const p0 = [790, L.y], mid = [905, 342];
    await K.travel(s, pb, [p0, mid], { dur: 1.3 });

    const bolt = K.bolt(s).at(mid[0], mid[1] - 52);
    await s.play(create(bolt, { dur: 0.4 }), K.flash(s, mid[0], mid[1] - 52, C.red), recolor(pb, C.red, { dur: 0.4 }));
    const lost = s.text('connection lost', { size: 18, italic: true, color: C.red }).at(mid[0], mid[1] - 105);
    await s.play(K.shatter(s, pb, C.red), fadeOut(bolt, { dur: 1 }), write(lost, { dur: 0.6 }));

    await s.step('Next sign-in: the authenticator only has <b>B</b>, the server only accepts <b>A</b>. alice is <b>locked out</b>.');
    await s.play(fadeOut(lost));
    const mm = s.path(`M ${L.xs[0] + 100} ${L.y} C 840 ${L.y + 40}, 900 ${L.y + 60}, ${1080 + db.slotX - 64} ${480 + db.slotY}`, { color: C.red, sw: 2.5 });
    mm.pathEl.setAttribute('stroke-dasharray', '8 8'); mm.pathEl.dataset.nodraw = 1;
    const nm = s.text('✗', { size: 48, color: C.red }).at(856, 449);
    await s.play(fadeIn(mm), indicate(B, { color: C.red, scale: 1.08 }), indicate(dbA, { color: C.red, scale: 1.12 }), write(nm));
    await s.play(wiggle(nm, { angle: 2 }));
  };

  /* ================================================================== */
  /* 5. two capabilities                                                */
  /* ================================================================== */
  SC.capabilities = async (s) => {
    // Deliberately calm: cards and arrow just fade in, one per press.
    const calm = (m) => fadeIn(m, { dy: 12, dur: 0.6 });

    await s.step('① <b>Restore credentials</b>: keep a list per user + RP instead of one slot, and report backups with <code>restoreCredentials</code>.');
    const c1 = K.capCard(s, {
      n: '①', title: 'Restore credentials', color: C.blue,
      sub: ['Keep a list of credentials per', '{ user id, RP ID } instead of one', 'slot, so lost upgrades are', 'recoverable.'],
      ext: 'restoreCredentials',
    }).at(340, 360);
    await s.play(calm(c1));

    await s.step('② <b>Algorithm upgrade</b>: mint a new credential inside an ordinary <code>get()</code>, signed by the old one, with <code>algUpgrade</code>.');
    const c2 = K.capCard(s, {
      n: '②', title: 'Algorithm upgrade', color: C.yellow,
      sub: ['Mint a new credential inside an', 'ordinary get(), signed by the', 'existing one.'],
      ext: 'algUpgrade',
    }).at(940, 360);
    await s.play(calm(c2));
  };

  /* ================================================================== */
  /* 6. one slot → a list                                               */
  /* ================================================================== */
  SC.stack = async (s) => {
    const L = authList(s);
    const slot1 = dashedRect(s, 200, 86).at(L.xs[0], L.y);
    const Bold = K.cardB(s, 't₂').at(L.xs[0], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 240);
    const db = K.db(s).at(1080, 480);
    let dbA = mini(s, 'A', 1080 + db.slotX, 480 + db.slotY);
    const nm = s.text('✗  no match', { size: 26, color: C.red }).at(880, 640);

    s.notes('Recap: with one slot, a lost response leaves B on the authenticator and A on the server.');
    await s.play(lagged([create(L.panel, { dur: 0.8 }), fadeIn(sv), fadeIn(db), fadeIn(L.chip), fadeIn(L.arr), fadeIn(slot1), fadeIn(dbA), fadeIn(Bold)], { dur: 1.4 }));
    await s.play(write(nm, { dur: 0.7 }), indicate(Bold, { color: C.red, scale: 1.06 }));

    await s.step('The proposal: map each <code>{ user id, RP ID }</code> to a <b>list</b> of credentials, ordered by creation time.');
    await s.play(fadeOut(nm), fadeOut(Bold, { scale: 0.8 }), fadeOut(slot1));
    const slot2 = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const order = s.text('oldest  ⟶  newest', { size: 16, italic: true, color: C.grey }).at(L.slotX, L.y - 74);
    const A2 = K.cardA(s, 't₁').at(L.xs[0], L.y);
    await s.play(fadeIn(slot2, { scale: 0.9 }), fadeIn(A2), fadeIn(order));

    await s.step('Creating a new credential <b>appends</b> B next to A instead of replacing it.');
    const B2 = K.cardB(s, 't₂').at(L.xs[1], L.y);
    await s.play(fadeIn(B2, { dx: 60 }));

    await s.step('If B reaches the server, the server now knows B.');
    const pb2 = mini(s, 'B', 0, 0, 0.55);
    await K.travel(s, pb2, [[790, L.y], [1010, 300]], { out: true, dur: 1.2 });
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));

    await s.step('If it doesn\'t, <b>A</b> is still there to fall back on.');
    const bk = s.text('backup', { size: 17, italic: true, color: C.grey }).at(L.xs[0], L.y + 62);
    await s.play(indicate(A2, { color: C.white, scale: 1.08 }), fadeIn(bk, { dy: -10 }));

    await s.step('Requests with an <b>empty</b> allow-list (usernameless sign-in) always use the <b>newest</b> credential.');
    const req = K.pill(s, 'allowCredentials: [ ]', C.teal);
    await K.travel(s, req, [[1010, 300], [L.xs[1], 150]], { dur: 1.2 });
    const box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.6 }), fadeOut(req));
    await s.play(indicate(B2, { color: C.yellow }));
    const resp = K.pill(s, 'assertion · B', C.yellow);
    await K.travel(s, resp, [[790, L.y], [1010, 300]], { out: true, dur: 1.1 });
    const ok = K.check(s).at(1080, 130);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbB, { color: C.green, scale: 1.12 }));
  };

  /* ================================================================== */
  /* 7. cleanup                                                         */
  /* ================================================================== */
  SC.cleanup = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    let B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 230);
    const reqAt = [L.slotX, 160];

    s.notes('alice\'s authenticator holds <b>A</b> and a newer <b>B</b>.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B));

    /* ---- round 1: allow-list [A] ---- */
    await s.step('An <b>allow-list</b> request arrives. The authenticator looks for the <b>newest</b> credential that matches…');
    let req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    let box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    const m1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(m1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    let m2 = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
    await s.play(create(m2, { dur: 0.4 }));

    await s.step('…uses it, and <b>erases every other credential</b> for that user and RP.');
    await s.play(recolor(B, C.red, { dur: 0.5 }));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(m1));
    const r1 = K.pill(s, 'assertion · A', C.blue);
    await s.play(fadeOut(req), fadeOut(box), fadeOut(m2));
    await K.travel(s, r1, [[790, L.y], [1010, 250]], { out: true, dur: 1.1 });

    /* ---- round 2: allow-list [B] ---- */
    await s.step('If the server knows <b>B</b> instead, the same rule cleans up the backup <b>A</b>.');
    B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    await s.play(fadeIn(B, { dy: -30 }));
    req = K.pill(s, [['allowCredentials: [ ', {}], ['B', { color: C.yellow }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    m2 = K.check(s, C.green, 0.9).at(L.xs[1], L.y - 66);
    await s.play(create(m2, { dur: 0.4 }));
    await s.play(recolor(A, C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }));
    await s.play(to(B, { x: L.xs[0] }), to(box, { x: L.xs[0] }), to(m2, { x: L.xs[0] }));
    await s.play(fadeOut(req), fadeOut(box), fadeOut(m2));
    const note = s.text('authenticators may also clean up old credentials to make space', { size: 19, italic: true, color: C.grey }).at(L.cx, 600);
    await s.play(fadeIn(note, { dy: -10 }));
  };

  /* ================================================================== */
  /* 8. restoreCredentials                                              */
  /* ================================================================== */
  SC.restore = async (s) => {
    const L = authList(s, { cy: 470 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 260);

    s.notes('A new assertion extension, <code>restoreCredentials</code>, tells the RP which backups still exist.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B));

    await s.step('The input is a boolean. The <b>signed</b> output lists the credential IDs that are currently backed up.');
    const kw = { color: C.blue }, tx = { color: C.light }, ty = { color: C.yellow };
    const code = s.lines([
      [['partial dictionary ', kw], ['AuthenticationExtensionsClientInputs {', tx]],
      [['  boolean ', kw], ['restoreCredentials', ty], [';', tx]],
      [['};', tx]],
      [['dictionary ', kw], ['RestoreCredentialsOutput {', tx]],
      [['  sequence<ArrayBuffer> ', kw], ['existingCredentials', ty], [';', tx]],
      [['};', tx]],
    ], { size: 17, font: 'mono', lh: 27 }).at(70, 70);
    await s.play(write(code, { dur: 2.2 }));

    await s.step('An empty allow-list request asks for <code>restoreCredentials</code>…');
    const req = K.pill(s, 'allowCredentials: [ ]  ·  restoreCredentials: true', C.teal, { size: 15 });
    await K.travel(s, req, [[1010, 280], [L.slotX - 30, 360]], { dur: 1.2 });
    const box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }), fadeOut(req));

    await s.step('…the response is an assertion signed by <b>B</b>, plus <code>existingCredentials: [A]</code>, inside the signed authenticator data.');
    const out = K.panel(s, 410, 170, 'response', { size: 16, italic: true }).at(1035, 560);
    const resp = s.lines([
      [['assertion', { color: C.white }], ['   signed by ', { color: C.grey }], ['B', { color: C.yellow }]],
      [['restoreCredentials: {', { color: C.light }]],
      [['  existingCredentials: [ ', { color: C.light }], ['A', { color: C.blue }], [' ]', { color: C.light }]],
      [['}', { color: C.light }]],
    ], { size: 16, font: 'mono', lh: 26 }).at(850, 528);
    await s.play(fadeIn(out));
    await s.play(write(resp, { dur: 1.6 }));
    const hl = s.rect(300, 30, { color: C.yellow, sw: 2, rx: 8 }).at(1003, 580);
    await s.play(create(hl, { dur: 0.6 }), indicate(A, { color: C.white, scale: 1.08 }));
  };

  /* ================================================================== */
  /* 10. upgrade                                                        */
  /* ================================================================== */
  SC.upgrade = async (s) => {
    const panel = K.panel(s, 300, 330, 'authenticator').at(200, 450);
    const A = K.cardA(s).at(200, 385);
    const br = K.browser(s, 220, 140, 'browser').at(640, 455);
    const sv = K.server(s, 'shrine.com').at(1090, 380);
    const db = K.db(s).at(1090, 590);
    const dbA = mini(s, 'A', 1090 + db.slotX, 590 + db.slotY);
    const ch1 = K.channel(s, 350, 455, 528, 455);
    const ch2 = K.channel(s, 752, 455, 1022, 410);

    s.notes('alice has credential <b>A</b> (ECDSA). shrine.com wants to move her to ML-DSA.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(br), fadeIn(sv), fadeIn(db), fadeIn(ch1), fadeIn(ch2)], { dur: 1.5 }));
    await s.play(create(A), fadeIn(dbA));

    const code = s.lines([
      [['navigator.credentials.get({ publicKey: { …, extensions: {', { color: C.light }]],
      [['  algUpgrade', { color: C.yellow }], [': { pubKeyCredParams: [', { color: C.light }]],
      [['    { alg: ', { color: C.light }], ['-48', { color: C.gold }], [' },  ', { color: C.light }], ['// ML-DSA-44', { color: C.grey }]],
      [['    { alg: ', { color: C.light }], ['-7', { color: C.gold }], [' },   ', { color: C.light }], ['// ECDSA', { color: C.grey }]],
      [['  ] } } } });', { color: C.light }]],
    ], { size: 18, font: 'mono', lh: 28 }).at(330, 60);
    await s.step('It adds <code>algUpgrade</code> to an <em>ordinary</em> sign-in, listing the algorithms it accepts, most preferred first.');
    await s.play(write(code, { dur: 2.4 }));
    await s.play(indicate(code.rows[2], { color: C.yellow, scale: 1.04 }));
    const req = K.pill(s, 'get() + algUpgrade', C.teal);
    await K.travel(s, req, [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.8 });

    await s.step('The authenticator picks the first algorithm it supports, ML-DSA-44, and has no ML-DSA credential for alice yet…');
    const c1 = s.text([['ML-DSA-44 supported ', { color: C.light }], ['✓', { color: C.green }]], { size: 15, font: 'mono' }).at(200, 520);
    const c2 = s.text([['ML-DSA cred exists? ', { color: C.light }], ['no', { color: C.red }]], { size: 15, font: 'mono' }).at(200, 552);
    await s.play(write(c1, { dur: 0.9 }));
    await s.play(write(c2, { dur: 0.9 }));

    await s.step('…so it mints a new credential, <b>B</b>.');
    const B = K.cardB(s).at(200, 470);
    await s.play(fadeOut(c1), fadeOut(c2));
    await s.play(create(B));
    await s.play(indicate(B, { color: C.white, scale: 1.08 }));

    await s.step('alice verifies once, the same as any other sign-in.');
    const fing = K.finger(s, C.green).at(200, 560);
    await s.play(create(fing, { dur: 0.7 }));
    await s.play(indicate(fing, { color: C.green, scale: 1.3 }));
    await s.play(fadeOut(fing, { dur: 0.4 }), fadeOut(code, { dy: -20 }));

    /* ---- the signed document ---- */
    await s.step('The old key <b>A</b> signs the assertion, and B\'s authenticator data is <b>inside</b> the signed extension outputs.');
    const doc = s.g().at(640, 210);
    const paper = s.rect(360, 200, { color: C.light, sw: 2, fill: '#14171c', fo: 1, rx: 10 });
    const head = s.text('assertion', { size: 22, anchor: 'start' }).at(-160, -74);
    const l1 = s.text('rpIdHash · flags · signCount', { size: 14, font: 'mono', color: C.grey, anchor: 'start' }).at(-160, -40);
    const l2 = s.text('extensions.algUpgrade.authData:', { size: 14, font: 'mono', color: C.light, anchor: 'start' }).at(-160, -12);
    doc.add(paper, head, l1, l2);
    await s.play(create(doc, { dur: 1.4 }));
    const Bc = mini(s, 'B', 200, 470, 1);
    s.add(Bc);
    await s.play(to(Bc, { x: 640, y: 255, s: 0.8 }, { dur: 1.3, arc: -0.6 }));
    const kA = K.key(s, C.blue).at(120, 385).set({ s: 0.9 });
    s.add(kA);
    await s.play(to(kA, { x: 770, y: 268, s: 1.3, r: -30 }, { dur: 1.3, arc: 0.5 }));
    const seal = K.seal(s, C.blue).at(770, 268);
    await s.play(fadeOut(kA, { scale: 0.5, dur: 0.4 }), create(seal, { dur: 0.6 }), K.flash(s, 770, 268, C.blue));
    const wrap = s.rect(384, 224, { color: C.blue, sw: 3, rx: 14 }).at(640, 210);
    const wl = s.text('signed by A', { size: 18, italic: true, color: C.blue }).at(640, 340);
    await s.play(create(wrap, { dur: 1 }), write(wl));

    await s.step('That is the <b>transfer of trust</b>: anyone who trusts A can now trust B.');
    await s.play(indicate(Bc, { color: C.yellow, scale: 1.1 }));

    /* ---- send to server ---- */
    await s.step('shrine.com verifies the signature with <b>A</b>, which it already trusts, then swaps A for <b>B</b>.');
    const pkg = s.g();
    s.add(pkg);
    [doc, Bc, seal, wrap].forEach((m) => { m.x -= 640; m.y -= 210; m.apply(); pkg.add(m); });
    pkg.at(640, 210);
    await s.play(fadeOut(wl, { dur: 0.3 }));
    await s.play(to(pkg, { y: 455, s: 0.32 }, { dur: 0.9 }));
    await s.play(to(pkg, { x: 1022, y: 410 }, { dur: 1.1 }));
    await s.play(fadeOut(pkg, { scale: 0.6, dur: 0.4 }));
    const ver = s.text([['verify with A  ', { color: C.light }], ['✓', { color: C.green }]], { size: 20, font: 'mono' }).at(1090, 275);
    await s.play(write(ver, { dur: 0.9 }));
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));

    await s.step('Later, an allow-list request naming <b>B</b> lets the authenticator erase the backup <b>A</b>.');
    await s.play(fadeOut(ver));
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['B', { color: C.yellow }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.6 });
    await s.play(recolor(A, C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }));
    await s.play(to(B, { y: 385 }));

    await s.step('alice is now on ML-DSA. <b>One</b> ceremony, the <b>same</b> authenticator, and trust carried over.');
    await s.play(indicate(B, { color: C.white, scale: 1.1 }), indicate(dbB, { color: C.white, scale: 1.12 }));
  };

  /* ================================================================== */
  /* 12. extensions                                                     */
  /* ================================================================== */
  SC.extensions = async (s) => {
    const A = K.cardA(s).at(330, 120).set({ s: 1.35 });
    const B = K.cardB(s).at(950, 120).set({ s: 1.35 });
    const arr = s.arrow(470, 120, 810, 120, { color: C.light, sw: 3 });
    const al = s.text('algUpgrade', { size: 18, font: 'mono', color: C.yellow }).at(640, 95);
    const names = ['hmac-secret / PRF', 'largeBlob', 'credBlob', 'credProtect', 'thirdPartyPayment'];
    const chip = (t, x, y) => K.chip(s, t, C.light, { fo: 0.06 }).at(x, y);
    const chipsA = names.map((n, i) => chip(n, 330, 232 + i * 54));

    s.notes('A credential is more than a key pair. RPs rely on per-credential state set by extensions.');
    await s.play(create(A), create(B));
    await s.play(create(arr, { dur: 0.7 }), write(al, { dur: 0.7 }));
    await s.play(lagged(chipsA.map((c) => fadeIn(c, { dy: -14 })), { dur: 1.4 }));

    await s.step('During an upgrade that state is <b>copied</b> from A to B: largeBlob (e.g. copy the largeBlobKey), credBlob, hmac-secret, the third-party-payment bit, credProtect.');
    const copies = chipsA.map((c, i) => chip(names[i], 330, c.y));
    await s.play(lagged(copies.map((c) => to(c, { x: 950 }, { dur: 1.1, arc: -0.25 })), { dur: 2.6 }));
    await s.play(lagged(copies.map((c) => indicate(c, { color: C.yellow, scale: 1.06 })), { dur: 1.2 }));

    await s.step('Take PRF: the same input gives the <b>same output</b> from both credentials, so data encrypted under it stays readable.');
    await s.play(lagged([...chipsA, ...copies].map((c) => fadeOut(c, { dur: 0.4 })), { dur: 0.9 }));
    const salt = K.pill(s, 'PRF(salt)', C.teal, { size: 18 }).at(640, 270);
    await s.play(fadeIn(salt, { scale: 0.6 }));
    const aa = s.arrow(580, 290, 400, 360, { color: C.teal, sw: 2.5 });
    const ab = s.arrow(700, 290, 880, 360, { color: C.teal, sw: 2.5 });
    await s.play(create(aa, { dur: 0.6 }), create(ab, { dur: 0.6 }));
    const oa = s.text('0x7f3a…c91e', { size: 22, font: 'mono', color: C.green }).at(330, 392);
    const ob = s.text('0x7f3a…c91e', { size: 22, font: 'mono', color: C.green }).at(950, 392);
    await s.play(write(oa, { dur: 1 }), write(ob, { dur: 1 }));
    const eq = s.text('=', { size: 48, color: C.green }).at(640, 392);
    await s.play(write(eq, { dur: 0.5 }));

    await s.step('Two things do <b>not</b> carry over: B has no attestation of its own, and B cannot output creation-time extensions.');
    const no1 = s.text([['✗  ', { color: C.red }], ['attestation statement', { color: C.light }]], { size: 22, anchor: 'start' }).at(470, 500);
    const no2 = s.text([['✗  ', { color: C.red }], ['new creation-time extensions', { color: C.light }]], { size: 22, anchor: 'start' }).at(470, 546);
    await s.play(fadeIn(no1, { dx: -20 }));
    await s.play(fadeIn(no2, { dx: -20 }));

    await s.step('Neither is needed: B is trusted <em>because A signed it</em>, and an upgrade never gives B abilities A didn\'t have.');
    const why = s.text([['B is trusted because ', { color: C.light }], ['A', { color: C.blue, italic: true }], [' signed it', { color: C.light }]], { size: 24, italic: true }).at(640, 630);
    await s.play(write(why, { dur: 1.4 }));
    await s.play(indicate(A, { color: C.blue, scale: 1.08 }));

    await s.step('Everything else needs no special handling: credProps (same properties), appId/appIdExclude (U2F devices aren\'t eligible), remoteClientDataJson, minPinLength / pinComplexityPolicy (match the original).');
    await s.play(lagged([salt, aa, ab, oa, ob, eq, no1, no2, why].map((m) => fadeOut(m, { dur: 0.4 })), { dur: 1 }));
    const hdr = s.text('no special handling', { size: 22, italic: true, color: C.grey }).at(640, 270);
    const na = ['credProps', 'appId / appIdExclude', 'remoteClientDataJson', 'minPinLength', 'pinComplexityPolicy'];
    const naChips = na.map((t, i) => K.chip(s, t, C.grey, { w: 290, fo: 0.05 }).at(i < 3 ? 330 + (i % 3) * 310 : 485 + (i - 3) * 310, i < 3 ? 340 : 400));
    await s.play(write(hdr, { dur: 0.8 }));
    await s.play(lagged(naChips.map((c) => fadeIn(c, { dy: -12 })), { dur: 1.4 }));
  };

  /* ================================================================== */
  /* 14. Signal API                                                     */
  /* ================================================================== */
  SC.signal = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 250);
    const nameAt = (i) => [L.xs[i], L.y + 80];
    let names = [0, 1].map((i) => s.text('alice', { size: 17, font: 'mono', color: C.light }).at(...nameAt(i)));
    const reqAt = [L.slotX, 170];
    const send = async (label, o = {}) => {
      const p = K.pill(s, label, C.teal, { size: o.size ?? 16 });
      await K.travel(s, p, [[1010, 270], reqAt], { dur: 1.2 });
      return p;
    };

    s.notes('Signal methods treat the list as <b>one</b> credential, for backwards compatibility and ease of deployment.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B), fadeIn(names[0]), fadeIn(names[1]));

    await s.step('<code>signalCurrentUserDetails</code> updates <b>every</b> credential in the list, including shadowed ones.');
    let p = await send('signalCurrentUserDetails(name: "alice.smith")', { size: 15 });
    const names2 = [0, 1].map((i) => s.text('alice.smith', { size: 17, font: 'mono', color: C.green }).at(...nameAt(i)));
    await s.play(fadeOut(p), ...names.map((n) => fadeOut(n, { dy: -10, dur: 0.4 })), ...names2.map((n) => fadeIn(n, { dy: 10 })));
    await s.play(indicate(names2[0], { color: C.green }), indicate(names2[1], { color: C.green }));
    names = names2;

    await s.step('<code>signalUnknownCredential(B)</code>: B is the back of the list, so <b>all</b> credentials in the list are hidden or erased.');
    p = await send([['signalUnknownCredential(', {}], ['B', { color: C.yellow }], [')', {}]]);
    const hid = s.text('hidden', { size: 20, italic: true, color: C.grey }).at(L.slotX, L.y - 74);
    await s.play(fadeOut(p), to(A, { o: 0.2 }), to(B, { o: 0.2 }), to(names[0], { o: 0.2 }), to(names[1], { o: 0.2 }), fadeIn(hid));

    await s.step('<code>signalUnknownCredential(A)</code>: A is shadowed. There is no valid use case, so it probably means an RP bug: <b>do nothing</b>.');
    await s.play(...[A, B, names[0], names[1]].map((m) => to(m, { o: 1 }, { dur: 0.6 })), fadeOut(hid, { dur: 0.6 }));
    p = await send([['signalUnknownCredential(', {}], ['A', { color: C.blue }], [')', {}]]);
    const nop = s.text('no-op', { size: 22, italic: true, color: C.grey }).at(L.xs[0], L.y - 66);
    await s.play(fadeOut(p), write(nop, { dur: 0.6 }), indicate(A, { color: C.grey, scale: 1.04 }));

    await s.step('<code>signalAllAcceptedCredentials([A])</code> is processed like an allow-list: the newest match, A, is kept, and every other credential is erased.');
    await s.play(fadeOut(nop));
    p = await send([['signalAllAcceptedCredentials([ ', {}], ['A', { color: C.blue }], [' ])', {}]], { size: 15 });
    const box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }), fadeOut(p));
    const x1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    const c1 = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
    await s.play(create(c1, { dur: 0.4 }));
    await s.play(recolor(B, C.red, { dur: 0.5 }), recolor(names[1], C.red, { dur: 0.5 }));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(names[1]), fadeOut(x1));
    await s.play(fadeOut(box), fadeOut(c1));

    await s.step('That gives a <b>second recovery path</b>: if an upgrade was lost, the RP can restore A any time before the next sign-in, e.g. from an account page.');
    const sec = s.text('a second recovery path', { size: 26, italic: true, color: C.green }).at(L.cx, 620);
    await s.play(write(sec, { dur: 1 }), indicate(A, { color: C.green, scale: 1.08 }));
  };

  /* ================================================================== */
  /* 16. lost upgrade, allow-list flow                                  */
  /* ================================================================== */
  SC.lostBank = async (s) => {
    const panel = K.panel(s, 400, 340, 'security key').at(250, 400);
    const sk = K.secKey(s).at(120, 420).set({ s: 0.9 });
    const A = K.cardA(s).at(320, 360);
    const sv = K.server(s, 'bank.com').at(1060, 320);
    const db = K.db(s).at(1060, 545);
    const dbA = mini(s, 'A', 1060 + db.slotX, 545 + db.slotY);
    const ch = K.channel(s, 450, 400, 990, 360);
    const P0 = [450, 400], P1 = [990, 360];

    s.notes('<code>bank.com</code> uses security keys as a second factor, so every request carries an allow-list.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(sk), fadeIn(sv), fadeIn(db), fadeIn(ch)], { dur: 1.4 }));
    await s.play(create(A), fadeIn(dbA));

    await s.step('It asks for an upgrade. The key mints <b>B</b> and sends it back, signed by A…');
    const req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ] + algUpgrade', {}]], C.teal);
    await K.travel(s, req, [P1, P0], { out: true, dur: 1.5 });
    const B = K.cardB(s).at(320, 450);
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }));
    await s.play(create(B));
    await s.play(indicate(B, { color: C.white, scale: 1.08 }));

    await s.step('…but the connection drops. The server never sees B.');
    const resp = K.pill(s, [['assertion(A) + ', {}], ['B', { color: C.yellow }]], C.blue);
    await lose(s, resp, P0, P1);
    await s.play(indicate(dbA, { color: C.white, scale: 1.12 }));

    await s.step('On the next sign-in, bank.com just sends the allow-list it knows: <code>[A]</code>.');
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [P1, [320, 260]], { dur: 1.5 });
    const box = scanBox(s, 320, 450);
    await s.play(create(box, { dur: 0.5 }));
    const x1 = K.cross(s, C.grey, 0.7).at(430, 450);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { y: 360 }, { dur: 0.6 }));
    const c1 = K.check(s, C.green, 0.8).at(430, 360);
    await s.play(create(c1, { dur: 0.4 }));

    await s.step('The key signs with <b>A</b> and erases <b>B</b>. bank.com didn\'t have to do anything special. The upgrade is simply retried later.');
    await s.play(recolor(B, C.red, { dur: 0.5 }), fadeOut(x1));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req2));
    await s.play(fadeOut(box), fadeOut(c1));
    const r2 = K.pill(s, 'assertion · A', C.blue);
    await K.travel(s, r2, [P0, P1], { out: true, dur: 1.4 });
    const ok = K.check(s).at(1060, 210);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbA, { color: C.green, scale: 1.12 }));
  };

  /* ================================================================== */
  /* 17. lost upgrade, usernameless flow                                */
  /* ================================================================== */
  SC.lostShrine = async (s) => {
    const panel = K.panel(s, 300, 330, 'passkey provider').at(180, 400);
    const A = K.cardA(s, 't₁').at(180, 360);
    const B = K.cardB(s, 't₂').at(180, 450);
    const sv = K.server(s, 'shrine.com').at(560, 300);
    const db = K.db(s, 'credential database', { w: 280 }).at(560, 510);
    const dbA = mini(s, 'A', 560 + db.slotX, 510 + db.slotY);
    const ch = K.channel(s, 330, 400, 492, 330);
    const P0 = [330, 400], P1 = [492, 330];

    s.notes('<code>shrine.com</code> uses usernameless passkeys. Same failure as before: <b>B</b> was minted but never saved.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(sv), fadeIn(db), fadeIn(ch)], { dur: 1.4 }));
    await s.play(create(A), create(B), fadeIn(dbA));

    await s.step('An empty allow-list request returns the newest credential, <b>B</b>, plus <code>existingCredentials: [A]</code> and the user handle.');
    const req = K.pill(s, 'allowCredentials: [ ]', C.teal);
    await K.travel(s, req, [P1, [180, 250]], { dur: 1.3 });
    const box = scanBox(s, 180, 450);
    await s.play(create(box, { dur: 0.5 }), fadeOut(req));
    const resp = s.g(
      s.rect(250, 78, { color: C.yellow, sw: 2, fill: C.yellow, fo: 0.1, rx: 14 }),
      s.lines([
        [['assertion · ', { color: C.light }], ['B', { color: C.yellow }]],
        [['existing: [ ', { color: C.light }], ['A', { color: C.blue }], [' ]', { color: C.light }]],
        [['userHandle: alice', { color: C.light }]],
      ], { size: 14, font: 'mono', lh: 21 }).at(-110, -21),
    );
    await K.travel(s, resp, [P0, [560, 140]], { dur: 1.4 });
    await s.play(fadeOut(box));

    await s.step('The server has never seen <b>B</b>. Is this a lost upgrade, or a passkey alice deleted?');
    const unk = s.text('B ?', { size: 30, color: C.red, italic: true }).at(700, 300);
    await s.play(write(unk), indicate(dbA, { color: C.red, scale: 1.12 }));

    /* ---- flowchart ---- */
    const node = (x, y, w, lines, color = C.light) => {
      const g = s.g(s.rect(w, 70, { color, sw: 2, fill: C.dark, fo: 0.9, rx: 12 }));
      g.add(s.lines(lines.map((t) => [[t, { color }]]), { size: 15, font: 'mono', lh: 22, anchor: 'middle' }).at(0, -11));
      return g.at(x, y);
    };
    const n1 = node(895, 170, 250, ['existingCredentials', 'empty?']);
    const n2 = node(895, 330, 250, ['any of them in', 'alice\'s credentials?']);
    const n3 = node(895, 500, 270, ['lost upgrade: retry with', 'allowCredentials: [A]'], C.green);
    const s1 = node(1165, 170, 175, ['no backup →', 'other sign-in'], C.grey);
    const s2 = node(1165, 330, 175, ['user deleted it →', 'signalUnknown…'], C.grey);
    const a12 = s.arrow(895, 206, 895, 293, { color: C.light, sw: 2.5, head: 12 });
    const a23 = s.arrow(895, 366, 895, 463, { color: C.light, sw: 2.5, head: 12 });
    const a1s = s.arrow(1022, 170, 1074, 170, { color: C.grey, sw: 2, head: 10 });
    const a2s = s.arrow(1022, 330, 1074, 330, { color: C.grey, sw: 2, head: 10 });
    const no1 = s.text('no', { size: 16, italic: true, color: C.light }).at(917, 250);
    const no2 = s.text('yes', { size: 16, italic: true, color: C.light }).at(920, 415);
    const y1 = s.text('yes', { size: 15, italic: true, color: C.grey }).at(1048, 152);
    const y2 = s.text('no', { size: 15, italic: true, color: C.grey }).at(1048, 312);

    await s.step('<code>existingCredentials</code> is <code>[A]</code>. It isn\'t empty, so this authenticator has a backup. (Empty → offer another way to sign in.)');
    await s.play(fadeOut(unk), create(n1, { dur: 1 }));
    await s.play(fadeIn(s1, { o: 0.45 }), fadeIn(a1s, { o: 0.45 }), fadeIn(y1, { o: 0.45 }));
    await s.play(create(a12, { dur: 0.6 }), write(no1, { dur: 0.4 }));

    await s.step('Intersect with alice\'s credentials (found via the user handle). <b>A</b> is one of them, so this is a <b>lost upgrade</b>.');
    await s.play(create(n2, { dur: 1 }));
    await s.play(fadeIn(s2, { o: 0.45 }), fadeIn(a2s, { o: 0.45 }), fadeIn(y2, { o: 0.45 }));
    await s.play(create(a23, { dur: 0.6 }), write(no2, { dur: 0.4 }));
    await s.play(create(n3, { dur: 1 }));

    await s.step('So shrine.com sends a second request, <code>allowCredentials: [A]</code>. Yes, this costs a second ceremony…');
    await s.play(fadeOut(resp));
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [P1, [180, 250]], { dur: 1.3 });
    const box2 = scanBox(s, 180, 360);
    await s.play(create(box2, { dur: 0.5 }));

    await s.step('…the authenticator signs with <b>A</b>, erases <b>B</b>, and alice is signed in.');
    await s.play(recolor(B, C.red, { dur: 0.5 }));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req2));
    const r2 = K.pill(s, 'assertion · A', C.blue);
    await s.play(fadeOut(box2));
    await K.travel(s, r2, [P0, P1], { out: true, dur: 1.2 });
    const ok = K.check(s).at(560, 190);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbA, { color: C.green, scale: 1.12 }), indicate(n3, { color: C.green, scale: 1.05 }));

    await s.step('If none had been alice\'s, she deleted that passkey herself. The RP calls <code>signalUnknownCredential</code> and offers another way in.');
    await s.play(to(s2, { o: 1 }), indicate(s2, { color: C.white, scale: 1.08 }));
  };

  /* ================================================================== */
  /* 18. alternatives                                                   */
  /* ================================================================== */
  SC.alternatives = async (s) => {
    const LX = 360, RX = 920, BASE = 640;
    const left = ['preferredAlgs', 'createAlgs', 'createExtensions', 'deleteCredentials',
      'existingCredentials', 'supportedAlgs', 'createdCredentialAuthData', 'deletedCredentials', 'maxCredentialsPerAccount'];
    const right = ['algUpgrade.pubKeyCredParams', 'algUpgrade.authenticatorData', 'restoreCredentials', 'existingCredentials'];
    const tL = s.text([['algPolicy', { font: 'mono', color: C.gold }]], { size: 30 }).at(LX, 70);
    const sL = s.text('Microsoft proposal', { size: 18, italic: true, color: C.grey }).at(LX, 106);
    const tR = s.text('this proposal', { size: 30, color: C.yellow }).at(RX, 70);
    const sR = s.text('restoreCredentials + algUpgrade', { size: 18, italic: true, color: C.grey }).at(RX, 106);
    const gL = s.line(LX - 200, BASE + 26, LX + 200, BASE + 26, { color: C.dim, sw: 3 });
    const gR = s.line(RX - 200, BASE + 26, RX + 200, BASE + 26, { color: C.dim, sw: 3 });
    const chip = (t, x, y, color) => s.g(
      s.rect(350, 38, { color, sw: 1.8, fill: color, fo: 0.1, rx: 8 }),
      s.text(t, { size: 16, font: 'mono', color }),
    ).at(x, y);

    s.notes('<code>algPolicy</code> keeps a credential for <b>every</b> algorithm side by side, as insurance in case a new algorithm breaks.');
    await s.play(write(tL), fadeIn(sL), create(gL, { dur: 0.6 }));

    await s.step('That means choosing a preferred algorithm per request, deleting credentials explicitly, and extra extension plumbing.');
    const cl = left.map((t, i) => chip(t, LX, BASE - i * 46, C.gold));
    await s.play(lagged(cl.map((c) => fadeIn(c, { dy: -60, ease: Ease.out })), { dur: 3.2 }));
    const nL = s.text('9 new fields', { size: 22, color: C.gold }).at(LX, BASE + 60);
    await s.play(write(nL));

    await s.step('This proposal adds far less: one list of algorithms in, one new credential out, and the backup report.');
    await s.play(write(tR), fadeIn(sR), create(gR, { dur: 0.6 }));
    const cr = right.map((t, i) => chip(t, RX, BASE - i * 46, C.yellow));
    await s.play(lagged(cr.map((c) => fadeIn(c, { dy: -60, ease: Ease.out })), { dur: 1.6 }));
    const nR = s.text('4 new fields', { size: 22, color: C.yellow }).at(RX, BASE + 60);
    await s.play(write(nR));

    await s.step('And insurance against a broken algorithm is better served by <b>hybrid signatures</b>: one credential, two algorithms, both must hold.');
    await s.play(lagged([...cl, ...cr, tL, sL, tR, sR, gL, gR, nL, nR].map((m) => fadeOut(m, { dur: 0.4 })), { dur: 1.2 }));
    const box = s.rect(520, 190, { color: C.light, sw: 2, fill: C.dark, fo: 0.8, rx: 18 }).at(640, 340);
    const k1 = K.key(s, C.blue).at(540, 330).set({ s: 1.6, r: -30 });
    const plus = s.text('+', { size: 50, color: C.light }).at(640, 330);
    const k2 = K.key(s, C.yellow).at(740, 330).set({ s: 1.6, r: -30 });
    const lab = s.text([['ECDSA', { color: C.blue }], ['  and  ', { color: C.grey }], ['ML-DSA', { color: C.yellow }]], { size: 22, font: 'mono' }).at(640, 400);
    const cap = s.text('hybrid: a forgery must break both', { size: 24, italic: true, color: C.light }).at(640, 490);
    await s.play(create(box));
    await s.play(create(k1), write(plus), create(k2));
    await s.play(write(lab), write(cap, { dur: 1.4 }));
  };

  window.SCENES = SC;
})();
