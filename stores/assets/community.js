/* /stores · page behaviour. Everything degrades: no JS shows the final states. */
(function(){
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

/* ── The Day Bag, drawn in SVG; swatches recolour it ── */
const COLOURS = {
  Sand:{base:'#CDB389',hi:'#E9D7B3',lo:'#A88D62',deep:'#7A6140'},
  Olive:{base:'#807E58',hi:'#A6A47B',lo:'#605E40',deep:'#46452E'},
  Ink:{base:'#3A3846',hi:'#5D5B72',lo:'#272530',deep:'#18171E'},
  Clay:{base:'#B5714E',hi:'#D6966F',lo:'#8E5438',deep:'#6A3C27'}};
function bag(name){
  const c = Object.assign({strap:'#5E3B22',strapHi:'#8E5E36'}, COLOURS[name]);
  const body = 'M150,128 L282,128 Q290,128 291,136 L306,292 Q307,302 297,302 L135,302 Q125,302 126,292 L141,136 Q142,128 150,128 Z';
  $('#product').innerHTML = `<defs>
    <linearGradient id="pWall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6CFB4"/><stop offset=".55" stop-color="#D4B391"/><stop offset="1" stop-color="#B98E69"/></linearGradient>
    <linearGradient id="pFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDAE8E"/><stop offset="1" stop-color="#B8936F"/></linearGradient>
    <linearGradient id="pPl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4D3BE"/><stop offset=".35" stop-color="#F4EADC"/><stop offset=".8" stop-color="#E2CFB7"/><stop offset="1" stop-color="#CDB596"/></linearGradient>
    <linearGradient id="pPlT" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F3E8DA"/><stop offset="1" stop-color="#E7D6C0"/></linearGradient>
    <linearGradient id="pBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.lo}"/><stop offset=".08" stop-color="${c.base}"/><stop offset=".34" stop-color="${c.hi}"/><stop offset=".7" stop-color="${c.base}"/><stop offset=".93" stop-color="${c.lo}"/><stop offset="1" stop-color="${c.deep}"/></linearGradient>
    <linearGradient id="pV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#3a2a18" stop-opacity=".28"/></linearGradient>
    <linearGradient id="pPk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.lo}"/><stop offset=".3" stop-color="${c.hi}"/><stop offset=".75" stop-color="${c.base}"/><stop offset="1" stop-color="${c.lo}"/></linearGradient>
    <linearGradient id="pSt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.strap}"/><stop offset=".4" stop-color="${c.strapHi}"/><stop offset="1" stop-color="${c.strap}"/></linearGradient>
    <filter id="pSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="pSoft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="pTex"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .18  0 0 0 0 .1  0 0 0 .55 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <clipPath id="pClip"><path d="${body}"/></clipPath></defs>
  <rect width="430" height="350" fill="url(#pWall)"/>
  <g opacity=".55" filter="url(#pSoft)"><path d="M262,-20 L338,-20 L196,262 L120,262 Z" fill="#FFF3E2"/><path d="M362,-20 L410,-20 L268,262 L220,262 Z" fill="#FFF3E2"/></g>
  <rect y="268" width="430" height="82" fill="url(#pFloor)"/><rect y="266" width="430" height="4" fill="#C49F7C" opacity=".6"/>
  <ellipse cx="216" cy="338" rx="140" ry="14" fill="#5a3d24" opacity=".28" filter="url(#pSoft)"/>
  <path d="M86,300 L346,300 L346,336 Q216,352 86,336 Z" fill="url(#pPl)"/><ellipse cx="216" cy="300" rx="130" ry="13" fill="url(#pPlT)"/>
  <ellipse cx="216" cy="302" rx="98" ry="8" fill="#4a3220" opacity=".42" filter="url(#pSoft2)"/>
  <path d="M178,132 C174,66 258,66 254,132" fill="none" stroke="${c.strap}" stroke-width="6.5" stroke-linecap="round" opacity=".85"/>
  <path d="${body}" fill="url(#pBody)"/>
  <g clip-path="url(#pClip)">
    <rect x="120" y="120" width="200" height="190" fill="url(#pV)"/>
    <rect x="168" y="120" width="34" height="190" fill="#fff" opacity=".13" filter="url(#pSoft)"/>
    <rect x="120" y="120" width="200" height="190" filter="url(#pTex)" opacity=".55"/>
    <rect x="120" y="128" width="200" height="17" fill="${c.deep}" opacity=".18"/>
    <line x1="140" y1="141" x2="292" y2="141" stroke="${c.deep}" stroke-dasharray="3 2.5" opacity=".7"/>
    <path d="M140,200 L292,200 L301,296 L131,296 Z" fill="url(#pPk)" opacity=".95"/>
    <path d="M140,200 L292,200" stroke="#fff" stroke-opacity=".45" stroke-width="1.2"/>
    <path d="M140,203 L292,203" stroke="${c.deep}" stroke-opacity=".35"/>
    <line x1="141" y1="208" x2="291" y2="208" stroke="${c.deep}" stroke-width=".9" stroke-dasharray="3 2.5" opacity=".6"/>
    <rect x="120" y="200" width="200" height="100" filter="url(#pTex)" opacity=".4"/>
    <path d="M145,136 L131,296" stroke="${c.deep}" stroke-opacity=".25" stroke-width="3"/><path d="M287,136 L301,296" stroke="${c.deep}" stroke-opacity=".3" stroke-width="3"/>
    <rect x="120" y="284" width="200" height="20" fill="${c.strap}" opacity=".85"/>
    <line x1="128" y1="288" x2="304" y2="288" stroke="#C99A6B" stroke-width=".9" stroke-dasharray="3 2.5" opacity=".7"/>
  </g>
  <path d="M183,150 C176,64 256,64 249,150" fill="none" stroke="url(#pSt)" stroke-width="8" stroke-linecap="round"/>
  <path d="M183,150 C176,64 256,64 249,150" fill="none" stroke="#D2A06A" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0 14 70 400" transform="translate(-1.8,1)" opacity=".6"/>
  <rect x="175" y="134" width="16" height="30" rx="2.5" fill="url(#pSt)"/><rect x="241" y="134" width="16" height="30" rx="2.5" fill="url(#pSt)"/>
  <circle cx="182" cy="157" r="2.4" fill="#D9B98C"/><circle cx="250" cy="157" r="2.4" fill="#D9B98C"/>
  <rect x="199" y="222" width="34" height="20" rx="2.5" fill="url(#pSt)"/>
  <text x="216" y="235.5" text-anchor="middle" font-family="Source Serif Display, Georgia, serif" font-size="7.5" letter-spacing="1.6" fill="#E5C9A0" opacity=".9">TILA</text>`;
}
let colour = 'Sand';
bag(colour);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ramp = (v, a, b) => clamp((v - a) / (b - a));
const ease = k => k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
const lerp = (a, b, k) => a + (b - a) * k;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
function tick(el, to){                       // count a number up to its new value
  const from = parseInt(el.textContent, 10) || 0; if (reduce || from === to) { el.textContent = to; return; }
  const t0 = performance.now(); (function f(now){ const k = clamp((now - t0) / 500); el.textContent = Math.round(lerp(from, to, ease(k))); if (k < 1) requestAnimationFrame(f); })(t0);
}

/* ── Swatches: recolour the bag (and the order it becomes, further down) ── */
document.querySelectorAll('.s-swatches button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.s-swatches button').forEach(x => x.setAttribute('aria-pressed', x === b));
  colour = b.dataset.c; const prod = $('#product'); prod.classList.add('swap');
  setTimeout(() => { bag(colour); prod.classList.remove('swap'); }, reduce ? 0 : 160);
  $('#colourName').textContent = colour; $('#shotTag').textContent = 'The Day Bag — ' + colour;
}));

