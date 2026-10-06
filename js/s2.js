/* S2's pin, and the record's inspection.
   Scroll lands the record; the reader opens it. Once landed, the heading holds
   the empty body for the whole pin (--pin of scroll), its button beneath it,
   and then the page moves on. Scroll never opens the record and never picks a
   card. The button (or →) deals the deck with 01 on top; Previous / Next step
   through it, and Previous on 01 closes it again. An opened record stays open
   through the rest of the pin and past S2; scrolling back above the landing
   (into the carry) closes it, and it lands on its heading again.
   Before the pin, s1-s2-transition.js carries S1's completed record in and
   reports its progress through weaveS2.carry(t); until the record lands the
   body stays empty and the thread draws down after it. Without the carry the
   record is simply landed.
   Inspection: one state, the active layer or none. Each layer's title is a
   toggle button (aria-pressed); the whole row, the spine (the rail's knots
   when pinned, the binding in the gutter otherwise) and Previous / Next pick
   a layer too. Pinned, the chosen card is dealt to the top; open, the other
   layers dim.
   No-JS, reduced motion, narrow or short viewports: no pin, the record is a
   normal document with the heading above and all six layers open. */
(() => {
  'use strict';
  const COUNT=6;
  // "See an example" lands this far into the pin: the record landed, its heading and button shown.
  const EXAMPLE=.5;
  const root=document.documentElement, section=document.querySelector('.s2');
  const frameBox=section.querySelector('.s2-frame'), inner=section.querySelector('.s2-inner');
  const figure=section.querySelector('.s2-figure');
  const record=figure.querySelector('.record'), layers=[...record.querySelectorAll('.layer')];
  const view=record.querySelector('.layers-window'), deck=view.querySelector('.layers');
  const ticks=[...figure.querySelector('.s2-rail').children];
  const nav=figure.querySelector('.s2-nav'), live=figure.querySelector('.s2-live');
  const [start,steps,prev,next,whole,count]=['.s2-start','.s2-steps','.s2-prev','.s2-next','.s2-whole','.s2-count'].map(s=>nav.querySelector(s));
  const pinnable=matchMedia('(min-width:1200px) and (min-height:640px)');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
  const px=(name,v)=>section.style.setProperty(name,v+'px');
  const pad=n=>String(n).padStart(2,'0');
  // carried: the carry's progress while it drives S2 (1 = landed); null = no carry.
  // landed: the record is on its pinned spot (the carry is done, or there is none).
  // span: the pin's scroll length in px, measured with the mode (never while scrolling).
  // open: the reader has dealt the deck (pinned only; scroll never sets it).
  // active: the layer being inspected, null = the whole record.
  let pinned=false, frame=0, shown=null, marked=null, last={}, carried=null, landed=true, shift=0, span=0, open=false, active=null;
  const heading=section.querySelector('.s2-title');
  // Scroll runs every frame; touch the DOM only when a value actually changes,
  // so a steady scroll costs no style recalculation.
  const put=(key,v,apply)=>{if(last[key]!==v){last[key]=v;apply(v)}};
  // The section's top edge in the viewport, without the landing offset below.
  const topOf=()=>section.getBoundingClientRect().top+shift;

  // Each title becomes its layer's toggle, inside the heading.
  const titles=layers.map(layer=>layer.querySelector('h4'));
  const keys=titles.map(h4=>{
    const button=document.createElement('button');
    button.type='button';button.setAttribute('aria-pressed','false');
    button.append(...h4.childNodes);h4.append(button);
    return button;
  });
  section.classList.add('is-inspectable');nav.hidden=false;

  // The frame's fixed furniture, in the figure's px: the body the heading
  // holds, the thread down from S1's last node, and the knots on the card.
  function place(){
    const f=figure.getBoundingClientRect(), s=section.getBoundingClientRect();
    // The figure's offset in the frame is the same stuck or not.
    const fy=f.top-frameBox.getBoundingClientRect().top;
    const v=view.getBoundingClientRect();
    px('--body-top',v.top-inner.getBoundingClientRect().top);px('--body-h',v.height);
    // The card slot, from layout: the cards themselves are moved by transforms.
    const ry=deck.getBoundingClientRect().top-f.top+layers[0].offsetTop, rh=layers[0].offsetHeight;
    // Without S1 the thread starts at the section's top edge, in the margin.
    let tx=f.width+(innerWidth-f.right)*.45, ty=-fy, tw=2;
    const hero=window.weaveHero;
    if(hero){
      // S1's record sits in its scaled 2048-wide artwork; its entry dot is the thread's end.
      const A=hero.record.getBoundingClientRect(), k=A.width/hero.record.offsetWidth;
      const entry=parseFloat(hero.record.style.getPropertyValue('--entry'))||280;
      tx=A.left+entry*k-f.left;ty=A.top+k-s.top-fy;tw=Math.max(2,4*k);
    }
    px('--tx',tx);px('--ty',ty);px('--tw',tw);px('--tb',-fy-ty);
    px('--ry',ry);px('--rh',rh);px('--th',ry+rh-ty);px('--k4',ry+rh*.6-ty);px('--stitch',tx-f.width);
    // The heading's button: under its last line, in its left column. Layout offsets, so
    // the heading's entrance transform never moves it; however the heading wraps.
    const line=heading.lastElementChild;
    px('--lead-x',heading.offsetLeft-figure.offsetLeft+line.offsetLeft);
    px('--lead-y',heading.offsetTop-figure.offsetTop+line.offsetTop+line.offsetHeight);
  }

  // ── The deck: which card holds the page ──
  // -1 is the empty body (the heading's beat). Slots only: CSS plays the swap,
  // on its own clock, and a card whose slot holds is left untouched. Before the
  // deal, the whole deck waits below the body.
  function show(index){
    if(index===shown)return;
    shown=index;
    layers.forEach((layer,i)=>{
      const d=i-index, slot=index<0?'waiting':d<0?'past':d>2?'rest':String(d);
      if(layer.dataset.slot!==slot)layer.dataset.slot=slot;
    });
  }
  // The rail's knot for the active layer is stitched through, with one pulse.
  function mark(){
    const index=pinned&&open?active:null;
    if(index===marked)return;
    marked=index;
    ticks.forEach((tick,i)=>tick.classList.toggle('is-current',i===index));
  }
  // Pinned, only the top card's title can take focus: the others are out of sight. Before
  // the record is opened none can: the heading's button is the way in.
  function rove(){
    keys.forEach((key,i)=>{if(pinned&&(!open||i!==(active??0)))key.tabIndex=-1;else key.removeAttribute('tabindex')});
  }
  // Pinned: the deck and the stage. carry → lead (the heading and its button, on the
  // empty body) → deck (the open record). Each only writes what changed.
  function stage(){
    if(!pinned)return;
    show(open?active??0:-1);
    put('stage',!landed?'carry':open?'deck':'lead',v=>section.dataset.stage=v);
  }
  function render(){
    record.classList.toggle('is-inspecting',active!==null);
    layers.forEach((layer,i)=>layer.classList.toggle('is-active',i===active));
    keys.forEach((key,i)=>key.setAttribute('aria-pressed',String(i===active)));
    start.hidden=active!==null;steps.hidden=active===null;
    if(active!==null){
      count.textContent=`${pad(active+1)} / ${pad(COUNT)}`;
      // Pinned, Previous on 01 closes the record, so it is never disabled there.
      prev.setAttribute('aria-disabled',String(!pinned&&active===0));
      next.setAttribute('aria-disabled',String(active===COUNT-1));
    }
    rove();
    stage();
    mark();
  }
  // reveal: from Previous / Next on the stacked record, bring an off-screen layer into view.
  // Pinned, picking a layer opens the record if it is still on its heading.
  function select(index,reveal=false){
    const opening=pinned&&!open&&index!==null;
    if(index===active&&!opening)return;
    if(opening)open=true;
    active=index;
    render();
    live.textContent=index===null?'Whole record: all six layers':`Layer ${index+1} of ${COUNT}: ${titles[index].textContent}`;
    if(reveal&&index!==null&&!pinned&&innerWidth<1200)
      layers[index].scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});
  }

  // top: the section's top edge, when the caller (the carry) has already read it this
  // frame; the carry calls after its own writes, and a second read would force a layout.
  // Pinned: back to the heading on the empty body, its button in reach.
  function close(){
    if(!open&&active===null)return;
    open=false;active=null;
    render();
  }
  function update(top=topOf()){
    frame=0;
    if(!pinned)return;
    const t=carried===null?1:carried;
    landed=t>=1;
    // The carry lands one CSS pixel early; that last pixel is drawn one pixel
    // up, exactly where the next scroll sample puts it, so both samples around
    // a fractional boundary paint the same frame.
    put('shift',carried!==null&&landed&&top>0&&top<=1?1:0,v=>{shift=v;section.style.top=v?-v+'px':''});
    // The thread follows the record down; it is whole once the record lands.
    put('draw',landed?1:+smooth((smooth(t)-.06)/.7).toFixed(4),v=>section.style.setProperty('--draw',v));
    // Scroll never opens the record. Above the landing (back in the carry), an
    // opened record closes, so it lands on its heading again.
    if(top>1&&(open||active!==null))close();
    else{stage();mark()}
  }
  // Scroll events are dispatched before the frame's rAF callbacks, while layout is still
  // clean: the position is read here, and the frame only writes.
  let seenTop=0;
  const schedule=()=>{seenTop=topOf();if(!frame)frame=requestAnimationFrame(()=>update(seenTop))};
  function release(){
    shown=null;marked=null;last={};shift=0;
    layers.forEach(layer=>delete layer.dataset.slot);
    ticks.forEach(tick=>tick.classList.remove('is-current'));
    delete section.dataset.stage;
    section.removeAttribute('style');
  }
  // Every layer must fit its page; otherwise fall back to the open document.
  const fits=()=>layers.every(layer=>layer.scrollHeight<=layer.clientHeight+1&&layer.scrollWidth<=layer.clientWidth+1);
  function mode(){
    // A record the reader opened stays open across a resize that keeps the pin.
    const kept=pinned&&open;
    release();
    pinned=pinnable.matches&&!reduced.matches;
    root.classList.toggle('s2-pin',pinned);
    if(pinned&&!fits()){pinned=false;root.classList.remove('s2-pin');console.warn('S2: a layer overflows its card; showing the open record.')}
    if(pinned){place();span=section.offsetHeight-innerHeight}
    open=pinned&&kept;
    if(pinned&&!open)active=null;
    render();
    update();
    // The carry re-measures on every mode change.
    section.dispatchEvent(new Event('s2:mode'));
  }

  // ── Inspection input ──
  // A row is a pointer target, but a drag or a text selection is not a click.
  let down=null;
  // Phones: the record is a plain open document, so only a layer's title (a button) inspects.
  const phone=matchMedia('(max-width:767px)');
  phone.addEventListener('change',()=>{if(phone.matches&&active!==null)select(null)});
  deck.addEventListener('pointerdown',event=>{down=[event.clientX,event.clientY]});
  deck.addEventListener('click',event=>{
    const layer=event.target.closest('.layer'), index=layers.indexOf(layer);
    if(index<0)return;
    if(!event.target.closest('button')){
      if(phone.matches)return;
      const selection=getSelection();
      if(event.detail>1||(down&&Math.hypot(event.clientX-down[0],event.clientY-down[1])>6)||
        (selection&&!selection.isCollapsed&&layer.contains(selection.anchorNode)))return;
      // A card's face only brings it up; its title closes it.
      if(pinned&&index===active)return;
    }
    select(index===active?null:index);
  });
  // The spine, pinned: each knot owns a band of the rail. Pointer only (aria-hidden).
  ticks.forEach((tick,i)=>tick.querySelector('.hit').addEventListener('click',()=>select(i===active?null:i)));
  keys.forEach((key,i)=>key.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    // Pinned, ← / → are the record's own (below): they also close it from 01.
    if(pinned&&(event.key==='ArrowLeft'||event.key==='ArrowRight'))return;
    if(event.key==='Escape'){
      if(active===null)return;
      event.preventDefault();select(null);
      // Pinned, this card has gone back into the deck: focus the one now on top.
      if(pinned)keys[0].focus({preventScroll:true});
      return;
    }
    const to={ArrowUp:i-1,ArrowLeft:i-1,ArrowDown:i+1,ArrowRight:i+1,Home:0,End:COUNT-1}[event.key];
    if(to===undefined)return;
    event.preventDefault();
    const index=Math.max(0,Math.min(COUNT-1,to));
    select(index);
    keys[index].focus({preventScroll:pinned});
  }));
  // Pinned, the heading's button opens the record at 01 (select opens it).
  start.addEventListener('click',()=>{select(0,true);next.focus()});
  // Pinned, Previous on 01 closes the record: back to the heading, focus on its button.
  function back(){
    if(active>0)select(active-1,true);
    else if(pinned&&active===0){close();start.focus({preventScroll:true})}
  }
  prev.addEventListener('click',back);
  next.addEventListener('click',()=>{if(active!==null&&active<COUNT-1)select(active+1,true)});
  whole.addEventListener('click',()=>{select(null);start.focus()});
  nav.addEventListener('keydown',event=>{if(event.key==='Escape'&&active!==null){event.preventDefault();select(null);start.focus()}});
  // Pinned: ← / → step through the record wherever focus is in it (a card's title, the
  // heading's button, Previous / Next): → from the heading opens it at 01, ← on 01 closes it.
  // Focus follows a control that goes out of sight.
  figure.addEventListener('keydown',event=>{
    if(!pinned||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    const right=event.key==='ArrowRight';
    if(!right&&event.key!=='ArrowLeft')return;
    const onKey=keys.includes(event.target);
    if(right){
      if(active===COUNT-1)return;
      event.preventDefault();
      select(active===null?0:active+1);
      if(onKey)keys[active].focus({preventScroll:true});
      else if(event.target===start)next.focus({preventScroll:true});
    }else{
      if(active===null)return;
      event.preventDefault();
      back();
      if(onKey&&active!==null)keys[active].focus({preventScroll:true});
    }
  });
  // Keyboard focus reaching the pinned record before it has landed: land it, so the
  // heading's button is on screen. Landing never opens it.
  figure.addEventListener('focusin',()=>{
    if(!pinned||landed)return;
    scrollTo({top:Math.ceil(topOf()+scrollY+EXAMPLE*span),behavior:'instant'});
  });

  // The bridge for the carry (s1-s2-transition.js) and the nav.
  Object.defineProperty(window,'weaveS2',{value:Object.freeze({
    section,record,
    get pinned(){return pinned},
    get top(){return topOf()},
    // t ∈ [0,1] while the carry drives the landing; null hands S2 back to itself.
    // top is this.top as the carry read it, before its writes.
    carry(t,top){carried=t;update(top)},
    // Pin progress for "See an example": landed, the heading and its button on the record.
    exampleProgress:EXAMPLE
  })});
  // The scroll handler only runs while the section is on screen; leaving settles it.
  new IntersectionObserver(([entry])=>{
    if(entry.isIntersecting)addEventListener('scroll',schedule,{passive:true});else removeEventListener('scroll',schedule);
    schedule();
  }).observe(section);
  addEventListener('resize',mode);
  pinnable.addEventListener('change',mode);
  reduced.addEventListener('change',mode);
  mode();
  // S1's record (the thread's start) may be defined after this script, and
  // local font metrics may change the fit after the first layout.
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',mode,{once:true});
  document.fonts.ready.then(mode);
})();
