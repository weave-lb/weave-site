(() => {
  const toggle=document.querySelector('.menu-toggle'), links=document.querySelector('#nav-links');
  const mobile=matchMedia('(max-width:767px)');
  function closeMenu(returnFocus=false){
    toggle.setAttribute('aria-expanded','false');links.classList.remove('is-open');
    if(returnFocus)toggle.focus();
  }
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')!=='true';
    toggle.setAttribute('aria-expanded',String(open));links.classList.toggle('is-open',open);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true')closeMenu(true);
  });
  document.addEventListener('click',event=>{
    if(!event.target.closest('.site-nav'))closeMenu();
  });
  links.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu()});
  // Phones: the bar's WhatsApp link steps aside while S6's panel, the page's own CTA, is on
  // screen, so the close keeps its one orange button. Wider screens never show the link.
  const wa=document.querySelector('.nav-wa'), panel=document.querySelector('.s6-panel');
  let atClose=false;
  const away=()=>wa.classList.toggle('is-away',mobile.matches&&atClose);
  if(wa&&panel)new IntersectionObserver(([entry])=>{atClose=entry.isIntersecting;away()}).observe(panel);
  mobile.addEventListener('change',()=>{closeMenu();if(wa)away()});
})();