/* ── The thread: from the customer's action (frontstage) to the record it creates (backstage) ── */
const demo = $('#demo'), svg = $('#thread'), btn = $('#addToBag'), rows = $('#rows');
let target = $('#seedRow');
svg.innerHTML = `<defs><filter id="tGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>
  <path class="t" pathLength="1" fill="none" stroke="#7A3BFF" stroke-width="12" stroke-linecap="round" opacity=".28" filter="url(#tGlow)"/>
  <path class="t" pathLength="1" fill="none" stroke="#5800FF" stroke-width="5" stroke-linecap="round"/>
  <path class="t" pathLength="1" fill="none" stroke="#A98BFF" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>
  <circle class="start" r="7" fill="#F7F3EC" stroke="#5800FF" stroke-width="3.5"/>
  <circle class="end" r="8" fill="#5800FF" stroke="#E6DDFF" stroke-width="2.5"/>
  <circle class="pulse" r="6" fill="#fff" opacity="0" style="filter:drop-shadow(0 0 8px #A98BFF)"/>`;
const T = {paths: [...svg.querySelectorAll('path.t')], start: svg.querySelector('.start'), end: svg.querySelector('.end'), pulse: svg.querySelector('.pulse')};
function route(){
  const D = demo.getBoundingClientRect(), b = btn.getBoundingClientRect(), r = target.getBoundingClientRect(),
        s = $('#store').getBoundingClientRect(), o = $('#ops').getBoundingClientRect();
  const x0 = b.left - D.left + b.width/2, y0 = b.bottom - D.top + 2;
  const y1 = r.top - D.top + r.height/2, x1 = o.left - D.left + 6, edge = s.bottom - D.top, R = 22;
  let d;
  if (x0 < x1 - R) {                      // side by side: straight down, then across into the row
    d = `M${x0},${y0} V${y1-R} Q${x0},${y1} ${x0+R},${y1} H${x1}`;
  } else {                                // stacked: out of the store, down the left gutter, into the row
    const gx = Math.max(8, o.left - D.left - 16), ym = edge + 18;
    d = `M${x0},${y0} V${ym-R} Q${x0},${ym} ${x0-R},${ym} H${gx+R} Q${gx},${ym} ${gx},${ym+R} V${y1-R} Q${gx},${y1} ${gx+R},${y1} H${x1}`;
  }
  return {d, x0, y0, x1, y1};
}
function place(){
  const p = route();
  T.paths.forEach(el => el.setAttribute('d', p.d));
  T.start.setAttribute('cx', p.x0); T.start.setAttribute('cy', p.y0);
  T.end.setAttribute('cx', p.x1); T.end.setAttribute('cy', p.y1);
}
function travel(dur, onFrame){               // a light runs the length of the thread
  return new Promise(res => {
    const t0 = performance.now();
    (function f(now){
      const k = clamp((now - t0) / dur), e = ease(k), main = T.paths[1], pt = main.getPointAtLength(main.getTotalLength() * e);
      T.pulse.setAttribute('cx', pt.x); T.pulse.setAttribute('cy', pt.y); T.pulse.setAttribute('opacity', k < 1 ? 1 : 0);
      onFrame && onFrame(e);
      if (k < 1) requestAnimationFrame(f); else res();
    })(t0);
  });
}
function drawIn(){
  place();
  if (reduce) return Promise.resolve();
  T.paths.forEach(el => { el.style.strokeDasharray = '1 1'; el.style.strokeDashoffset = 1; });
  T.end.style.opacity = 0;
  return travel(900, e => T.paths.forEach(el => el.style.strokeDashoffset = 1 - e)).then(() => {
    T.paths.forEach(el => el.style.strokeDashoffset = 0); T.end.style.transition = 'opacity .3s'; T.end.style.opacity = 1;
  });
}

