/* S5's stack. render(p) draws the whole scene for a progress p in [0,1] and depends on
   nothing else. A clock runs p from 0 to 1 once, while the stage is on screen (see "The
   clock"); scroll doesn't drive it. The scene is laid
   out in a 1000×720 frame. Where the whole frame fits with its text at ≥ 11px it is
   fitted to the canvas; otherwise a camera frames each beat's focus area (CROPS). */
(() => {
  'use strict';
  const s5 = document.querySelector('.s5');
  if (!s5) return;
  const canvas = s5.querySelector('.s5-scene'), ctx = canvas.getContext('2d');
  const stage = s5.querySelector('.s5-stage'), replay = s5.querySelector('.s5-replay');
  const beats = [...s5.querySelectorAll('[data-beat]')], count = s5.querySelector('.s5-count');
  const principle = s5.querySelector('.s5-principle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ctx) return;
  s5.classList.add(reduced ? 'is-still' : 'is-live');

  const VW = 1000, FLOOR = 560;
  // Colours come from the site tokens (their -rgb variants), never literals.
  const css = getComputedStyle(s5), tok = n => css.getPropertyValue(`--${n}-rgb`).trim().split(/\s+/).map(Number);
  const INK = tok('ink'), SHEET = tok('sheet'), PAPER = tok('paper'), VIOLET = tok('thread'), ORANGE = tok('orange'), ORANGE_INK = tok('orange-ink');
  const rgba = (c, a = 1) => `rgba(${c},${a})`;
  const clamp01 = t => Math.max(0, Math.min(1, t)), band = (t, a, b) => clamp01((t - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t = clamp01(t), t * t * (3 - 2 * t));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const MONO = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace', SANS = 'Montserrat, Helvetica, sans-serif';
  // Meaningful canvas text, in scene units. The whole scene is used only while it's fitted at
  // ≥ 11/15 (1280×720 fits it at .84: 12.5px). Crops are ≤ 488 units wide: ≥ 11px in a 360px canvas.
  const TXT = 15;

  // ── Data ────────────────────────────────────────────────
  const STACKS = [72, 44, 60, 82, 66];                      // sheets per stack, Mon–Fri
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const SH = 4.1;                                           // sheet thickness in frame units
  const VOYAGES = ['CEDAR STAR 214', 'AL MINA 088', 'NORTH QUAY 31', 'LEVANT 7', 'BLUE RIDGE 52', 'SIDON 19', 'CEDAR STAR 215', 'ORONTES 4'];
  const CODES = ['PLT-01', 'TUG-02', 'MOR-04', 'BTH-11', 'WST-03', 'FWT-06', 'PLT-01', 'GAR-09'];
  const ROWS = Array.from({ length: 11 }, (_, i) => [VOYAGES[i % 8], CODES[(i * 3) % 8], String(1 + (i * 7) % 4)]);
  const FLY = 24;                                           // sheets processed during "the first move"
  const FLY4 = 6;                                           // and the ones that keep coming in once it's live (beat 4)
  const UNSURE = j => j % 6 === 4;                           // every sixth one goes to review

  // Beats 1–2 are laid out two ways: across the whole frame, or closer together for the camera.
  const WIDE = { b1x: 250, b1w: 200, clockX: 260, sheetX: 470, sheetW: 470, cols: [24, 250, 400], weekX: 110, weekDX: 190, weekW: 150 };
  const TIGHT = { b1x: 285, b1w: 180, clockX: 285, sheetX: 380, sheetW: 290, cols: [14, 150, 258], weekX: 316, weekDX: 92, weekW: 78 };
  // The camera's focus area per beat, [x, y, w, h] in frame units.
  const CROPS = [
    [195, 80, 480, 486],   // 1: the clock and "HOURS ON THIS STACK", the stack, the sheet being typed
    [266, 170, 484, 440],  // 2: the week's five stacks, their 2:00 labels and weekdays
    [461, 58, 488, 444],   // 3: the application: its reading step, the records and the review queue
    [461, 58, 488, 444],   // 4: the application, live: its title bar (LIVE), the reading step, the records and the review queue
  ];
  const WHOLE = [25, 0, 950, 720];
  // Phones: the scene runs across the whole screen there, and CROPS sit flush on its content,
  // so the stack and "HOURS ON THIS STACK" met the screen's edge. These keep 12–20 units of
  // air at the sides (text ≥ 11.7px at 390, ≥ 12.4px from 412).
  const phone = matchMedia('(max-width: 767px)');
  const PHONE_CROPS = [
    [180, 76, 500, 490],   // 1: the clock and its label, the stack, the sheet being typed
    [265, 170, 492, 440],  // 2: the week's five stacks, their 2:00 labels and weekdays
    [455, 50, 500, 456],   // 3: the application, the records and the review queue
    [455, 50, 500, 456],   // 4: the application, live
  ];

  // ── Canvas fit ──────────────────────────────────────────
  let cw = 0, ch = 0, dpr = 1, tight = false, L = WIDE;
  function measure() {
    const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    tight = TXT * Math.min(cw / WHOLE[2], ch / WHOLE[3]) < 11;
    L = tight ? TIGHT : WIDE;
    sprites = {};
  }

  // ── Drawing pieces ──────────────────────────────────────
  function sheetFront(x, y, w, a, i, seed) {                 // one sheet seen edge-on, y = its bottom
    const jx = (hash(seed * 97 + i) - .5) * (i % 9 === 0 ? 26 : 9);
    ctx.fillStyle = rgba(SHEET, a); ctx.fillRect(x - w / 2 + jx, y - SH, w, SH);
    ctx.fillStyle = rgba(INK, .42 * a); ctx.fillRect(x - w / 2 + jx, y - .9, w, .9);
    if (i % 13 === 5) { ctx.fillStyle = rgba(INK, .55 * a); ctx.fillRect(x + w / 2 + jx - 2, y - SH, 10, SH - .6); }  // a tab sticking out
    return jx;
  }
  function stack(x, n, w, a, seed, label) {
    if (n <= 0 || a <= 0) return FLOOR;
    ctx.fillStyle = rgba(INK, .08 * a);
    ctx.beginPath(); ctx.ellipse(x + 10, FLOOR + 3, w * .62, 7, 0, 0, Math.PI * 2); ctx.fill();
    let jx = 0; const whole = Math.floor(n);
    for (let i = 0; i < whole; i++) jx = sheetFront(x, FLOOR - i * SH, w, a, i, seed);
    const top = FLOOR - whole * SH;
    // top face, in a slight perspective
    const dx = 22, dy = 14, x0 = x - w / 2 + jx;
    ctx.fillStyle = rgba(SHEET, a);
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + w, top); ctx.lineTo(x0 + w + dx, top - dy); ctx.lineTo(x0 + dx, top - dy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(INK, .5 * a); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = rgba(INK, .16 * a);
    for (let l = 0; l < 3; l++) ctx.fillRect(x0 + 16 + l * 5, top - 4 - l * 3.2, w * .5 - l * 12, 1.2);
    if (label) { ctx.font = `500 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .6 * a); ctx.textAlign = 'center'; ctx.fillText(label, x + 8, FLOOR + 30); }
    return top - dy;
  }
  function doc(cx, cy, w, h, a, rot = 0) {                   // a small sheet in flight
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.globalAlpha *= a;
    ctx.fillStyle = rgba(SHEET); ctx.shadowColor = rgba(INK, .18); ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(INK, .25); ctx.lineWidth = .8; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = rgba(INK, .18);
    for (let l = 0; l < 5; l++) ctx.fillRect(-w / 2 + 6, -h / 2 + 8 + l * (h - 14) / 5, (w - 12) * (l % 2 ? .6 : .85), 1.6);
    ctx.restore();
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  // The two shadowed panels (the sheet being typed, the application) never change, so each is
  // drawn once per size into a sprite, shadow and all, and blitted: no 40px blur per frame.
  // ks is canvas px per scene unit when the sprite is made. Shadows are set in canvas px.
  let sprites = {};
  function panel(key, x, y, w, h, r, ks) {
    const PAD = 80;                                          // canvas px: room for the blur (40) and its offset (18)
    let s = sprites[key];
    if (!s) {
      s = sprites[key] = document.createElement('canvas'); s.ks = ks;
      s.width = Math.ceil(w * ks) + PAD * 2; s.height = Math.ceil(h * ks) + PAD * 2;
      const c = s.getContext('2d');
      c.fillStyle = rgba(SHEET); c.shadowColor = rgba(INK, .16); c.shadowBlur = 40; c.shadowOffsetY = 18;
      c.beginPath(); r && c.roundRect ? c.roundRect(PAD, PAD, w * ks, h * ks, r * ks) : c.rect(PAD, PAD, w * ks, h * ks); c.fill();
    }
    ctx.drawImage(s, x - PAD / s.ks, y - PAD / s.ks, s.width / s.ks, s.height / s.ks);
  }
  function hm(mins) { const h = Math.floor(mins / 60), m = Math.floor(mins % 60); return `${h}:${String(m).padStart(2, '0')}`; }

  // ── The scene ───────────────────────────────────────────
  // Four beats over p's run (DUR, below; the clock adds a hold after 02). Each beat's motion runs in its band, then holds until
  // the next. The shares follow the reading: beat 3 carries the long paragraph, beat 2 one line.
  const BEATS = [[0, .27], [.27, .42], [.42, .78], [.78, 1]];
  function render(p) {
    const q1 = band(p, .02, .2), q2 = band(p, .29, .4), q3 = band(p, .44, .66), q4 = band(p, .8, .92);
    // camera: the whole frame, or each beat's crop, gliding as the next beat starts
    let cam = WHOLE;
    if (tight) {
      const crops = phone.matches ? PHONE_CROPS : CROPS;
      cam = crops[0];
      [ease(band(q2, 0, .4)), ease(band(q3, 0, .25)), ease(band(q4, 0, .3))].forEach((e, i) => { if (e > 0) cam = cam.map((v, j) => lerp(v, crops[i + 1][j], e)); });
    }
    const [cx, cy, cwu, chu] = cam, k = Math.min(cw / cwu, ch / chu), ks = dpr * k;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ((cw - cwu * k) / 2 - cx * k), dpr * ((ch - chu * k) / 2 - cy * k));

    // floor
    ctx.fillStyle = rgba(INK, .5); ctx.fillRect(20, FLOOR, VW - 40, 1.2);

    // stacks: one (beat 1) → the week (beat 2) → a pile beside the app, emptying (beat 3+)
    const e2 = ease(q2), e3 = ease(band(q3, 0, .16));
    const processed = (FLY + .6) * band(q3, .12, .98);         // + .6: the last sheet lands before the hold
    const processed4 = (FLY4 + .7) * band(p, .82, .98);         // beat 4: in daily use, the sheets keep coming, at a calmer pace (+ .7: the last lands, with room for rounding)
    // A sheet's flight: 0 → 1 from its stack through the read step into records or review; > 1 once landed.
    const flight = j => j < FLY ? (processed - j) / 1.6 : (processed4 - (j - FLY)) / 1.6;
    const tops = [];
    STACKS.forEach((n0, s) => {
      const xWeek = L.weekX + s * L.weekDX, x1 = s === 0 ? lerp(L.b1x, xWeek, e2) : xWeek, x = lerp(x1, 62 + s * 74, e3);
      const grow = s === 0 ? 1 : ease(band(q2, .08 + s * .12, .4 + s * .12));
      const leaving = n0 * (.8 * band(q3, .12, .98) + .12 * band(p, .82, .98));
      const w = lerp(s === 0 ? lerp(L.b1w, L.weekW, e2) : L.weekW, 96, e3);
      const n = n0 * grow - leaving;
      const labelA = band(q2, .05, .3) * (1 - e3);
      const top = stack(x, n, w, grow > 0 ? 1 : 0, s + 1, labelA > .02 ? DAYS[s] : '');
      tops.push([x + 10, top]);
      if (labelA > 0 && grow > .5) {                           // two hours on every one of them
        ctx.globalAlpha = labelA * band(grow, .5, 1);
        ctx.font = `600 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .9); ctx.textAlign = 'center';
        ctx.fillText('2:00', x + 10, top - 14);
        ctx.globalAlpha = 1;
      }
    });

    // beat 1: the sheet on top, typed out by hand; the clock above the stack
    const docA = 1 - ease(band(q2, 0, .35));
    if (docA > 0) {
      ctx.save(); ctx.globalAlpha = docA; ctx.translate(ease(band(q2, 0, .35)) * 120, 0);
      const X = L.sheetX, Y = 96, Wd = L.sheetW, Hd = 430, cols = L.cols.map(c => X + c);
      panel('sheet', X, Y, Wd, Hd, 0, ks);
      ctx.strokeStyle = rgba(INK, .14); ctx.lineWidth = 1; ctx.strokeRect(X, Y, Wd, Hd);
      ctx.font = `600 11px ${MONO}`; ctx.fillStyle = rgba(INK, .55); ctx.textAlign = 'left';
      ctx.fillText('PORT SERVICES · VOYAGE SHEET', cols[0], Y + 34); ctx.textAlign = 'right'; ctx.fillText('p. 1 / 72', X + Wd - L.cols[0], Y + 34);
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(INK, .45); ['VOYAGE', 'SERVICE CODE', 'QTY'].forEach((h, i) => ctx.fillText(h, cols[i], Y + 74));
      ctx.fillStyle = rgba(INK, .12); ctx.fillRect(cols[0], Y + 84, Wd - 2 * L.cols[0], 1);
      const total = ROWS.reduce((s, r) => s + r.join('').length, 0);
      let left = Math.floor(total * q1), caret = null;
      ctx.font = `500 ${TXT}px ${MONO}`;
      ROWS.forEach((r, ri) => {
        const y = Y + 112 + ri * 28;
        ctx.fillStyle = rgba(INK, .06); ctx.fillRect(cols[0], y + 9, Wd - 2 * L.cols[0], 1);
        r.forEach((cell, ci) => {
          const n = Math.max(0, Math.min(cell.length, left)); left -= cell.length;
          if (n <= 0) return;
          ctx.fillStyle = rgba(INK, .92); ctx.fillText(cell.slice(0, n), cols[ci], y);
          caret = [cols[ci] + ctx.measureText(cell.slice(0, n)).width + 2, y];
        });
      });
      if (caret && q1 < 1) { ctx.fillStyle = rgba(VIOLET); ctx.fillRect(caret[0], caret[1] - 14, 2, 18); }
      ctx.restore();
      // the clock
      ctx.save(); ctx.globalAlpha = docA;
      ctx.font = `500 64px ${SANS}`; ctx.fillStyle = rgba(INK); ctx.textAlign = 'center';
      const top0 = tops[0][1], cy0 = Math.min(top0 - 40, 190);
      ctx.fillText(hm(120 * q1), L.clockX, cy0);
      ctx.font = `500 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .6); ctx.fillText('HOURS ON THIS STACK', L.clockX, cy0 + 26);
      ctx.restore();
    }

    // beat 3: the application takes the stack in
    const X = 466, Y = 70, Wa = 480, Ha = 420, QX = X + 340;
    const appA = ease(band(q3, 0, .18));
    if (appA > 0) {
      ctx.save(); ctx.globalAlpha = appA; ctx.translate((1 - appA) * 80, 0);
      panel('app', X, Y, Wa, Ha, 10, ks);
      ctx.strokeStyle = rgba(INK, .14); ctx.lineWidth = 1; rrect(X, Y, Wa, Ha, 10); ctx.stroke();
      ctx.fillStyle = rgba(INK); rrect(X, Y, Wa, 44, [10, 10, 0, 0]); ctx.fill();
      ctx.font = `600 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(PAPER); ctx.textAlign = 'left'; ctx.fillText('PORT OPERATIONS · INTERNAL', X + 18, Y + 28);
      // live since May 2026 (beat 4)
      const liveA = ease(band(q4, 0, .25));
      if (liveA > 0) {
        ctx.globalAlpha = appA * liveA; ctx.textAlign = 'right'; ctx.fillStyle = rgba(PAPER); ctx.fillText('LIVE · SINCE MAY 2026', X + Wa - 18, Y + 28);
        const dx = X + Wa - 18 - ctx.measureText('LIVE · SINCE MAY 2026').width - 12;
        ctx.fillStyle = rgba(VIOLET); ctx.strokeStyle = rgba(PAPER); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dx, Y + 23, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = appA;
      }
      // read strip
      ctx.textAlign = 'left'; ctx.font = `600 11px ${MONO}`; ctx.fillStyle = rgba(INK, .5);
      ctx.fillText('READ', X + 18, Y + 80);
      ctx.fillStyle = rgba(VIOLET, .06); ctx.fillRect(X + 18, Y + 88, Wa - 36, 78);
      ctx.fillStyle = rgba(VIOLET, .9); ctx.fillRect(X + 18, Y + 126, Wa - 36, 2);
      // records
      ctx.font = `600 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .5);
      ctx.fillText('RECORDS', X + 18, Y + 200); ctx.fillText('REVIEW QUEUE', QX, Y + 200);
      ctx.fillStyle = rgba(INK, .1); ctx.fillRect(X + 18, Y + 210, 312, 1);
      ctx.strokeStyle = rgba(ORANGE); ctx.lineWidth = 1.5; rrect(QX, Y + 212, 124, 204, 6); ctx.stroke();
      ctx.fillStyle = rgba(ORANGE, .06); ctx.fill();
      let r = 0;
      const queue = [];
      for (let j = 0; j < FLY + FLY4; j++) {
        if (flight(j) < 1) continue;
        if (UNSURE(j)) queue.push(j);
        else {
          if (r < 8) {
            const y = Y + 234 + r * 22;
            ctx.font = `500 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .85);
            ctx.fillText(VOYAGES[j % 8], X + 18, y); ctx.fillText(CODES[j % 8], X + 190, y);
            ctx.strokeStyle = rgba(VIOLET); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 296, y - 5); ctx.lineTo(X + 301, y); ctx.lineTo(X + 312, y - 10); ctx.stroke();
          }
          r++;
        }
      }
      // The review queue holds four. When a fifth lands (beat 4), the oldest has been reviewed:
      // it leaves at the top and the rest move up.
      const over = Math.max(0, queue.length - 4), shift = over ? over - 1 + ease(band(flight(queue[queue.length - 1]), 1, 1.5)) : 0;
      ctx.save(); rrect(QX, Y + 212, 124, 204, 6); ctx.clip();
      queue.forEach((j, i) => {
        const slot = i - shift, y = Y + 224 + slot * 48;
        if (slot <= -1 || slot >= 4) return;
        ctx.globalAlpha = appA * clamp01(1 + slot);
        ctx.fillStyle = rgba(SHEET); ctx.fillRect(QX + 8, y, 108, 40);
        ctx.fillStyle = rgba(ORANGE); ctx.fillRect(QX + 8, y, 4, 40);
        ctx.font = `600 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .8); ctx.fillText(VOYAGES[j % 8].split(' ')[0], QX + 20, y + 17);
        ctx.fillStyle = rgba(ORANGE_INK); ctx.fillText('? ' + CODES[j % 8], QX + 20, y + 35);
      });
      ctx.restore();
      ctx.font = `600 ${TXT}px ${MONO}`; ctx.fillStyle = rgba(INK, .5);   // under the list, clear of REVIEW QUEUE
      ctx.fillText(`${r} STRAIGHT THROUGH`, X + 18, Y + 406);
      ctx.restore();
    }

    // sheets in flight: stack → read → records or review
    if (q3 > 0) {
      for (let j = 0; j < FLY + FLY4; j++) {
        const t = flight(j);
        if (t <= 0 || t >= 1) continue;
        const [sx, sy] = tops[j % STACKS.length];
        const rx = X + Wa / 2, ry = Y + 126;
        let x, y, w, h, rot;
        if (t < .5) { const e = ease(t / .5); x = lerp(sx, rx, e); y = lerp(sy, ry, e) - Math.sin(e * Math.PI) * 90; w = lerp(90, 52, e); h = lerp(116, 68, e); rot = lerp(-.25, 0, e); }
        else {
          const e = ease((t - .5) / .5), uns = UNSURE(j);
          const tx = uns ? QX + 62 : X + 150, ty = uns ? Y + 250 : Y + 260;
          x = lerp(rx, tx, e); y = lerp(ry, ty, e); w = lerp(52, 30, e); h = lerp(68, 30, e); rot = 0;
        }
        doc(x, y, w, h, t > .85 ? 1 - band(t, .85, 1) : 1, rot);
        if (t > .38 && t < .62) { ctx.fillStyle = rgba(VIOLET, .8); ctx.fillRect(x - w / 2 - 6, y - 1.5 + (t - .5) * 120, w + 12, 3); }
      }
    }
  }

  // ── Beats (the text column) ─────────────────────────────
  let lastBeat = -1;
  const beatOf = p => { const b = BEATS.findIndex(([a, z]) => p >= a && p < z); return b < 0 ? BEATS.length - 1 : b; };
  function setBeat(beat) {
    if (beat === lastBeat) return; lastBeat = beat;
    beats.forEach(el => el.classList.toggle('is-on', +el.dataset.beat === beat));
    count.textContent = `0${beat + 1} / 04`;
  }

  measure();
  const drawn = new IntersectionObserver(([e]) => { if (e.isIntersecting) { principle.classList.add('is-drawn'); drawn.disconnect(); } }, { threshold: .6 });
  drawn.observe(principle);
  if (reduced) {                                            // one still frame: beat 4's end state
    const still = () => { measure(); render(1); };
    new ResizeObserver(still).observe(canvas);
    document.fonts && document.fonts.ready.then(still);
    return;
  }
  // ── The clock ──────────────────────────────────────────
  // The clock runs RUN ms once. p runs 0 → 1 over DUR of it at a steady rate (the scene's bands
  // do the easing), except that it waits HOLD ms at the end of beat 02 (p = HELD), so the week's
  // stacks stay up a second longer and beat 03 starts HOLD later; every other beat keeps its
  // length. Picture, camera, text column and counter all follow p, and through the hold the
  // text stays on 02 (at p = HELD alone, BEATS would already say 03). It starts when the stage
  // is ≥50% on screen, pauses while it is off screen or the tab is hidden, and holds the last
  // frame; it never restarts by itself. Replay, shown once it has played through, starts it over.
  const DUR = 10000, HOLD = 1000, RUN = DUR + HOLD;
  const HELD = BEATS[1][1], RESUME = HELD * DUR + HOLD;   // p's hold, and the clock time it ends
  const pAt = ms => Math.min(1, (ms < HELD * DUR ? ms : Math.max(HELD * DUR, ms - HOLD)) / DUR);
  let ms = 0, raf = 0, last = 0, inView = false;
  const draw = () => { const p = pAt(ms); render(p); setBeat(ms < RESUME ? Math.min(1, beatOf(p)) : beatOf(p)); };
  const tick = now => {
    ms = Math.min(RUN, ms + Math.min(50, now - last)); last = now;   // rAF sleeps in hidden tabs; that time isn't counted
    draw();
    raf = ms < RUN && inView && !document.hidden ? requestAnimationFrame(tick) : 0;
    if (ms >= RUN) replay.classList.add('is-on');
  };
  const wake = () => { if (!raf && ms < RUN && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  // On phones the stage is the picture plus the whole story under it, taller than the screen,
  // so "half on screen" is measured on the picture itself.
  const seen = new IntersectionObserver(([e]) => {
    if (e.intersectionRatio >= .5) inView = true; else if (!e.isIntersecting) inView = false;
    wake();
  }, { threshold: [0, .5] });
  let watched = phone.matches ? canvas : stage;
  seen.observe(watched);
  phone.addEventListener('change', () => { seen.unobserve(watched); inView = false; watched = phone.matches ? canvas : stage; seen.observe(watched); });
  document.addEventListener('visibilitychange', wake);
  replay.hidden = false;
  replay.addEventListener('click', () => { replay.classList.remove('is-on'); ms = 0; draw(); wake(); });
  new ResizeObserver(() => { measure(); draw(); }).observe(canvas);
  document.fonts && document.fonts.ready.then(draw);
  draw();
})();
