/* S3's desk. Pinned (wide screens): scroll drives one camera path from the overview
   through each situation, pulls back to show all four at once, then the desk recedes
   (under S4, when S4 follows). Stacked (narrower screens, and always under reduced
   motion): each scene sits under its caption, in a frame cropped to its telling area.
   The same four scene nodes move between the desk and the frames.
   Each scene has one beat. A scene plays only while it has focus (pinned: it is the
   camera's frame; stacked: ≥50% on screen until it leaves): it starts from a primed
   state, lands its beat within ~3s, holds, and loops back to primed. Without focus it
   stands frozen on its beat. Reduced motion: every scene stands on its beat. */
(() => {
  'use strict';
  const s3 = document.querySelector('.s3');
  if (!s3) return;
  const track = s3.querySelector('.s3-track'), stage = s3.querySelector('.s3-stage'), desk = s3.querySelector('.s3-desk');
  const head = s3.querySelector('.s3-head'), h2 = head.querySelector('h2'), list = s3.querySelector('.s3-list');
  const items = [...s3.querySelectorAll('.s3-item')], ticks = [...s3.querySelectorAll('.s3-meter i')];
  // Pinned only where a situation's camera scale keeps the desk's smallest text (15px) at 11px or more.
  const mqPin = matchMedia('(min-width: 1120px) and (min-height: 580px)');
  const mqStill = matchMedia('(prefers-reduced-motion: reduce)');
  const lerp = (a, b, t) => a + (b - a) * t, clamp01 = t => Math.max(0, Math.min(1, t)), ease = t => t * t * (3 - 2 * t);
  const band = (y, a, b) => clamp01((y - a) / (b - a));
  const on = (el, v = true) => el && el.classList.toggle('is-on', v);
  // Set a state without its transitions: one style pass with .is-snap, then transitions come back.
  const snap = (el, fn) => { el.classList.add('is-snap'); fn(); void el.offsetWidth; el.classList.remove('is-snap'); };

  // ── Scene clocks ────────────────────────────────────────
  // One rAF serves every scene, and runs only while a visible scene is waiting on something.
  const clocks = [];
  let raf = 0, last = 0;
  const due = () => !document.hidden && clocks.some(c => c.on && c.timers.size);
  // Time is measured frame to frame. A timer that fires keeps the chain going for one more
  // frame, because the wait that follows it is only queued after this callback returns.
  function tick(now) {
    raf = 0; const dt = Math.max(0, Math.min(1000, now - last)); last = now;
    let fired = false;
    for (const c of clocks) if (c.on && c.timers.size) { c.t += dt; for (const t of [...c.timers]) { t.left -= dt; if (t.left <= 0) { c.timers.delete(t); c.late = -t.left; fired = true; t.r(); } } }
    if (fired || due()) raf = requestAnimationFrame(tick);
  }
  // Waking counts from now: the gap while nothing was waiting (or the tab was hidden) isn't counted.
  const wake = () => { if (!raf && due()) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', () => { last = performance.now(); wake(); });   // time spent hidden never counts
  function clock(el) {
    // A wait resolves on the first frame at or after its time; the overshoot (late) comes off
    // the next wait, so a run of short waits keeps to its schedule instead of drifting a frame each.
    // c.t is the clock's own running time (ms), for anything paced faster than frames can be relied on.
    const c = { el, on: false, timers: new Set(), gen: 0, late: 0, t: 0 };
    c.wait = ms => new Promise(r => { const g = c.gen; c.timers.add({ left: ms - c.late, r: () => g === c.gen && r() }); c.late = 0; wake(); });
    c.wait.now = () => c.t;
    c.stop = () => { c.gen++; c.timers.clear(); c.late = 0; };   // a stopped loop's pending wait never resolves
    c.loop = fn => { c.stop(); const g = c.gen; (async () => { while (g === c.gen) await fn(c.wait); })(); };
    clocks.push(c); return c;
  }
  const seen = new IntersectionObserver(es => {
    for (const e of es) { const c = clocks.find(c => c.el === e.target); c.on = e.isIntersecting; c.el.classList.toggle('is-idle', !c.on); }
    wake();
  });

  // ── Scenes ──────────────────────────────────────────────
  // Each: arrange(arr) for 'desk' or 'col'; prime() and beat() set its primed and beat
  // states at once; play(wait) is one pass of its loop, from primed back to primed.
  // crop is its stacked frame, in scene units of the column arrangement.
  const scenes = [];

  // 01 · retyping — beat: the same value typed for the third time
  scenes.push((() => {
    const el = desk.querySelector('.sc-a');
    const VALUES = ['Haddad & Co.', 'INV-2291', '$1,240.00', '12 Oct'], AMOUNT = 2;
    const src = [...el.querySelectorAll('.a-fields > div')];
    const dests = [...el.querySelectorAll('.a-dest')].map(d => ({ el: d, slots: [...d.querySelectorAll('.t')] }));
    const report = dests[2];
    const caret = Object.assign(document.createElement('i'), { className: 'caret' });
    const fill = (d, v = true) => d.slots.forEach((s, i) => { s.textContent = v ? VALUES[i] : ''; });
    const hit = v => { on(src[AMOUNT], v); dests.forEach(d => d.slots[AMOUNT].classList.toggle('is-hit', v)); };
    const prime = () => { caret.remove(); hit(false); dests.forEach((d, i) => { fill(d, i < 2); on(d.el, i < 2); }); };
    return {
      el, crop: { col: { x: 0, y: 0, w: 440, h: 826 }, phone: { x: 0, y: 0, w: 400, h: 476 } },
      arrange() {},
      prime,                                                // typed into the sheet (×1) and the order form (×2)
      beat() { prime(); fill(report); on(report.el); hit(true); },
      async play(wait) {
        await wait(450);
        // Only the report types. Keystrokes are scheduled on the clock's time and typed as
        // their moment passes, so a slow frame never slows the typing down.
        const keys = []; let at = 0;
        VALUES.forEach((v, i) => { for (const ch of v) keys.push([i, ch, at += 30 + Math.random() * 16]); at += 90; });
        const t0 = wait.now();
        report.slots[0].after(caret);
        for (let k = 0; k < keys.length;) {
          await wait(16);
          while (k < keys.length && keys[k][2] <= wait.now() - t0) { const [i, ch] = keys[k++]; report.slots[i].textContent += ch; report.slots[i].after(caret); }
        }
        caret.remove(); on(report.el); hit(true);           // ×3 lands; $1,240.00 lights in the source and all three copies
        await wait(2600);
        hit(false); on(report.el, false); await wait(300);
        fill(report, false); await wait(500);
      },
    };
  })());

  // 02 · requests pile up — beat: the original request gets buried
  scenes.push((() => {
    const el = desk.querySelector('.sc-b'), pile = el.querySelector('.b-pile');
    const counts = Object.fromEntries([...el.querySelectorAll('[data-src]')].map(b => [b.dataset.src, b]));
    const REQS = [
      ['Email', 'Booking: Thu 10:00', 'Dr. Salem Clinic', 'reply', 'Needs reply'],
      ['Phone', 'Order 40 filters', 'Karim, Dbayeh site', 'follow', 'Follow up'],
      ['Email', 'Approve PO-118?', 'Finance', 'pending', 'Pending'],
      ['WhatsApp', 'Any update on my order?', 'N. Khoury', 'reply', 'Needs reply'],
      ['WhatsApp', 'Can you service our AC?', 'Haddad & Co.', 'pending', 'Pending'],     // S1's request, here without a system
      ['Phone', 'Move my visit to Tuesday', 'Hala T.', 'follow', 'Follow up'],
      ['Email', 'Send the invoice again', 'Dr. Salem Clinic', 'reply', 'Needs reply'],
      ['Email', 'Quote for 3 units?', 'Beit Mery Hotel', 'pending', 'Pending'],
      ['WhatsApp', 'Is the technician coming?', 'Haddad & Co.', 'follow', 'Follow up'], // the same client, landing on top of it
    ];
    const KEY = 4, PRIMED = 5, STEPS = REQS.length - PRIMED;
    // Ages come from one clock: each new card lands a little later (hours since the primed pile).
    // The original reads now → 2h → 1d → 2d → 3d as the four land on it.
    const AT = [0, 2, 24, 48, 72], BORN = [-75, -26, -6, -2.5, 0];   // BORN: the primed cards, hours before
    const AGES = [[144, '6d'], [96, '4d'], [72, '3d'], [48, '2d'], [24, '1d'], [5, '5h'], [2, '2h'], [0, 'now']];
    const ageLabel = h => AGES.find(([min]) => Math.max(0, h) >= min)[1];
    const LAYOUT = {                                        // where each card lands, and where it flies in from
      desk: { spots: [[590, 360, 3], [250, 392, -2], [600, 40, 2.5], [236, 236, -1.5], [430, 150, -2],
                      [330, 60, 3], [540, 214, -3], [300, 244, 2.5], [474, 134, 1.5]],
              from: { WhatsApp: [20, 40], Email: [20, 164], Phone: [20, 288] } },
      col:  { spots: [[152, 392, 3], [0, 404, -2], [160, 128, 2.5], [0, 262, -1.5], [70, 214, -2],
                      [10, 140, 3], [160, 280, -3], [4, 300, 2.5], [104, 198, 1.5]],
              from: { WhatsApp: [0, 0], Email: [150, 0], Phone: [300, 0] } },
      // Phones: the same pile in 400 × 420, drawn tighter, with the original request's thread
      // edge still showing and the newest three readable on top.
      phone: { spots: [[118, 300, 3], [0, 306, -2], [120, 116, 2.5], [0, 214, -1.5], [40, 168, -2],
                       [6, 122, 3], [120, 214, -3], [2, 248, 2.5], [84, 160, 1.5]],
               from: { WhatsApp: [0, 0], Email: [136, 0], Phone: [272, 0] } },
    };
    let L = LAYOUT.desk;
    const live = [];
    const land = c => { const [x, y, r] = L.spots[c.i]; c.el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`; };
    function card(i) {
      const [src, title, from, kind, label] = REQS[i], c = document.createElement('div');
      c.className = 'paper b-card' + (i === KEY ? ' is-key' : '');
      c.innerHTML = `<div class="row mono"><span>${src}</span><span class="age"></span></div><h4></h4><p></p><span class="stamp ${kind}">${label}</span>`;
      c.querySelector('h4').textContent = title; c.querySelector('p').textContent = from;
      pile.append(c);
      const entry = { el: c, i }; live.push(entry); return entry;
    }
    // Ages, burial and the counters for a pile of `n` cards after `step` of the new ones have landed.
    function settle(n, step) {
      live.forEach(c => {
        c.el.querySelector('.age').textContent = ageLabel(AT[step] - (c.i < PRIMED ? BORN[c.i] : AT[c.i - PRIMED + 1]));
        c.el.classList.toggle('is-buried', c.i < n && n - c.i > 4);
      });
      for (const s in counts) counts[s].textContent = REQS.slice(0, n).filter(r => r[0] === s).length;
    }
    function build(n) {
      live.splice(0).forEach(c => c.el.remove());
      for (let i = 0; i < n; i++) { const c = card(i); land(c); on(c.el.querySelector('.stamp')); }
      settle(n, n - PRIMED);
    }
    return {
      el, crop: { col: { x: 0, y: 0, w: 440, h: 516 }, phone: { x: 0, y: 0, w: 400, h: 420 } },
      arrange(arr) { L = LAYOUT[arr]; live.forEach(land); },
      prime() { build(PRIMED); },                           // five on the pile, the original on top
      beat() { build(REQS.length); },                       // buried under "Is the technician coming?"
      async play(wait) {
        await wait(260);
        for (let k = 1; k <= STEPS; k++) {
          const i = PRIMED + k - 1, c = card(i), [fx, fy] = L.from[REQS[i][0]];
          c.el.style.transform = `translate(${fx}px,${fy}px) scale(.6)`; c.el.style.opacity = '0';
          settle(i, k - 1); await wait(40);
          c.el.style.opacity = '1'; land(c); settle(i + 1, k);
          await wait(360); on(c.el.querySelector('.stamp'));
          if (k < STEPS) await wait(150);
        }
        await wait(2600);
        live.slice(PRIMED).forEach(c => { c.el.style.opacity = '0'; });   // lift the new ones off: the original is on top again
        settle(PRIMED, 0);
        await wait(650);
        live.splice(PRIMED).forEach(c => c.el.remove());
        await wait(250);
      },
    };
  })());

  // 03 · the schedule — beat: one change ends in "Who can take this?"
  scenes.push((() => {
    const el = desk.querySelector('.sc-c'), board = el.querySelector('.c-board'), hours = board.querySelector('.c-hours');
    const X0 = 150, PX = 72, ROW0 = 44;                     // 72px per hour, from H0 at X0
    // ROW is the row pitch and JY a job's drop inside its row. The column crop starts the day
    // at 11:00; the phone board ends at 14:30, so its flag and question sit inside it, and its
    // rows (96 tall in the CSS) are drawn a little closer.
    const GEO = { desk: { H0: 8, clash: 14.2, ask: 13.2, ROW: 128, JY: 24 },
                  col: { H0: 11, clash: 13.6, ask: 12, ROW: 128, JY: 24 },
                  phone: { H0: 11, clash: 13, ask: 11.6, ROW: 108, JY: 16 } };
    let G = GEO.desk, cur = 0;
    const X = h => X0 + (h - G.H0) * PX;
    const PEOPLE = [['RA', 'Rami'], ['SN', 'S. Nader'], ['KH', 'Karim'], ['MA', 'Maya']];
    const rows = PEOPLE.map(([ini, name], i) => {
      board.insertAdjacentHTML('beforeend', `<div class="c-row" style="top:${ROW0 + i * G.ROW}px"><div class="c-who"><i>${ini}</i><span>${name}</span><em class="c-off">Off today</em></div></div>`);
      return board.lastElementChild;
    });
    const JOBS = [
      [0, 9, 11, 'AC service', 'Hamra'], [0, 13.5, 16, 'Install', 'Verdun'],
      [1, 8.5, 10.5, 'Inspection', 'Jal el Dib'], [1, 12, 14, 'Repair', 'Badaro'],
      [2, 11, 13.5, 'Maintenance', 'Dbayeh'], [2, 15, 17, 'Quote visit', 'Sin el Fil'],
      [3, 11, 13.5, 'Repair', 'Mar Mikhael'], [3, 14.5, 17, 'AC service', 'Achrafieh'],
    ];
    const jobs = JOBS.map(([r, a, b, t, where]) => {
      const j = document.createElement('div'); j.className = 'c-job';
      j.style.cssText = `width:${(b - a) * PX - 6}px;top:${ROW0 + r * G.ROW + G.JY}px`;
      j.innerHTML = `${t}<small>${where}</small>`; board.append(j); return j;
    });
    const ghost = Object.assign(document.createElement('div'), { className: 'c-ghost' });
    ghost.style.cssText = `width:${2 * PX - 6}px;top:${ROW0 + G.JY}px`;
    const flag = txt => Object.assign(document.createElement('span'), { className: 'flag', textContent: txt });
    const clash = flag('Conflict'), loose = flag('Unassigned');
    const ask = Object.assign(document.createElement('div'), { className: 'ask', textContent: 'Who can take this?' });
    board.append(ghost, clash, loose, ask);
    const state = n => {                                   // 0 clean · 1 moved · 2 clash · 3 off · 4 loose · 5 ask
      cur = n;
      jobs[0].style.setProperty('--dx', `${n >= 1 ? 3.6 * PX : 0}px`); ghost.style.opacity = n >= 1 ? '1' : '0';   // 09:00 → 12:36
      jobs[0].classList.toggle('is-moved', n >= 1); [jobs[0], jobs[1]].forEach(j => j.classList.toggle('is-clash', n >= 2)); on(clash, n >= 2);
      rows[3].classList.toggle('is-off', n >= 3);
      jobs[6].classList.toggle('is-loose', n >= 4); on(loose, n >= 4);
      jobs[7].classList.toggle('is-loose', n >= 4); jobs[7].style.transitionDelay = n >= 4 ? '.12s' : '0s';
      on(ask, n >= 5);
    };
    return {
      el, crop: { col: { x: 0, y: 0, w: 440, h: 560 }, phone: { x: 0, y: 0, w: 400, h: 472 } },
      arrange(arr) {
        G = GEO[arr];
        hours.innerHTML = '';
        for (let h = Math.ceil(G.H0 / 2) * 2; h <= 18; h += 2) hours.insertAdjacentHTML('beforeend', `<span style="left:${(h - G.H0) * PX}px">${String(h).padStart(2, '0')}:00</span>`);
        rows.forEach((row, i) => { row.style.top = `${ROW0 + i * G.ROW}px`; });
        jobs.forEach((j, i) => { j.style.left = `${X(JOBS[i][1])}px`; j.style.top = `${ROW0 + JOBS[i][0] * G.ROW + G.JY}px`; });
        ghost.style.left = `${X(9)}px`; ghost.style.top = `${ROW0 + G.JY}px`;
        clash.style.cssText = `left:${X(G.clash)}px;top:${ROW0 + 6}px`;
        loose.style.cssText = `left:${X(11)}px;top:${ROW0 + 3 * G.ROW - 4}px`;
        ask.style.left = `${X(G.ask)}px`; ask.style.top = `${ROW0 + 3 * G.ROW - 52}px`;
        state(cur);
      },
      prime() { state(0); },                                // a clean day
      beat() { state(5); },
      async play(wait) {
        await wait(600); state(1);                          // the one move: Rami's AC service slides to midday
        await wait(550); state(2);                          // it clashes with his install
        await wait(650); state(3);                          // Maya is off
        await wait(450); state(4);                          // her jobs come loose
        await wait(450); state(5);                          // "Who can take this?" at ~2.7s
        await wait(2800);
        state(0); await wait(1000);                         // the day tidies itself back, clean
      },
    };
  })());

  // 04 · which number? — beat: the report can't decide
  scenes.push((() => {
    const el = desk.querySelector('.sc-d');
    const nums = [...el.querySelectorAll('.num')], links = [...el.querySelectorAll('.d-link path')], msg = el.querySelector('.d-msg');
    const field = el.querySelector('.wait'), fieldText = field.querySelector('.wv'), WAITING = fieldText.textContent;
    const VALS = nums.map(n => n.textContent);
    const PATHS = { desk: ['M394 66 C 520 96, 600 70, 690 96', 'M630 180 C 700 180, 720 150, 720 132'],
                    col: ['M340 84 C 318 108, 324 140, 368 160', 'M392 204 C 372 222, 344 228, 330 244'],
                    phone: ['M278 60 C 318 62, 354 84, 360 118', 'M354 150 C 336 214, 214 236, 140 268'] };
    const show = v => { fieldText.textContent = v ?? WAITING; field.classList.toggle('is-val', v != null); };
    const all = v => { nums.forEach(n => on(n, v)); links.forEach(l => on(l, v)); on(msg, v); show(); };
    return {
      el, crop: { col: { x: 0, y: 0, w: 440, h: 720 }, phone: { x: 0, y: 0, w: 400, h: 548 } },
      arrange(arr) {
        links.forEach((l, i) => {                           // a 6/6 dash run as long as the path, then a gap as long again
          l.setAttribute('d', PATHS[arr][i]);
          const len = Math.ceil(l.getTotalLength());
          l.style.strokeDasharray = `${'6 6 '.repeat(Math.ceil(len / 12))}0 ${len}`;
          l.style.setProperty('--len', Math.ceil(len / 12) * 12);
        });
      },
      prime() { all(false); },
      beat() { all(true); },
      async play(wait) {
        for (let i = 0; i < 3; i++) {                       // three numbers, half a second apart; the report tries each
          await wait(i ? 500 : 350);
          on(nums[i]); if (i) on(links[i - 1]); show(VALS[i]);
        }
        await wait(550); show();                            // and falls back to "Waiting for update"
        await wait(250); on(msg);                           // "Which number is correct?" at ~2.2s
        await wait(2800);
        all(false); await wait(900);
      },
    };
  })());

  scenes.forEach(sc => { sc.clock = clock(sc.el); sc.live = false; seen.observe(sc.el); });
  // Stacked frames take the crop of the scene's current arrangement (col, or phone below 768px).
  const cropOf = sc => sc.crop[sc.el.dataset.arr === 'phone' ? 'phone' : 'col'];
  const frames = items.map((li, i) => {
    const f = document.createElement('div'); f.className = 's3-frame'; f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--cw', scenes[i].crop.col.w); f.style.setProperty('--ch', scenes[i].crop.col.h);
    li.append(f); return f;
  });

  // Focus: a scene arriving restarts from primed; a scene leaving freezes on its beat.
  let still = null;
  function arrive(sc) { if (sc.live || still) return; sc.live = true; snap(sc.el, () => sc.prime()); sc.clock.loop(w => sc.play(w)); }
  function leave(sc) { if (!sc.live) return; sc.live = false; sc.clock.stop(); snap(sc.el, () => sc.beat()); }
  const focus = new IntersectionObserver(es => {           // stacked: arrive at ≥50% on screen, leave once off it
    if (mode !== 'stacked') return;
    for (const e of es) { const sc = scenes[frames.indexOf(e.target)]; if (e.intersectionRatio >= .5) arrive(sc); else if (!e.isIntersecting) leave(sc); }
  }, { threshold: [0, .5] });

  // ── Camera (pinned) ─────────────────────────────────────
  // y below is the camera path's own measure, 0–END. The track is 400vh, so the stage pins
  // for 300vh: the last screen of it is the recede (y COVER–END, the screen S4 slides over
  // when it follows), and the 200vh before it run y 0–COVER. The path keeps its
  // proportions; it only runs faster (yOf).
  // One monotone cubic spline (Steffen) runs through the camera keys, per component,
  // with scale in log space: velocity is continuous everywhere and nothing overshoots.
  // Each hold is a pair of keys a little apart (a slow drift and a slight push-in), so
  // the camera never parks.
  //   0–18 overview · 48–82 01 · 110–144 02 · 188–230 03 · 258–290 04 · 322–340 pull-back
  //   340–410 recede (S4 covering 340–440) · captions switch at 33 / 96 / 166 / 244 / 306
  const END = 440, COVER = 340;
  const SWITCH = [33, 96, 166, 244, 306];                  // where each frame becomes dominant
  const CONTENT = { x: 10, y: -40, w: 1960, h: 1350 };  // the four scenes, with their numbers
  const DRIFT = [[.03, 0], [.024, .018], [.03, 0], [-.024, -.014]];   // per hold, as a share of the scene's width/height: onward, so the camera never parks
  let vw = 0, vh = 0, run = 1, keys = [], lastActive = -1;
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    run = Math.max(1, track.offsetHeight - vh);              // the pin's scroll length, px
    const capX = list.offsetLeft, capW = list.offsetWidth;
    const x0 = capX + capW + Math.max(24, Math.min(56, vw * .024)), x1 = vw - capX;
    stage.style.setProperty('--hs', Math.min(.44, capW / head.offsetWidth).toFixed(3));
    // The overview veil sits on the heading's text (its line boxes, with the heading's scale undone).
    const hr = head.getBoundingClientRect(), k = hr.width / head.offsetWidth || 1, rg = document.createRange(); rg.selectNodeContents(h2);
    const lines = [...rg.getClientRects()].map(r => ({ l: (r.left - hr.left) / k, t: (r.top - hr.top) / k, r: (r.right - hr.left) / k, b: (r.bottom - hr.top) / k }));
    const bx = { l: Math.min(...lines.map(r => r.l)), t: Math.min(...lines.map(r => r.t)), r: Math.max(...lines.map(r => r.r)), b: Math.max(...lines.map(r => r.b)) };
    const hx = head.offsetLeft, hy = head.offsetTop;
    stage.style.setProperty('--vcx', `${hx + (bx.l + bx.r) / 2}px`); stage.style.setProperty('--vcy', `${hy + (bx.t + bx.b) / 2}px`);
    stage.style.setProperty('--vrx', `${(bx.r - bx.l) * .7 + 30}px`); stage.style.setProperty('--vry', `${(bx.b - bx.t) * .9 + 30}px`);

    const frame = (r, ax, ay, w, h) => ({ ls: Math.log(Math.min(w / r.w, h / r.h)), fx: r.x + r.w / 2, fy: r.y + r.h / 2, ax, ay });
    const ovS = Math.min(vw * .94 / CONTENT.w, vh * .95 / CONTENT.h);   // overview: whole, set to the right and bottom gutters, under the heading
    const ov = frame(CONTENT, vw - capX - CONTENT.w / 2 * ovS, vh - capX * .6 - CONTENT.h / 2 * ovS, vw * .94, vh * .95);
    const sc = scenes.map(s => frame({ x: s.el.offsetLeft - 10, y: s.el.offsetTop - 44, w: 920, h: 610 }, (x0 + x1) / 2, vh / 2, x1 - x0, vh * .78));
    const whole = frame(CONTENT, vw / 2, vh / 2, vw * .94, vh * .92);
    const drift = (c, [dx, dy]) => ({ ...c, fx: c.fx + dx * 920, fy: c.fy + dy * 610, ls: c.ls + Math.log(1.03) });
    const dip = (a, b, k) => ({ ls: (a.ls + b.ls) / 2 + Math.log(k), fx: (a.fx + b.fx) / 2, fy: (a.fy + b.fy) / 2, ax: (a.ax + b.ax) / 2, ay: (a.ay + b.ay) / 2 });
    const zoom = (c, k, dx = 0, dy = 0) => ({ ...c, ls: c.ls + Math.log(k), fx: c.fx + dx, fy: c.fy + dy });
    const held = sc.map((c, i) => [c, drift(c, DRIFT[i])]);
    const K = [
      [0, ov], [18, zoom(ov, 1.03, -24, -12)],             // overview, easing toward 01
      [48, held[0][0]], [82, held[0][1]],                  // 01 (push in)
      [110, held[1][0]], [144, held[1][1]],                // 02 (travel right)
      [166, dip(held[1][1], held[2][0], .72)],             // the long diagonal: pull back to ~72% mid-way
      [188, held[2][0]], [230, held[2][1]],                // 03
      [244, dip(held[2][1], held[3][0], .93)],             // a slight dip on the way right
      [258, held[3][0]], [290, held[3][1]],                // 04
      [322, whole], [340, zoom(whole, .97)],               // pull-back: all four, full brightness
      [410, zoom(whole, .8)], [440, zoom(whole, .76)],     // recede
    ];
    keys = K.map(([y, c]) => ({ y, c }));
    for (const p of ['ls', 'fx', 'fy', 'ax', 'ay']) {       // Steffen tangents
      const n = keys.length, d = [];
      for (let i = 0; i < n - 1; i++) d.push((keys[i + 1].c[p] - keys[i].c[p]) / (keys[i + 1].y - keys[i].y));
      keys.forEach((kk, i) => {
        kk.m = kk.m || {};
        if (i === 0 || i === n - 1) { kk.m[p] = d[i === 0 ? 0 : n - 2]; return; }
        const d0 = d[i - 1], d1 = d[i], h0 = kk.y - keys[i - 1].y, h1 = keys[i + 1].y - kk.y;
        kk.m[p] = d0 * d1 <= 0 ? 0 : (Math.sign(d0) + Math.sign(d1)) * Math.min(Math.abs(d0), Math.abs(d1), .5 * Math.abs((d0 * h1 + d1 * h0) / (h0 + h1)));
      });
    }
  }
  function camAt(y) {
    let i = 0; while (i < keys.length - 2 && y > keys[i + 1].y) i++;
    const a = keys[i], b = keys[i + 1], h = b.y - a.y, t = clamp01((y - a.y) / h), t2 = t * t, t3 = t2 * t;
    const c = {};
    for (const p of ['ls', 'fx', 'fy', 'ax', 'ay'])
      c[p] = (2 * t3 - 3 * t2 + 1) * a.c[p] + (t3 - 2 * t2 + t) * h * a.m[p] + (-2 * t3 + 3 * t2) * b.c[p] + (t3 - t2) * h * b.m[p];
    return c;
  }
  // Pin progress f (0–1) → y: the last screen is the recede, the rest shares y 0–COVER.
  const yOf = f => { const s = f * run, lead = Math.max(1, run - vh); return s < lead ? s / lead * COVER : COVER + (s - lead) / vh * (END - COVER); };
  // Custom properties are only written when their value changes.
  let vars = {}, rest = 0;
  const put = (name, v) => { if (vars[name] !== v) { vars[name] = v; stage.style.setProperty(name, v); } };
  // The camera and its veils, drawn from the eased progress: writes only.
  function draw(f) {
    const y = yOf(f), c = camAt(y), s = Math.exp(c.ls);
    desk.style.transform = `translate(${c.ax - c.fx * s}px,${c.ay - c.fy * s}px) scale(${s})`;
    const hp = ease(band(y, 18, 48)), end = ease(band(y, 304, 324));   // the caption leaves (306) before its veil and the heading go
    put('--hp', hp.toFixed(3));
    put('--cv', (hp * (1 - end)).toFixed(3));
    put('--ho', (1 - end).toFixed(3));
    put('--rc', ease(band(y, 340, 410)).toFixed(3));
    if (!rest) desk.classList.add('is-moving');
    clearTimeout(rest); rest = setTimeout(() => { rest = 0; desk.classList.remove('is-moving'); }, 200);
  }
  const glide = weaveSmooth(f => { if (mode === 'pinned') draw(f); });
  function place(top = track.getBoundingClientRect().top) {
    const f = clamp01(-top / run);
    // Captions and scenes switch on the raw position, so they never trail the scroll.
    const active = SWITCH.filter(v => yOf(f) >= v).length;  // 0 overview · 1–4 a situation · 5 the ending
    if (active !== lastActive) {
      lastActive = active;
      items.forEach((el, i) => el.classList.toggle('is-on', i === active - 1));
      ticks.forEach((el, i) => el.classList.toggle('is-on', i < active));
      scenes.forEach((sc, i) => i === active - 1 ? arrive(sc) : leave(sc));
    }
    glide(f);
  }

  // ── Frames (stacked) ────────────────────────────────────
  function frame() {
    scenes.forEach((sc, i) => { const { x, y, w } = cropOf(sc), s = frames[i].clientWidth / w; sc.el.style.transform = `scale(${s}) translate(${-x}px,${-y}px)`; });
  }

  // ── Layout switching ────────────────────────────────────
  // Stacked scenes use their phone arrangement below 768px (see "Phones: each scene composed
  // for a narrow frame" in the style); crossing 767/768 re-arranges them.
  const mqPhone = matchMedia('(max-width: 767px)');
  let mode = '', stackedArr = '';
  function layout() { if (mode === 'pinned') { measure(); place(); } else if (mode === 'stacked') frame(); }
  function setMode() {
    const nextStill = mqStill.matches, next = mqPin.matches && !nextStill ? 'pinned' : 'stacked';
    const nextArr = mqPhone.matches ? 'phone' : 'col';
    if (next === mode && nextStill === still && nextArr === stackedArr) return;
    stackedArr = nextArr;
    s3.classList.add('is-switching');
    focus.disconnect();
    scenes.forEach(sc => { sc.live = false; sc.clock.stop(); });
    mode = next; still = nextStill;
    s3.classList.toggle('is-pinned', mode === 'pinned'); s3.classList.toggle('is-stacked', mode === 'stacked'); s3.classList.toggle('is-still', still);
    scenes.forEach((sc, i) => {                             // every scene starts frozen on its beat
      if (mode === 'pinned') { desk.append(sc.el); sc.el.style.transform = ''; } else frames[i].append(sc.el);
      sc.el.dataset.arr = mode === 'pinned' ? 'desk' : stackedArr;
      sc.arrange(sc.el.dataset.arr);
      snap(sc.el, () => sc.beat());
      const c = cropOf(sc);
      frames[i].style.setProperty('--cw', c.w); frames[i].style.setProperty('--ch', c.h);
    });
    lastActive = -1;
    if (mode === 'stacked') {
      desk.style.transform = ''; items.forEach(el => el.classList.remove('is-on')); ticks.forEach(el => el.classList.remove('is-on'));
      ['--hp', '--cv', '--ho', '--rc'].forEach(p => stage.style.removeProperty(p)); vars = {};
      if (!still) frames.forEach(f => focus.observe(f));
    }
    layout();
    requestAnimationFrame(() => requestAnimationFrame(() => s3.classList.remove('is-switching')));
  }
  // Scroll events are dispatched before the frame's rAF callbacks, while layout is still clean:
  // the position is read here, and the frame only writes.
  let queued = false, trackTop = 0;
  const onScroll = () => {
    if (mode !== 'pinned') return;
    trackTop = track.getBoundingClientRect().top;
    if (queued) return;
    queued = true; requestAnimationFrame(() => { queued = false; if (mode === 'pinned') place(trackTop); });
  };
  // The scroll handler only runs while the track is on screen; leaving settles it at 0 or 1.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) addEventListener('scroll', onScroll, { passive: true }); else removeEventListener('scroll', onScroll);
    if (mode === 'pinned') place();
  }).observe(track);
  mqPin.addEventListener('change', setMode);
  mqStill.addEventListener('change', setMode);
  mqPhone.addEventListener('change', setMode);
  new ResizeObserver(() => { setMode(); layout(); }).observe(s3);
  setMode();
})();
