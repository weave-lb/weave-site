/* S6's moving world. One canvas, one RAF loop that runs only while the section is on
   screen and the tab is visible. Reduced motion gets one still frame.

   Units: the canvas is scaled so 1u = 1% of the world's height. Every shape is laid
   out in u, so the world keeps its macro scale on any screen.

   Three layers loop at their own lengths and speeds (deep < mid < fore). Nothing
   spawns: each layer is one long strip that wraps off-screen.

   The panel is the gate. `resolve(x)` is 0 to the right of it and 1 once a thing has
   passed under it; every shape interpolates its messy form to its clean form by the
   resolve value at its own messy position, so long sequences compress piece by piece. */
(() => {
  'use strict';
  const section = document.querySelector('.s6');
  const stage = section && section.querySelector('.s6-stage');
  const canvas = stage && stage.querySelector('.s6-world');
  const panel = stage && stage.querySelector('.s6-panel');
  const main = canvas && canvas.getContext('2d');
  if (!main) return;
  // The deep layer moves slowest (under half a pixel a frame), so while running it redraws
  // every other frame into its own canvas and is copied in between. `ctx` is whichever
  // canvas is being drawn.
  const deepCanvas = document.createElement('canvas'), deep = deepCanvas.getContext('2d');
  let ctx = main, deepDue = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // ── Tuning ────────────────────────────────────────────────
  const SPEED = 4.2;                         // u per second on the mid layer (~35s to cross a laptop screen)
  const DEPTH = { deep: .55, mid: 1, fore: 1.2 };
  const LOOP  = { deep: 860, mid: 720, fore: 780 };
  const PAD = 140;                           // how far off-screen a unit's anchor may sit before it wraps
  const ROUTE = 52;                          // y of the violet transfer path
  const LEDGER = 92;                         // y of the foreground ledger rule
  const GATE_OUT = 9, GATE_IN = 30;          // resolve starts GATE_OUT u right of the panel, ends GATE_IN u inside it
  const MONO = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace';

  // ── Colour ────────────────────────────────────────────────
  // Site tokens as [r, g, b]; the three tints derive from them, none is a new colour.
  const C = {
    night:      [15, 8, 28],               // overlay #0F081C: the section's ground (op() dims toward it)
    paper:      [245, 245, 242],           // paper #F5F5F2
    paperShade: [222, 221, 221],           // paper 10% toward overlay: the copy behind a duplicate
    sheetEdge:  [126, 110, 154],           // paper 55% toward ink #1C0051: a sheet's lower edge
    ink:        [28, 0, 81],               // ink #1C0051
    thread:     [88, 0, 255],              // thread #5800FF: resolved work
    threadLit:  [163, 115, 255],           // thread 45% toward sheet #FFFFFF: thread's lines, lit to read on the night
    orange:     [240, 80, 35],             // orange #F05023: only where a person had to step in
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
  const ease = t => (t = clamp01(t), t * t * (3 - 2 * t));
  const band = (t, a, b) => clamp01((t - a) / (b - a));
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // Opaque colour dimmed toward the night: overlapping strokes never double up.
  const op = (c, a) => rgba(mix(C.night, c, a));
  // Batching: shapes that share a style and don't overlap go down as one path, so a frame
  // is a few hundred canvas calls, not ~1800. q() quantises a resolve value for styles only
  // (1/32 steps, invisible); geometry always uses the exact value.
  const q = k => Math.round(k * 32) / 32;
  const RECTS = new Map(), MARKS = new Map(), SLASHES = new Map();
  const queue = (m, key, ...v) => { let a = m.get(key); if (!a) m.set(key, a = []); a.push(...v); };
  function flushRects(m) {
    for (const [fill, r] of m) { ctx.fillStyle = fill; ctx.beginPath(); for (let i = 0; i < r.length; i += 4) ctx.rect(r[i], r[i + 1], r[i + 2], r[i + 3]); ctx.fill(); }
    m.clear();
  }
  function flushLines(m) {                         // key: "stroke|lineWidth"; values: x0, y0, x1, y1 per line
    for (const [key, l] of m) {
      const bar = key.lastIndexOf('|'); ctx.strokeStyle = key.slice(0, bar); ctx.lineWidth = +key.slice(bar + 1);
      ctx.beginPath(); for (let i = 0; i < l.length; i += 4) { ctx.moveTo(l[i], l[i + 1]); ctx.lineTo(l[i + 2], l[i + 3]); } ctx.stroke();
    }
    m.clear();
  }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const mod = (a, n) => ((a % n) + n) % n;

  // ── The world (all in u) ─────────────────────────────────
  // Mid layer: the work itself.
  const BW = 11.5, BH = 8;                   // one step of the clean violet bar a messy sequence becomes
  const SPECIALS = [
    { x: 0, join: 2, orange: 2, stamp: 4, dup: 4, ticks: [0, 1, 3],
      // [dx, y centre, w, h, rotation]
      blocks: [[0, 49, 13, 34, -.026], [16.5, 45, 12, 30, .02], [37, 55, 13.5, 37, -.014], [54, 47.5, 12, 31, .034], [73, 52, 13, 34, -.03]],
      path: [[28.5, 43], [32.5, 43], [32.5, 21], [61, 21], [61, 30], [44, 30], [44, 35.4]] },       // a detour up and back
    { x: 330, join: 3, orange: 3, stamp: 1, dup: 1, ticks: [0, 2, 4],
      blocks: [[0, 51, 13, 33, .02], [15.5, 48, 12.5, 36, -.022], [33, 53, 12, 30, .03], [49, 47, 13.5, 35, -.018], [70, 50, 12.5, 32, .024]],
      path: [[39, 68.2], [39, 83], [68, 83], [68, 74], [56, 74], [56, 65.4]] },                       // a detour down and back
  ];
  const DUPES = [{ x: 232, seed: 3 }, { x: 560, seed: 7 }];
  const CHECKS = [
    { x: 138, marks: ['t', 't', 'x', 't', 'o', 't', '', 't', 't', 'x', 't'] },
    { x: 470, marks: ['t', '', 't', 't', 'x', 't', 't', '', 't', 't', 't'] },
  ];
  const TIMES = [{ x: 240, y: 9, orange: true }, { x: 500, y: 10.5, orange: false }];
  const TABLES = [{ x: 640 }];

  // The messy timeline: a detour, a backtrack, a dip. Sampled every 1u of its length.
  const TIME_PATH = [[0, 0], [14, 0], [14, -5], [38, -5], [38, 5], [27, 5], [27, 0], [56, 0], [60, 4], [72, 4], [72, -4], [86, -4], [86, 0], [110, 0]];
  const TIME_CLEAN = 72;
  const TIME_SAMPLES = (() => {
    const out = []; let s = 0;
    for (let i = 0; i < TIME_PATH.length - 1; i++) {
      const [x0, y0] = TIME_PATH[i], [x1, y1] = TIME_PATH[i + 1], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len));
      for (let j = 0; j < n; j++) out.push({ x: lerp(x0, x1, j / n), y: lerp(y0, y1, j / n), s: s + len * j / n });
      s += len;
    }
    const [lx, ly] = TIME_PATH[TIME_PATH.length - 1]; out.push({ x: lx, y: ly, s });
    out.forEach(p => p.c = p.s / s * TIME_CLEAN);
    return out;
  })();
  const TIME_LEN = TIME_SAMPLES[TIME_SAMPLES.length - 1].s;
  const TIME_STOPS = [{ s: 9 }, { s: 44 }, { s: 47.5, dup: 1 }, { s: 66, orange: 1 }, { s: 84 }, { s: 104 }];

  // The route: short pieces that are broken and misaligned before the gate, one line after it.
  const ROUTE_STEP = 5;
  const ROUTE_SEGS = Array.from({ length: LOOP.mid / ROUTE_STEP }, (_, i) => ({
    x: i * ROUTE_STEP, dy: (hash(i) - .5) * 4 * (hash(i + 40) > .35 ? 1 : .2), f: .55 + hash(i + 80) * .35,
  }));

  // Foreground: the ledger along the bottom. Tally marks (counting by hand) and fragments (work in pieces).
  const TALLIES = [{ x: 30, groups: 6 }, { x: 330, groups: 5 }, { x: 560, groups: 7 }].map((t, n) => {
    t.jit = Array.from({ length: t.groups * 4 }, (_, j) => [(hash(j + n * 50) - .5) * .7, (hash(j + n * 50 + 9) - .5) * 1.6, (hash(j + n * 50 + 17) - .3) * 1.1]);
    t.len = t.groups * (4 * 1.7 + 3.2); return t;
  });
  const FRAGS = [{ x: 170 }, { x: 440 }, { x: 690 }].map((f, n) => {
    f.items = []; let dx = 0, c = 0;
    for (let i = 0; i < 9; i++) {
      const len = 2 + hash(i + n * 30) * 6;
      f.items.push({ dx, len, c, dbl: hash(i + n * 30 + 7) > .6 });
      dx += len + 1 + hash(i + n * 30 + 3) * 3; c += len * .7;
    }
    f.len = dx; return f;
  });

  // Deep: giant ghost forms, cropped by the screen, moving slowest.
  const DEEP = [
    { t: 'sheet', x: 10,  y: -14, w: 48,  h: 72 },
    { t: 'table', x: 95,  y: 60,  w: 120, h: 56, cols: [0, 18, 46, 70, 92, 120] },
    { t: 'slots', x: 262, y: 3,   w: 76,  h: 25, cols: 8, rows: 3 },
    { t: 'sheet', x: 372, y: 34,  w: 42,  h: 88 },
    { t: 'band',  x: 440, y: 69,  w: 250, h: 8 },
    { t: 'table', x: 590, y: -24, w: 86,  h: 52, cols: [0, 22, 50, 86] },
    { t: 'sheet', x: 740, y: 40,  w: 44,  h: 80 },
  ];

  // ── State ─────────────────────────────────────────────────
  let W = 0, H = 0, U = 1, Wu = 1, dpr = 1, gate = { s: 1, e: 0 }, clock = null;
  const resolve = x => ease((gate.s - x) / (gate.s - gate.e));
  const at = (wx, scroll, L, pad = PAD) => mod(wx - scroll + pad, L) - pad;

  function layout() {
    const r = stage.getBoundingClientRect(), p = panel.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = deepCanvas.width = Math.round(W * dpr); canvas.height = deepCanvas.height = Math.round(H * dpr);
    const stacked = p.width > W * .7;
    const worldH = stacked ? Math.max(p.top - r.top + 8, 240) : H;
    U = worldH / 100; Wu = W / U;
    if (stacked) gate = { s: Wu * .78, e: Wu * .3 };
    else {
      const pl = (p.left - r.left) / U, pr = (p.right - r.left) / U;
      gate = { s: pr + GATE_OUT, e: Math.max(pr - GATE_IN, pl + 4) };
    }
    // First layout: start with the second messy sequence arriving at the gate and
    // resolved work already on the left, so the very first frame tells the story.
    if (clock === null) clock = (SPECIALS[1].x - (gate.s - 3)) / SPEED;
  }

  // ── Drawing helpers ───────────────────────────────────────
  function tick(x, y, s, col, a, lw) {
    ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * .5, y); ctx.lineTo(x - s * .12, y + s * .42); ctx.lineTo(x + s * .6, y - s * .58); ctx.stroke();
  }
  function cross(x, y, s, col, a, lw) {
    ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.stroke();
  }
  function lines(x, y, w, h, a, gap, seed) {       // text on a form, as bars
    if (a <= 0 || h <= 0) return;
    ctx.fillStyle = rgba(C.ink, a);
    for (let i = 0, ry = y; ry < y + h; ry += gap, i++) ctx.fillRect(x, ry, w * (.45 + .55 * hash(seed * 13 + i)), .55);
  }
  // A sheet of paper centred on cx, cy. `draw` paints its contents in local coords.
  function sheet(cx, cy, w, h, rot, o) {
    const a = o.a ?? 1;
    if (a <= 0) return;
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
    const x = -w / 2, y = -h / 2;
    if (o.edge > 0) { ctx.fillStyle = rgba(C.sheetEdge, a * o.edge); ctx.fillRect(x + .45, y + .6, w, h); }
    ctx.fillStyle = rgba(o.fill || C.paper, a); ctx.fillRect(x, y, w, h);
    if (o.draw) o.draw(x, y, w, h, a);
    ctx.restore();
  }

  // ── Deep layer ────────────────────────────────────────────
  function drawDeep(sc) {
    const hl = 1 / U, L = LOOP.deep;
    ctx.lineWidth = hl;
    for (const d of DEEP) {
      const x = at(d.x, sc, L, d.w + 4);
      if (x > Wu || x + d.w < 0) continue;
      const { y, w, h } = d;
      if (d.t === 'sheet') {
        ctx.fillStyle = rgba(C.paper, .028); ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rgba(C.paper, .1); ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = rgba(C.paper, .035); ctx.fillRect(x, y, w, 9);
        ctx.strokeStyle = rgba(C.paper, .055); ctx.beginPath();
        for (let ry = y + 14; ry < y + h - 3; ry += 3.4) { ctx.moveTo(x + 3, ry); ctx.lineTo(x + w - 3 - hash(ry) * 14, ry); }
        ctx.stroke();
      } else if (d.t === 'table') {
        ctx.fillStyle = rgba(C.paper, .022); ctx.fillRect(x, y, w, h);
        ctx.fillStyle = rgba(C.paper, .045); ctx.fillRect(x, y, w, 5);
        ctx.strokeStyle = rgba(C.paper, .1); ctx.strokeRect(x, y, w, h);
        ctx.strokeStyle = rgba(C.paper, .06); ctx.beginPath();
        for (const c of d.cols) { ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + h); }
        for (let ry = y + 5; ry < y + h; ry += 5) { ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); }
        ctx.stroke();
      } else if (d.t === 'slots') {
        const cw = w / d.cols, ch = h / d.rows;
        ctx.strokeStyle = rgba(C.paper, .09);
        for (let i = 0; i < d.cols; i++) for (let j = 0; j < d.rows; j++) {
          const sx = x + i * cw + .6, sy = y + j * ch + .6;
          ctx.strokeRect(sx, sy, cw - 1.2, ch - 1.2);
          if (hash(i * 7 + j * 3) > .45) { ctx.fillStyle = rgba(C.paper, .05); ctx.fillRect(sx + 1.2, sy + ch * .35, cw - 3.6, ch * .5); }
        }
      } else if (d.t === 'band') {
        // a long ruled surface, divided at irregular intervals
        ctx.fillStyle = rgba(C.paper, .03); ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rgba(C.paper, .08); ctx.beginPath();
        for (let ry = y + 2.6; ry < y + h - 1; ry += 2.6) { ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); }
        for (let i = 0, sx = x + 14; sx < x + w - 6; i++, sx += 16 + hash(i) * 30) { ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); }
        ctx.stroke();
      }
    }
  }

  // ── Mid layer ─────────────────────────────────────────────
  function drawRoute(sc) {
    // The broad path: violet haze along the route once work has passed the gate.
    const g = ctx.createLinearGradient(gate.e, 0, gate.s, 0);
    g.addColorStop(0, rgba(C.thread, .13)); g.addColorStop(1, rgba(C.thread, 0));
    ctx.fillStyle = g; ctx.fillRect(0, ROUTE - 7, gate.s, 14);
    for (const s of ROUTE_SEGS) {
      const x = at(s.x, sc, LOOP.mid, 8);
      if (x > Wu + 1) continue;
      const k = resolve(x + ROUTE_STEP / 2), th = lerp(.5, .75, k), ks = q(k);
      queue(RECTS, op(mix(C.paper, C.threadLit, ks), lerp(.34, 1, ks)), x, ROUTE + s.dy * (1 - k) - th / 2, lerp(ROUTE_STEP * s.f, ROUTE_STEP + .03, k), th);
    }
    flushRects(RECTS);
  }

  // The special moment: five repeated blocks, three ticks, a detour, one orange
  // intervention, one more manual step. It leaves as one violet bar on the route.
  function drawSpecial(d, ax) {
    if (ax > Wu + 4 || ax + 100 < -70) return;
    const tickAt = [];
    d.blocks.forEach(([dx, yc, w0, h0, r0], i) => {
      const mcx = ax + dx + w0 / 2, k = resolve(mcx);
      const cx = lerp(mcx, ax + i * BW + BW / 2, k), cy = lerp(yc, ROUTE, k);
      const w = lerp(w0, BW + .04, k), h = lerp(h0, BH, k), rot = r0 * (1 - k);
      const c = band(k, .3, .85), fill = mix(C.paper, C.thread, c), ra = 1 - band(k, 0, .45);
      if (i === d.dup) {                                    // the same form, filled in twice
        const da = 1 - band(k, 0, .5);
        if (da > 0) sheet(cx + 1.9 * (1 - k), cy - 2.1 * (1 - k), w, h, rot + .04 * (1 - k), { fill: C.paperShade, a: da, edge: .9,
          draw: (x, y, w, h, a) => lines(x + 1.6, y + 5.5, w - 3.2, h - 8, .12 * a, 2.3, i + 90) });
      }
      sheet(cx, cy, w, h, rot, { fill, edge: (1 - c) * .9, draw: (x, y, w, h) => {
        if (ra > 0) {
          ctx.fillStyle = rgba(C.ink, .12 * ra); ctx.fillRect(x, y, w, Math.min(3.4, h));
          ctx.fillStyle = rgba(C.ink, .4 * ra); ctx.fillRect(x + 1.6, y + 1.3, w * .35, .8);
          lines(x + 1.6, y + 5.6, w - 3.2, h - 8.5, .16 * ra, 2.3, i + d.x);
        }
        if (i === d.orange) {                               // a person had to step in
          const oa = 1 - band(k, .08, .45);
          if (oa > 0) {
            ctx.strokeStyle = rgba(C.orange, oa); ctx.lineWidth = .55;
            ctx.beginPath(); ctx.ellipse(0, h * .06, w * .64, 3.6, -.09, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = rgba(C.orange, oa); ctx.fillRect(x + w - 3.6, y - 2.6, 2.4, 4.6);
          }
        }
        if (i === d.stamp) {                                // and signed off by hand
          const sa = .62 * (1 - band(k, .05, .4));
          if (sa > 0) {
            ctx.save(); ctx.translate(0, h * .2); ctx.rotate(-.14);
            ctx.strokeStyle = rgba(C.ink, sa); ctx.lineWidth = .32; ctx.strokeRect(-w * .36, -2.6, w * .72, 5.2);
            ctx.lineWidth = .16; ctx.strokeRect(-w * .36 + .6, -2, w * .72 - 1.2, 4);
            ctx.fillStyle = rgba(C.ink, sa * .8); ctx.fillRect(-w * .26, -.9, w * .52, .7); ctx.fillRect(-w * .26, .5, w * .3, .5);
            ctx.restore();
          }
        }
        if (c > 0) {                                        // the bar's finish: a lit top edge, faint joints
          ctx.fillStyle = rgba(C.threadLit, .6 * c); ctx.fillRect(x, y, w, .28);
          if (i < d.blocks.length - 1) { ctx.fillStyle = rgba(C.threadLit, .2 * c); ctx.fillRect(x + w - .12, y + 2, .12, h - 4); }
        }
      } });
      if (d.ticks.includes(i)) tickAt.push([cx + w * .12, cy - h / 2 - 4.6, 1 - band(k, .05, .4)]);
    });
    for (const [x, y, a] of tickAt) if (a > 0) tick(x, y, 6.4, C.paper, .95 * a, .7);   // three checks, by hand
    // The detour: drawn by hand across the forms, it shortens into the bar.
    let ks = 0;
    const pts = d.path.map(([px, py]) => { const k = resolve(ax + px); ks += k; return [lerp(ax + px, ax + d.join * BW, k), lerp(py, ROUTE, k)]; });
    const pa = 1 - band(ks / pts.length, .05, .55);
    if (pa > 0) {
      ctx.save();
      ctx.strokeStyle = rgba(C.paper, .9 * pa); ctx.lineWidth = .55; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([1.5, 1.1]);
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(C.paper, .9 * pa);
      ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], .8, 0, Math.PI * 2); ctx.fill();
      const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1];
      ctx.translate(x2, y2); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
      ctx.beginPath(); ctx.moveTo(.5, 0); ctx.lineTo(-1.8, -1.2); ctx.lineTo(-1.8, 1.2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // The same request, three times. It leaves as one record on the route.
  function drawDupes(d, ax) {
    if (ax > Wu + 4 || ax + 50 < -4) return;
    const w = 16, h = 40, DX = [0, 10.5, 21], YC = [50, 47.5, 52.5], R = [-.018, .022, -.012];
    for (let i = 2; i >= 0; i--) {
      const mcx = ax + DX[i] + w / 2, k = resolve(mcx);
      const cx = lerp(mcx, ax + w / 2, k), cy = lerp(YC[i], ROUTE, k), rot = R[i] * (1 - k);
      const a = i ? 1 - band(k, .35, .9) : 1, v = i ? 0 : band(k, .25, .8);
      sheet(cx, cy, w, h, rot, { a, fill: i ? C.paperShade : C.paper, edge: .9, draw: (x, y, w, h, a) => {
        ctx.fillStyle = v ? rgba(mix(C.ink, C.thread, v), lerp(.12, 1, v) * a) : rgba(C.ink, .12 * a); ctx.fillRect(x, y, w, 4.2);
        ctx.fillStyle = rgba(C.ink, .42 * a); ctx.fillRect(x + 1.8, y + 1.6, 6, .9);
        lines(x + 1.8, y + 7.4, w - 3.6, h - 17, .15 * a, 2.4, d.seed);
        // the label: same code on every copy
        const lx = x + w - 8.2, ly = y + h - 6.8;
        ctx.strokeStyle = rgba(C.ink, .55 * a); ctx.lineWidth = .2; ctx.strokeRect(lx, ly, 6.6, 4.6);
        ctx.fillStyle = rgba(C.ink, .8 * a);
        for (let b = 0, bx = lx + .6; bx < lx + 6; b++) { const bw = .14 + hash(d.seed * 20 + b) * .42; ctx.fillRect(bx, ly + .6, bw, 3.4); bx += bw + .18 + hash(b + 3) * .3; }
        if (v) { ctx.fillStyle = rgba(C.thread, v * a); ctx.fillRect(x, y, .8, h); }
      } });
    }
  }

  // A checklist, cropped by the top of the screen. Every tick by hand becomes one violet line.
  function drawChecklist(d, ax) {
    const w = 36, top = -12, h = 76;
    if (ax > Wu + 4 || ax + w < -4) return;
    const k = resolve(ax + w / 2), c = band(k, .3, .8), ma = 1 - band(k, 0, .45);
    sheet(ax + w / 2, top + h / 2, w, h, .012 * (1 - k), { edge: .9, draw: (x, y, w, h) => {
      const bx = x + 3.4, gap = 5.6, y0 = y + 14;
      ctx.fillStyle = rgba(C.ink, .1); ctx.fillRect(x, y, w, 10);
      if (c > 0) {
        ctx.fillStyle = rgba(C.thread, 1);
        ctx.fillRect(bx + 1.3 - .3, y0 + 1.3, .6, (d.marks.length - 1) * gap * band(k, .25, .95));
      }
      d.marks.forEach((m, i) => {
        const ry = y0 + i * gap;
        ctx.fillStyle = rgba(C.ink, .16); ctx.fillRect(bx + 5.2, ry + .9, (w - 13) * (.4 + .55 * hash(i + d.x)), .8);
        ctx.lineWidth = .22; ctx.strokeStyle = rgba(C.ink, .6 * (1 - c)); ctx.strokeRect(bx, ry, 2.6, 2.6);
        if (c > 0) { ctx.fillStyle = rgba(C.thread, c); ctx.fillRect(bx, ry, 2.6, 2.6); }
        if (ma <= 0) return;
        const jx = (hash(i * 3 + d.x) - .5) * 1.2, jy = (hash(i * 5 + d.x) - .5) * .8;
        if (m === 't') tick(bx + 1.5 + jx, ry + 1 + jy, 3.8, C.ink, .85 * ma, .5);
        else if (m === 'x') cross(bx + 1.3 + jx, ry + 1.3 + jy, 2.6, C.ink, .8 * ma, .45);
        else if (m === 'o') {
          ctx.fillStyle = rgba(C.orange, ma); ctx.fillRect(bx, ry, 2.6, 2.6);
          ctx.strokeStyle = rgba(C.orange, ma); ctx.lineWidth = .45; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx + 5, ry + 3.1); ctx.bezierCurveTo(bx + 12, ry + 3.9, bx + 20, ry + 2.4, x + w - 4, ry + 3.4); ctx.stroke();
        }
      });
      if (ma > 0) {                                        // a note in the margin
        const my = y0 + 5 * gap;
        ctx.strokeStyle = rgba(C.ink, .6 * ma); ctx.lineWidth = .35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + w - 2.6, my); ctx.quadraticCurveTo(x + w - 1, my + 1, x + w - 1.2, my + 6);
        ctx.quadraticCurveTo(x + w - 1.4, my + 11, x + w - 2.8, my + 12.5); ctx.stroke();
      }
    } });
  }

  // A long timeline with detours and manual checkpoints; it straightens into one line.
  function drawTimeline(d, ax) {
    if (ax > Wu + 4 || ax + TIME_LEN < -4) return;
    const S = TIME_SAMPLES, P = new Array(S.length), K = new Array(S.length);
    for (let i = 0; i < S.length; i++) {
      const k = resolve(ax + S[i].x); K[i] = k;
      P[i] = [lerp(ax + S[i].x, ax + S[i].c, k), d.y + S[i].y * (1 - k)];
    }
    // Runs of segments at the same (quantised) resolve go down as one path: the colours are
    // opaque, so a joined run looks the same as its pieces and costs one stroke, not ~150.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let run = -1;
    for (let i = 0; i < S.length - 1; i++) {
      const k = q((K[i] + K[i + 1]) / 2);
      if (k !== run) {
        if (run >= 0) ctx.stroke();
        run = k;
        ctx.strokeStyle = op(mix(C.paper, C.threadLit, k), lerp(.62, 1, k)); ctx.lineWidth = lerp(.32, .55, k);
        ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]);
      }
      ctx.lineTo(P[i + 1][0], P[i + 1][1]);
    }
    if (run >= 0) ctx.stroke();
    for (const st of TIME_STOPS) {
      if (st.orange && !d.orange) continue;
      const j = Math.min(S.length - 1, Math.round(st.s / TIME_LEN * (S.length - 1)));
      let [x, y] = P[j]; const k = K[j];
      if (st.dup) { const a = 1 - band(k, .1, .6); if (a <= 0) continue; ctx.globalAlpha = a; x += 3 * (1 - k); }
      if (st.orange) {
        const s = lerp(2.6, 1.8, k);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4 * (1 - k));
        ctx.fillStyle = rgba(mix(C.orange, C.thread, band(k, .2, .7))); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      } else {
        const s = lerp(2.8, 1.8, k), c = band(k, .3, .8);
        ctx.fillStyle = op(C.night, 1); ctx.fillRect(x - s / 2, y - s / 2, s, s);
        if (c < 1) { ctx.strokeStyle = rgba(C.paper, .85 * (1 - c)); ctx.lineWidth = .24; ctx.strokeRect(x - s / 2, y - s / 2, s, s); }
        if (c > 0) { ctx.fillStyle = rgba(C.thread, c); ctx.fillRect(x - s / 2, y - s / 2, s, s); }
        const ta = 1 - band(k, 0, .4);
        if (ta > 0) tick(x + .2, y + .1, 2.4, C.paper, .9 * ta, .32);
      }
      ctx.globalAlpha = 1;
    }
  }

  // A table with repeated rows. The copies drop out and the table gets shorter.
  function drawTable(d, ax) {
    const w = 54, top = 27, rowH = 4.2, ROWS = 'abbcdddeff', COLS = [0, 11, 29, 42, 54];
    if (ax > Wu + 4 || ax + w < -4) return;
    const k = resolve(ax + w / 2), c = band(k, .3, .85);
    const uniq = []; let u = -1;
    for (let i = 0; i < ROWS.length; i++) { if (i === 0 || ROWS[i] !== ROWS[i - 1]) u++; uniq.push(u); }
    const hM = 6 + ROWS.length * rowH + 1, hC = 6 + (u + 1) * rowH + 1, h = lerp(hM, hC, k);
    sheet(ax + w / 2, top + h / 2, w, h, -.008 * (1 - k), { edge: .9, draw: (x, y, w, h) => {
      ctx.fillStyle = rgba(C.ink, .12); ctx.fillRect(x, y, w, 6);
      if (c > 0) { ctx.fillStyle = rgba(C.thread, c); ctx.fillRect(x + COLS[3] + .3, y + 6, COLS[4] - COLS[3] - .6, h - 7); }
      ctx.strokeStyle = rgba(C.ink, .14); ctx.lineWidth = .12; ctx.beginPath();
      for (const cx of COLS.slice(1, -1)) { ctx.moveTo(x + cx, y + 6); ctx.lineTo(x + cx, y + h - 1); }
      ctx.stroke();
      for (let i = 0; i < ROWS.length; i++) {
        const dup = i > 0 && ROWS[i] === ROWS[i - 1], a = dup ? 1 - band(k, .1, .6) : 1;
        if (a <= 0) continue;
        const ry = y + 6 + lerp(i, uniq[i], k) * rowH, seed = ROWS.charCodeAt(i);
        ctx.fillStyle = rgba(C.ink, .07 * a); ctx.fillRect(x, ry + rowH - .1, w, .1);
        for (let cI = 0; cI < 3; cI++) {
          ctx.fillStyle = rgba(C.ink, .22 * a);
          ctx.fillRect(x + COLS[cI] + 1.4, ry + 1.7, (COLS[cI + 1] - COLS[cI] - 3) * (.35 + .6 * hash(seed + cI)), .8);
        }
        ctx.fillStyle = c > .5 ? rgba(C.paper, .85 * a) : rgba(C.ink, .22 * a);
        ctx.fillRect(x + COLS[3] + 1.4, ry + 1.7, 6 + hash(seed) * 4, .8);
        if (dup && a > 0) {                                // "same as above", by hand
          ctx.strokeStyle = rgba(C.ink, .7 * a); ctx.lineWidth = .3; ctx.beginPath();
          ctx.moveTo(x + w + 1.2, ry + 1.4); ctx.lineTo(x + w + 3.6, ry + 1.2); ctx.moveTo(x + w + 1.2, ry + 2.6); ctx.lineTo(x + w + 3.6, ry + 2.4); ctx.stroke();
        }
      }
    } });
    // the "same as above" marks sit off the paper; draw them in paper colour so they read on the night
    for (let i = 1; i < ROWS.length; i++) {
      if (ROWS[i] !== ROWS[i - 1]) continue;
      const a = 1 - band(k, .1, .6); if (a <= 0) continue;
      const ry = top + 6 + lerp(i, uniq[i], k) * rowH;
      ctx.strokeStyle = rgba(C.paper, .8 * a); ctx.lineWidth = .32; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(ax + w + 1.4, ry + 1.5); ctx.lineTo(ax + w + 4, ry + 1.3); ctx.moveTo(ax + w + 1.4, ry + 2.7); ctx.lineTo(ax + w + 4, ry + 2.5); ctx.stroke();
    }
  }

  function drawMid(sc) {
    const L = LOOP.mid;
    for (const d of MID_UNITS) d.fn(d.u, at(d.u.x, sc, L));
  }
  const MID_UNITS = [
    ...TIMES.map(u => ({ u, fn: drawTimeline })),
    ...CHECKS.map(u => ({ u, fn: drawChecklist })),
    ...TABLES.map(u => ({ u, fn: drawTable })),
    ...DUPES.map(u => ({ u, fn: drawDupes })),
    ...SPECIALS.map(u => ({ u, fn: drawSpecial })),
  ];

  // ── Foreground: the ledger ────────────────────────────────
  function drawLedger(sc) {
    const L = LOOP.fore;
    const g = ctx.createLinearGradient(gate.e, 0, gate.s, 0);
    g.addColorStop(0, op(C.threadLit, .9)); g.addColorStop(1, op(C.paper, .3));
    ctx.fillStyle = g; ctx.fillRect(0, LEDGER - .1, Wu, .2);
    const step = 2;
    ctx.font = `500 2.1px ${MONO}`; ctx.textBaseline = 'alphabetic';
    // Ticks, tally marks and tally slashes are each batched by style (marks before slashes,
    // as before: a slash crosses its group's marks).
    const hours = [];
    for (let n = Math.ceil(sc / step); n * step - sc < Wu + step; n++) {
      const x = n * step - sc, k = q(resolve(x)), hour = n % 20 === 0, major = n % 5 === 0;
      queue(RECTS, op(mix(C.paper, C.threadLit, k), hour ? .7 : major ? .45 : .28), x - .08, LEDGER, .16, hour ? 3.6 : major ? 1.7 : .8);
      if (hour) hours.push(n, x);
    }
    flushRects(RECTS);
    ctx.fillStyle = op(C.paper, .42);
    for (let i = 0; i < hours.length; i += 2) ctx.fillText(String(mod(hours[i] / 20 + 7, 24)).padStart(2, '0') + ':00', hours[i + 1] + .8, LEDGER + 3.3);
    for (const t of TALLIES) {
      const ax = at(t.x, sc, L);
      if (ax > Wu + 4 || ax + t.len < -4) continue;
      let j = 0;
      for (let gI = 0; gI < t.groups; gI++) {
        const gx = ax + gI * (4 * 1.7 + 3.2);
        for (let m = 0; m < 4; m++, j++) {
          const [jx, jy, jt] = t.jit[j], mx = gx + m * 1.7 + jx, k = resolve(mx), cx = ax + j * 1.36, ks = q(k);
          queue(MARKS, op(mix(C.paper, C.thread, band(ks, .2, .8)), lerp(.85, 1, ks)) + '|' + lerp(.34, 1.3, band(ks, .3, 1)),
            lerp(mx, cx + .3, k), lerp(84.4 + jy, 90.5, k), lerp(mx + jt, cx + 1.06, k), lerp(91.2, 90.5, k));
        }
        const sa = q(1 - band(resolve(gx + 3), 0, .5));
        if (sa > 0) queue(SLASHES, op(C.paper, .85 * sa) + '|.34', gx - .9, 90.4, gx + 4 * 1.7 - .2, 85.2);
      }
    }
    ctx.lineCap = 'round';
    flushLines(MARKS); flushLines(SLASHES);
    for (const f of FRAGS) {
      const ax = at(f.x, sc, L);
      if (ax > Wu + 4 || ax + f.len < -4) continue;
      for (const it of f.items) {
        const mx = ax + it.dx, k = resolve(mx + it.len / 2);
        const x = lerp(mx, ax + it.c, k), w = lerp(it.len, it.len * .7 + .03, k), y = lerp(88.4, 89.85, k), h = lerp(2.4, 1.3, k);
        if (it.dbl) {                                        // the same piece of work, done again
          const a = 1 - band(k, 0, .6);
          if (a > 0) { ctx.fillStyle = op(C.paper, .3 * a); ctx.fillRect(x + .8 * (1 - k), lerp(y - 3, y, k), w, h); }
        }
        ctx.fillStyle = op(mix(C.paper, C.thread, band(k, .2, .8)), lerp(.55, 1, k));
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  // ── Frame ─────────────────────────────────────────────────
  function draw(full = true) {
    const s = clock * SPEED;
    if (full || deepDue) {
      ctx = deep;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, deepCanvas.width, deepCanvas.height);
      ctx.setTransform(dpr * U, 0, 0, dpr * U, 0, 0);
      drawDeep(s * DEPTH.deep);
      ctx = main;
    }
    deepDue = !deepDue;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(deepCanvas, 0, 0);
    ctx.setTransform(dpr * U, 0, 0, dpr * U, 0, 0);
    drawRoute(s * DEPTH.mid);
    drawMid(s * DEPTH.mid);
    drawLedger(s * DEPTH.fore);
  }

  let raf = 0, last = 0, onScreen = false;
  const shouldRun = () => onScreen && !document.hidden && !reduced.matches;
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; clock += dt; draw(false);
    if (shouldRun()) raf = requestAnimationFrame(frame);
  }
  function sync() {
    if (shouldRun()) { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    else { if (raf) cancelAnimationFrame(raf); raf = 0; draw(); }
  }

  layout(); draw();
  new ResizeObserver(() => { layout(); draw(); }).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.intersectionRatio > 0; sync(); }, { threshold: [0, .01] }).observe(section);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
})();
