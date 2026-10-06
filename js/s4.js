/* S4's drawing. draw(svg) builds the drawing from the data below and returns render(p), p being
   progress 0–1 across the four passes (PH): pencil and trace strokes are drawn by pathLength=1
   dash offsets, screens and chips are groups whose transform and opacity follow their pass.
   The principles are tabs; each selects a pass. Nothing listens to scroll: p moves on a clock,
   toward the selected pass's end (see "The pen"), and pass 1 plays once by itself when the sheet
   first comes into view. Where the whole sheet would set its text under 11px (CSS decides, with
   the same media query as mqFull), the one svg is cropped to the selected pass's focus area
   (CROPS), and the crop moves with p. */
(() => {
  'use strict';
  const s4 = document.querySelector('.s4');
  if (!s4) return;
  const sheetSvg = s4.querySelector('.s4-svg'), steps = [...s4.querySelectorAll('.s4-step')];
  const NS = 'http://www.w3.org/2000/svg';
  const clamp01 = t => Math.max(0, Math.min(1, t)), band = (t, a, b) => clamp01((t - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);

  // The four passes, in drawing progress: equal lengths, short holds between, done by .88.
  const PH = [[0, .2], [.227, .427], [.453, .653], [.68, .88]];
  // Frames: each pass's focus area [x, y, w, h] in viewBox units. ≤470 wide keeps
  // 16-unit text at ≥11px in a 326px frame (a 360px screen); the Screens crop is 524 wide, so chips, clean and edge labels are 18.
  const CROPS = [
    [278, 34, 468, 306],   // Sketch: "Ops writes it down" → "Check price & code", the wrong-code loop, "Rami knows the codes"
    [736, 56, 344, 432],   // Trace: "Over $500?", "Manager signs off", "Over $500: the manager signs"
    [478, 66, 524, 448],   // Screens: "Service code" and "Approval needed", with their chips (and all of Dispatch, between them)
    [470, 506, 440, 280],   // Exceptions: "Rebook visit" (Nobody home) with "Call before rebooking", the branch in and the rebook loop
  ];
  // Phones: the frame is square, so CROPS' wide areas grew above and below into the next row of
  // boxes, which the frame then sliced. These are square and placed on the drawing's empty grid
  // (whatever still meets an edge fades out in the CSS). Sketch and Trace are 456 wide (16-unit
  // text at 12.6px on a 390px phone); Screens and Exceptions, whose smallest words are 18 units,
  // are 500 wide so each holds whole screens.
  const phone = matchMedia('(max-width: 767px)');
  const PHONE_CROPS = [
    [287, -56, 456, 456],   // Sketch: "Ops writes it down", "Check price & code", the loop, "Rami knows the codes"
    [740, 48, 456, 456],    // Trace: "Over $500?", "Manager signs off", "Over $500: the manager signs"
    [496, 50, 500, 500],    // Screens: "Service code", "Dispatch" and "Approval needed", with both chips
    [482, 318, 500, 500],   // Exceptions: "Approval needed" and "Rebook visit", in orange, and the branches in
  ];
  const crops = () => phone.matches ? PHONE_CROPS : CROPS;

  // ── The workflow, as discovered ────────────────────────
  const W = 196, H = 84;
  const N = {
    in:   { x: 130, y: 150, t: 'Request comes in', s: 'WhatsApp · calls · email' },
    note: { x: 390, y: 150, t: 'Ops writes it down', s: 'on paper, then typed', who: 1 },
    code: { x: 640, y: 150, t: 'Check price & code', s: 'from memory' },
    appr: { x: 870, y: 430, t: 'Manager signs off', s: 'by phone', who: 1, x2: 1 },
    tech: { x: 610, y: 430, t: 'Assign technician', s: 'whoever’s free', who: 1 },
    site: { x: 350, y: 430, t: 'Technician on site', s: 'calls in when done' },
    done: { x: 350, y: 700, t: 'Invoice & close', s: 'retyped for billing' },
    away: { x: 650, y: 700, t: 'Nobody home', s: 'happens weekly', x2: 1 },
  };
  const D = { x: 870, y: 150, r: 74, t: 'Over $500?' };
  const R = (n, side) => { const o = N[n]; return side === 'r' ? [o.x + W / 2, o.y] : side === 'l' ? [o.x - W / 2, o.y] : side === 't' ? [o.x, o.y - H / 2] : [o.x, o.y + H / 2]; };
  // Edges: [from, to, bend, label, label position [x, y, anchor], dashed?]. Labels sit clear of every line.
  const EDGES = [
    [R('in', 'r'), R('note', 'l'), 0],
    [R('note', 'r'), R('code', 'l'), 0],
    [R('code', 'r'), [D.x - D.r, D.y], 0],
    [[D.x, D.y + D.r], R('appr', 't'), 0, 'yes', [896, 306]],
    [[D.x - D.r * .55, D.y + D.r * .55], [N.tech.x + 40, N.tech.y - H / 2], -30, 'no', [695, 290]],
    [R('appr', 'l'), R('tech', 'r'), 0],
    [R('tech', 'l'), R('site', 'r'), 0],
    [R('site', 'b'), R('done', 't'), 0],
    [[N.site.x + W / 2 - 20, N.site.y + H / 2], R('away', 't'), 20],
    [R('away', 'r'), [N.tech.x + W / 2 - 30, N.tech.y + H / 2], -70, 'call, rebook', [800, 624, 'start'], 1],
  ];
  const NOTES = [
    { id: 'codes', x: 520, y: 292, w: 172, r: -3, lines: ['Rami knows', 'the codes'] },
    { id: 'limit', x: 990, y: 292, w: 150, r: 3.5, lines: ['Over $500:', 'the manager', 'signs'] },
    { id: 'home', x: 898, y: 712, w: 190, r: -2, lines: ['Call before', 'rebooking'] },
    { id: 'excel', x: 128, y: 540, w: 176, r: 2, lines: ['Copied into', 'Excel. Again.'] },
  ];
  // Screens the traced steps become (pass 3). chip: the note that moves into it, and its words as the rule.
  const SCREENS = [
    { at: 'in', title: 'New request', meta: 'INBOX', fields: 2 },
    { at: 'code', title: 'Service code', meta: 'PRICING', fields: 1, chip: 'codes', chipLines: ['Rami knows', 'the codes'] },
    { at: 'appr', title: 'Approval needed', meta: 'RULE', fields: 1, chip: 'limit', chipLines: ['Over $500:', 'the manager signs'], x2: 1 },
    { at: 'tech', title: 'Dispatch', meta: 'SCHEDULE', fields: 2 },
    { at: 'away', title: 'Rebook visit', meta: 'EXCEPTION', fields: 1, chip: 'home', chipLines: ['Call before', 'rebooking'], x2: 1 },
  ];
  const onScreen = new Set(SCREENS.map(s => s.at));
  const noteH = n => n.lines.length * 22 + 26;

  function draw(svg) {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const j = (a = 2.2) => (rnd() - .5) * 2 * a;
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.append(n); return n; };
    const g = (cls, parent) => el('g', cls ? { class: cls } : {}, parent);
    const text = (x, y, str, cls, size, parent, anchor = 'middle') => { const t = el('text', { x, y, class: cls, 'font-size': size, 'text-anchor': anchor }, parent); t.textContent = str; return t; };
    const parts = [];                                   // {node, phase, a, b, kind}
    const add = (node, phase, a, b, kind = 'stroke') => { parts.push({ node, phase, a, b, kind }); if (kind === 'stroke') node.style.strokeDasharray = '1 1'; };

    // Pencil helpers: rough boxes, wobbly lines, hand arrows
    function roughBox(x, y, w, h, grp) {
      const x0 = x - w / 2, y0 = y - h / 2, x1 = x + w / 2, y1 = y + h / 2;
      const d = `M${x0 - 5 + j()} ${y0 + j()} L${x1 + 4 + j()} ${y0 + j()} M${x1 + j()} ${y0 - 4 + j()} L${x1 + j()} ${y1 + 5 + j()} M${x1 + 5 + j()} ${y1 + j()} L${x0 - 3 + j()} ${y1 + j()} M${x0 + j()} ${y1 + 4 + j()} L${x0 + j()} ${y0 - 5 + j()}`;
      return el('path', { d, class: 'pencil', pathLength: 1 }, grp);
    }
    function wobble(x0, y0, x1, y1, bend = 0) {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      const cx = mx - dy / L * bend + j(4), cy = my + dx / L * bend + j(4);
      return `M${x0 + j(1.5)} ${y0 + j(1.5)} Q${cx} ${cy} ${x1} ${y1}`;
    }
    function arrowHead(x0, y0, x1, y1, bend) {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      const cx = mx - dy / L * bend, cy = my + dx / L * bend, a = Math.atan2(y1 - cy, x1 - cx), s = 13;
      return `M${x1 - s * Math.cos(a - .45)} ${y1 - s * Math.sin(a - .45)} L${x1} ${y1} L${x1 - s * Math.cos(a + .45)} ${y1 - s * Math.sin(a + .45)}`;
    }
    const person = (x, y, grp) => el('path', { d: `M${x - 7} ${y} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M${x - 14} ${y + 26} q14 -22 28 0`, class: 'pencil', pathLength: 1 }, grp);

    // ── Layer 1: the sketch ───────────────────────────────
    const sketch = g('sketch', svg);
    let order = 0; const next = () => order++;
    const pencilOrder = [];
    const knock = [];                                   // pencil words that give way to a clean label in pass 3
    for (const [k, n] of Object.entries(N)) {
      const grp = g('', sketch), o = next(), words = g('', grp);
      pencilOrder.push([roughBox(n.x, n.y, W, H, grp), o]);
      pencilOrder.push([text(n.x, n.y - 2, n.t, 'hand', 21, words), o, 'text']);
      pencilOrder.push([text(n.x, n.y + 22, n.s, 'hand', 16, words), o, 'text']);
      if (n.who) pencilOrder.push([person(n.x - W / 2 + 4, n.y - H / 2 - 30, grp), o]);
      if (!onScreen.has(k)) knock.push(words);
    }
    // Decision diamond
    {
      const grp = g('', sketch), o = next(), words = g('', grp);
      const d = `M${D.x + j()} ${D.y - D.r + j()} L${D.x + D.r + j()} ${D.y + j()} L${D.x + j()} ${D.y + D.r + j()} L${D.x - D.r + j()} ${D.y + j()} Z`;
      pencilOrder.push([el('path', { d, class: 'pencil', pathLength: 1 }, grp), o]);
      pencilOrder.push([text(D.x, D.y + 7, D.t, 'hand', 19, words), o, 'text']);
      knock.push(words);
    }
    // Edges
    EDGES.forEach(([[x0, y0], [x1, y1], bend, label, at, dash]) => {
      const grp = g('', sketch), o = next();
      pencilOrder.push([el('path', { d: wobble(x0, y0, x1, y1, bend), class: 'pencil' + (dash ? ' dash' : ''), pathLength: 1 }, grp), o]);
      pencilOrder.push([el('path', { d: arrowHead(x0, y0, x1, y1, bend), class: 'pencil', pathLength: 1 }, grp), o]);
      if (label) pencilOrder.push([text(at[0], at[1], label, 'hand', 18, grp, at[2]), o, 'text']);
    });
    // The correction loop: the wrong code, fixed by hand. Its note sits to the loop's left, clear of both loops.
    {
      const grp = g('', sketch), o = next(), n = N.code;
      const d = `M${n.x + 60} ${n.y - H / 2} C${n.x + 70} ${n.y - 120} ${n.x - 70} ${n.y - 120} ${n.x - 60} ${n.y - H / 2 - 4}`;
      pencilOrder.push([el('path', { d, class: 'pencil', pathLength: 1 }, grp), o]);
      pencilOrder.push([el('path', { d: arrowHead(n.x - 40, n.y - 110, n.x - 60, n.y - H / 2 - 4, 0), class: 'pencil', pathLength: 1 }, grp), o]);
      pencilOrder.push([text(n.x - 80, n.y - 86, 'wrong code? fix by hand', 'hand', 18, grp, 'end'), o, 'text']);
    }
    // The workaround: a spreadsheet on the side
    {
      const grp = g('', sketch), o = next(), x = 128, y = 380;
      let d = '';
      for (let r = 0; r <= 4; r++) d += `M${x - 80 + j()} ${y - 50 + r * 25 + j()} L${x + 80 + j()} ${y - 50 + r * 25 + j()} `;
      for (let c = 0; c <= 3; c++) d += `M${x - 80 + c * 53 + j()} ${y - 52 + j()} L${x - 80 + c * 53 + j()} ${y + 52 + j()} `;
      pencilOrder.push([el('path', { d, class: 'pencil faint', pathLength: 1 }, grp), o]);
      pencilOrder.push([el('path', { d: wobble(N.note.x - 40, N.note.y + H / 2, x + 30, y - 58, 30), class: 'pencil dash', pathLength: 1 }, grp), o]);
    }
    const nSketch = order;
    pencilOrder.forEach(([node, o, kind]) => add(node, 1, o / nSketch * .78, o / nSketch * .78 + .22, kind === 'text' ? 'fade' : 'stroke'));

    // Notes (drawn with the sketch, as paper stuck to the sheet). body fades once the note's chip has landed.
    const notes = {};
    NOTES.forEach((n, i) => {
      const h = noteH(n), grp = g('note', svg), body = g('', grp);
      grp.setAttribute('transform', `translate(${n.x} ${n.y}) rotate(${n.r})`);
      el('rect', { class: 'paper', x: -n.w / 2, y: -h / 2, width: n.w, height: h }, body);
      el('rect', { class: 'tape', x: -22, y: -h / 2 - 8, width: 44, height: 15 }, body);
      const words = g('', body);
      n.lines.forEach((ln, k) => text(0, -h / 2 + 34 + k * 22, ln, 'hand', 18, words));
      notes[n.id] = { body, words, n };
      add(grp, 1, .3 + i * .12, .42 + i * .12, 'fade');
    });

    // ── Layer 2: the trace ─────────────────────────────────
    const traced = g('traced', svg);
    const traceParts = [], pad = 7;
    for (const n of Object.values(N))
      traceParts.push(el('rect', { x: n.x - W / 2 - pad, y: n.y - H / 2 - pad, width: W + pad * 2, height: H + pad * 2, rx: 10, class: 'trace' + (n.x2 ? ' x2' : ''), pathLength: 1 }, traced));
    traceParts.push(el('path', { d: `M${D.x} ${D.y - D.r - 10} L${D.x + D.r + 10} ${D.y} L${D.x} ${D.y + D.r + 10} L${D.x - D.r - 10} ${D.y} Z`, class: 'trace', pathLength: 1 }, traced));
    const orth = (x0, y0, x1, y1, via = 'h') => via === 'h' ? `M${x0} ${y0} L${(x0 + x1) / 2} ${y0} L${(x0 + x1) / 2} ${y1} L${x1} ${y1}` : `M${x0} ${y0} L${x0} ${(y0 + y1) / 2} L${x1} ${(y0 + y1) / 2} L${x1} ${y1}`;
    const TRACE_EDGES = [
      [orth(N.in.x + W / 2 + pad, N.in.y, N.note.x - W / 2 - pad, N.note.y)],
      [orth(N.note.x + W / 2 + pad, N.note.y, N.code.x - W / 2 - pad, N.code.y)],
      [orth(N.code.x + W / 2 + pad, N.code.y, D.x - D.r - 10, D.y)],
      [`M${D.x} ${D.y + D.r + 10} L${N.appr.x} ${N.appr.y - H / 2 - pad}`, 1],
      // "no": runs under its label (y 330, the label sits at 290) to Assign technician
      [`M${D.x - 40} ${D.y + 44} L${D.x - 40} 330 L${N.tech.x + 40} 330 L${N.tech.x + 40} ${N.tech.y - H / 2 - pad}`],
      [`M${N.appr.x - W / 2 - pad} ${N.appr.y} L${N.tech.x + W / 2 + pad} ${N.tech.y}`, 1],
      [`M${N.tech.x - W / 2 - pad} ${N.tech.y} L${N.site.x + W / 2 + pad} ${N.site.y}`],
      [`M${N.site.x} ${N.site.y + H / 2 + pad} L${N.done.x} ${N.done.y - H / 2 - pad}`],
      [orth(N.site.x + 60, N.site.y + H / 2 + pad, N.away.x, N.away.y - H / 2 - pad, 'v'), 1],
      // the rebook loop: up the right of "call, rebook" (label starts at x 800), under both screens
      [`M${N.away.x + W / 2 + pad} ${N.away.y} L${N.away.x + W / 2 + 40} ${N.away.y} L${N.away.x + W / 2 + 40} ${N.tech.y + 90} L${N.tech.x + 60} ${N.tech.y + 90} L${N.tech.x + 60} ${N.tech.y + H / 2 + pad}`, 1],
      [`M${N.code.x + 60} ${N.code.y - H / 2 - pad} L${N.code.x + 60} ${N.code.y - 110} L${N.code.x - 60} ${N.code.y - 110} L${N.code.x - 60} ${N.code.y - H / 2 - pad}`, 1],
    ];
    // Steps that don't become screens still get a clean name once traced; their pencil words fade as it comes in.
    const cleanLabels = Object.entries(N).filter(([k]) => !onScreen.has(k)).map(([, n]) => text(n.x, n.y + 6, n.t, 'clean', 18, traced));
    cleanLabels.push(text(D.x, D.y + 6, D.t, 'clean', 18, traced));
    TRACE_EDGES.forEach(([d, x2]) => traceParts.push(el('path', { d, class: 'trace' + (x2 ? ' x2' : ''), pathLength: 1 }, traced)));
    traceParts.forEach((p, i) => add(p, 2, i / traceParts.length * .7, i / traceParts.length * .7 + .3));
    const exceptionTraces = traceParts.filter(p => p.classList.contains('x2'));
    const plainTraces = traceParts.filter(p => !p.classList.contains('x2'));

    // ── Layer 3: screens, and the notes that move into them ──
    const sw = 250, cw = sw - 32, ch = 54;
    const screens = SCREENS.map((s, i) => {
      const n = N[s.at], sh = s.chip ? 154 : 118;
      const grp = g('screen' + (s.x2 ? ' x2' : ''), svg);
      el('rect', { class: 'frame', x: -sw / 2, y: -sh / 2, width: sw, height: sh, rx: 8 }, grp);
      el('rect', { class: 'bar', x: -sw / 2, y: -sh / 2, width: sw, height: 6, rx: 3 }, grp);
      text(-sw / 2 + 16, -sh / 2 + 26, s.meta, 'meta', 11, grp, 'start');
      text(-sw / 2 + 16, -sh / 2 + 52, s.title, 'title', 19, grp, 'start');
      for (let f = 0; f < s.fields; f++) el('rect', { class: 'field', x: -sw / 2 + 16, y: -sh / 2 + 64 + f * 24, width: sw - 32 - f * 40, height: 14, rx: 3 }, grp);
      return { s, n, grp, i, chipAt: s.chip && { x: n.x, y: n.y + sh / 2 - 12 - ch / 2 } };
    });
    // Chips: each starts as the note's own words, in its place, and lands in its screen as a rule.
    const chips = screens.filter(sc => sc.s.chip).map(sc => {
      const note = notes[sc.s.chip].n, h = noteH(note), grp = g('chip' + (sc.s.x2 ? ' x2' : ''), svg);
      const box = el('rect', { x: -cw / 2, y: -ch / 2, width: cw, height: ch, rx: 4 }, grp);
      const asChip = g('', grp), asNote = g('', grp);
      sc.s.chipLines.forEach((ln, k) => text(-cw / 2 + 12, -ch / 2 + 22 + k * 21, ln, 'as-chip', 18, asChip, 'start'));
      note.lines.forEach((ln, k) => text(0, -h / 2 + 34 + k * 22, ln, 'hand', 18, asNote));
      return { grp, box, asChip, asNote, from: note, to: sc.chipAt, sc };
    });

    return function render(p) {
      const ph = PH.map(([a, b]) => band(p, a, b));
      for (const part of parts) {
        const t = ease(band(ph[part.phase - 1], part.a, part.b));
        if (part.kind === 'stroke') part.node.style.strokeDashoffset = 1 - t;
        else part.node.style.opacity = t;
      }
      // Pass 3: the sketch steps back to a ghost; clean names replace the pencil words under them.
      const clean = ease(band(ph[2], 0, .35)), ghost = lerp(1, .22, ease(ph[2]));
      sketch.style.opacity = ghost;
      knock.forEach(w => { w.style.opacity = 1 - clean; });
      cleanLabels.forEach(l => { l.style.opacity = clean; });
      screens.forEach(sc => {
        const t = ease(band(ph[2], sc.i * .1, sc.i * .1 + .35));
        sc.grp.setAttribute('transform', `translate(${sc.n.x} ${sc.n.y}) scale(${lerp(.86, 1, t)})`);
        sc.grp.style.opacity = t;
      });
      chips.forEach(c => {
        const a = .3 + c.sc.i * .08, b = .6 + c.sc.i * .06;
        const t = ease(band(ph[2], a, b)), gone = band(ph[2], b, b + .12);
        c.grp.setAttribute('transform', `translate(${lerp(c.from.x, c.to.x, t)} ${lerp(c.from.y, c.to.y, t)}) rotate(${lerp(c.from.r, 0, t)})`);
        c.grp.style.opacity = t > 0 ? 1 : 0;
        c.box.style.opacity = c.asChip.style.opacity = band(t, .6, 1);
        c.asNote.style.opacity = 1 - band(t, .45, .8);
        const note = notes[c.sc.s.chip];
        note.words.style.opacity = t > 0 ? 0 : 1;       // the words leave with the chip (same glyphs, same place)
        note.body.style.opacity = 1 - gone;             // then the empty paper goes
      });
      // Pass 4: exceptions light orange; the plain trace steps back behind them.
      const lit = ph[3] > .15, dim = lerp(1, .55, ease(ph[3]));
      screens.forEach(sc => sc.grp.classList.toggle('is-x', lit && !!sc.s.x2));
      chips.forEach(c => c.grp.classList.toggle('is-x', lit && !!c.sc.s.x2));
      exceptionTraces.forEach(tr => tr.classList.toggle('is-x', lit));
      plainTraces.forEach(tr => { tr.style.opacity = dim; });
    };
  }

  // ── The tabs ───────────────────────────────────────────
  const list = s4.querySelector('.s4-steps'), sheet = s4.querySelector('.s4-sheet'), nav = s4.querySelector('.s4-nav');
  const [prev, next, count] = ['.s4-prev', '.s4-next', '.s4-count'].map(s => nav.querySelector(s));
  const passLabel = sheet.querySelector('.s4-pass'), rev = sheet.querySelector('.s4-rev'), live = s4.querySelector('.s4-live');
  const tabs = steps.map(li => li.querySelector('.s4-say')), names = tabs.map(t => t.querySelector('h3'));
  const PASS = ['01 Sketch', '02 Trace', '03 Screens', '04 Exceptions'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFull = matchMedia('(min-width:1262px) and (min-height:712px)');   // the CSS's full-sheet query
  const render = draw(sheetSvg);

  list.setAttribute('role', 'tablist'); list.setAttribute('aria-labelledby', 's4-title'); list.setAttribute('aria-orientation', 'vertical');
  steps.forEach(li => li.setAttribute('role', 'presentation'));
  tabs.forEach((t, i) => {
    const n = i + 1;
    t.id = `s4-tab-${n}`; names[i].id = `s4-tab-${n}-name`; t.querySelector('p').id = `s4-tab-${n}-text`;
    t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', 's4-sheet');
    t.setAttribute('aria-labelledby', names[i].id); t.setAttribute('aria-describedby', `s4-tab-${n}-text`);
  });
  sheet.setAttribute('role', 'tabpanel'); sheet.tabIndex = 0;
  nav.hidden = false;

  let sel = 0;
  // Selection state, without touching the drawing.
  function mark(i, slide) {
    // Opening one description and closing another moves the principles. The list is laid out
    // once, here; each principle then slides from where it was (its CSS transition on transform).
    const from = slide && !reduced.matches ? steps.map(s => s.offsetTop) : null;
    sel = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    sheet.setAttribute('aria-labelledby', names[i].id);
    passLabel.textContent = PASS[i]; rev.textContent = 'Rev ' + 'ABCD'[i];
    count.textContent = `0${i + 1} / 04`;
    prev.setAttribute('aria-disabled', String(i === 0)); next.setAttribute('aria-disabled', String(i === 3));
    if (from) {
      const by = steps.map((s, k) => from[k] - s.offsetTop);
      steps.forEach((s, k) => { s.style.transition = 'none'; s.style.transform = by[k] ? `translateY(${by[k]}px)` : ''; });
      void list.offsetWidth;
      steps.forEach(s => { s.style.transition = s.style.transform = ''; });
    }
  }
  function select(i, announce) {
    if (i < 0 || i > 3) return;
    intro.disconnect();                                  // a choice made first replaces the opening pass
    if (i !== sel) mark(i, true);
    if (announce) live.textContent = `Principle ${i + 1} of 4: ${names[i].textContent}`;
    go();
  }

  // ── The pen ─────────────────────────────────────────────
  // One rAF loop moves p toward the selected pass's end. Forward, the selected pass plays in
  // PLAY and any pass on the way runs in SKIP, so 01 → 04 still shows trace, then screens, then
  // exceptions; back, p rewinds in BACK. A new choice retargets from wherever p is. In the frame,
  // the crop moves from where it is to the selected pass's, over the same time.
  const ENDS = [0, ...PH.map(([, b]) => b)];          // segment k: pass k and the hold before it
  const PLAY = 1200, SKIP = 250, BACK = 450;
  const FULL = [0, 0, 1080, 800];
  let p = 0, framed = !mqFull.matches, vb = framed ? crops()[0] : FULL, plan = null, raf = 0, last = 0;
  const paint = () => { render(p); sheetSvg.setAttribute('viewBox', vb.map(v => +v.toFixed(2)).join(' ')); };
  function go() {
    const T = ENDS[sel + 1], vbTo = framed ? crops()[sel] : FULL, segs = [];
    if (T > p) {
      for (let k = 0; k < 4; k++) {
        const a = Math.max(p, ENDS[k]), b = Math.min(T, ENDS[k + 1]);
        if (b > a) segs.push({ a, b, dur: (b - a) / (ENDS[k + 1] - ENDS[k]) * (k === sel ? PLAY : SKIP) });
      }
    } else if (T < p) segs.push({ a: p, b: T, dur: BACK, eased: true });
    const total = segs.reduce((s, g) => s + g.dur, 0) || (vbTo === vb ? 0 : BACK);
    if (reduced.matches || !total) {                     // reduced motion: straight to the pass's end
      cancelAnimationFrame(raf); raf = 0; plan = null; p = T; vb = vbTo; paint(); return;
    }
    plan = { segs, total, t: 0, vbFrom: vb, vbTo };
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    plan.t += Math.min(50, now - last); last = now;    // rAF sleeps in hidden tabs; that time isn't counted
    let t = plan.t;
    for (const g of plan.segs) {
      if (t < g.dur) { const f = t / g.dur; p = lerp(g.a, g.b, g.eased ? ease(f) : f); break; }
      t -= g.dur; p = g.b;
    }
    const c = ease(Math.min(1, plan.t / plan.total));
    vb = plan.vbFrom.map((v, j) => lerp(v, plan.vbTo[j], c));
    if (plan.t >= plan.total) { vb = plan.vbTo; plan = null; }
    paint();
    raf = plan ? requestAnimationFrame(tick) : 0;
  }

  // ── Wiring ──────────────────────────────────────────────
  // Phones: the sheet sits under the four open principles, so a choice made with the sheet off
  // screen brings it into view (its scroll margins clear the fixed bar and keep Previous / Next).
  const reveal = () => {
    if (!phone.matches) return;
    const r = sheet.getBoundingClientRect(), bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 0;
    if (r.top < bar || r.bottom > innerHeight) sheet.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { select(i); reveal(); }));
  list.addEventListener('keydown', e => {
    const i = tabs.indexOf(e.target);
    if (i < 0) return;
    const j = { ArrowDown: (i + 1) % 4, ArrowRight: (i + 1) % 4, ArrowUp: (i + 3) % 4, ArrowLeft: (i + 3) % 4, Home: 0, End: 3, Enter: i, ' ': i }[e.key];
    if (j === undefined) return;
    e.preventDefault(); select(j); tabs[j].focus();
  });
  prev.addEventListener('click', () => select(sel - 1, true));
  next.addEventListener('click', () => select(sel + 1, true));
  // Pass 1 plays once, when the sheet is first half on screen. Under reduced motion it is already drawn.
  const intro = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= .5) { intro.disconnect(); go(); } }, { threshold: .5 });
  mqFull.addEventListener('change', () => {
    framed = !mqFull.matches;
    vb = framed ? crops()[sel] : FULL;
    if (plan) plan.vbFrom = plan.vbTo = vb;
    paint(); reserve();
  });
  // Crossing 767/768 swaps the frame's crops: snap to the selected pass's, as above.
  phone.addEventListener('change', () => {
    if (!framed) return;
    vb = crops()[sel];
    if (plan) plan.vbFrom = plan.vbTo = vb;
    paint();
  });
  // The list keeps the height of its tallest selection, so a frame under it never moves on a click.
  let seenW = 0;
  function reserve() {
    s4.classList.add('is-switching');
    list.style.minHeight = '';
    let h = 0;
    for (let i = 0; i < 4; i++) { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); h = Math.max(h, list.offsetHeight); }
    steps.forEach((s, k) => s.classList.toggle('is-on', k === sel));
    list.style.minHeight = h + 'px';
    void list.offsetWidth;
    s4.classList.remove('is-switching');
  }
  new ResizeObserver(() => { if (s4.clientWidth !== seenW) { seenW = s4.clientWidth; reserve(); } }).observe(s4);
  document.fonts && document.fonts.ready.then(reserve);
  // Every visit starts on pass 01: nothing is saved (no storage, no hash), and a page restored
  // from the back/forward cache, which keeps its scripts' state, is set back to 01. Scrolling
  // away and back within a visit keeps the reader's pass. A restore before pass 1 has played
  // leaves it to play on first sight, as on a fresh load.
  addEventListener('pageshow', e => { if (e.persisted && (sel !== 0 || p > ENDS[1])) select(0); });

  mark(0, false);
  s4.classList.add('is-tabs');
  if (reduced.matches) p = ENDS[1]; else intro.observe(sheet);
  paint();
  reserve();

  // ── The title block's ticks ────────────────────────────
  // Drawn in order (CSS: 350ms each, 250ms apart) each time the block is half on screen,
  // and set back to undrawn once it has fully left, so every visit draws them again.
  const commit = s4.querySelector('.s4-commit');
  if (commit) {
    const ticks = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= .5) commit.classList.add('is-ticked');
      else if (!e.isIntersecting) commit.classList.remove('is-ticked');
    }, { threshold: [0, .5] });
    const arm = () => {
      const on = !reduced.matches;
      commit.classList.toggle('is-armed', on);
      if (on) ticks.observe(commit); else { ticks.disconnect(); commit.classList.remove('is-ticked'); }
    };
    reduced.addEventListener('change', arm);
    arm();
  }
})();
