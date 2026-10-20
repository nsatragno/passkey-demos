/* Scene scripts. Each is an async function of a Ctx `s`. Canvas: 1280×720. */
(function () {
  'use strict';
  const { C, create, uncreate, write, fadeIn, fadeOut, to, recolor, indicate, wiggle, along, lagged, succession,
    call, anim, Ease, lerpColor, clamp } = Anim;

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
  /* 1. threat                                                          */
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
    s.say('Every passkey and security key credential today signs with <b>classical</b> cryptography.');
    await s.play(write(title, { dur: 1.4 }), lagged(keys.map((k) => fadeIn(k, { scale: 0.3, dur: 0.6 })), { dur: 2.6 }));
    s.say('Billions of them: synced by passkey providers, or burned into hardware security keys.');
    await s.play(lagged(keys.filter((_, i) => i % 7 === 3).map((k) => indicate(k, { color: C.white, scale: 1.3 })), { dur: 2.2 }));
    await s.wait(0.6);

    s.say('A large enough quantum computer breaks the math underneath. Every one of these signatures becomes <span class="r">forgeable</span>.');
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
    await s.wait(0.8);

    s.say('Now rewind. Suppose every credential first moved to a <span class="y">post-quantum</span> algorithm like ML-DSA…');
    await s.play(anim(1.2, null, (a) => { for (const k of keys) applyBreak(k, 1 - a); }), fadeOut(q, { dur: 0.8 }));
    const title2 = s.text([['ML-DSA-44', { color: C.yellow }], ['   (FIPS 204)', { color: C.grey }]], { size: 36 }).at(640, 92);
    const sorted = [...keys].sort((a, b) => a.x0 - b.x0);
    await s.play(fadeOut(title, { dy: -20 }), fadeIn(title2, { dy: 20 }),
      lagged(sorted.map((k) => recolor(k, C.yellow, { dur: 0.5 })), { dur: 2.2 }));
    await s.wait(0.4);

    s.say('…then the same attack finds nothing to break.');
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

    s.say('The hard part is the move itself: changing the key inside a credential people <em>already have</em>, without making them re-register.');
    await s.play(lagged(keys.map((k) => fadeOut(k, { scale: 0.4, dur: 0.4 })), { dur: 1.4 }), fadeOut(title2));
    const a = K.cardA(s).at(380, 360).set({ s: 1.4 });
    const b = K.cardB(s).at(900, 360).set({ s: 1.4 });
    const arr = s.arrow(530, 360, 750, 360, { color: C.light, sw: 3 });
    const qm = s.text('?', { size: 52, color: C.light }).at(640, 305);
    await s.play(create(a));
    await s.play(create(arr, { dur: 0.7 }), write(qm, { dur: 0.7 }));
    await s.play(create(b));
    await s.wait(2.5);
  };

  /* ================================================================== */
  /* 2. naive                                                           */
  /* ================================================================== */
  SC.naive = async (s) => {
    const phone = K.phone(s, 'passkey provider').at(190, 262);
    const keyA = K.key(s, C.blue).at(190, 230).set({ s: 1.1, r: -30 });
    const aLbl = s.text('A', { size: 26, italic: true, color: C.blue }).at(190, 290);
    const sk = K.secKey(s, 'security key').at(190, 570);
    const br = K.browser(s, 240, 160, 'browser').at(640, 360);
    const sv = K.server(s, 'shrine.com').at(1090, 340);
    const ch1 = K.channel(s, 260, 262, 515, 345);
    const ch2 = K.channel(s, 240, 560, 515, 380);
    const ch3 = K.channel(s, 765, 360, 1018, 345);
    const prompts = s.text([['user prompts: ', { color: C.grey }], ['0', { color: C.white }]], { size: 18, font: 'mono' }).at(640, 250);
    const setPrompts = (n, color) => {
      const spans = prompts.textEl.querySelectorAll('tspan');
      spans[spans.length - 1].textContent = String(n);
      if (color) spans[spans.length - 1].setAttribute('fill', color);
    };

    s.say('Without new APIs, an RP could sign alice in with <code>get()</code>, then call <code>create()</code> for a new ML-DSA credential.');
    await s.play(lagged([fadeIn(phone), fadeIn(sk), fadeIn(br), fadeIn(sv), fadeIn(ch1), fadeIn(ch2), fadeIn(ch3)], { dur: 1.6 }));
    await s.play(create(keyA), write(aLbl), fadeIn(prompts));

    const p1 = K.pill(s, 'get()', C.teal);
    await K.travel(s, p1, [[1018, 345], [640, 360], [262, 262]], { out: true, dur: 1.6 });
    const fing = K.finger(s, C.green).at(190, 330).set({ s: 0.9 });
    await s.play(create(fing, { dur: 0.6 }), call(() => setPrompts(1)), indicate(prompts, { color: C.white }));
    await s.play(fadeOut(fing, { dur: 0.3 }));
    const p2 = K.pill(s, 'assertion · A', C.blue);
    await K.travel(s, p2, [[262, 262], [640, 360], [1018, 345]], { out: true, dur: 1.6 });
    const ok = K.check(s).at(1090, 236);
    await s.play(create(ok, { dur: 0.5 }));
    await s.wait(0.4);

    s.say('Then a second request, <code>create()</code>, asks for an ML-DSA credential. That means a <b>second</b> prompt…');
    await s.play(fadeOut(ok, { dur: 0.3 }));
    const p3 = K.pill(s, 'create()', C.yellow);
    await K.travel(s, p3, [[1018, 345], [640, 360]], { out: true, dur: 1 });
    await s.play(call(() => setPrompts(2, C.red)), indicate(prompts, { color: C.red, scale: 1.25 }));

    s.say('…and nothing makes alice use the <b>same</b> authenticator. She taps her security key instead.');
    const p4 = K.pill(s, 'create()', C.yellow);
    await K.travel(s, p4, [[640, 360], [240, 560]], { out: true, dur: 1 });
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }));
    const keyB = K.key(s, C.yellow).at(320, 560).set({ s: 1.1, r: -30 });
    const bLbl = s.text('B', { size: 26, italic: true, color: C.yellow }).at(320, 612);
    await s.play(create(keyB), write(bLbl), K.flash(s, 320, 560, C.yellow));
    const p5 = K.pill(s, 'new credential · B', C.yellow);
    await K.travel(s, p5, [[240, 560], [640, 360], [1018, 345]], { out: true, dur: 1.6 });

    s.say('Three problems:');
    const items = [
      ['①', 'two prompts for one sign-in'],
      ['②', 'B may be on a different authenticator'],
      ['③', 'nothing proves A vouched for B'],
    ].map(([n, t], i) => s.text([[n + '  ', { color: C.red }], [t, { color: C.white }]], { size: 22, anchor: 'start' }).at(770, 520 + i * 44));
    await s.play(fadeIn(items[0], { dx: -20 }), indicate(prompts, { color: C.red }));
    await s.play(fadeIn(items[1], { dx: -20 }), indicate(sk, { color: C.red, scale: 1.08 }));
    const link = s.path('M 210 250 C 400 330, 420 470, 320 540', { color: C.red, sw: 2.5 });
    link.pathEl.setAttribute('stroke-dasharray', '8 8'); link.pathEl.dataset.nodraw = 1;
    const lq = s.text('?', { size: 36, color: C.red }).at(400, 400);
    await s.play(fadeIn(items[2], { dx: -20 }), fadeIn(link), write(lq));
    await s.wait(1);
    s.say('The proposal fixes all three: <b>one</b> ceremony, on the <b>same</b> authenticator, with A <b>signing</b> B into existence.');
    await s.play(lagged(items.map((it) => indicate(it, { color: C.green, scale: 1.05 })), { dur: 1.6 }));
    await s.wait(2.5);
  };

  /* ================================================================== */
  /* 3. stack                                                           */
  /* ================================================================== */
  SC.stack = async (s) => {
    const L = authList(s);
    const slot1 = dashedRect(s, 200, 86).at(L.xs[0], L.y);
    const A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 240);
    const db = K.db(s).at(1080, 480);
    const dbA = mini(s, 'A', 1080 + db.slotX, 480 + db.slotY);

    s.say('Today an authenticator stores <b>one</b> credential per <code>{ user id, RP ID }</code>.');
    await s.play(create(L.panel, { dur: 1 }), fadeIn(sv), fadeIn(db));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot1), fadeIn(dbA));
    await s.play(create(A));
    await s.wait(0.8);

    s.say('Creating a new credential for alice on shrine.com <b>overwrites</b> the old one.');
    const B = K.cardB(s, 't₂').at(L.xs[0], 130);
    await s.play(fadeIn(B, { dy: -30 }));
    await s.play(to(B, { y: L.y }, { dur: 0.9, ease: Ease.back }),
      succession([Anim.wait(0.35), to(A, { y: L.y + 230, r: 24, o: 0 }, { dur: 0.9, ease: Ease.in })]),
      recolor(A, C.red, { dur: 0.6 }));
    A.g.remove();
    await s.wait(0.5);

    s.say('Now suppose the response carrying B never reaches the server…');
    const pb = mini(s, 'B', 0, 0, 0.55);
    await lose(s, pb, [790, L.y], [1010, 300]);

    s.say('alice is locked out. Her authenticator only has <span class="y">B</span>, and the server only accepts <span class="b">A</span>.');
    const nm = s.text('✗  no match', { size: 26, color: C.red }).at(880, 640);
    await s.play(indicate(B, { color: C.red, scale: 1.08 }), indicate(dbA, { color: C.red, scale: 1.12 }), write(nm));
    await s.wait(1.5);

    s.say('The proposal: map each <code>{ user id, RP ID }</code> to a <b>list</b> of credentials, ordered by creation time.');
    await s.play(fadeOut(nm), fadeOut(B, { scale: 0.8 }), fadeOut(slot1));
    const slot2 = dashedRect(s, 400, 96).at(L.slotX, L.y);
    const order = s.text('oldest  ⟶  newest', { size: 16, italic: true, color: C.grey }).at(L.slotX, L.y - 74);
    const A2 = K.cardA(s, 't₁').at(L.xs[0], L.y);
    await s.play(fadeIn(slot2, { scale: 0.9 }), fadeIn(A2), fadeIn(order));
    const B2 = K.cardB(s, 't₂').at(L.xs[1], L.y);
    await s.play(fadeIn(B2, { dx: 60 }));
    await s.wait(0.6);

    s.say('If B reaches the server, the server now knows B.');
    const pb2 = mini(s, 'B', 0, 0, 0.55);
    await K.travel(s, pb2, [[790, L.y], [1010, 300]], { out: true, dur: 1.2 });
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));

    s.say('If it doesn\'t, <span class="b">A</span> is still there to fall back on.');
    const bk = s.text('backup', { size: 17, italic: true, color: C.grey }).at(L.xs[0], L.y + 62);
    await s.play(indicate(A2, { color: C.white, scale: 1.08 }), fadeIn(bk, { dy: -10 }));
    await s.wait(0.6);

    s.say('Requests with an <b>empty</b> allow-list (usernameless sign-in) always use the <b>newest</b> credential.');
    const req = K.pill(s, 'allowCredentials: [ ]', C.teal);
    await K.travel(s, req, [[1010, 300], [L.xs[1], 150]], { dur: 1.2 });
    const box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.6 }), fadeOut(req));
    await s.play(indicate(B2, { color: C.yellow }));
    const resp = K.pill(s, 'assertion · B', C.yellow);
    await K.travel(s, resp, [[790, L.y], [1010, 300]], { out: true, dur: 1.1 });
    const ok = K.check(s).at(1080, 130);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbB, { color: C.green, scale: 1.12 }));
    await s.wait(2.5);
  };

  /* ================================================================== */
  /* 4. cleanup                                                         */
  /* ================================================================== */
  SC.cleanup = async (s) => {
    const L = authList(s, { cy: 400 });
    const slot = dashedRect(s, 400, 96).at(L.slotX, L.y);
    let A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    let B = K.cardB(s, 't₂').at(L.xs[1], L.y);
    const sv = K.server(s, 'shrine.com').at(1080, 230);
    const reqAt = [L.slotX, 160];

    s.say('alice\'s authenticator holds <span class="b">A</span> and a newer <span class="y">B</span>.');
    await s.play(create(L.panel, { dur: 0.9 }), fadeIn(sv));
    await s.play(fadeIn(L.chip, { dx: -20 }), create(L.arr, { dur: 0.6 }), fadeIn(slot), create(A), create(B));

    /* ---- round 1: allow-list [A] ---- */
    s.say('An <b>allow-list</b> request arrives. The authenticator looks for the <b>newest</b> credential that matches…');
    let req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal, { size: 18 });
    await K.travel(s, req, [[1010, 250], reqAt], { dur: 1.2 });
    let box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));
    let m1 = K.cross(s, C.grey, 0.8).at(L.xs[1], L.y - 66);
    await s.play(create(m1, { dur: 0.4 }));
    await s.play(to(box, { x: L.xs[0] }, { dur: 0.7 }));
    let m2 = K.check(s, C.green, 0.9).at(L.xs[0], L.y - 66);
    await s.play(create(m2, { dur: 0.4 }));

    s.say('…uses it, and <span class="r">erases every other credential</span> for that user and RP.');
    await s.play(recolor(B, C.red, { dur: 0.5 }));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(m1));
    const r1 = K.pill(s, 'assertion · A', C.blue);
    await s.play(fadeOut(req), fadeOut(box), fadeOut(m2));
    await K.travel(s, r1, [[790, L.y], [1010, 250]], { out: true, dur: 1.1 });
    await s.wait(0.5);

    /* ---- round 2: allow-list [B] ---- */
    s.say('If the server knows <span class="y">B</span> instead, the same rule cleans up the backup <span class="b">A</span>.');
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
    await s.wait(0.4);

    /* ---- restoreCredentials ---- */
    s.say('And a new extension, <code>restoreCredentials</code>, tells the RP which backups still exist.');
    await s.play(to(B, { x: L.xs[1] }, { dur: 0.6 }));
    A = K.cardA(s, 't₁').at(L.xs[0], L.y);
    await s.play(fadeIn(A, { dy: -30 }));
    req = K.pill(s, 'allowCredentials: [ ]  ·  restoreCredentials: true', C.teal, { size: 15 });
    await K.travel(s, req, [[1010, 250], [L.slotX - 30, 160]], { dur: 1.2 });
    box = scanBox(s, L.xs[1], L.y);
    await s.play(create(box, { dur: 0.5 }));

    const out = K.panel(s, 410, 190, 'response', { size: 16, italic: true }).at(1035, 560);
    const code = s.lines([
      [['assertion', { color: C.white }], ['   signed by ', { color: C.grey }], ['B', { color: C.yellow }]],
      [['restoreCredentials: {', { color: C.light }]],
      [['  existingCredentials: [ ', { color: C.light }], ['A', { color: C.blue }], [' ]', { color: C.light }]],
      [['}', { color: C.light }]],
    ], { size: 16, font: 'mono', lh: 28 }).at(850, 522);
    await s.play(fadeIn(out), fadeOut(req));
    await s.play(write(code, { dur: 1.8 }));
    const hl = s.rect(300, 30, { color: C.yellow, sw: 2, rx: 8 }).at(1003, 578);
    await s.play(create(hl, { dur: 0.6 }), indicate(A, { color: C.white, scale: 1.08 }));
    s.say('The list is signed. It lets the RP tell a lost upgrade apart from a passkey the user deleted.');
    await s.wait(3);
  };

  /* ================================================================== */
  /* 5. upgrade                                                         */
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

    s.say('alice has credential <span class="b">A</span> (ECDSA). shrine.com wants to move her to ML-DSA.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(br), fadeIn(sv), fadeIn(db), fadeIn(ch1), fadeIn(ch2)], { dur: 1.5 }));
    await s.play(create(A), fadeIn(dbA));

    const code = s.lines([
      [['navigator.credentials.get({ publicKey: { …, extensions: {', { color: C.light }]],
      [['  algUpgrade', { color: C.yellow }], [': { pubKeyCredParams: [', { color: C.light }]],
      [['    { alg: ', { color: C.light }], ['-48', { color: C.gold }], [' },  ', { color: C.light }], ['// ML-DSA-44', { color: C.grey }]],
      [['    { alg: ', { color: C.light }], ['-7', { color: C.gold }], [' },   ', { color: C.light }], ['// ECDSA', { color: C.grey }]],
      [['  ] } } } });', { color: C.light }]],
    ], { size: 18, font: 'mono', lh: 28 }).at(330, 60);
    s.say('It adds <code>algUpgrade</code> to an <em>ordinary</em> sign-in, listing the algorithms it accepts, most preferred first.');
    await s.play(write(code, { dur: 2.4 }));
    await s.play(indicate(code.rows[2], { color: C.yellow, scale: 1.04 }));
    await s.wait(0.6);

    const req = K.pill(s, 'get() + algUpgrade', C.teal);
    await K.travel(s, req, [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.8 });

    s.say('The authenticator picks the first algorithm it supports, ML-DSA-44, and has no ML-DSA credential for alice yet…');
    const c1 = s.text([['ML-DSA-44 supported ', { color: C.light }], ['✓', { color: C.green }]], { size: 15, font: 'mono' }).at(200, 520);
    const c2 = s.text([['ML-DSA cred exists? ', { color: C.light }], ['no', { color: C.red }]], { size: 15, font: 'mono' }).at(200, 552);
    await s.play(write(c1, { dur: 0.9 }));
    await s.play(write(c2, { dur: 0.9 }));
    await s.wait(0.5);

    s.say('…so it mints a new credential, <span class="y">B</span>.');
    const B = K.cardB(s).at(200, 470);
    await s.play(fadeOut(c1), fadeOut(c2));
    await s.play(create(B));
    await s.play(indicate(B, { color: C.white, scale: 1.08 }));

    s.say('alice verifies once, the same as any other sign-in.');
    const fing = K.finger(s, C.green).at(200, 560);
    await s.play(create(fing, { dur: 0.7 }));
    await s.play(indicate(fing, { color: C.green, scale: 1.3 }));
    await s.play(fadeOut(fing, { dur: 0.4 }), fadeOut(code, { dy: -20 }));

    /* ---- the signed document ---- */
    s.say('The old key <span class="b">A</span> signs the assertion, and <span class="y">B</span>\'s public key is <b>inside</b> the signed data.');
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
    s.say('That is the <b>transfer of trust</b>: anyone who trusts A can now trust B.');
    await s.play(indicate(Bc, { color: C.yellow, scale: 1.1 }));
    await s.wait(1);

    /* ---- send to server ---- */
    const pkg = s.g();
    s.add(pkg);
    [doc, Bc, seal, wrap].forEach((m) => { m.x -= 640; m.y -= 210; m.apply(); pkg.add(m); });
    pkg.at(640, 210);
    await s.play(fadeOut(wl, { dur: 0.3 }));
    await s.play(to(pkg, { y: 455, s: 0.32 }, { dur: 0.9 }));
    await s.play(to(pkg, { x: 1022, y: 410 }, { dur: 1.1 }));
    await s.play(fadeOut(pkg, { scale: 0.6, dur: 0.4 }));

    s.say('shrine.com verifies the signature with <span class="b">A</span>, which it already trusts, then swaps A for <span class="y">B</span>.');
    const ver = s.text([['verify with A  ', { color: C.light }], ['✓', { color: C.green }]], { size: 20, font: 'mono' }).at(1090, 275);
    await s.play(write(ver, { dur: 0.9 }));
    const dbB = mini(s, 'B', dbA.x, dbA.y);
    await s.play(...swap(dbA, dbB));
    await s.wait(0.8);

    s.say('Later, an allow-list request naming <span class="y">B</span> lets the authenticator erase the backup <span class="b">A</span>.');
    await s.play(fadeOut(ver));
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['B', { color: C.yellow }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [[1022, 410], [640, 455], [350, 455]], { out: true, dur: 1.6 });
    await s.play(recolor(A, C.red, { dur: 0.5 }));
    await s.play(uncreate(A, { dur: 0.8 }));
    await s.play(to(B, { y: 385 }));

    s.say('alice is now on ML-DSA. <b>One</b> ceremony, the <b>same</b> authenticator, and trust carried over.');
    await s.play(indicate(B, { color: C.white, scale: 1.1 }), indicate(dbB, { color: C.white, scale: 1.12 }));
    await s.wait(2.5);
  };

  /* ================================================================== */
  /* 6a. lost upgrade, allow-list flow                                  */
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

    s.say('<code>bank.com</code> uses security keys as a second factor, so every request carries an allow-list.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(sk), fadeIn(sv), fadeIn(db), fadeIn(ch)], { dur: 1.4 }));
    await s.play(create(A), fadeIn(dbA));

    s.say('It asks for an upgrade. The key mints <span class="y">B</span> and sends it back, signed by A…');
    const req = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ] + algUpgrade', {}]], C.teal);
    await K.travel(s, req, [P1, P0], { out: true, dur: 1.5 });
    const B = K.cardB(s).at(320, 450);
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }));
    await s.play(create(B));
    await s.play(indicate(B, { color: C.white, scale: 1.08 }));

    s.say('…but the connection drops. The server never sees B.');
    const resp = K.pill(s, [['assertion(A) + ', {}], ['B', { color: C.yellow }]], C.blue);
    await lose(s, resp, P0, P1);
    await s.play(indicate(dbA, { color: C.white, scale: 1.12 }));
    await s.wait(0.6);

    s.say('On the next sign-in, bank.com just sends the allow-list it knows: <code>[A]</code>.');
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [P1, [320, 260]], { dur: 1.5 });
    const box = scanBox(s, 320, 450);
    await s.play(create(box, { dur: 0.5 }));
    const x1 = K.cross(s, C.grey, 0.7).at(430, 450);
    await s.play(create(x1, { dur: 0.4 }));
    await s.play(to(box, { y: 360 }, { dur: 0.6 }));
    const c1 = K.check(s, C.green, 0.8).at(430, 360);
    await s.play(create(c1, { dur: 0.4 }));

    s.say('The key signs with <span class="b">A</span> and erases <span class="r">B</span>. bank.com didn\'t have to do anything special.');
    await s.play(recolor(B, C.red, { dur: 0.5 }), fadeOut(x1));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req2));
    await s.play(fadeOut(box), fadeOut(c1));
    const r2 = K.pill(s, 'assertion · A', C.blue);
    await K.travel(s, r2, [P0, P1], { out: true, dur: 1.4 });
    const ok = K.check(s).at(1060, 210);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbA, { color: C.green, scale: 1.12 }));
    s.say('Everything is consistent again, and the upgrade will simply be retried on a later sign-in.');
    await s.wait(3);
  };

  /* ================================================================== */
  /* 6b. lost upgrade, usernameless flow                                */
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

    s.say('<code>shrine.com</code> uses usernameless passkeys. Same failure as before: <span class="y">B</span> was minted but never saved.');
    await s.play(lagged([create(panel.box), fadeIn(panel.title), fadeIn(sv), fadeIn(db), fadeIn(ch)], { dur: 1.4 }));
    await s.play(create(A), create(B), fadeIn(dbA));

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

    s.say('The server has never seen <span class="y">B</span>. Is this a lost upgrade, or a passkey alice deleted?');
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

    s.say('<code>existingCredentials</code> is <code>[A]</code>, which isn\'t empty, so this authenticator has a backup.');
    await s.play(fadeOut(unk), create(n1, { dur: 1 }));
    await s.play(fadeIn(s1, { o: 0.45 }), fadeIn(a1s, { o: 0.45 }), fadeIn(y1, { o: 0.45 }));
    await s.play(create(a12, { dur: 0.6 }), write(no1, { dur: 0.4 }));

    s.say('Is any of them one of alice\'s credentials? <span class="b">A</span> is, so this is a <b>lost upgrade</b>.');
    await s.play(create(n2, { dur: 1 }));
    await s.play(fadeIn(s2, { o: 0.45 }), fadeIn(a2s, { o: 0.45 }), fadeIn(y2, { o: 0.45 }));
    await s.play(create(a23, { dur: 0.6 }), write(no2, { dur: 0.4 }));
    await s.play(create(n3, { dur: 1 }));
    await s.wait(0.5);

    s.say('So shrine.com sends a second request, <code>allowCredentials: [A]</code>…');
    await s.play(fadeOut(resp));
    const req2 = K.pill(s, [['allowCredentials: [ ', {}], ['A', { color: C.blue }], [' ]', {}]], C.teal);
    await K.travel(s, req2, [P1, [180, 250]], { dur: 1.3 });
    const box2 = scanBox(s, 180, 360);
    await s.play(create(box2, { dur: 0.5 }));

    s.say('…the authenticator signs with <span class="b">A</span>, erases <span class="r">B</span>, and alice is signed in.');
    await s.play(recolor(B, C.red, { dur: 0.5 }));
    await s.play(uncreate(B, { dur: 0.8 }), fadeOut(req2));
    const r2 = K.pill(s, 'assertion · A', C.blue);
    await s.play(fadeOut(box2));
    await K.travel(s, r2, [P0, P1], { out: true, dur: 1.2 });
    const ok = K.check(s).at(560, 190);
    await s.play(create(ok, { dur: 0.5 }), indicate(dbA, { color: C.green, scale: 1.12 }), indicate(n3, { color: C.green, scale: 1.05 }));
    await s.wait(0.6);

    s.say('If none of them had been alice\'s, she deleted that passkey herself. Then the RP calls <code>signalUnknownCredential</code> and offers another way in.');
    await s.play(to(s2, { o: 1 }), indicate(s2, { color: C.white, scale: 1.08 }));
    await s.wait(3);
  };

  /* ================================================================== */
  /* 7. extensions                                                      */
  /* ================================================================== */
  SC.extensions = async (s) => {
    const A = K.cardA(s).at(330, 120).set({ s: 1.35 });
    const B = K.cardB(s).at(950, 120).set({ s: 1.35 });
    const arr = s.arrow(470, 120, 810, 120, { color: C.light, sw: 3 });
    const al = s.text('algUpgrade', { size: 18, font: 'mono', color: C.yellow }).at(640, 95);
    const names = ['hmac-secret / PRF', 'largeBlob', 'credBlob', 'credProtect', 'thirdPartyPayment'];
    const chip = (t, x, y) => s.g(
      s.rect(250, 40, { color: C.light, sw: 1.8, fill: C.light, fo: 0.06, rx: 20 }),
      s.text(t, { size: 16, font: 'mono', color: C.light }),
    ).at(x, y);
    const chipsA = names.map((n, i) => chip(n, 330, 232 + i * 54));

    s.say('A credential is more than a key pair. RPs rely on per-credential state set by extensions.');
    await s.play(create(A), create(B));
    await s.play(create(arr, { dur: 0.7 }), write(al, { dur: 0.7 }));
    await s.play(lagged(chipsA.map((c) => fadeIn(c, { dy: -14 })), { dur: 1.4 }));

    s.say('During an upgrade that state is <b>copied</b> from <span class="b">A</span> to <span class="y">B</span>, so nothing that depends on it breaks.');
    const copies = chipsA.map((c, i) => chip(names[i], 330, c.y));
    await s.play(lagged(copies.map((c) => to(c, { x: 950 }, { dur: 1.1, arc: -0.25 })), { dur: 2.6 }));
    await s.play(lagged(copies.map((c) => indicate(c, { color: C.yellow, scale: 1.06 })), { dur: 1.2 }));
    await s.wait(0.6);

    s.say('Take PRF: the same input gives the <b>same output</b> from both credentials, so data encrypted under it stays readable.');
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
    await s.wait(0.8);

    s.say('Two things do <b>not</b> carry over: B has no attestation of its own, and the RP can\'t attach new creation-time extensions.');
    const no1 = s.text([['✗  ', { color: C.red }], ['attestation statement', { color: C.light }]], { size: 22, anchor: 'start' }).at(470, 500);
    const no2 = s.text([['✗  ', { color: C.red }], ['new creation-time extensions', { color: C.light }]], { size: 22, anchor: 'start' }).at(470, 546);
    await s.play(fadeIn(no1, { dx: -20 }));
    await s.play(fadeIn(no2, { dx: -20 }));
    s.say('Neither is needed: B is trusted <em>because A signed it</em>, and an upgrade never gives B abilities A didn\'t have.');
    const why = s.text([['B is trusted because ', { color: C.light }], ['A', { color: C.blue, italic: true }], [' signed it', { color: C.light }]], { size: 24, italic: true }).at(640, 630);
    await s.play(write(why, { dur: 1.4 }));
    await s.play(indicate(A, { color: C.blue, scale: 1.08 }));
    await s.wait(2.5);
  };

  /* ================================================================== */
  /* 8. security keys                                                   */
  /* ================================================================== */
  SC.seckey = async (s) => {
    const win = K.browser(s, 470, 330, 'platform UI').at(300, 380);
    const sk = K.secKey(s, 'security key').at(930, 380);
    const named = (name, alg, color) => K.card(s, { id: name, alg, color, w: 170 });
    const cAlice = named('alice', 'ECDSA P-256', C.blue).at(1140, 330);
    const cBob = named('bob', 'ECDSA P-256', C.blue).at(1140, 420);
    // Replace "cred " prefix for named cards.
    [cAlice, cBob].forEach((c) => { c.label.textEl.querySelectorAll('tspan.ch').forEach((t, i) => { if (i < 5) t.textContent = ''; }); });
    const ch = K.channel(s, 535, 380, 880, 380);
    const P0 = [535, 380], P1 = [880, 380];

    s.say('Security keys have no screen. With an empty allow-list they return an assertion for <em>every</em> account…');
    await s.play(lagged([fadeIn(win), fadeIn(sk), fadeIn(ch)], { dur: 1.2 }));
    await s.play(create(cAlice), create(cBob));
    const req = K.pill(s, 'getAssertion · allowList: [ ]', C.teal, { size: 15 });
    await K.travel(s, req, [P0, P1], { out: true, dur: 1.3 });
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }), indicate(cAlice, { color: C.white }), indicate(cBob, { color: C.white }));
    const row = (t, y) => s.g(
      s.rect(300, 46, { color: C.light, sw: 1.5, fill: C.light, fo: 0.05, rx: 10 }),
      s.text(t, { size: 18, font: 'mono', color: C.light }),
    ).at(300, y);
    const rA = row('alice', 365), rB = row('bob', 425);
    const pa = K.pill(s, 'alice', C.blue), pb = K.pill(s, 'bob', C.blue);
    pa.at(...P1); pb.at(...P1);
    await s.play(fadeIn(pa), fadeIn(pb));
    await s.play(to(pa, { x: 300, y: 365 }, { dur: 1.2 }), to(pb, { x: 300, y: 425 }, { dur: 1.4 }));
    await s.play(fadeOut(pa, { dur: 0.3 }), fadeOut(pb, { dur: 0.3 }), fadeIn(rA, { dur: 0.3 }), fadeIn(rB, { dur: 0.3 }));
    const pick = s.text('choose an account', { size: 17, italic: true, color: C.grey }).at(300, 300);
    await s.play(fadeIn(pick));

    s.say('…and the platform asks the user to pick. Upgrading at this point would touch accounts the user never chose.');
    const q1 = s.text('?', { size: 34, color: C.red }).at(1245, 330);
    const q2 = s.text('?', { size: 34, color: C.red }).at(1245, 420);
    await s.play(write(q1), write(q2), recolor(cAlice, C.red), recolor(cBob, C.red));
    await s.wait(1);
    await s.play(fadeOut(q1), fadeOut(q2), recolor(cAlice, C.blue), recolor(cBob, C.blue), fadeOut(rA), fadeOut(rB), fadeOut(pick));

    s.say('Instead the platform gets a PIN/UV token with one touch, then <b>enumerates</b> the credentials itself…');
    const steps = s.lines([
      [['①  ', { color: C.yellow }], ['touch → pinUvAuthToken', { color: C.light }]],
      [['②  ', { color: C.yellow }], ['credentialManagement: enumerate', { color: C.light }]],
      [['③  ', { color: C.yellow }], ['getAssertion · allowList: [alice]', { color: C.light }]],
      [['     + algUpgrade', { color: C.yellow }]],
    ], { size: 15, font: 'mono', lh: 26 }).at(85, 250);
    steps.rows.forEach((r) => { r.o = 0; r.apply(); });
    s.add(steps);
    await s.play(fadeIn(steps.rows[0], { dx: -10 }));
    await s.play(indicate(sk.pad, { color: C.green, scale: 1.4 }));
    await s.play(fadeIn(steps.rows[1], { dx: -10 }));
    const enumP = K.pill(s, 'enumerateCredentials', C.teal, { size: 15 });
    await K.travel(s, enumP, [P0, P1], { out: true, dur: 1.2 });
    const rA2 = row('alice', 440), rB2 = row('bob', 495);
    await s.play(fadeIn(rA2, { dx: 30 }), fadeIn(rB2, { dx: 30 }));

    s.say('…the user picks <b>alice</b>…');
    const cur = K.cursor(s).at(500, 560);
    await s.play(fadeIn(cur));
    await s.play(to(cur, { x: 330, y: 446 }, { dur: 1 }));
    await s.play(indicate(rA2, { color: C.yellow, scale: 1.05 }), recolor(rA2, C.yellow));

    s.say('…and the platform sends an allow-list with exactly that credential, plus <code>algUpgrade</code>.');
    await s.play(fadeOut(cur), fadeIn(steps.rows[2], { dx: -10 }), fadeIn(steps.rows[3], { dx: -10 }));
    const req3 = K.pill(s, 'allowList: [alice] + algUpgrade', C.teal, { size: 15 });
    await K.travel(s, req3, [P0, P1], { out: true, dur: 1.3 });
    await s.play(indicate(cAlice, { color: C.yellow }));
    const nB = named('alice', 'ML-DSA-44', C.yellow).at(1140, 520);
    nB.label.textEl.querySelectorAll('tspan.ch').forEach((t, i) => { if (i < 5) t.textContent = ''; });
    await s.play(create(nB));
    await s.play(indicate(nB, { color: C.white, scale: 1.08 }));
    const back = K.pill(s, [['assertion(A) + ', {}], ['new cred', { color: C.yellow }]], C.blue, { size: 15 });
    await K.travel(s, back, [P1, P0], { out: true, dur: 1.3 });

    s.say('Over USB that\'s still a single touch. Over NFC it may take a second tap.');
    await s.wait(3);
  };

  /* ================================================================== */
  /* 9. timeline / trust                                                */
  /* ================================================================== */
  SC.timeline = async (s) => {
    const Y = 380;
    const axis = s.arrow(90, Y, 1200, Y, { color: C.light, sw: 3 });
    const tToday = s.g(s.line(180, Y - 12, 180, Y + 12, { color: C.light, sw: 3 }), s.text('today', { size: 22, color: C.light }).at(180, Y + 40));
    const band = s.rect(580, 18, { color: C.green, sw: 0, fill: C.green, fo: 0.35, rx: 9 }).at(470, Y);
    const bandL = s.text('upgrade window', { size: 22, italic: true, color: C.green }).at(470, Y - 38);
    const after = s.rect(420, 18, { color: C.red, sw: 0, fill: C.red, fo: 0.18, rx: 9 }).at(970, Y);
    const crqc = s.path(`M 760 ${Y - 140} L 760 ${Y + 140}`, { color: C.red, sw: 2.5 });
    crqc.pathEl.setAttribute('stroke-dasharray', '8 8'); crqc.pathEl.dataset.nodraw = 1;
    const ql = s.text([['|ψ⟩ ', { color: C.red }], ['quantum computers arrive', { color: C.red, italic: true }]], { size: 22 }).at(760, Y - 165);

    s.say('Recovery quietly assumes one thing: that the RP can still <b>trust the old algorithm</b>.');
    await s.play(create(axis, { dur: 1 }), fadeIn(tToday));
    await s.play(fadeIn(crqc), write(ql, { dur: 1 }));
    await s.play(fadeIn(band, { scale: 0.8 }), write(bandL), fadeIn(after));

    const dot = s.circle(10, { color: C.white, sw: 2, fill: C.white }).at(180, Y);
    await s.play(fadeIn(dot, { scale: 0.2 }));
    await s.play(to(dot, { x: 430 }, { dur: 1.2 }));
    s.say('Before that day, a lost upgrade that falls back to <span class="b">A</span> is safe to accept.');
    const card1 = s.g(
      s.rect(380, 110, { color: C.green, sw: 2, fill: C.dark, fo: 0.9, rx: 14 }),
      s.lines([
        [['unknown ', { color: C.light }], ['B', { color: C.yellow, italic: true }], [', backup ', { color: C.light }], ['A', { color: C.blue, italic: true }], [' found', { color: C.light }]],
        [['trust A → restore  ', { color: C.light }], ['✓', { color: C.green }]],
      ], { size: 20, lh: 34 }).at(-165, -16),
    ).at(430, 200);
    const l1 = s.line(430, 255, 430, Y - 14, { color: C.green, sw: 2 });
    await s.play(create(l1, { dur: 0.5 }), fadeIn(card1, { dy: 20 }));
    await s.wait(1.5);

    s.say('After it, an assertion that falls back to a classical key might be an <span class="r">attacker forcing a downgrade</span>.');
    await s.play(to(dot, { x: 960 }, { dur: 1.6 }), recolor(dot, C.red, { dur: 1.6 }));
    const card2 = s.g(
      s.rect(420, 140, { color: C.red, sw: 2, fill: C.dark, fo: 0.9, rx: 14 }),
      s.lines([
        [['unknown cred, classical ', { color: C.light }], ['A', { color: C.blue, italic: true }]],
        [['could be forged  ', { color: C.light }], ['✗', { color: C.red }]],
        [['→ step up another way', { color: C.light, italic: true }]],
      ], { size: 20, lh: 34 }).at(-185, -34),
    ).at(960, 570);
    const l2 = s.line(960, Y + 14, 960, 500, { color: C.red, sw: 2 });
    await s.play(create(l2, { dur: 0.5 }), fadeIn(card2, { dy: -20 }));
    await s.play(wiggle(card2, { angle: 2 }));
    await s.wait(1);

    s.say('So start upgrading <b>early</b>, while classical keys are still safe. Which algorithms to trust is the RP\'s decision, not the API\'s.');
    await s.play(indicate(band, { color: C.green, scale: 1.04 }), indicate(bandL, { color: C.white }));
    await s.wait(3);
  };

  /* ================================================================== */
  /* 10. alternatives                                                   */
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

    s.say('Microsoft\'s <code>algPolicy</code> keeps a credential for <b>every</b> algorithm side by side, as insurance in case a new algorithm breaks.');
    await s.play(write(tL), fadeIn(sL), create(gL, { dur: 0.6 }));
    s.say('That means choosing a preferred algorithm per request, deleting credentials explicitly, and extra extension plumbing.');
    const cl = left.map((t, i) => chip(t, LX, BASE - i * 46, C.gold));
    await s.play(lagged(cl.map((c) => fadeIn(c, { dy: -60, ease: Ease.out })), { dur: 3.2 }));
    const nL = s.text('9 new fields', { size: 22, color: C.gold }).at(LX, BASE + 60);
    await s.play(write(nL));

    s.say('This proposal adds far less: one list of algorithms in, one new credential out, and the backup report.');
    await s.play(write(tR), fadeIn(sR), create(gR, { dur: 0.6 }));
    const cr = right.map((t, i) => chip(t, RX, BASE - i * 46, C.yellow));
    await s.play(lagged(cr.map((c) => fadeIn(c, { dy: -60, ease: Ease.out })), { dur: 1.6 }));
    const nR = s.text('4 new fields', { size: 22, color: C.yellow }).at(RX, BASE + 60);
    await s.play(write(nR));
    await s.wait(1);

    s.say('And insurance against a broken algorithm is better served by <b>hybrid signatures</b>: one credential, two algorithms, both must hold.');
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
    await s.wait(3);
  };

  window.SCENES = SC;
})();
