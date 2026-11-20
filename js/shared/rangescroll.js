/* Explore Beyond — the standalone range scrubber.
   The main page maps the WHOLE page scroll onto p 0..1
   (story/scroll.js, with the blast cinematic and the stopping
   points). The per-animation standalone pages (animations/<name>/
   run.html) instead map THEIR page scroll onto one story range
   [from, to]: scrolling through the page scrubs exactly that
   animation, with the story's smoothing.
   When the WIN table is passed in (opts.win), the same stop-point
   gate as the main page applies inside the range: any scrub, fast or
   reading pace, can't skip a card's park (the latch keys off the
   forward lead, see shared/parkgate.js) — the story holds there
   until the user scrolls on again. Ranges without opts.win scrub
   freely, exactly as before. */
import { M } from './math.js';
import { createGate } from './parkgate.js';

var SCROLL_KEYS = { ' ': 1, Spacebar: 1, PageDown: 1, ArrowDown: 1, End: 1 };

export function initRangeScroll(ctx, opts) {
  var from = opts.from;
  var to = opts.to;
  var k = opts.k || 0.05;
  var target = 0;
  var progress = 0;
  var frame = 0;
  var gate = opts.win ? createGate({
    win: opts.win,
    settleFrames: opts.settleFrames || 15,
    arriveK: opts.arriveK
  }) : null;

  function readTarget() {
    var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    target = M.clamp(window.scrollY / max, 0, 1);
    if (gate) gate.noteScroll(from + (to - from) * target, frame);
  }

  window.addEventListener('scroll', readTarget, { passive: true });
  if (gate) {
    // the "scroll on again" release signals, same as the main page
    // (raw input events: they fire even at the bottom of the page)
    window.addEventListener('wheel', function (e) {
      if (e.deltaY > 0) gate.noteForward(frame);
    }, { passive: true });
    var lastTY = -1;
    window.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0];
      lastTY = (e.touches && e.touches.length === 1 && t) ? t.clientY : -1;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = e.touches && e.touches[0];
      if (e.touches && e.touches.length === 1 && t && lastTY >= 0 &&
          lastTY - t.clientY > 6) gate.noteForward(frame);  // a swipe up
      if (t) lastTY = t.clientY;
    }, { passive: true });
    window.addEventListener('touchend', function () { lastTY = -1; }, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (SCROLL_KEYS[e.key] || SCROLL_KEYS[e.code]) gate.noteForward(frame);
    });
  }
  readTarget();
  progress = target;
  ctx.p = from + (to - from) * progress;
  ctx.parked = false;

  function step() {
    frame++;
    if (gate) {
      var p = from + (to - from) * progress;   // story-p
      var g = gate.step({
        target: from + (to - from) * target,
        progress: p,
        frame: frame
      });
      if (g.held) {
        ctx.p = g.snap;
        ctx.parked = true;
        return ctx.p;
      }
      var kk = (g.k != null) ? g.k : k;
      p += (g.et - p) * kk;
      progress = (p - from) / (to - from);
      ctx.p = p;
      ctx.parked = false;
      return p;
    }
    progress += (target - progress) * k;
    if (Math.abs(target - progress) < 0.00005) progress = target;
    ctx.p = from + (to - from) * progress;
    ctx.parked = false;
    return ctx.p;
  }

  return { step: step, readTarget: readTarget };
}
