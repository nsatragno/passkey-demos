(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const shotT = parseFloat(params.get('t') ?? '0');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- syntax highlighting for <pre><code data-lang> ---------- */
  const KW = new Set(['const', 'let', 'await', 'if', 'new', 'function', 'return', 'partial', 'dictionary', 'required',
    'sequence', 'boolean', 'ArrayBuffer', 'true', 'false']);
  function highlight(code) {
    const src = code.textContent;
    const re = /(\/\/[^\n]*)|('[^']*'|"[^"]*")|(-?\b\d+\b)|(\b[A-Za-z_$][\w$]*\b)/g;
    let out = '', last = 0, m;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += `<span class="tok-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tok-n">${esc(m[3])}</span>`;
      else if (m[4]) {
        const w = m[4];
        if (KW.has(w)) out += `<span class="tok-k">${w}</span>`;
        else if (/^(algUpgrade|restoreCredentials|existingCredentials|pubKeyCredParams|authenticatorData)$/.test(w)) out += `<span class="tok-t">${w}</span>`;
        else out += w;
      }
      last = re.lastIndex;
    }
    out += esc(src.slice(last));
    code.innerHTML = out;
  }
  document.querySelectorAll('pre code[data-lang]').forEach(highlight);

  /* ---------- rail ---------- */
  document.querySelectorAll('.rail a').forEach((a) => {
    const t = document.createElement('span');
    t.className = 'txt';
    t.textContent = a.textContent;
    a.textContent = '';
    a.appendChild(t);
  });

  /* ---------- stages ---------- */
  const stages = [];
  document.querySelectorAll('figure.stage').forEach((fig) => {
    const name = fig.dataset.scene;
    const build = window.SCENES[name];
    if (!build) return;
    fig.tabIndex = 0;
    fig.classList.add('fresh');
    fig.innerHTML = `
      <div class="screen">
        <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img"></svg>
        <div class="overlay-play"><i></i></div>
      </div>
      <figcaption class="caption" aria-live="polite"></figcaption>
      <div class="controls">
        <button class="pp" data-state="play" aria-label="play"></button>
        <div class="scrub"><input type="range" min="0" max="1" value="0" step="0.01" aria-label="Scrub animation"><div class="marks"></div></div>
        <span class="time">0:00</span>
        <button class="speed" aria-label="Playback speed" title="Playback speed">1×</button>
        <button class="mute" aria-label="Toggle voiceover" title="Toggle voiceover (M)" data-muted="false">
          <svg viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            <path class="sound-wave" d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path class="sound-wave" d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <line class="mute-slash" x1="2" y1="2" x2="22" y2="22" stroke="#FC6255" stroke-width="2.5"/>
          </svg>
        </button>
        <button class="fs" aria-label="Toggle fullscreen" title="Fullscreen (F)">
          <svg viewBox="0 0 24 24">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      </div>`;
    const st = new Anim.Stage(fig, build);
    st.name = name;
    stages.push(st);
  });
  window.STAGES = stages;

  if (params.has('dump_cues')) {
    ready.then(async () => {
      for (const st of stages) await st.init(Infinity);
      const data = stages.map(s => ({ name: s.name, total: s.total, cues: s.cues }));
      const div = document.createElement('div');
      div.id = 'cues-data';
      div.textContent = JSON.stringify(data);
      document.body.appendChild(div);
      console.log('CUES_READY');
    });
  }

  if (shot) {
    document.body.classList.add('shot');
    const st = stages.find((s) => s.name === shot);
    st.fig.classList.add('target');
    st.fig.closest('.chapter').classList.add('has-target');
    st.init(null).then(() => st.seek(shotT, false)).then(() => { document.title = 'ready'; });
    return;
  }

  const ready = (document.fonts && document.fonts.ready) || Promise.resolve();
  ready.then(() => {
    for (const st of stages) st.init(reduced ? Infinity : 0);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const st = stages.find((s) => s.fig === e.target);
        if (!st) continue;
        if (e.intersectionRatio >= 0.6 && !reduced) {
          if (!st.started) { st.fig.classList.remove('fresh'); st.autoplay(); }
        } else if (e.intersectionRatio < 0.25) {
          st.pause();
        }
      }
    }, { threshold: [0, 0.25, 0.6, 1] });
    stages.forEach((s) => io.observe(s.fig));
    stages.forEach((s) => s.fig.addEventListener('click', () => s.fig.classList.remove('fresh'), { once: true }));
  });

  /* ---------- progress + active chapter ---------- */
  const bar = document.querySelector('.progress span');
  const links = [...document.querySelectorAll('.rail a')];
  const chapters = links.map((a) => document.querySelector(a.getAttribute('href')));
  function onScroll() {
    const h = document.documentElement;
    bar.style.width = `${(h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100}%`;
    let idx = -1;
    chapters.forEach((c, i) => { if (c && c.getBoundingClientRect().top < window.innerHeight * 0.4) idx = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === idx));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