/* ── Add to bag: the customer acts, the system records it and moves it along ── */
const NAMES = ['Lina H.','Jad M.','Nour T.','Hadi S.','Tala R.','Ziad K.','Rania F.'];
let next = 1048, count = 0, today = 23, busy = false, played = false;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
function rowHTML(id, name){
  return `<td class="id">#${id}<span class="newtag">NEW</span></td><td class="c-cust">${name}</td><td>Day Bag · ${colour}</td><td class="amt c-tot">$48.00</td>
    <td class="c-pay"><span class="st wait">Checking</span></td><td class="c-sup"><span class="st wait">Requested</span></td><td><span class="tag new">New order</span></td>`;
}
async function order(){
  if (busy) return; busy = true; hideHint();
  btn.classList.add('press'); setTimeout(() => btn.classList.remove('press'), 160);
  const badge = $('#bagCount'); badge.textContent = ++count; badge.classList.add('on'); badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
  rows.querySelectorAll('tr.is-new').forEach(tr => { tr.classList.remove('is-new'); tr.querySelector('.newtag')?.remove(); });
  const tr = document.createElement('tr'); tr.className = 'is-new enter'; tr.innerHTML = rowHTML(next, NAMES[(next - 1048) % NAMES.length]);
  rows.prepend(tr); if (rows.children.length > 5) rows.lastElementChild.remove();
  if (next === 1048) document.querySelectorAll('[data-bind="colour"]').forEach(el => el.textContent = colour);   // the weave tells this order's story
  target = tr; next++; tick($('#todayCount'), ++today);
  svg.style.opacity = 1;
  await drawIn();
  await wait(700);
  const pay = tr.querySelector('.c-pay .st'); pay.className = 'st ok'; pay.textContent = 'Paid';
  await wait(700);
  const sup = tr.querySelector('.c-sup .st'); sup.className = 'st ok'; sup.textContent = 'Confirmed';
  const tag = tr.querySelector('.tag'); tag.className = 'tag ready'; tag.textContent = 'Ready to pack';
  busy = false;
  if (!played) { played = true; setTimeout(showHint, 900); setTimeout(life, 4200); }
}
btn.addEventListener('click', order);
$('#tryIt').addEventListener('click', () => { btn.scrollIntoView({block:'center', behavior: reduce ? 'auto' : 'smooth'}); setTimeout(order, reduce ? 0 : 450); });

