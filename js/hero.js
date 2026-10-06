(() => {
  'use strict';
  const config = WEAVE_CONFIG, timing = config.timing;
  const root = document.documentElement;
  for (const [name,value] of Object.entries(config.colors)) {
    const token='--'+name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
    root.style.setProperty(token,value);
    root.style.setProperty(token+'-rgb',[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).join(' '));
  }
  const hero=document.querySelector('.hero'), stage=document.querySelector('.plate-stage');
  const plate=document.querySelector('.plate'), space=document.querySelector('.fragment-space');
  stage.style.aspectRatio=config.plateAspect.join(' / ');
  const svg=document.querySelector('.weave-motion'), path=svg.querySelector('#thread');
  svg.setAttribute('preserveAspectRatio','none');
  const length=path.getTotalLength(), strands=[...svg.querySelectorAll('#line>use')];
  svg.style.setProperty('--weave-length',length); svg.setAttribute('data-weave-ready','');
  const ns='http://www.w3.org/2000/svg';
  const energy=document.createElementNS(ns,'use');
  energy.setAttribute('href','#thread'); energy.setAttribute('fill','none');
  energy.setAttribute('stroke',config.colors.sheet); energy.setAttribute('stroke-width','2.2');
  energy.setAttribute('stroke-linecap','round'); energy.classList.add('energy');
  svg.querySelector('#line').after(energy);
  const fragments=Object.fromEntries([...document.querySelectorAll('.fragment')].map(el=>[el.dataset.fragment,el]));
  const approval=fragments.approval, caption=document.querySelector('#flow-caption'), announcement=document.querySelector('#announcement');
  const systemWord=document.querySelector('.word-system');
  const delivery=fragments.dispatch, deliveryBar=delivery.querySelector('.delivery-track');
  const deliveryLabel=delivery.querySelector('.delivery-label'), deliveryTime=delivery.querySelector('.delivery-time');
  const deliveryStatus=delivery.querySelector('.delivery-status');
  const docks=document.querySelector('.docks'), beats=Object.entries(config.nodes);
  const beatFragments={workstation:'intake',received:'structured',approval:'approval',van:'dispatch',client:'verification',record:'record'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  for(const [name,f] of Object.entries(config.fragments)) {
    const [x,y]=config.nodes[f.node].anchor, left=x+f.offset[0], top=y+f.offset[1], el=fragments[name];
    el.style.setProperty('--left',left+'px'); el.style.setProperty('--top',top+'px');
    el.style.setProperty('--width',f.width+'px'); el.style.setProperty('--entry',-f.offset[0]+'px');
    if(f.dock) {
      const line=document.createElementNS(ns,'path');
      line.setAttribute('d',`M${x},${y} L${left+f.dock[0]},${top+f.dock[1]}`);
      line.dataset.fragment=name;line.classList.add('dock');docks.append(line);
    }
  }
  function resize(){space.style.transform=`scale(${stage.clientWidth/config.viewBox.width},${stage.clientHeight/config.viewBox.height})`}
  new ResizeObserver(resize).observe(stage);resize();
  // Glass cards: offsets are layout values inside the scaled fragment space, so a
  // resize never invalidates them; fonts (the bubble's height) and the desktop
  // breakpoint can. Background origin is the border box, so each offset walks
  // offsetLeft/Top up to the space, adding every offset parent's border width.
  const glassMode=matchMedia('(min-width:1200px)');
  const glass=[...space.querySelectorAll('.message,.structured,.approval,.dispatch,.proof')];
  function placeGlass(){
    if(!glassMode.matches)return;
    for(const el of glass){
      let x=0,y=0;
      for(let node=el;node&&node!==space;node=node.offsetParent){
        x+=node.offsetLeft;y+=node.offsetTop;
        const parent=node.offsetParent;
        if(parent&&parent!==space){x+=parent.clientLeft;y+=parent.clientTop}
      }
      el.style.setProperty('--glass-x',-x+'px');el.style.setProperty('--glass-y',-y+'px');
      if(el.classList.contains('message')){
        // The tail is positioned against the bubble's padding box.
        const tail=getComputedStyle(el,'::after');
        el.style.setProperty('--tail-x',-(x+el.clientLeft+parseFloat(tail.left))+'px');
        el.style.setProperty('--tail-y',-(y+el.clientTop+parseFloat(tail.top))+'px');
      }
    }
  }
  placeGlass();document.fonts.ready.then(placeGlass);glassMode.addEventListener('change',placeGlass);
  const gate=timing.arrival+timing.travel*config.nodes.approval.fraction;
  const resume=gate+timing.approval+timing.confirmation;
  const arrivalEnd=timing.arrival+timing.travel+timing.approval+timing.confirmation;
  const total=arrivalEnd+timing.receipt+timing.hold;
  // The loop: the record rests complete until loopEnd, fades out by cycle, then replays from 0.
  const loopEnd=total+timing.rest, cycle=loopEnd+timing.reset;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const ease=value=>{const t=clamp(value);return t*t*(3-2*t)};
  const arrivalAt=beat=>beat==='workstation'?0:timing.arrival+timing.travel*config.nodes[beat].fraction+
    (config.nodes[beat].fraction>config.nodes.approval.fraction?timing.approval+timing.confirmation:0);
  const beatElements=Object.fromEntries(beats.map(([beat])=>[beat,svg.querySelector(beat==='record'?'#record-spill':'#node-'+beat)]));
  const dockElements=Object.fromEntries([...docks.children].map(el=>[el.dataset.fragment,el]));
  // clock: time into the current cycle. elapsed: the workflow's own time (clock, held at total).
  // frame: the one RAF handle. suspended: S1→S2 holds the completed record (see the bridge).
  let frame=0, previous=null, clock=0, elapsed=0, next=0, fraction=0, state='idle', started=false;
  let inView=false, suspended=false, cycles=0;
  function setState(value){state=value;hero.dataset.workflowState=value}
  // Screen readers hear the first run only; the replays repeat it silently.
  function say(text){caption.textContent=text;if(!cycles)announcement.textContent=text}
  function renderEvidence(){
    for(const [beat] of beats){
      const age=elapsed-arrivalAt(beat);
      beatElements[beat].style.setProperty('--ignition',ease(age/180));
      const name=beatFragments[beat];
      if(name){
        const reveal=ease(age/(beat==='record'?timing.receipt:220));
        fragments[name].style.setProperty('--reveal',reveal);
        dockElements[name].style.opacity=.5*reveal;
      }
    }
    fragments.intake.style.setProperty('--incoming-arrival',ease(elapsed/timing.arrival));
    fragments.intake.style.setProperty('--persistence',1-.12*ease((elapsed-arrivalAt('received'))/220));
    beatElements.record.style.setProperty('--receipt',ease((elapsed-arrivalEnd)/timing.receipt));
  }
  function ignite(progress){
    while(next<beats.length && progress>=beats[next][1].fraction){
      const [beat]=beats[next++];
      svg.querySelector(beat==='record'?'#record-spill':'#node-'+beat).classList.add('lit');
      const name=beatFragments[beat];
      if(name){fragments[name].classList.add('is-lit');docks.querySelector(`[data-fragment="${name}"]`)?.classList.add('lit')}
      if(beat==='received'){fragments.intake.classList.add('is-carried');say('Request details captured: Haddad & Co., Mar Mikhael, AC maintenance.')}
      if(beat==='van')say('S. Nader · Unit 4 dispatched. ETA 19:20.');
      if(beat==='verified'){
        fragments.verification.classList.add('is-verified');
        fragments.verification.querySelector('.verification-title').textContent='Service confirmed';
        fragments.verification.querySelector('.proof-mark').textContent='✓';
      }
      if(beat==='record')say('Service complete. The request, R. Khalil’s approval, and S. Nader’s verified work are connected.');
      svg.dispatchEvent(new CustomEvent('beat:lit',{detail:{beat,fraction:config.nodes[beat].fraction},bubbles:true}));
    }
  }
  // These are projections of the same route fraction, never independent animations.
  function renderRouteDetails(){
    // A slight early lead keeps the structure readable throughout the journey.
    // The frontier clears the last letter exactly when the route reaches record.
    systemWord.style.setProperty('--system-progress',fraction+.16*fraction*(1-fraction));
    // One small pop after the receipt completes, using the existing hold clock.
    const finish=clamp((elapsed-arrivalEnd-timing.receipt)/460);
    systemWord.style.setProperty('--system-weight',ease(finish/.45));
    systemWord.style.setProperty('--system-pop',finish===1?.015:.06*Math.sin(Math.PI*finish)+.015*ease(finish));
    const progress=clamp((fraction-config.nodes.van.fraction)/(config.nodes.record.fraction-config.nodes.van.fraction));
    delivery.style.setProperty('--delivery-progress',progress);
    deliveryBar.setAttribute('aria-valuenow',String(Math.round(progress*100)));
    const stage=fraction>=config.nodes.record.fraction?'complete':fraction>=config.nodes.verified.fraction?'verified':
      fraction>=config.nodes.client.fraction?'on-site':fraction>=config.nodes.van.fraction?'en-route':'pending';
    if(delivery.dataset.deliveryState!==stage){
      const states={
        pending:['Arrival estimate','19:20','Awaiting dispatch'],
        'en-route':['Arrival estimate','19:20','S. Nader is on the way'],
        'on-site':['Arrived at','19:41','Unit 4 is on site'],
        verified:['Service status','Verified','Service confirmed'],
        complete:['Service status','Complete','Connected record saved']
      };
      const [label,time,status]=states[stage];
      delivery.dataset.deliveryState=stage;deliveryLabel.textContent=label;deliveryTime.textContent=time;
      deliveryStatus.textContent=status;deliveryBar.setAttribute('aria-valuetext',status);
    }
  }
  function render(progress){
    fraction=Math.max(0,Math.min(1,progress));
    strands.forEach(el=>el.style.strokeDashoffset=length*(1-fraction));
    const span=Math.min(76,length*fraction);
    energy.setAttribute('stroke-dasharray',`${span} ${length+1}`);
    energy.setAttribute('stroke-dashoffset',-Math.max(0,length*fraction-span));
    energy.style.opacity=String(.7*clamp(fraction*length/40)*clamp((1-fraction)*length/55));
    ignite(fraction);renderEvidence();renderRouteDetails();
  }
  function waiting(){
    setState('waiting');approval.dataset.state='waiting';
    say('Awaiting R. Khalil’s decision.');
  }
  function confirm(){
    setState('resolving');approval.dataset.state='confirmed';
    approval.querySelector('.decision-label').textContent='Approved';
    approval.querySelector('#approval-title').textContent='Approved to proceed.';
    approval.style.setProperty('--decision-progress',1);
    say('Approved by R. Khalil. Continuing.');
  }
  function resolve(){approval.dataset.state='approved'}
  function sample(){
    if(elapsed<gate){
      setState(elapsed<timing.arrival?'arriving':'drawing');
      render(Math.max(0,elapsed-timing.arrival)/timing.travel);
    }else if(elapsed<resume){
      render(config.nodes.approval.fraction);
      if(state!=='waiting'&&state!=='resolving')waiting();
      if(elapsed>=gate+timing.approval){if(state!=='resolving')confirm()}
      else approval.style.setProperty('--decision-progress',Math.min(1,(elapsed-gate)/timing.approval));
    }else{
      // Catch up deterministically if a frame crosses a state boundary.
      if(approval.dataset.state!=='approved'){confirm();resolve()}
      setState(elapsed>=total?'complete':elapsed>=arrivalEnd+timing.receipt?'holding':elapsed>=arrivalEnd?'receiving':'resuming');
      render((elapsed-timing.arrival-timing.approval-timing.confirmation)/timing.travel);
    }
  }
  // ── The clock ───────────────────────────────────────────
  // One RAF loop and no timers. It runs only while the hero has started, is on screen, the
  // tab is visible, the handoff isn't holding the record and motion is allowed; anything
  // else cancels the frame, and a resume picks up from the current position (the time
  // away is never counted). sync() is the only place a frame is scheduled or cancelled,
  // so nothing can stack.
  const running=()=>started&&inView&&!suspended&&!document.hidden&&!reduced.matches;
  function sync(){
    if(running()){if(!frame)frame=requestAnimationFrame(draw)}
    else{if(frame){cancelAnimationFrame(frame);frame=0}previous=null}
  }
  // The reset beat: thread, nodes, docks, fragments and the system reveal fade together
  // (--loop-fade on .hero); the system word's settle-pop eases back with them. The "see"
  // hairline and the rest of the headline take no part in it.
  function fade(k){
    hero.style.setProperty('--loop-fade',String(1-k));
    systemWord.style.setProperty('--system-pop',.015*(1-k));
  }
  // Back to the opening frame: no lit beats, every text swap at its first value. Called with
  // the workflow fully faded, so nothing is seen to snap.
  function clear(){
    clock=0;elapsed=0;next=0;
    svg.querySelectorAll('.lit').forEach(el=>el.classList.remove('lit'));
    docks.querySelectorAll('.lit').forEach(el=>el.classList.remove('lit'));
    Object.values(fragments).forEach(el=>el.classList.remove('is-lit','is-carried','is-verified'));
    approval.dataset.state='pending';approval.style.setProperty('--decision-progress',0);
    approval.querySelector('#approval-title').textContent='Approval needed.';
    approval.querySelector('.decision-label').textContent='Awaiting decision';
    fragments.verification.querySelector('.verification-title').textContent='Arrival logged';
    fragments.verification.querySelector('.proof-mark').textContent='·';
    delete delivery.dataset.deliveryState;   // the tracker relabels from "pending" on the first frame
    hero.style.removeProperty('--loop-fade');
    setState('arriving');say('A request enters the system.');render(0);
  }
  function draw(now){
    frame=0;
    if(previous!==null)clock+=now-previous;
    previous=now;
    if(clock>=cycle){cycles++;clear()}
    if(clock<loopEnd){
      // Play, then rest on the completed record (the sample that reaches total lands it).
      if(state!=='complete'){elapsed=Math.min(clock,total);sample()}
    }else{
      if(state!=='resetting'){
        if(state!=='complete'){elapsed=total;sample()}   // a long frame skipped the end: land it first
        // Never reset a record the handoff may be carrying: hold it complete instead.
        if(handoff()){hold();return}
        setState('resetting');
      }
      fade(ease((clock-loopEnd)/timing.reset));
    }
    sync();
  }
  function resolvedView(){
    elapsed=total;clock=total;
    hero.style.removeProperty('--loop-fade');
    confirm();resolve();render(1);setState('complete');
    say('R. Khalil approved the request. Unit 4 dispatched, service verified, and everything retained in one record.');
    sync();
  }
  // From the opening frame: the first run, and the dev transport's Replay.
  function start(){
    started=true;suspended=false;
    clear();
    if(reduced.matches)resolvedView();else sync();
  }

  // ── The bridge to S1→S2 (s1-s2-transition.js) ───────────
  // The transition reads `complete` and calls finish() once the reader scrolls into the
  // handoff (past its 25px jitter) or lands past the hero. Its carry lifts S1's completed
  // record off the plate, so the loop must never reset it mid-transition:
  //   · finish() lands the completed record (as before) and suspends the loop;
  //   · the loop also suspends, rather than start a reset beat, while the handoff is engaged
  //     (anywhere in the carry's runway, its first 25px included);
  //   · suspended, it resumes once the reader is back at the top: the record rests the full
  //     1600ms, then resets and replays. Phones, short screens and reduced motion have no
  //     carry, so there the loop only pauses while the hero is off screen.
  // engaged(): the carry's own geometry (its runway is the last viewport before S2's top).
  // handoff(): engaged, or the carry's eased card hasn't settled back on S1 yet.
  const s2bridge=()=>window.weaveS2&&weaveS2.pinned?weaveS2:null;
  const engaged=()=>{const s2=s2bridge();return !!s2&&scrollY>0&&s2.top<innerHeight};
  const handoff=()=>{const s2=s2bridge();return !!s2&&(engaged()||(s2.section.dataset.carry||'source')!=='source')};
  function hold(){
    clock=total;
    if(!suspended){suspended=true;addEventListener('scroll',release,{passive:true});addEventListener('resize',release)}
    sync();
  }
  function release(){
    if(!suspended||engaged())return;
    suspended=false;removeEventListener('scroll',release);removeEventListener('resize',release);
    sync();
  }
  Object.defineProperty(window,'weaveHero',{value:Object.freeze({
    record:fragments.record,
    get complete(){return state==='complete'},
    finish(){started=true;if(state!=='complete')resolvedView();hold()}
  })});
  // S2 re-decides its pin on resize, media and font changes: without a pin there is no carry to wait for.
  addEventListener('DOMContentLoaded',()=>{if(window.weaveS2)weaveS2.section.addEventListener('s2:mode',release)},{once:true});
  // Development transport is opt-in; production has no demo controls or footer.
  if(new URLSearchParams(location.search).get('dev')==='1'){
    document.querySelector('.transport').hidden=false;
    document.querySelector('#replay').addEventListener('click',start);
    window.weaveS1=Object.freeze({get state(){return state},get elapsed(){return elapsed},get clock(){return clock},get cycles(){return cycles},
      get running(){return !!frame},get suspended(){return suspended},get gateTime(){return gate},get fraction(){return fraction},
      get totalTime(){return total},get cycleTime(){return cycle}});
  }
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(!started)return;if(reduced.matches)resolvedView();else sync()});
  // Starts once 15% of the hero is on screen; the same observer then pauses and resumes it.
  async function boot(){
    try{
      await plate.decode();
      new IntersectionObserver(([entry])=>{
        inView=entry.isIntersecting;
        if(!started&&entry.intersectionRatio>=.15)start();else sync();
      },{threshold:[0,.15]}).observe(hero);
    }catch(error){document.querySelector('#asset-error').hidden=false;started=true;resolvedView()}
  }
  boot();
})();
