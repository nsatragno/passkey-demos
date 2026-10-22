/*
 * Slide controller: keyboard/clicker/mouse input, URL hash routing, stepped
 * reveals on static slides, stepped scenes on animated slides, and state
 * broadcasting for the presenter window.
 *
 * URL options:
 *   #/S/K       slide S (1-based), step K (0-based)
 *   ?embed      used by presenter previews: no chrome, no input, no channel,
 *               instant jumps on hash changes
 *   ?static     no animations; every step is shown instantly
 *   ?selftest   visit every step of every slide and report errors in
 *               <pre id="selftest">
 *   ?at=T       debug: freeze the current scene at time T seconds
 *   ?index      debug: open the slide index (press I) on load
 *
 * Keys: Space/→ next · Shift+Space/← back · Home/End · F fullscreen ·
 *       P presenter window · I slide index
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const EMBED = params.has('embed');
  const SELFTEST = params.has('selftest');
  const STATIC = EMBED || SELFTEST || params.has('static') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (EMBED) document.documentElement.classList.add('embed');
  if (STATIC) document.documentElement.classList.add('static');

  /* ---------------- error capture (for selftest) ---------------- */
  const errors = [];
  if (SELFTEST) {
    const origErr = console.error.bind(console);
    console.error = (...a) => { errors.push(a.map(String).join(' ')); origErr(...a); };
    window.addEventListener('error', (e) => errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + String(e.reason)));
  }

  /* ---------------- syntax highlighting ---------------- */
  const KW = new Set(['const', 'let', 'await', 'if', 'new', 'function', 'return', 'partial', 'dictionary', 'required',
    'sequence', 'boolean', 'ArrayBuffer', 'true', 'false', 'bstr']);
  const TT = /^(algUpgrade|restoreCredentials|existingCredentials|pubKeyCredParams|authenticatorData|authData|newCredential)$/;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function hl(src) {
    const re = /(\/\/(?!=)[^\n]*)|('[^']*'|"[^"]*")|(-?\b\d+\b)|(\b[A-Za-z_$][\w$]*\b)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += `<span class="tok-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tok-n">${esc(m[3])}</span>`;
      else if (m[4]) {
        const w = m[4];
        if (KW.has(w)) out += `<span class="tok-k">${w}</span>`;
        else if (TT.test(w)) out += `<span class="tok-t">${w}</span>`;
        else out += w;
      }
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  /** Highlight text nodes only, so step <span>s inside code survive. */
  function highlight(code) {
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const tmp = document.createElement('span');
      tmp.innerHTML = hl(n.textContent);
      n.replaceWith(...tmp.childNodes);
    }
  }
  document.querySelectorAll('pre code').forEach(highlight);

  /* ---------------- canvas fit ---------------- */
  const canvas = document.getElementById('canvas');
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    canvas.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------------- slide controllers ---------------- */
  const sections = [...document.querySelectorAll('section.slide')];
  const titleOf = (i) => {
    const sec = sections[i];
    if (!sec) return '';
    if (sec.dataset.title) return sec.dataset.title;
    const h = sec.querySelector('h1, h2');
    return h ? h.textContent.trim() : `Slide ${i + 1}`;
  };
  const notesOf = (sec, forStep) => {
    const sel = forStep == null ? 'aside.notes:not([data-for])' : `aside.notes[data-for="${forStep}"]`;
    const a = sec.querySelector(sel);
    return a ? a.innerHTML.trim() : '';
  };

  /** Static slide: elements with data-step="N" appear on step N. */
  class StaticCtl {
    constructor(sec) {
      this.sec = sec;
      this.els = [...sec.querySelectorAll('[data-step]')].filter((e) => !e.matches('aside'));
      this.max = this.els.reduce((m, e) => Math.max(m, parseInt(e.dataset.step, 10) || 0), 0);
      this.idx = 0;
      this.playing = false;
      this.slideNotes = notesOf(sec);
    }
    ready() { return Promise.resolve(); }
    get count() { return this.max + 1; }
    show(i) {
      this.idx = Math.max(0, Math.min(this.max, i));
      for (const e of this.els) {
        const n = parseInt(e.dataset.step, 10) || 0;
        e.classList.toggle('shown', n <= this.idx);
        e.classList.toggle('current', n === this.idx);
      }
      return Promise.resolve();
    }
    enter() { return this.show(0); }
    advance() { if (this.idx >= this.max) return false; this.show(this.idx + 1); return true; }
    back() { if (this.idx <= 0) return false; this.show(this.idx - 1); return true; }
    leave() {}
    segNotes(i) { return i > 0 ? notesOf(this.sec, i) : ''; }
    nextNotes(i) { return i < this.max ? (notesOf(this.sec, i + 1) || '<i>reveal next item</i>') : ''; }
  }

  /** Animated slide backed by an Anim.Stage. */
  class SceneCtl {
    constructor(sec) {
      this.sec = sec;
      this.svg = sec.querySelector('svg.scene');
      this.name = sec.dataset.scene;
      this.stage = null;
      this._ready = null;
      this.slideNotes = notesOf(sec);
    }
    ready() {
      if (!this._ready) {
        const build = window.SCENES[this.name];
        if (!build) return (this._ready = Promise.reject(new Error(`unknown scene ${this.name}`)));
        this.stage = new Anim.Stage(this.svg, build);
        this.stage.onSettle = () => { if (ctls[cur] === this) changed(); };
        this._ready = this.stage.init();
      }
      return this._ready;
    }
    get count() { return this.stage ? this.stage.count : 1; }
    get idx() { return this.stage ? this.stage.idx : 0; }
    get playing() { return !!(this.stage && this.stage.playing); }
    show(i) { return this.stage.show(i); }
    enter(animate) { return animate ? this.stage.playTo(0) : this.stage.show(0); }
    advance(animate) { return this.stage.advance(animate); }
    back() { return this.stage.back(); }
    leave() { if (this.stage && this.stage.playing) this.stage.show(this.stage.idx); }
    segNotes(i) { return i === 0 ? this.stage.introNotes : this.stage.segNotes(i); }
    nextNotes(i) { return this.stage.nextNotes(i); }
  }

  const ctls = sections.map((sec) => (sec.dataset.scene ? new SceneCtl(sec) : new StaticCtl(sec)));
  const N = sections.length;
  let cur = -1;

  /* ---------------- navigation (serialized) ---------------- */
  let queue = Promise.resolve();
  const enqueue = (fn) => (queue = queue.then(fn).catch((e) => console.error(e)));

  async function activate(i, dir, k) {
    i = Math.max(0, Math.min(N - 1, i));
    const c = ctls[i];
    await c.ready();
    if (cur !== i) {
      // Slides marked data-continue pick up exactly where the previous slide
      // ends, so swap them without the usual crossfade (in either direction).
      const later = sections[Math.max(cur, i)];
      if (cur >= 0 && Math.abs(cur - i) === 1 && later.hasAttribute('data-continue')) {
        const pair = [sections[cur], sections[i]];
        pair.forEach((sec) => sec.classList.add('instant'));
        requestAnimationFrame(() => requestAnimationFrame(() => pair.forEach((sec) => sec.classList.remove('instant'))));
      }
      if (cur >= 0) { sections[cur].classList.remove('active'); ctls[cur].leave(); }
      sections[i].classList.add('active');
      cur = i;
    }
    if (k != null) await c.show(k);
    else if (dir < 0) await c.show(c.count - 1);
    else await c.enter(!STATIC);
    changed();
    // Warm up the neighbours so their dry runs don't delay the next press.
    if (!SELFTEST) {
      if (ctls[i + 1]) ctls[i + 1].ready().catch(() => {});
      if (ctls[i - 1]) ctls[i - 1].ready().catch(() => {});
    }
  }

  const deck = {
    next: () => enqueue(async () => {
      const c = ctls[cur];
      await c.ready();
      if (c.advance(!STATIC)) { changed(); return; }
      if (cur < N - 1) await activate(cur + 1, 1);
    }),
    prev: () => enqueue(async () => {
      const c = ctls[cur];
      await c.ready();
      if (c.back()) { changed(); return; }
      if (cur > 0) await activate(cur - 1, -1);
    }),
    goto: (slide, step) => enqueue(() => activate(slide - 1, 0, step ?? 0)),
    first: () => enqueue(() => activate(0, 0, 0)),
    last: () => enqueue(() => activate(N - 1, -1)),
  };
  window.DECK = deck;

  /* ---------------- state, hash, HUD, broadcast ---------------- */
  const channel = EMBED ? null : DeckSync.open();
  const bar = document.querySelector('.hud .bar span');
  const num = document.querySelector('.hud .num');

  function state() {
    const c = ctls[cur];
    const idx = c.idx;
    return {
      type: 'state',
      slide: cur + 1,
      slideCount: N,
      step: idx,
      stepCount: c.count,
      title: titleOf(cur),
      slideNotes: c.slideNotes || '',
      notes: c.segNotes(idx) || '',
      nextNotes: c.nextNotes(idx) || '',
      nextTitle: titleOf(cur + 1),
      playing: c.playing,
    };
  }

  function changed() {
    if (cur < 0) return;
    const st = state();
    const h = `#/${st.slide}/${st.step}`;
    if (location.hash !== h) history.replaceState(null, '', h);
    if (bar) bar.style.width = `${((cur + (st.stepCount > 1 ? st.step / (st.stepCount - 1) : 1)) / N) * 100}%`;
    if (num) num.textContent = `${st.slide} / ${N}`;
    if (channel) channel.postMessage(st);
  }

  function parseHash() {
    const m = /^#\/(\d+)(?:\/(\d+))?/.exec(location.hash);
    if (!m) return null;
    return { slide: parseInt(m[1], 10), step: m[2] != null ? parseInt(m[2], 10) : 0 };
  }

  window.addEventListener('hashchange', () => {
    const p = parseHash();
    if (!p) return;
    const c = ctls[cur];
    if (c && p.slide === cur + 1 && p.step === c.idx && !c.playing) return;
    deck.goto(p.slide, p.step);
  });

  if (channel) {
    channel.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'hello') { if (cur >= 0) channel.postMessage(state()); }
      else if (m.type === 'cmd') {
        let p;
        if (m.cmd === 'next') p = deck.next();
        else if (m.cmd === 'prev') p = deck.prev();
        else if (m.cmd === 'goto') p = deck.goto(m.slide, m.step);
        // Acknowledge once the command has been processed.
        if (p && m.id != null) p.then(() => { if (cur >= 0) channel.postMessage({ ...state(), ack: m.id }); });
      }
    };
  }

  /* ---------------- input (main window only) ---------------- */
  function openPresenter() {
    window.open('presenter.html', 'alg-upgrades-presenter', 'width=1280,height=860');
  }
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  if (!EMBED) {
    /* ---- slide index (press I) ---- */
    const index = document.createElement('div');
    index.className = 'slide-index';
    index.hidden = true;
    index.innerHTML = '<div class="si-panel"><div class="si-head">Slides <span>I or Esc to close</span></div><ol></ol></div>';
    document.body.appendChild(index);
    const list = index.querySelector('ol');
    sections.forEach((_, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = `<span class="n">${i + 1}</span>${titleOf(i).replace(/</g, '&lt;')}`;
      b.addEventListener('click', () => { closeIndex(); deck.goto(i + 1, 0); });
      li.appendChild(b);
      list.appendChild(li);
    });
    index.addEventListener('click', (e) => { if (e.target === index) closeIndex(); });
    const openIndex = () => {
      [...list.children].forEach((li, i) => li.classList.toggle('current', i === cur));
      index.hidden = false;
      const c = list.children[cur];
      if (c) c.querySelector('button').focus();
    };
    const closeIndex = () => { index.hidden = true; };
    // Debug: ?index opens the index on load (screenshots).
    if (params.has('index')) setTimeout(() => queue.then(openIndex), 500);

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (!index.hidden) {
        // While the index is open, only close keys apply (Tab/Enter work on the buttons).
        if (k === 'Escape' || k === 'i' || k === 'I') { e.preventDefault(); closeIndex(); }
        return;
      }
      if (k === 'i' || k === 'I') { e.preventDefault(); openIndex(); return; }
      if ((k === ' ' && !e.shiftKey) || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter') {
        e.preventDefault(); deck.next();
      } else if ((k === ' ' && e.shiftKey) || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
        e.preventDefault(); deck.prev();
      } else if (k === 'Home') { e.preventDefault(); deck.first(); }
      else if (k === 'End') { e.preventDefault(); deck.last(); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFs(); }
      else if (k === 'p' || k === 'P') { e.preventDefault(); openPresenter(); }
    });

    document.getElementById('stage').addEventListener('click', (e) => {
      if (e.target.closest('a, button, .navbtns')) return;
      if (window.getSelection && String(window.getSelection())) return;
      deck.next();
    });

    const nav = document.querySelector('.navbtns');
    nav.querySelector('.prev').addEventListener('click', () => deck.prev());
    nav.querySelector('.next').addEventListener('click', () => deck.next());
    nav.querySelector('.pres').addEventListener('click', () => openPresenter());
    let hideT = null;
    window.addEventListener('mousemove', () => {
      nav.classList.add('visible');
      document.body.classList.remove('nocursor');
      clearTimeout(hideT);
      hideT = setTimeout(() => {
        if (!nav.matches(':hover')) { nav.classList.remove('visible'); document.body.classList.add('nocursor'); }
      }, 2000);
    });
  }

  /* ---------------- boot ---------------- */
  const fontsReady = Promise.race([
    (document.fonts && document.fonts.ready) || Promise.resolve(),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  async function selftest() {
    const report = { ok: true, slides: [] };
    for (let i = 0; i < N; i++) {
      const c = ctls[i];
      const before = errors.length;
      const entry = { slide: i + 1, title: titleOf(i), scene: sections[i].dataset.scene || null, steps: 0 };
      try {
        await activate(i, 0, 0);
        entry.steps = c.count;
        for (let k = 0; k < c.count; k++) await c.show(k);
        for (let k = c.count - 1; k >= 0; k--) await c.show(k);
      } catch (e) {
        errors.push(String(e && e.stack || e));
      }
      entry.errors = errors.slice(before);
      entry.ok = entry.errors.length === 0 && entry.steps >= 1;
      if (!entry.ok) report.ok = false;
      report.slides.push(entry);
    }
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = JSON.stringify(report);
    document.body.appendChild(pre);
    document.title = report.ok ? 'SELFTEST PASS' : 'SELFTEST FAIL';
  }

  fontsReady.then(() => {
    if (SELFTEST) { selftest(); return; }
    const p = parseHash();
    if (p) deck.goto(p.slide, p.step);
    else enqueue(() => activate(0, 1));
    // Debug: ?at=<seconds> freezes the current scene at that time (screenshots).
    if (params.has('at')) enqueue(() => { const c = ctls[cur]; if (c.stage) return c.stage.seek(parseFloat(params.get('at'))); });
  });
})();
