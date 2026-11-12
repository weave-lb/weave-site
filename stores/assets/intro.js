/* Weave intro for /stores: see intro.css. The head script decides whether it plays (once per visit, never with
   reduced motion) by setting .wi-on on <html>; this file ends it after 3.55 s, or at once on a click or any key. */
(() => {
  'use strict';
  const root = document.documentElement;
  const intro = document.getElementById('wi');
  if (!intro) return;
  if (!root.classList.contains('wi-on')) { intro.remove(); return; }
  try { sessionStorage.setItem('weave-intro', '1'); } catch (e) { /* storage blocked: it may play again */ }
  let leaving = false;
  const done = () => { intro.remove(); root.classList.remove('wi-on'); };
  const leave = () => {
    if (leaving) return; leaving = true;
    clearTimeout(timer);
    removeEventListener('keydown', leave, true); removeEventListener('pointerdown', leave, true);
    intro.classList.add('wi--out');
    intro.addEventListener('animationend', e => { if (e.target === intro) done(); });
    setTimeout(done, 700); // in case animationend never fires (background tab)
  };
  const timer = setTimeout(leave, 3550);
  addEventListener('keydown', leave, true);
  addEventListener('pointerdown', leave, true);
})();
