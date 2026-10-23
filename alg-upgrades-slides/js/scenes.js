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

    await s.step('Every one of them needs to move to a <b>post-quantum</b> algorithm like ML-DSA.');
    const title2 = s.text('ML-DSA-44', { size: 36, color: C.yellow }).at(640, 92);
    const sorted = [...keys].sort((a, b) => a.x0 - b.x0);
    await s.play(fadeOut(title, { dy: -20 }), fadeIn(title2, { dy: 20 }),
      lagged(sorted.map((k) => recolor(k, C.yellow, { dur: 0.5 })), { dur: 2.2 }));
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
    const picker = K.picker(s, [[K.icons.phone, 'This phone'], [K.icons.secKey, 'Security key'], [K.icons.laptop, 'Another device']],
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

    await s.step('① <b>Back up and restore credentials</b>: keep a list per user + RP instead of one slot, and report backups with <code>restoreCredentials</code>.');
    const c1 = K.capCard(s, {
      n: '①', title: 'Back up and restore credentials', color: C.blue,
      sub: ['Keep a list of credentials per', '{ user id, RP ID } instead of one', 'slot, so lost upgrades are', 'recoverable.'],
      ext: 'restoreCredentials', w: 560,
    }).at(345, 360);
    await s.play(calm(c1));

    await s.step('② <b>Algorithm upgrade</b>: mint a new credential inside an ordinary <code>get()</code>, signed by the old one, with <code>algUpgrade</code>.');
    const c2 = K.capCard(s, {
      n: '②', title: 'Algorithm upgrade', color: C.yellow,
      sub: ['Mint a new credential inside an', 'ordinary get(), signed by the', 'existing one.'],
      ext: 'algUpgrade', w: 560,
    }).at(935, 360);
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
  };

  /* ================================================================== */
  /* 8. getting an assertion with an allow-list (two examples)          */
  /* ================================================================== */
  SC.cleanup = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    let A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 230);
    const db = K.db(s).at(1080, 470);
    const dbAt = [1080 + db.slotX, 470 + db.slotY];
    let dbCard = mini(s, 'B', ...dbAt);
    const reqAt = [L.slotX, 160];
    const label = (n, which, color) => s.text([[`Example ${n}: `, { color: C.grey }], ['shrine.com has ', { color: C.light }],
      [`cred ${which}`, { color, italic: true }]], { size: 22, anchor: 'start' }).at(70, 90);

    /* ---- example 1: shrine.com has cred B ---- */
    let ex = label(1, 'B', C.yellow);
    s.notes('alice\'s authenticator holds <b>A</b> and a newer <b>B</b>. Example 1: the upgrade reached the server, so shrine.com has <b>B</b>.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv), fadeIn(db));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B), fadeIn(dbCard), write(ex, { dur: 0.8 }));

    await s.step('shrine.com sends an <b>allow-list</b> with the credential it knows, <code>[B]</code>. The authenticator picks the <b>newest</b> matching credential: B.');
    let req = K.pill(s, [['allowCredentials: [ ', {}], ['B', { color: C.yellow }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    let box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    let ck = K.check(s, C.green, 0.9).at(L.xs[1], L.y - 66);
    await s.play(create(ck, { dur: 0.4 }));

    await s.step('It signs with B and <b>erases every other credential</b> for that user and RP. The backup A is no longer needed.');
    await s.play(recolor(A, C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }), fadeOut(req), fadeOut(box), fadeOut(ck));
    let resp = K.pill(s, 'assertion · B', C.yellow);
    await K.travel(s, resp, [[790, L.y], [1010, 250]], { out: true, dur: 1.1 });
    let ok = K.check(s).at(1080, 130);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbCard, { color: C.green, scale: 1.12 }));

    /* ---- example 2: shrine.com has cred A ---- */
    await s.step('Example 2: same authenticator, but the upgrade never reached the server, so shrine.com still has <b>A</b>.');
    const ex2 = label(2, 'A', C.blue);
    A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const dbA = mini(s, 'A', ...dbAt);
    await s.play(fadeOut(ok), fadeOut(ex, { dy: -10 }), fadeIn(ex2, { dy: 10 }), fadeIn(A, { dy: -30 }), ...swap(dbCard, dbA));
    dbCard = dbA; ex = ex2;

    await s.step('shrine.com sends <code>[A]</code>. B doesn\'t match, so the newest matching credential is A.');
    req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    const x1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    ck = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
    await s.play(create(ck, { dur: 0.4 }));

    await s.step('It signs with A and erases B. alice signs in with A, and the upgrade can simply be retried later.');
    await s.play(recolor(B, C.red, { dur: 0.5 }), fadeOut(x1));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req), fadeOut(box), fadeOut(ck));
    resp = K.pill(s, 'assertion · A', C.blue);
    await K.travel(s, resp, [[790, L.y], [1010, 250]], { out: true, dur: 1.1 });
    ok = K.check(s).at(1080, 130);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbCard, { color: C.green, scale: 1.12 }));
  };

  /* ================================================================== */
  /* 9. empty allow-list: happy path, then recovery with restoreCredentials */
  /* ================================================================== */
  SC.restore = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 230);
    const db = K.db(s).at(1080, 470);
    const dbAt = [1080 + db.slotX, 470 + db.slotY];
    let dbCard = mini(s, 'B', ...dbAt);
    const reqAt = [L.slotX, 160];
    const label = (n, which, color) => s.text([[`Example ${n}: `, { color: C.grey }], ['shrine.com has ', { color: C.light }],
      [`cred ${which}`, { color, italic: true }]], { size: 22, anchor: 'start' }).at(70, 90);
    const toServer = (text, color) => K.travel(s, K.pill(s, text, color), [[790, L.y], [1010, 250]], { out: true, dur: 1.1 });
    const emptyReq = async (text = 'allowCredentials: [ ]', size = 18) => {
      const req = K.pill(s, text, C.teal, { size });
      await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
      const box = scanBox(s, L.xs[1], L.y);
      await s.play(create(box, { dur: 0.5 }), fadeOut(req));
      return box;
    };

    /* ---- example 1 (happy path): shrine.com has cred B ---- */
    let ex = label(1, 'B', C.yellow);
    s.notes('Now usernameless sign-in, with an <b>empty</b> allow-list. Example 1: the upgrade reached shrine.com, so it has <b>B</b>.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv), fadeIn(db));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B), fadeIn(dbCard), write(ex, { dur: 0.8 }));

    await s.step('With an empty allow-list, the authenticator always uses the <b>newest</b> credential: B.');
    let box = await emptyReq();

    await s.step('shrine.com knows B, so alice is signed in. A stays on the authenticator as a backup.');
    await s.play(fadeOut(box));
    await toServer('assertion · B', C.yellow);
    let mark = K.check(s).at(1080, 130);
    await s.play(create(mark, { dur: 0.5 }), indicate(dbCard, { color: C.green, scale: 1.12 }));

    /* ---- example 2 (unhappy path): shrine.com has cred A ---- */
    await s.step('Example 2: the upgrade never reached the server, so shrine.com still has <b>A</b>.');
    const ex2 = label(2, 'A', C.blue);
    const dbA = mini(s, 'A', ...dbAt);
    await s.play(fadeOut(mark), fadeOut(ex, { dy: -10 }), fadeIn(ex2, { dy: 10 }), ...swap(dbCard, dbA));
    dbCard = dbA; ex = ex2;

    await s.step('The same empty allow-list request gets an assertion from the newest credential, <b>B</b>…');
    box = await emptyReq();
    await s.play(fadeOut(box));
    await toServer('assertion · B', C.yellow);

    await s.step('…which shrine.com has never seen. Is this a lost upgrade, or a passkey alice deleted? It can\'t tell.');
    mark = K.cross(s).at(1080, 130);
    const unk = s.text([['unknown credential ', { color: C.red }], ['B', { color: C.yellow }]], { size: 20, italic: true }).at(1080, 580);
    await s.play(create(mark, { dur: 0.5 }), write(unk, { dur: 0.8 }), indicate(dbCard, { color: C.red, scale: 1.12 }));

    await s.step('This is where the new <code>restoreCredentials</code> extension comes in: the signed response also lists the credentials the authenticator still keeps as backups.');
    await s.play(fadeOut(mark), fadeOut(unk));
    box = await emptyReq('allowCredentials: [ ]  ·  restoreCredentials: true', 15);
    const out = K.panel(s, 540, 124, 'response', { size: 16, italic: true }).at(L.cx, 628);
    const resp = s.lines([
      [['assertion', { color: C.white }], ['   signed by ', { color: C.grey }], ['B', { color: C.yellow }]],
      [['restoreCredentials: { existingCredentials: [ ', { color: C.light }], ['A', { color: C.blue }], [' ] }', { color: C.light }]],
    ], { size: 16, font: 'mono', lh: 28 }).at(L.cx - 250, 630);
    await s.play(fadeOut(box), fadeIn(out));
    await s.play(write(resp, { dur: 1.4 }));

    await s.step('A is one of alice\'s credentials, so this was a <b>lost upgrade</b>. shrine.com retries with <code>allowCredentials: [A]</code>…');
    await s.play(indicate(resp.rows[1], { color: C.blue, scale: 1.03 }), indicate(dbCard, { color: C.blue, scale: 1.12 }));
    const req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    const x1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    const ck = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
    await s.play(create(ck, { dur: 0.4 }));

    await s.step('…the authenticator signs with A and erases B. alice is signed in, and the upgrade can be retried later.');
    await s.play(recolor(B, C.red, { dur: 0.5 }), fadeOut(x1));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req), fadeOut(box), fadeOut(ck), fadeOut(out), fadeOut(resp));
    await toServer('assertion · A', C.blue);
    mark = K.check(s).at(1080, 130);
    await s.play(create(mark, { dur: 0.5 }), indicate(dbCard, { color: C.green, scale: 1.12 }));

    await s.step('Backups are best effort: authenticators may also <b>clean up old credentials over time</b> to make space for new ones.');
    const note = s.text('authenticators may also clean up old credentials over time to make space', { size: 21, italic: true, color: C.light }).at(L.cx, 610);
    await s.play(fadeIn(note, { dy: -10 }));
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

    await s.step('The authenticator picks the first algorithm it supports, ML-DSA-44, and has no ML-DSA credential for alice yet.');
    const c1 = s.text([['ML-DSA-44 supported ', { color: C.light }], ['✓', { color: C.green }]], { size: 15, font: 'mono' }).at(200, 520);
    const c2 = s.text([['ML-DSA cred exists? ', { color: C.light }], ['no', { color: C.red }]], { size: 15, font: 'mono' }).at(200, 552);
    await s.play(write(c1, { dur: 0.9 }));
    await s.play(write(c2, { dur: 0.9 }));

    await s.step('alice verifies once, the same as any other sign-in.');
    await s.play(fadeOut(c1), fadeOut(c2));
    const fing = K.finger(s, C.green).at(200, 500);
    await s.play(create(fing, { dur: 0.7 }));
    await s.play(indicate(fing, { color: C.green, scale: 1.3 }));
    await s.play(fadeOut(fing, { dur: 0.4 }));

    await s.step('Only after user verification does it mint the new credential, <b>B</b>.');
    const B = K.cardB(s).at(200, 470);
    await s.play(create(B));
    await s.play(indicate(B, { color: C.white, scale: 1.08 }), fadeOut(code, { dy: -20 }));

    /* ---- the signed document ---- */
    await s.step('The authenticator builds the assertion. Its <b>authenticator data</b> has an <b>extensions</b> section, empty for now.');
    const doc = s.g().at(640, 210);
    const paper = s.rect(380, 230, { color: C.light, sw: 2, fill: '#14171c', fo: 1, rx: 10 });
    const head = s.text('assertion', { size: 22, anchor: 'start' }).at(-170, -90);
    const adBox = s.rect(344, 160, { color: C.dim, sw: 1.5, rx: 8 }).at(0, 18);
    const adLbl = s.text('authData', { size: 14, italic: true, color: C.grey, anchor: 'start' }).at(-160, -46);
    const l1 = s.text('rpIdHash · flags · signCount', { size: 14, font: 'mono', color: C.grey, anchor: 'start' }).at(-160, -20);
    const l2 = s.text('extensions: {', { size: 14, font: 'mono', color: C.light, anchor: 'start' }).at(-160, 8);
    const l3 = s.text('algUpgrade:', { size: 14, font: 'mono', color: C.yellow, anchor: 'start' }).at(-144, 46);
    const l4 = s.text('}', { size: 14, font: 'mono', color: C.light, anchor: 'start' }).at(-160, 82);
    const extSlot = dashedRect(s, 160, 60).at(70, 46);
    doc.add(paper, head, adBox, adLbl, l1, l2, l3, l4, extSlot);
    await s.play(create(doc, { dur: 1.4 }));

    await s.step('B\'s authenticator data goes into the <code>algUpgrade</code> extension output, <b>inside</b> the assertion\'s authenticator data.');
    const Bc = mini(s, 'B', 200, 470, 1).set({ o: 0 });
    s.add(Bc);
    await s.play(to(Bc, { x: 640 + 70, y: 210 + 46, s: 0.8, o: 1 }, { dur: 1.3, arc: -0.6 }));

    await s.step('Then the old key <b>A</b> signs the whole assertion, including B.');
    const kA = K.key(s, C.blue).at(A.x - A.w / 2 + 34, A.y).set({ s: 0.78, o: 0 });
    s.add(kA);
    await s.play(to(kA, { x: 800, y: 120, s: 1.3, r: -30, o: 1 }, { dur: 1.3, arc: 0.5 }));
    const seal = K.seal(s, C.blue).at(800, 120);
    await s.play(fadeOut(kA, { scale: 0.5, dur: 0.4 }), create(seal, { dur: 0.6 }), K.flash(s, 800, 120, C.blue));
    const wrap = s.rect(404, 254, { color: C.blue, sw: 3, rx: 14 }).at(640, 210);
    const wl = s.text('signed by A', { size: 18, italic: true, color: C.blue }).at(640, 354);
    await s.play(create(wrap, { dur: 1 }), write(wl));

    await s.step('That is the <b>transfer of trust</b>: anyone who trusts A can now trust B.');
    await s.play(indicate(Bc, { color: C.yellow, scale: 1.1 }));

    /* ---- send to server ---- */
    await s.step('The assertion goes to shrine.com, which verifies the signature with <b>A</b>, the credential it already trusts.');
    const pkg = s.g();
    s.add(pkg);
    [doc, Bc, seal, wrap].forEach((m) => { m.x -= 640; m.y -= 210; m.apply(); pkg.add(m); });
    pkg.at(640, 210);
    await s.play(fadeOut(wl, { dur: 0.3 }));
    await s.play(to(pkg, { y: 455, s: 0.32 }, { dur: 0.9 }));
    await s.play(to(pkg, { x: 1022, y: 410 }, { dur: 1.1 }));
    await s.play(fadeOut(pkg, { scale: 0.6, dur: 0.4 }));
    const ver = s.text([['verify with A  ', { color: C.light }], ['✓', { color: C.green }]], { size: 20, font: 'mono' }).at(1090, 248);
    await s.play(write(ver, { dur: 0.9 }));

    await s.step('The signature checks out, so shrine.com <b>replaces</b> A with <b>B</b> in its database.');
    const rep = s.text([['replace with ', { color: C.light }], ['B', { color: C.yellow }]], { size: 20, font: 'mono' }).at(1090, 282);
    await s.play(write(rep, { dur: 0.8 }));
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));
  };

  /* ================================================================== */
  /* 13. upgrade, continued: the preferred algorithm already exists     */
  /* ================================================================== */
  SC.upgradeAgain = async (s) => {
    // Start from slide 12's final frame.
    const panel = K.panel(s, 300, 330, 'authenticator').at(200, 450);
    const A = K.cardA(s).at(200, 385);
    const B = K.cardB(s).at(200, 470);
    const br = K.browser(s, 220, 140, 'browser').at(640, 455);
    const sv = K.server(s, 'shrine.com').at(1090, 380);
    const db = K.db(s).at(1090, 590);
    const dbB = mini(s, 'B', 1090 + db.slotX, 590 + db.slotY);
    const ch1 = K.channel(s, 350, 455, 528, 455);
    const ch2 = K.channel(s, 752, 455, 1022, 410);
    const ver = s.text([['verify with A  ', { color: C.light }], ['✓', { color: C.green }]], { size: 20, font: 'mono' }).at(1090, 248);
    const rep = s.text([['replace with ', { color: C.light }], ['B', { color: C.yellow }]], { size: 20, font: 'mono' }).at(1090, 282);
    s.add(panel, A, B, br, sv, db, dbB, ch1, ch2, ver, rep);

    s.notes('Some time later, alice signs in again. shrine.com keeps sending the same <code>algUpgrade</code> request.');
    await s.play(fadeOut(ver), fadeOut(rep));

    await s.step('Next sign-in: the same <code>get()</code> with <code>algUpgrade</code>, still preferring ML-DSA-44.');
    const code = s.lines([
      [['navigator.credentials.get({ publicKey: { …, extensions: {', { color: C.light }]],
      [['  algUpgrade', { color: C.yellow }], [': { pubKeyCredParams: [', { color: C.light }]],
      [['    { alg: ', { color: C.light }], ['-48', { color: C.gold }], [' },  ', { color: C.light }], ['// ML-DSA-44', { color: C.grey }]],
      [['    { alg: ', { color: C.light }], ['-7', { color: C.gold }], [' },   ', { color: C.light }], ['// ECDSA', { color: C.grey }]],
      [['  ] } } } });', { color: C.light }]],
    ], { size: 18, font: 'mono', lh: 28 }).at(330, 60);
    await s.play(write(code, { dur: 2 }));
    const req = K.pill(s, 'get() + algUpgrade', C.teal);
    await K.travel(s, req, [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.6 });

    await s.step('The preferred algorithm, ML-DSA-44, already has a credential for alice: <b>B</b>. Nothing new is created.');
    const c1 = s.text([['ML-DSA-44 supported ', { color: C.light }], ['✓', { color: C.green }]], { size: 15, font: 'mono' }).at(200, 545);
    const c2 = s.text([['ML-DSA cred exists? ', { color: C.light }], ['yes', { color: C.green }]], { size: 15, font: 'mono' }).at(200, 577);
    await s.play(write(c1, { dur: 0.9 }));
    await s.play(write(c2, { dur: 0.9 }), indicate(B, { color: C.white, scale: 1.08 }));

    await s.step('So this is just a <b>normal assertion</b>: alice verifies, B signs it, and there is no <code>algUpgrade</code> output.');
    await s.play(fadeOut(c1), fadeOut(c2), fadeOut(code, { dy: -20 }));
    const fing = K.finger(s, C.green).at(200, 560);
    await s.play(create(fing, { dur: 0.7 }));
    await s.play(indicate(fing, { color: C.green, scale: 1.3 }));
    await s.play(fadeOut(fing, { dur: 0.4 }));
    const resp = K.pill(s, 'assertion · B', C.yellow);
    await K.travel(s, resp, [[350, 455], [640, 455], [1022, 410]], { out: true, dur: 1.6 });

    await s.step('shrine.com verifies with B, the credential it now has on file. Sending <code>algUpgrade</code> again is harmless.');
    const ver2 = s.text([['verify with B  ', { color: C.light }], ['✓', { color: C.green }]], { size: 20, font: 'mono' }).at(1090, 265);
    await s.play(write(ver2, { dur: 0.9 }), indicate(dbB, { color: C.green, scale: 1.12 }));
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
    // Each pill is copied: a duplicate slides straight across from A's column to B's.
    await s.play(lagged(copies.map((c) => to(c, { x: 950 }, { dur: 1.0 })), { lag: 0.18 }));
    await s.play(lagged(copies.map((c) => indicate(c, { color: C.yellow, scale: 1.06 })), { dur: 1.2 }));

    await s.step('Take PRF: the same input gives the <b>same output</b> from both credentials, so data encrypted under it stays readable.');
    // The two PRF pills glide to the centre and merge into PRF(salt); the rest fade away.
    const others = [...chipsA.slice(1), ...copies.slice(1)];
    await s.play(...others.map((c) => fadeOut(c, { dur: 0.5 })),
      to(chipsA[0], { x: 640, y: 270 }, { dur: 0.9 }), to(copies[0], { x: 640, y: 270 }, { dur: 0.9 }));
    const salt = K.pill(s, 'PRF(salt)', C.teal, { size: 18 }).at(640, 270);
    await s.play(fadeOut(chipsA[0], { scale: 0.6, dur: 0.5 }), fadeOut(copies[0], { scale: 0.6, dur: 0.5 }),
      fadeIn(salt, { scale: 1.6, dur: 0.6 }));
    const aa = s.arrow(580, 290, 400, 360, { color: C.teal, sw: 2.5 });
    const ab = s.arrow(700, 290, 880, 360, { color: C.teal, sw: 2.5 });
    await s.play(create(aa, { dur: 0.6 }), create(ab, { dur: 0.6 }));
    const oa = s.text('0x7f3a…c91e', { size: 22, font: 'mono', color: C.green }).at(330, 392);
    const ob = s.text('0x7f3a…c91e', { size: 22, font: 'mono', color: C.green }).at(950, 392);
    await s.play(write(oa, { dur: 1 }), write(ob, { dur: 1 }));
    const eq = s.text('=', { size: 48, color: C.green }).at(640, 392);
    await s.play(write(eq, { dur: 0.5 }));

    await s.step('What does <b>not</b> carry over: B cannot output new creation-time extensions. An upgrade never gives B abilities A didn\'t have.');
    const no2 = s.text([['✗  ', { color: C.red }], ['new creation-time extensions', { color: C.light }]], { size: 22, anchor: 'start' }).at(470, 520);
    await s.play(fadeIn(no2, { dx: -20 }));
  };

  /* ================================================================== */
  /* 15. attestation                                                    */
  /* ================================================================== */
  SC.attestation = async (s) => {
    const A = K.cardA(s).at(330, 330).set({ s: 1.35 });
    const att = K.chip(s, 'attestation statement', C.gold, { w: 300, size: 18 }).at(330, 170);
    const attArr = s.arrow(330, 196, 330, 280, { color: C.gold, sw: 2.5, head: 12 });
    const attLbl = s.text('at registration', { size: 18, italic: true, color: C.grey, anchor: 'start' }).at(350, 238);

    s.notes('When A was registered, it may have come with an <b>attestation statement</b> vouching for the authenticator that holds it.');
    await s.play(create(A));
    await s.play(fadeIn(att, { dy: -12 }), create(attArr, { dur: 0.7 }), fadeIn(attLbl));

    await s.step('B is created by <code>algUpgrade</code> inside a <code>get()</code>. There is no way for it to carry an attestation statement.');
    const arr = s.arrow(500, 330, 780, 330, { color: C.light, sw: 3 });
    const al = s.text('algUpgrade', { size: 18, font: 'mono', color: C.yellow }).at(640, 302);
    const B = K.cardB(s).at(950, 330).set({ s: 1.35 });
    await s.play(create(arr, { dur: 0.7 }), write(al, { dur: 0.7 }));
    await s.play(create(B));
    const none = dashedRect(s, 300, 40).at(950, 170);
    const noneT = s.text([['✗  ', { color: C.red }], ['no attestation statement', { color: C.grey, italic: true }]], { size: 17 }).at(950, 170);
    await s.play(fadeIn(none), write(noneT, { dur: 0.8 }));

    await s.step('It doesn\'t need one: B is <b>signed by A</b>. If the RP trusted A\'s attestation when A was registered, it can trust B.');
    const seal = K.seal(s, C.blue).at(640, 368);
    const sl = s.text('signed by A', { size: 17, italic: true, color: C.blue }).at(640, 410);
    await s.play(create(seal, { dur: 0.6 }), K.flash(s, 640, 368, C.blue), write(sl, { dur: 0.6 }));
    const chain = s.text([['attestation', { color: C.gold }], ['  →  ', { color: C.grey }], ['A', { color: C.blue, italic: true }],
      ['  →  ', { color: C.grey }], ['B', { color: C.yellow, italic: true }]], { size: 30 }).at(640, 530);
    const cap = s.text('trusting A at registration is enough to trust B', { size: 22, italic: true, color: C.light }).at(640, 590);
    await s.play(write(chain, { dur: 1.2 }));
    await s.play(fadeIn(cap, { dy: -10 }), indicate(B, { color: C.white, scale: 1.06 }));
  };

  /* ================================================================== */
  /* 14. Signal API                                                     */
  /* ================================================================== */
  SC.signal = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    let A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 250);
    const nameAt = (i) => [L.xs[i], L.y + 80];
    let names = [0, 1].map((i) => s.text('alice', { size: 17, font: 'mono', color: C.light }).at(...nameAt(i)));
    const reqAt = [L.slotX, 170];
    // The pill stays where it lands until the next signal* call replaces it.
    let lastPill = null;
    const send = async (label, o = {}) => {
      const p = K.pill(s, label, C.teal, { size: o.size ?? 16 });
      if (lastPill) await s.play(fadeOut(lastPill, { dur: 0.4 }));
      await K.travel(s, p, [[1010, 270], reqAt], { dur: 1.2 });
      lastPill = p;
      return p;
    };
    // Subtitle naming the signal* method being shown; swapped as the method changes.
    let sub = null;
    const subtitle = async (name) => {
      const next = s.text(name, { size: 26, font: 'mono', color: C.teal, anchor: 'start' }).at(70, 90);
      await s.play(...(sub ? [fadeOut(sub, { dy: -10, dur: 0.4 })] : []), fadeIn(next, { dy: 10, dur: 0.5 }));
      sub = next;
    };

    s.notes('Signal methods treat the list as <b>one</b> credential, for backwards compatibility and ease of deployment.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B), fadeIn(names[0]), fadeIn(names[1]));

    await s.step('<code>signalCurrentUserDetails</code> updates <b>every</b> credential in the list, including shadowed ones.');
    await subtitle('signalCurrentUserDetails');
    let p = await send('signalCurrentUserDetails(name: "alice.smith")', { size: 15 });
    const names2 = [0, 1].map((i) => s.text('alice.smith', { size: 17, font: 'mono', color: C.green }).at(...nameAt(i)));
    await s.play(...names.map((n) => fadeOut(n, { dy: -10, dur: 0.4 })), ...names2.map((n) => fadeIn(n, { dy: 10 })));
    await s.play(indicate(names2[0], { color: C.green }), indicate(names2[1], { color: C.green }));
    names = names2;

    await s.step('<code>signalUnknownCredential(B)</code>: B is the back of the list, so <b>all</b> credentials in the list are hidden or erased.');
    await subtitle('signalUnknownCredential');
    p = await send([['signalUnknownCredential(', {}], ['B', { color: C.yellow }], [')', {}]]);
    const hid = s.text('hidden', { size: 20, italic: true, color: C.grey }).at(L.slotX, L.y - 74);
    await s.play(to(A, { o: 0.2 }), to(B, { o: 0.2 }), to(names[0], { o: 0.2 }), to(names[1], { o: 0.2 }), fadeIn(hid));

    await s.step('<code>signalUnknownCredential(A)</code>: A is shadowed. There is no valid use case, so it probably means an RP bug: <b>do nothing</b>.');
    await s.play(...[A, B, names[0], names[1]].map((m) => to(m, { o: 1 }, { dur: 0.6 })), fadeOut(hid, { dur: 0.6 }));
    p = await send([['signalUnknownCredential(', {}], ['A', { color: C.blue }], [')', {}]]);
    const nop = s.text('no-op', { size: 22, italic: true, color: C.grey }).at(L.xs[0], L.y - 66);
    await s.play(write(nop, { dur: 0.6 }), indicate(A, { color: C.grey, scale: 1.04 }));

    await s.step('<code>signalAllAcceptedCredentials([B])</code> is processed like an allow-list: the upgrade made it, so the newest match, B, is kept and the backup A is <b>erased</b>.');
    await s.play(fadeOut(nop));
    await subtitle('signalAllAcceptedCredentials');
    p = await send([['signalAllAcceptedCredentials([ ', {}], ['B', { color: C.yellow }], [' ])', {}]], { size: 15 });
    let box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    let c1 = K.check(s, C.green, 0.9).at(L.xs[1], L.y - 66);
    await s.play(create(c1, { dur: 0.4 }));
    await s.play(recolor(A, C.red, { dur: 0.5 }), recolor(names[0], C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }), fadeOut(names[0]));
    await s.play(fadeOut(box), fadeOut(c1));

    await s.step('If instead the upgrade was lost, <code>signalAllAcceptedCredentials([A])</code> keeps A, the newest match, and erases B.');
    A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    names[0] = s.text('alice.smith', { size: 17, font: 'mono', color: C.green }).at(...nameAt(0));
    await s.play(fadeIn(A, { dy: -30 }), fadeIn(names[0], { dy: -30 }));
    p = await send([['signalAllAcceptedCredentials([ ', {}], ['A', { color: C.blue }], [' ])', {}]], { size: 15 });
    box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    const x1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    c1 = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
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
  /* appendix: CMTG keys across trust groups                            */
  /* ================================================================== */
  SC.cmtg = async (s) => {
    /* ---- account: synced passkeys on top, trust groups (with their CMTG keys) below ---- */
    const acct = K.panel(s, 560, 570, 'account').at(340, 400);
    const pkLbl = s.text('synced passkeys', { size: 15, italic: true, color: C.grey, anchor: 'start' }).at(90, 160);
    const credAt = (i) => [175 + i * 150, 205];
    const a = mini(s, 'A', ...credAt(0));
    const group = (n, y) => ({ y, p: K.panel(s, 500, 150, `trust group ${n}`, { size: 18 }).at(340, y) });
    const g1 = group(1, 360), g2 = group(2, 560);
    const keyAt = (g, col) => [205 + col * 230, g.y + 15];
    const cmtgKey = (alg, color, at) => K.chip(s, `CMTG · ${alg}`, color, { w: 200, size: 15 }).at(...at);
    const k1e = cmtgKey('ECDSA', C.blue, keyAt(g1, 0)), k2e = cmtgKey('ECDSA', C.blue, keyAt(g2, 0));

    /* ---- relying party ---- */
    const sv = K.server(s, 'shrine.com').at(1040, 165);
    const db = K.panel(s, 440, 170, 'CMTG key shrine.com has on file', { size: 16, italic: true }).at(1040, 565);
    const rowY = [545, 605];
    const rowLbl = [1, 2].map((n, i) => s.text(`group ${n}`, { size: 16, font: 'mono', color: C.light, anchor: 'start' }).at(842, rowY[i]));
    const dbChip = (alg, color, i) => K.chip(s, alg, color, { w: 130, h: 32, size: 14 }).at(1010, rowY[i]);
    const d1e = dbChip('ECDSA', C.blue, 0), d2e = dbChip('ECDSA', C.blue, 1);
    const SV = [975, 165];
    const out = (g) => [620, g.y];
    const keysPill = () => K.pill(s, [['cmtgKeys: [ ', {}], ['ECDSA', { color: C.blue }], [', ', {}], ['ML-DSA', { color: C.yellow }], [' ]', {}]], C.light, { size: 15 });

    /** The authenticator's response: both CMTG keys, each with its own signature. */
    const response = () => {
      const box = K.panel(s, 390, 116, 'response · cmtgKeys', { size: 15, italic: true }).at(1040, 365);
      const l1 = s.text([['CMTG · ECDSA ', { color: C.blue }], [' signature ', { color: C.grey }], ['σ', { color: C.blue }]], { size: 16, font: 'mono', anchor: 'start' }).at(866, 365);
      const l2 = s.text([['CMTG · ML-DSA', { color: C.yellow }], [' signature ', { color: C.grey }], ['σ', { color: C.yellow }]], { size: 16, font: 'mono', anchor: 'start' }).at(866, 397);
      return s.g(box, l1, l2);
    };
    /** "✓ provides trust", pointing at the ECDSA signature in the response. */
    const trust = () => {
      const t = s.text([['✓ ', { color: C.green }], ['provides trust', { color: C.green, italic: true }]], { size: 21 }).at(735, 292);
      const arr = s.arrow(770, 310, 858, 358, { color: C.green, sw: 2.5, head: 11 });
      return [t, arr];
    };

    s.notes('alice\'s <b>account</b> holds her synced passkey A, available on every device. Her devices form two <b>trust groups</b>, and each group has its own CMTG key, which uses the same algorithm as the credential.');
    await s.play(create(acct.box, { dur: 0.8 }), fadeIn(acct.title), fadeIn(sv), fadeIn(db));
    await s.play(fadeIn(pkLbl), create(a), fadeIn(g1.p), fadeIn(g2.p));
    await s.play(fadeIn(k1e), fadeIn(k2e), ...rowLbl.map((t) => fadeIn(t)), fadeIn(d1e), fadeIn(d2e));

    await s.step('alice signs in from a device in trust group 1 with <code>algUpgrade</code>: B is created, signed by A. B is a synced passkey, so it belongs to the account and is available to <b>both</b> trust groups.');
    await K.travel(s, K.pill(s, 'get() + algUpgrade', C.teal), [SV, out(g1)], { out: true, dur: 1.2 });
    const b = mini(s, 'B', ...credAt(1));
    await s.play(create(b));

    await s.step('Trust group 1 has no ML-DSA CMTG key yet, so it mints one. The response returns <b>both</b> CMTG keys, each with its own signature: <code>cmtgKeys</code> becomes a list (w3c/webauthn#2472).');
    const k1m = cmtgKey('ML-DSA', C.yellow, keyAt(g1, 1));
    await s.play(create(k1m), K.flash(s, ...keyAt(g1, 1), C.yellow));
    await K.travel(s, keysPill(), [out(g1), SV], { out: true, dur: 1.3 });
    const r1 = response();
    await s.play(fadeIn(r1, { dy: 10 }));

    await s.step('shrine.com already trusts group 1\'s ECDSA CMTG key, so a valid ECDSA signature in the same response <b>provides trust</b> for the new ML-DSA key. shrine.com replaces the key it has on file.');
    const t1 = trust();
    await s.play(fadeIn(t1[0], { dx: -10 }), create(t1[1], { dur: 0.6 }));
    await s.play(...swap(d1e, dbChip('ML-DSA', C.yellow, 0)));

    await s.step('A lost CMTG key isn\'t a lock-out, so trust group 1 can <b>drop</b> its ECDSA key right away.');
    await s.play(fadeOut(r1), ...t1.map((m) => fadeOut(m)), recolor(k1e, C.red, { dur: 0.5 }));
    await s.play(uncreate(k1e, { dur: 0.8 }));

    await s.step('Later, alice signs in from trust group 2. It already has B, so this is a <b>normal</b> sign-in: no new passkey. But trust group 2 has no ML-DSA CMTG key yet, so it mints one; the ECDSA signature provides trust, shrine.com replaces group 2\'s key, and the group drops its ECDSA key.');
    await K.travel(s, K.pill(s, 'get()', C.teal), [SV, out(g2)], { out: true, dur: 1.2 });
    await s.play(indicate(b, { color: C.white, scale: 1.08 }));
    const k2m = cmtgKey('ML-DSA', C.yellow, keyAt(g2, 1));
    await s.play(create(k2m), K.flash(s, ...keyAt(g2, 1), C.yellow));
    await K.travel(s, keysPill(), [out(g2), SV], { out: true, dur: 1.3 });
    const r2 = response();
    await s.play(fadeIn(r2, { dy: 10 }));
    const t2 = trust();
    await s.play(fadeIn(t2[0], { dx: -10 }), create(t2[1], { dur: 0.6 }));
    await s.play(...swap(d2e, dbChip('ML-DSA', C.yellow, 1)));
    await s.play(fadeOut(r2), ...t2.map((m) => fadeOut(m)), recolor(k2e, C.red, { dur: 0.5 }));
    await s.play(uncreate(k2e, { dur: 0.8 }));
  };

  /* ================================================================== */
  /* appendix: the old algorithm is no longer trusted                   */
  /* ================================================================== */
  SC.untrusted = async (s) => {
    const panel = K.panel(s, 300, 330, 'authenticator').at(200, 450);
    const A = K.cardA(s).at(200, 385);
    const br = K.browser(s, 220, 140, 'browser').at(640, 455);
    const sv = K.server(s, 'shrine.com').at(1090, 380);
    const db = K.db(s).at(1090, 590);
    const dbA = mini(s, 'A', 1090 + db.slotX, 590 + db.slotY);
    const ch1 = K.channel(s, 350, 455, 528, 455);
    const ch2 = K.channel(s, 752, 455, 1022, 410);
    const status = (y, segs) => s.text(segs, { size: 19, font: 'mono', anchor: 'start' }).at(900, y);

    s.notes('Suppose the upgrade happens <b>late</b>: shrine.com no longer trusts ECDSA, so A\'s signature on its own isn\'t enough.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(br), fadeIn(sv), fadeIn(db), fadeIn(ch1), fadeIn(ch2)], { dur: 1.4 }));
    await s.play(create(A), fadeIn(dbA));

    await s.step('alice signs in with <code>algUpgrade</code> as usual. The authenticator mints B and A signs the assertion that carries it.');
    await K.travel(s, K.pill(s, 'get() + algUpgrade', C.teal), [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.5 });
    const B = K.cardB(s).at(200, 470);
    await s.play(create(B));
    await K.travel(s, K.pill(s, [['assertion(A) + ', {}], ['B', { color: C.yellow }]], C.blue), [[350, 455], [640, 455], [1022, 410]], { out: true, dur: 1.5 });

    await s.step('But shrine.com <b>no longer trusts ECDSA</b>: a valid signature from A could be forged, so it can\'t vouch for B.');
    const v = status(222, [['verify with A  ', { color: C.light }], ['✗ not trusted', { color: C.red }]]);
    await s.play(write(v, { dur: 0.9 }), indicate(dbA, { color: C.red, scale: 1.1 }));

    await s.step('So shrine.com <b>steps the user up</b> with something it does trust, e.g. another factor or account recovery.');
    await K.travel(s, K.pill(s, 'step-up challenge', C.gold), [[1022, 410], [640, 455]], { out: true, dur: 1.2 });
    const fing = K.finger(s, C.green).at(640, 470);
    await s.play(create(fing, { dur: 0.6 }));
    await s.play(fadeOut(fing, { dur: 0.4 }));
    await K.travel(s, K.pill(s, 'step-up ✓', C.green), [[640, 455], [1022, 410]], { out: true, dur: 1 });
    const su = status(254, [['step-up  ', { color: C.light }], ['✓', { color: C.green }]]);
    await s.play(write(su, { dur: 0.8 }));

    await s.step('Only after that <b>trusted</b> ceremony does shrine.com replace A with B. The API never forces it to accept B on A\'s word alone.');
    const rep = status(286, [['replace with ', { color: C.light }], ['B', { color: C.yellow }]]);
    await s.play(write(rep, { dur: 0.8 }));
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));
  };

  /* ================================================================== */
  /* algorithm agnostic: A → B → C, driven only by pubKeyCredParams     */
  /* ================================================================== */
  SC.agnostic = async (s) => {
    const Y = 330;
    const A = K.cardA(s).set({ s: 1.2 }).at(220, Y);
    const B = K.cardB(s).set({ s: 1.2 }).at(640, Y);
    const Cc = K.card(s, { id: 'C', alg: 'ML-DSA-65 + Ed25519', color: C.teal, w: 250 }).set({ s: 1.2 }).at(1075, Y);
    const hop = (x0, x1) => {
      const arr = s.arrow(x0, Y, x1, Y, { color: C.light, sw: 3 });
      const lbl = s.text('algUpgrade', { size: 17, font: 'mono', color: C.yellow }).at((x0 + x1) / 2, Y - 28);
      return [arr, lbl];
    };
    const params = (x, list) => {
      const head = s.text('pubKeyCredParams', { size: 14, font: 'mono', color: C.grey }).at(x, 440);
      const body = s.text(list, { size: 16, font: 'mono' }).at(x, 470);
      return s.g(head, body);
    };

    s.notes('<code>algUpgrade</code> doesn\'t hard-code ML-DSA. It moves a credential to whichever algorithm the RP lists first.');
    await s.play(create(A));

    await s.step('Today: the RP lists ML-DSA-44 first, so A is upgraded to B.');
    const [a1, l1] = hop(352, 508);
    const p1 = params(430, [['[ ', { color: C.light }], ['ML-DSA-44', { color: C.yellow }], [', ', { color: C.light }], ['ECDSA', { color: C.blue }], [' ]', { color: C.light }]]);
    await s.play(fadeIn(p1, { dy: 10 }));
    await s.play(create(a1, { dur: 0.7 }), write(l1, { dur: 0.7 }));
    await s.play(create(B));

    await s.step('Tomorrow: if ML-DSA-44 needs replacing, or the RP wants a <b>hybrid</b> like ML-DSA-65 + Ed25519, it just edits its list. The same flow moves B to C.');
    const [a2, l2] = hop(772, 918);
    const p2 = params(850, [['[ ', { color: C.light }], ['ML-DSA-65+Ed25519', { color: C.teal }], [', ', { color: C.light }], ['ML-DSA-44', { color: C.yellow }], [' ]', { color: C.light }]]);
    await s.play(fadeIn(p2, { dy: 10 }));
    await s.play(create(a2, { dur: 0.7 }), write(l2, { dur: 0.7 }));
    await s.play(create(Cc));
  };

  /* ================================================================== */
  /* appendix: authenticators evict backups to make space               */
  /* ================================================================== */
  SC.storage = async (s) => {
    s.offset(0, -40);
    const panel = K.panel(s, 880, 420, 'security key storage').at(560, 390);
    const rowY = [262, 332, 402, 472];
    const who = (i, user, rp) => s.text([['{ ', { color: C.grey }], [user, { color: C.white }], [', ', { color: C.grey }], [rp, { color: C.teal }], [' }', { color: C.grey }]],
      { size: 16, font: 'mono', anchor: 'start' }).at(150, rowY[i]);
    const card = (id, alg, color, x, i) => K.card(s, { id, alg, color }).set({ s: 0.72 }).at(x, rowY[i]);
    const w1 = who(0, 'alice', 'shrine.com'), w2 = who(1, 'bob', 'bank.com'), w3 = who(2, 'carol', 'shop.com');
    const A = card('A', 'ECDSA P-256', C.blue, 520, 0);
    const bk = s.text('backup', { size: 15, italic: true, color: C.grey }).at(520, rowY[0] + 34);
    const B = card('B', 'ML-DSA-44', C.yellow, 680, 0);
    const X = card('X', 'ECDSA P-256', C.green, 520, 1);
    const Y = card('Y', 'ML-DSA-44', C.maroon, 520, 2);

    // Storage meter: 4 slots.
    const BAR_W = 600, BAR_X = 600, BAR_Y = 548;
    const barLbl = s.text('storage', { size: 16, font: 'mono', color: C.grey, anchor: 'start' }).at(170, BAR_Y);
    const bar = s.rect(BAR_W, 20, { color: C.dim, sw: 2, rx: 10 }).at(BAR_X, BAR_Y);
    const fill = s.rect(BAR_W, 20, { color: C.red, sw: 0, fill: C.red, fo: 0.55, rx: 10 }).at(BAR_X, BAR_Y);
    const fr = fill.g.querySelector('rect');
    let frac = 1;
    const setFill = (to2, color) => anim(0.8, null, (a) => {
      const f = lerp(frac, to2, a), w = BAR_W * f;
      fr.setAttribute('width', w.toFixed(1));
      fr.setAttribute('x', (-BAR_W / 2).toFixed(1));
      if (color) fr.setAttribute('fill', lerpColor(fr.getAttribute('fill'), color, a));
      if (a >= 1) frac = to2;
    });

    s.notes('Security keys have very little storage, and keeping backups uses more of it.');
    await s.play(create(panel.box, { dur: 0.8 }), fadeIn(panel.title));
    await s.play(lagged([fadeIn(w1), fadeIn(A), fadeIn(bk), fadeIn(B), fadeIn(w2), fadeIn(X), fadeIn(w3), fadeIn(Y)], { dur: 1.4 }),
      fadeIn(barLbl), fadeIn(bar), fadeIn(fill));
    const full = s.text('full', { size: 16, italic: true, color: C.red, anchor: 'start' }).at(BAR_X + BAR_W / 2 + 16, BAR_Y);
    await s.play(fadeIn(full));

    await s.step('A new site asks to register a passkey, but the key is <b>full</b>.');
    const req = K.pill(s, [['create() · ', {}], ['dave, news.com', { color: C.white }]], C.teal);
    await K.travel(s, req, [[1300, rowY[3]], [1140, rowY[3]]], { dur: 1 });
    await s.play(wiggle(full, { angle: 3 }), indicate(fill, { color: C.red, scale: 1.02 }));

    await s.step('Authenticators may <b>delete old backed-up credentials</b> to make space. A has been superseded by the newer B, so it goes first.');
    const box = scanBox(s, 520, rowY[0]).set({ s: 0.85 });
    await s.play(create(box, { dur: 0.5 }));
    await s.play(recolor(A, C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }), fadeOut(bk), fadeOut(box), fadeOut(full), setFill(0.75, C.gold));

    await s.step('Now the new passkey fits.');
    const w4 = who(3, 'dave', 'news.com');
    const D = card('D', 'ML-DSA-44', C.teal, 520, 3);
    await s.play(fadeOut(req, { dur: 0.4 }), fadeIn(w4, { dx: -20 }));
    await s.play(create(D), setFill(1, C.red));
  };

  window.SCENES = SC;
})();