/* After the first run: invite the visitor to try it */
const hint = $('#hint');
function showHint(){ if (count > 1) return; hint.classList.add('show'); btn.classList.add('invite'); setTimeout(hideHint, 7000); }
function hideHint(){ hint.classList.remove('show'); btn.classList.remove('invite'); }

/* The system keeps running on its own: a quiet pulse on the thread, and the backstage resolves its work */
let heroVisible = true;
new IntersectionObserver(es => heroVisible = es[0].isIntersecting, {threshold:.2}).observe(demo);
if (!reduce) setInterval(() => { if (played && !busy && heroVisible && !document.hidden) travel(1300); }, 5200);
const LIFE = [
  () => { const r = rows.querySelector('[data-o="1047"]'); if (!r) return;
          r.querySelector('.tag').textContent = 'Shipped'; r.classList.add('flash');
          $('#segPack').style.flex = 3; $('#lblPackW').style.flex = 3; tick($('#lblPack'), 3);
          $('#segShip').style.flex = 13; $('#lblShipW').style.flex = 13; tick($('#lblShip'), 13); },
  () => { const r = rows.querySelector('[data-o="1046"]'); if (!r) return;
          const s = r.querySelector('.c-sup .st'); s.className = 'st ok'; s.textContent = 'Confirmed';
          const t = r.querySelector('.tag'); t.className = 'tag'; t.textContent = 'Dispatched'; r.classList.add('flash');
          tick($('#attnCount'), 0); $('#attnChip').classList.add('calm'); tick($('#supCount'), 2); }
];
async function life(){
  for (const step of LIFE) { while (busy || !heroVisible || document.hidden) await wait(800); step(); await wait(5200); }
}

/* Depth: the store and the system drift apart a little under the pointer */
if (finePointer && !reduce){
  let raf = 0, mx = 0, my = 0;
  const store = $('#store'), ops = $('#ops');
  demo.addEventListener('pointermove', e => {
    if (innerWidth < 960) return;
    const r = demo.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width * 2 - 1; my = (e.clientY - r.top) / r.height * 2 - 1;
    demo.classList.add('tilting');
    if (!raf) raf = requestAnimationFrame(() => { raf = 0;
      store.style.transform = `translate3d(${mx * 9}px,${my * 6}px,0)`; ops.style.transform = `translate3d(${mx * -6}px,${my * -4}px,0)`; place(); });
  });
  demo.addEventListener('pointerleave', () => {
    demo.classList.remove('tilting'); store.style.transform = ops.style.transform = '';
    const t0 = performance.now(); (function f(now){ place(); if (now - t0 < 550) requestAnimationFrame(f); })(t0);   // follow the settle
  });
}

// First run: the seeded #1048 is the no-JS state. With JS, it's played in once the demo is on screen.
$('#seedRow').remove(); $('#todayCount').textContent = today; target = rows.firstElementChild;
document.fonts.ready.then(() => {
  place(); svg.style.opacity = 0;
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(order, reduce ? 0 : 1300); } }, {threshold:.45});
  io.observe(demo);
});
new ResizeObserver(() => { if (!busy) place(); }).observe(demo);

