/* Nav jumps, from the masthead and the footer. Without JS, or when S2 isn't pinned, these
   are plain anchors that land on the section top. With the pin active, "See an example"
   lands on the landed record, its heading and its button shown. */
(() => {
  'use strict';
  // S2 pin progress to land on, published by S2's script: the landed record with its
  // heading and its button.
  const EXAMPLE_PROGRESS=window.weaveS2?weaveS2.exampleProgress:0;
  const root=document.documentElement, example=document.querySelector('#example');
  const smooth=matchMedia('(prefers-reduced-motion: no-preference)');
  // Phones: the masthead is a fixed bar there (with JS), so a section lands just under it.
  const phone=matchMedia('(max-width:767px)'), masthead=document.querySelector('.masthead');
  const bar=()=>phone.matches&&masthead&&getComputedStyle(masthead).position==='fixed'?masthead.offsetHeight:0;
  function targetY(section){
    // Phones: S6's world band and panel together are taller than the screen, so "Tell us what
    // takes too much time" lands on the panel itself, its button and contact rows in view.
    const panel=section.id==='contact'&&bar()?section.querySelector('.s6-panel'):null;
    if(panel)return Math.ceil(panel.getBoundingClientRect().top+scrollY)-bar()-16;
    const top=section.getBoundingClientRect().top+scrollY;
    if(section===example&&root.classList.contains('s2-pin'))
      return Math.round(top+EXAMPLE_PROGRESS*(section.offsetHeight-innerHeight));
    // Sections below the hero sit on fractional offsets (its plate is 2048:1153): round
    // up, so the section covers the top row instead of leaving a hairline of the one above.
    return Math.ceil(top)-bar();
  }
  function land(section,behavior){
    weaveSmooth.snap();   // the landing is exact: nothing eases in after it
    scrollTo({top:targetY(section),behavior});
    if(!section.hasAttribute('tabindex'))section.setAttribute('tabindex','-1');
    section.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('.site-nav a[href^="#"],.s6-nav a[href^="#"]');
    const section=link&&document.getElementById(link.getAttribute('href').slice(1));
    if(!section||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    if(location.hash!==link.hash)history.pushState(null,'',link.hash);
    land(section,smooth.matches?'smooth':'instant');
  });
  // Loading /#section: the browser lands on the section top before the pins are measured
  // and the font has swapped. Land again once the pin is measured, and after fonts and
  // load (either can remeasure), unless the reader has started scrolling themselves.
  const navigation=performance.getEntriesByType('navigation')[0];
  const target=['#example','#how-we-work','#about','#contact'].includes(location.hash)&&document.querySelector(location.hash);
  if(target&&(!navigation||navigation.type==='navigate')){
    let taken=false;
    const stop=()=>{taken=true};
    for(const type of ['wheel','touchstart','keydown','pointerdown'])addEventListener(type,stop,{once:true,passive:true});
    const settle=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!taken)scrollTo({top:targetY(target),behavior:'instant'});
    }));
    settle();document.fonts.ready.then(settle);
    if(document.readyState==='complete')settle();else addEventListener('load',settle,{once:true});
  }
})();
