/* Shared scroll smoothing, for everything scroll scrubs (the S1→S2 carry, S3's camera).
   A mouse wheel moves the page in steps. Each section still computes its
   raw progress from the scroll position; that is the target, and the section draws from
   the value this eases toward it: current += (target − current) · (1 − e^(−dt / TAU)).
   It runs on time, so it behaves the same at any frame rate, and it never touches
   scrolling itself. Only wheel input is eased: a nav jump, the scrollbar, the keyboard
   and touch are already continuous or must land exactly, so they go straight to the
   target. State switches (captions, cards) stay on the raw progress.
   weaveSmooth(draw) returns set(target). draw(value) runs at most once a frame, and the
   rAF loop runs only while the value is more than EPS from its target. */
window.weaveSmooth = (() => {
  'use strict';
  const TAU = 80, EPS = .0005;   // ms · progress (0–1)
  const WHEEL = 1000;            // ms after a wheel event in which a scroll counts as wheel-driven
  let wheelAt = -1e9;
  addEventListener('wheel', () => { wheelAt = performance.now(); }, { passive: true });
  const make = draw => {
    let cur = null, target = 0, raf = 0, last = 0;
    const step = now => {
      const dt = Math.min(50, now - last); last = now;
      cur += (target - cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(target - cur) <= EPS) cur = target;
      raf = cur === target ? 0 : requestAnimationFrame(step);
      draw(cur);
    };
    return to => {
      target = to;
      const now = performance.now();
      if (cur === null || now - wheelAt > WHEEL || (!raf && Math.abs(to - cur) <= EPS)) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cur = to; draw(cur);
      } else if (!raf) { last = now - 16.7; step(now); }   // the first step is drawn in this frame
    };
  };
  // A jump that must land exactly (the nav) forgets the last wheel event.
  make.snap = () => { wheelAt = -1e9; };
  return make;
})();
