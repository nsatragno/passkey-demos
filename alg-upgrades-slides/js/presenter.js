/*
 * Presenter window. Sends commands to the deck over BroadcastChannel and
 * renders the state the deck broadcasts back (the deck is the source of
 * truth). See js/sync.js for the protocol.
 *
 * ?selftest  loads the deck in a hidden iframe, drives it through the
 *            channel and reports results in <pre id="selftest">.
 * ?withdeck=S/K  loads a hidden deck at slide S, step K (for screenshots).
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const SELFTEST = params.has('selftest');
  const ch = DeckSync.open();
  const $ = (sel) => document.querySelector(sel);

  let state = null;
  let connected = false;
  const listeners = new Set();

  if (!ch) {
    $('.banner').hidden = false;
    $('.banner').firstChild.textContent = 'This browser does not support BroadcastChannel. ';
    return;
  }

  ch.onmessage = (e) => {
    const m = e.data || {};
    if (m.type !== 'state') return;
    state = m;
    if (!connected) { connected = true; $('.banner').hidden = true; }
    render();
    for (const l of listeners) l(m);
  };

  /* ---------------- commands ---------------- */
  let seq = 0;
  function send(cmd, extra) {
    const id = ++seq;
    ch.postMessage({ type: 'cmd', cmd, id, ...extra });
    if (cmd === 'next' && !timer.started) timer.start();
    return id;
  }
  const next = () => send('next');
  const prev = () => send('prev');
  const goto = (slide, step) => send('goto', { slide, step });

  $('.controls .next').addEventListener('click', next);
  $('.controls .prev').addEventListener('click', prev);
  $('.open-deck').addEventListener('click', () => window.open('index.html', 'alg-upgrades-deck'));

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ((k === ' ' && !e.shiftKey) || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter') {
      e.preventDefault(); next();
    } else if ((k === ' ' && e.shiftKey) || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
      e.preventDefault(); prev();
    } else if (k === 'Home') { e.preventDefault(); goto(1, 0); }
    else if (k === 'End' && state) { e.preventDefault(); goto(state.slideCount, 0); }
    else if (k === 'l' || k === 'L') { e.preventDefault(); send('theme'); }
  });

  /* ---------------- timer & clock ---------------- */
  const timer = {
    started: false, running: false, acc: 0, t0: 0,
    start() { this.started = true; this.running = true; this.t0 = performance.now(); },
    toggle() {
      if (!this.started) { this.start(); return; }
      if (this.running) { this.acc += performance.now() - this.t0; this.running = false; }
      else { this.t0 = performance.now(); this.running = true; }
    },
    reset() { this.started = false; this.running = false; this.acc = 0; },
    ms() { return this.acc + (this.running ? performance.now() - this.t0 : 0); },
  };
  $('.timer').addEventListener('click', () => timer.toggle());
  $('.reset').addEventListener('click', () => timer.reset());
  const pad = (n) => String(n).padStart(2, '0');
  setInterval(() => {
    const s = Math.floor(timer.ms() / 1000);
    $('.timer').textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    $('.timer').classList.toggle('paused', timer.started && !timer.running);
    const d = new Date();
    $('.clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, 250);

  /* ---------------- previews ---------------- */
  const curFrame = $('.cur-frame');
  const nextFrame = $('.next-frame');
  const setFrame = (frame, hash) => {
    if (SELFTEST) return;
    if (!frame.src) { frame.src = `index.html?embed${hash}`; return; }
    try {
      if (frame.contentWindow.location.hash !== hash) frame.contentWindow.location.hash = hash;
    } catch (e) {
      frame.src = `index.html?embed${hash}`;
    }
  };

  /* ---------------- render ---------------- */
  function render() {
    const st = state;
    if (!st) return;
    $('.title').textContent = st.title;
    $('.slide-n').textContent = `Slide ${st.slide} / ${st.slideCount}`;
    $('.step-n').textContent = st.stepCount > 1 ? `Step ${st.step + 1} / ${st.stepCount}` : '';

    const dots = $('.dots');
    if (dots.childElementCount !== st.stepCount) {
      dots.innerHTML = '';
      for (let i = 0; i < st.stepCount; i++) {
        const b = document.createElement('button');
        b.title = `Step ${i + 1}`;
        b.addEventListener('click', () => goto(state.slide, i));
        dots.appendChild(b);
      }
    }
    [...dots.children].forEach((b, i) => {
      b.classList.toggle('done', i < st.step);
      b.classList.toggle('now', i === st.step);
    });

    $('.slide-notes').innerHTML = st.slideNotes || '';
    $('.step-notes').innerHTML = st.notes || '';
    const atEnd = st.step >= st.stepCount - 1;
    $('.next-notes').innerHTML = atEnd
      ? (st.nextTitle ? `Next slide: <b>${st.nextTitle.replace(/</g, '&lt;')}</b>` : 'End of deck')
      : (st.nextNotes || '');

    const nb = $('.controls .next');
    nb.classList.toggle('skip', !!st.playing);
    nb.textContent = st.playing ? 'SKIP ▶▶' : (atEnd ? 'NEXT SLIDE ▶' : 'NEXT STEP ▶');

    setFrame(curFrame, `#/${st.slide}/${st.step}`);
    const lastSlide = st.slide >= st.slideCount;
    $('.nxt .end').hidden = !(atEnd && lastSlide);
    if (!atEnd) setFrame(nextFrame, `#/${st.slide}/${st.step + 1}`);
    else if (!lastSlide) setFrame(nextFrame, `#/${st.slide + 1}/0`);
  }

  /* ---------------- connect ---------------- */
  ch.postMessage({ type: 'hello' });
  setTimeout(() => { if (!connected && !SELFTEST) $('.banner').hidden = false; }, 1000);

  /* ---------------- selftest ---------------- */
  // ?withdeck=S/K loads a hidden deck in this window (handy for screenshots).
  if (params.has('withdeck')) {
    const frame = document.createElement('iframe');
    frame.className = 'hidden-deck';
    frame.src = `index.html?static#/${params.get('withdeck') || '1/0'}`;
    document.body.appendChild(frame);
    const poll = setInterval(() => { if (connected) clearInterval(poll); else ch.postMessage({ type: 'hello' }); }, 200);
  }
  if (SELFTEST) runSelftest();

  async function runSelftest() {
    // Under headless --virtual-time-budget, idle time is skipped. A short
    // keepalive timer keeps virtual time advancing in small steps while the
    // deck iframe processes commands.
    const keepalive = setInterval(() => {}, 50);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const report = { ok: true, checks: [] };
    const check = (name, ok, info) => { report.checks.push({ name, ok, info }); if (!ok) report.ok = false; };
    const key = (s) => [s.slide, s.step];
    const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);

    const frame = document.createElement('iframe');
    frame.className = 'hidden-deck';
    frame.src = 'index.html#/1/0';
    document.body.appendChild(frame);

    // Wait for the deck to answer hello.
    for (let i = 0; i < 40 && !connected; i++) { ch.postMessage({ type: 'hello' }); await sleep(250); }
    check('deck connects', connected, state && key(state));
    if (!connected) return finish();

    /** Resolve with the state that acknowledges command `id`. */
    const ackOf = (id) => new Promise((res) => {
      const l = (m) => { if (m.ack !== id) return; listeners.delete(l); res(m); };
      listeners.add(l);
    });
    let last = { ...state };
    const act = async (name, fn, ok) => {
      const before = last;
      const id = fn();
      const after = (id != null && await ackOf(id)) || { ...state };
      last = after;
      check(name, ok(before, after), { before: key(before), beforePlaying: before.playing, after: key(after), afterPlaying: after.playing });
    };
    for (let i = 0; i < 5; i++) {
      await act(`next #${i + 1}`, next, (b, a) => cmp(key(a), key(b)) > 0 || (b.playing && cmp(key(a), key(b)) === 0));
    }
    for (let i = 0; i < 2; i++) {
      await act(`prev #${i + 1}`, prev, (b, a) => cmp(key(a), key(b)) < 0 || (b.playing && cmp(key(a), key(b)) === 0));
    }
    await act('goto 14/3', () => goto(14, 3), (b, a) => a.slide === 14 && a.step === 3);
    check('notes present on 14/3', last.notes.length > 0 && last.nextNotes.length > 0, { notes: last.notes, nextNotes: last.nextNotes });
    // Toggle the theme while a step is animating: playback must carry on.
    send('next');
    await act('theme while playing', () => send('theme'), (b, a) => a.slide === 14 && a.step === 4);
    await act('theme back', () => send('theme'), (b, a) => a.slide === 14 && a.step === 4);
    await act('goto last', () => goto(last.slideCount, 0), (b, a) => a.slide === a.slideCount);
    finish();

    function finish() {
      clearInterval(keepalive);
      const pre = document.createElement('pre');
      pre.id = 'selftest';
      pre.textContent = JSON.stringify(report);
      document.body.appendChild(pre);
      document.title = report.ok ? 'SELFTEST PASS' : 'SELFTEST FAIL';
    }
  }
})();