/* ═════════ THE WEAVE ═════════
   Scroll-scrubbed. p (0–1) across the pinned track:
   0–.14 the pieces arrive · .14–.34 "you" run between them · .34–.56 the thread reaches each one ·
   .56–.86 each piece is pulled along its thread into its row · .86–1 one record, settled. */
const weave = $('#weave'), stage = $('#weaveStage'), field = $('#weaveField'), wsvg = $('#weaveSvg'), you = $('#you'), wrec = $('#wrec');
const live = !reduce && 'IntersectionObserver' in window;
if (live){
  weave.classList.add('is-live');
  const frags = [...field.querySelectorAll('.wf')].map((el, i) => ({el, i, to: el.dataset.to, rot: [-5, 3, 6, -4, 7, -3, 4, -6][i]}));
  const slots = Object.fromEntries([...wrec.querySelectorAll('.wr')].map(el => [el.dataset.k, el]));
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  wsvg.innerHTML = `<defs><filter id="wGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>`;
  const gTangle = mk('g', {fill:'none', stroke:'#F05023', 'stroke-width':2, 'stroke-linecap':'round', 'stroke-dasharray':'7 7'});
  const gGlow = mk('g', {fill:'none', stroke:'#7A3BFF', 'stroke-width':10, 'stroke-linecap':'round', filter:'url(#wGlow)', opacity:.3});
  const gWeave = mk('g', {fill:'none', 'stroke-linecap':'round'});
  wsvg.append(gTangle, gGlow, gWeave);
  frags.forEach(f => {
    f.tangle = gTangle.appendChild(mk('path', {}));
    f.glow = gGlow.appendChild(mk('path', {pathLength:1}));
    f.gap = gWeave.appendChild(mk('path', {pathLength:1, stroke:'#0B0420', 'stroke-width':9}));      // the gap makes each crossing read as over/under
    f.line = gWeave.appendChild(mk('path', {pathLength:1, stroke:'#5800FF', 'stroke-width':3}));
    f.knot = gWeave.appendChild(mk('circle', {r:5, fill:'#B9A3FF'}));
  });
  let L = null;                              // layout, measured
  function layout(){
    const F = field.getBoundingClientRect(), mobile = F.width < 700;
    const R = wrec.getBoundingClientRect();
    const s = mobile ? .58 : F.width < 1100 ? .82 : 1;
    const homes = mobile
      ? [[.2,.1],[.66,.05],[.84,.24],[.3,.3],[.62,.36],[.12,.42],[.82,.48],[.42,.15]]
      : [[.14,.16],[.37,.02],[.68,.06],[.9,.36],[.86,.78],[.62,.97],[.2,.9],[.08,.55]];
    frags.forEach((f, k) => {
      f.w = f.el.offsetWidth; f.h = f.el.offsetHeight;
      f.hx = homes[k][0] * F.width; f.hy = homes[k][1] * F.height;
      // keep every piece on the stage
      f.hx = clamp(f.hx, f.w * s / 2 + 6, F.width - f.w * s / 2 - 6); f.hy = clamp(f.hy, f.h * s / 2 + 6, F.height - f.h * s / 2 - 6);
      const slot = slots[f.to].getBoundingClientRect();
      f.tx = slot.left - F.left + slot.width / 2; f.ty = slot.top - F.top + slot.height / 2;
      const left = f.hx < R.left - F.left + R.width / 2;
      f.ax = left ? R.left - F.left + (mobile ? 20 : 26) : R.right - F.left - 4; f.ay = f.ty;     // where its thread leaves the record
      if (f.to === 'head') { f.ax = R.left - F.left + R.width / 2; f.ay = R.top - F.top; }
    });
    L = {F, s, mobile, cx: R.left - F.left + R.width / 2, cy: mobile ? (frags[3].hy + frags[4].hy) / 2 : R.top - F.top + R.height / 2};
    wsvg.setAttribute('viewBox', `0 0 ${F.width} ${F.height}`);
  }
  function render(p, t){
    if (!L) return;
    const step = p < .14 ? 0 : p < .34 ? 1 : p < .6 ? 2 : 3;
    if (stage.dataset.step != step) stage.dataset.step = step;
    const youK = ramp(p, .14, .2) * (1 - ramp(p, .32, .38));
    const ghost = ramp(p, .32, .4), fill = ramp(p, .57, .61);   // the sheet turns white as the first piece lands
    stage.style.setProperty('--glow', (ramp(p, .82, .96)).toFixed(3));
    wrec.style.opacity = ghost; wrec.style.setProperty('--fill', fill.toFixed(3));
    you.style.opacity = youK; you.style.transform = `translate(${L.cx}px,${L.cy}px) scale(${.6 + youK * .4})`;
    const got = {};                          // per row: how far its piece(s) have landed
    frags.forEach((f, k) => {
      const inK = ease(ramp(p, k * .012, .1 + k * .012));                  // arrive
      const pull = ease(ramp(p, .58 + k * .028, .7 + k * .028));            // pulled into the record
      const amp = (1 - pull) * 7, dx = Math.sin(t / 1300 + k * 1.7) * amp, dy = Math.cos(t / 1500 + k * 2.3) * amp;
      const ox = (f.hx - L.cx) * (1 - inK) * .3, oy = (1 - inK) * 150;                   // rise into place from below
      const x = lerp(f.hx + dx + ox, f.tx, pull), y = lerp(f.hy + dy + oy, f.ty, pull);
      const sc = L.s * lerp(1, .3, pull) * lerp(.85, 1, inK), rot = f.rot * (1 - pull) + (1 - inK) * f.rot * 2;
      f.el.style.opacity = inK * (1 - ramp(pull, .7, 1));
      f.el.style.transform = `translate(${x - f.w / 2}px,${y - f.h / 2}px) rotate(${rot}deg) scale(${sc})`;
      // "you": a frantic orange line to each piece
      if (youK > .01){
        const w1 = Math.sin(t / 240 + k) * 40, w2 = Math.cos(t / 310 + k * 2) * 40;
        f.tangle.setAttribute('d', `M${L.cx},${L.cy} C${lerp(L.cx, x, .3) + w1},${lerp(L.cy, y, .3) - w2} ${lerp(L.cx, x, .7) - w2},${lerp(L.cy, y, .7) + w1} ${x},${y}`);
        f.tangle.style.opacity = youK; f.tangle.style.strokeDashoffset = -t / 30;
      } else f.tangle.style.opacity = 0;
      // the thread: from its row out to the piece, then shortening as the piece is pulled home
      const reach = ease(ramp(p, .38 + k * .018, .5 + k * .018));
      const d = `M${f.ax},${f.ay} C${lerp(f.ax, x, .55)},${f.ay} ${lerp(f.ax, x, .45)},${y} ${x},${y}`;
      const on = reach > 0 && pull < .98;
      [f.glow, f.gap, f.line].forEach(el => { el.setAttribute('d', d); el.style.strokeDasharray = '1 1'; el.style.strokeDashoffset = 1 - reach; el.style.opacity = on ? 1 : 0; });
      f.knot.setAttribute('cx', x); f.knot.setAttribute('cy', y); f.knot.style.opacity = on && reach > .98 ? 1 : 0;
      got[f.to] = Math.max(got[f.to] || 0, ramp(pull, .75, 1));
    });
    // each row fills as its piece lands; the spine grows with them
    let filled = 0;
    for (const key in got){
      const o = got[key], slot = slots[key];
      slot.style.setProperty('--o', o.toFixed(3)); if (key === 'head') slot.style.setProperty('--ho', o.toFixed(3));
      slot.classList.toggle('filled', o > .95); if (o > .95) filled++;
    }
    wrec.style.setProperty('--spine', (filled / Object.keys(got).length).toFixed(3));
    slots.foot.style.setProperty('--o', ramp(p, .88, .95).toFixed(3));
  }
  let running = false, visible = false;
  function frame(t){
    const r = weave.getBoundingClientRect(), span = r.height - innerHeight;
    render(clamp(-r.top / span), t);
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !running){ running = true; requestAnimationFrame(frame); } }).observe(weave);
  document.fonts.ready.then(layout); new ResizeObserver(layout).observe(field);
  render(0, 0);
}

