/* Phones: the hero's one card (see "Phones: the six cards share one place" in S1's style).
   With motion allowed, the CSS stacks the six cards in one cell; here the card the thread
   reached last (the driver's own is-lit, read and never written) takes it as .is-current, and
   six knots above it follow the same lit state. Wider screens, reduced motion and the driver's
   loop are untouched; crossing 767/768 or changing the motion setting re-decides. */
(() => {
  'use strict';
  const phone=matchMedia('(max-width:767px)'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const box=document.querySelector('.hero .fragments');
  if(!box)return;
  const space=box.querySelector('.fragment-space'), cards=[...space.querySelectorAll('.fragment')];
  const rail=document.createElement('ol');
  rail.className='slot-rail';rail.setAttribute('aria-hidden','true');
  rail.innerHTML=cards.map(card=>card.dataset.fragment==='approval'?'<li data-human></li>':'<li></li>').join('');
  const knots=[...rail.children];
  let on=false, current=null;
  function follow(){
    const lit=cards.map(card=>card.classList.contains('is-lit'));
    const last=lit.lastIndexOf(true);
    // Between the loop's reset and its next frame nothing is lit: the slot keeps its card.
    const next=last<0?current||cards[0]:cards[last];
    if(next!==current){current?.classList.remove('is-current');next.classList.add('is-current');current=next}
    knots.forEach((knot,i)=>{knot.classList.toggle('is-lit',lit[i]);knot.classList.toggle('is-current',cards[i]===current)});
    rail.style.setProperty('--k',Math.max(0,lit.filter(Boolean).length-1));
  }
  function mode(){
    on=phone.matches&&!reduced.matches;
    if(on){if(!rail.isConnected)space.before(rail);follow()}else rail.remove();
  }
  // Only the cards' own class changes are watched; follow() writes is-current on them, which
  // queues one more call that finds nothing to change.
  const watch=new MutationObserver(()=>{if(on)follow()});
  cards.forEach(card=>watch.observe(card,{attributes:true,attributeFilter:['class']}));
  phone.addEventListener('change',mode);reduced.addEventListener('change',mode);
  mode();
})();