/* ── Growth path: one thread through the three stages. Straight, then tangled (you, carrying it), then straight again ── */
const pathSvg = $('#pathSvg'), stagesEls = [...document.querySelectorAll('.stage')];
function pathLine(){
  const P = pathSvg.getBoundingClientRect(); if (!P.width) return;
  const r = stagesEls.map(s => s.getBoundingClientRect());
  const vertical = r[1].top - r[0].top > r[1].left - r[0].left;
  pathSvg.setAttribute('viewBox', `0 0 ${P.width} ${P.height}`);
  let d, a, b, z;
  if (!vertical){
    const y = 8, x1 = r[0].left - P.left + 8, x2 = r[1].left - P.left + 8, x3 = r[2].left - P.left + 8, xe = P.width, m = (x3 - x2);
    d = `M${x1},${y} H${x2} C${x2 + m*.15},${y} ${x2 + m*.2},${y - 22} ${x2 + m*.32},${y + 14} S${x2 + m*.5},${y - 24} ${x2 + m*.6},${y + 10} S${x2 + m*.82},${y - 14} ${x3},${y} H${xe}`;
    a = 0; b = x2 / xe; z = x3 / xe;
  } else {
    const x = 8, y1 = r[0].top - P.top + 8, y2 = r[1].top - P.top + 8, y3 = r[2].top - P.top + 8, ye = P.height, m = (y3 - y2);
    d = `M${x},${y1} V${y2} C${x},${y2 + m*.15} ${x + 18},${y2 + m*.2} ${x - 10},${y2 + m*.35} S${x + 16},${y2 + m*.55} ${x - 8},${y2 + m*.68} S${x},${y2 + m*.85} ${x},${y3} V${ye}`;
    b = y2 / ye; z = y3 / ye;
  }
  pathSvg.innerHTML = `<defs><linearGradient id="pg" ${vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"'}>
      <stop offset="0" stop-color="#1C0051"/><stop offset="${b.toFixed(3)}" stop-color="#1C0051"/><stop offset="${(b + .04).toFixed(3)}" stop-color="#F05023"/>
      <stop offset="${(z - .04).toFixed(3)}" stop-color="#F05023"/><stop offset="${z.toFixed(3)}" stop-color="#5800FF"/><stop offset="1" stop-color="#5800FF"/></linearGradient></defs>
    <path d="${d}" pathLength="1" fill="none" stroke="url(#pg)" stroke-width="3" stroke-linecap="round"/>`;
}
pathLine(); new ResizeObserver(pathLine).observe($('.path')); document.fonts.ready.then(pathLine);

/* ── Two sides: the thread sits on the lists' top rule (side by side) or on the divide (stacked) ── */
const sides = $('.sides'), cross = $('.cross');
function placeCross(){
  const S = sides.getBoundingClientRect(), front = $('.side.front'), ul = front.querySelector('ul');
  const stacked = front.getBoundingClientRect().width > S.width * .9;
  const y = stacked ? front.getBoundingClientRect().bottom - S.top : ul.getBoundingClientRect().top - S.top;
  cross.style.setProperty('--cross-y', y + 'px');
  if (stacked) { cross.style.left = cross.style.width = cross.style.transform = ''; return; }
  const a = ul.getBoundingClientRect(), z = $('.side.back ul').getBoundingClientRect();   // span the gap between the two lists
  cross.style.left = (a.right - S.left + 16) + 'px'; cross.style.width = (z.left - a.right - 32) + 'px'; cross.style.transform = 'translateY(-50%)';
}
placeCross(); new ResizeObserver(placeCross).observe(sides); document.fonts.ready.then(placeCross);

/* ── Reveal on scroll; lines that draw once they're reached ── */
const els = document.querySelectorAll('.reveal');
if (!reduce && 'IntersectionObserver' in window){
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.15, rootMargin:'0px 0px -8% 0px'});
  els.forEach(e => io.observe(e));
  const once = (el, fn, threshold = .35) => { const o = new IntersectionObserver(es => { if (es[0].isIntersecting){ fn(); o.disconnect(); } }, {threshold}); o.observe(el); };
  once($('.path'), () => $('.path').classList.add('in-view'), .25);
} else { els.forEach(e => e.classList.add('in')); $('.path').classList.add('in-view'); }

/* ── The page's progress, as a thread across the top ── */
const bar = $('#progress');
let ticking = false;
function onScroll(){
  ticking = false;
  bar.style.setProperty('--p', (scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(4));
}
addEventListener('scroll', () => { if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
onScroll();

})();
