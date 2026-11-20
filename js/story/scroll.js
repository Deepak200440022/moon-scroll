/* Explore Beyond — scroll progress (the main page's driver).
   Reads the page scroll into a 0..1 target and smooths progress
   toward it. The smoothing factor is deliberately slower through the
   explosion and the shard flythrough; the project band is slowest of
   all — the projects are the main show. Everything else in the story
   is a pure function of this progress, so scrolling backward
   reverses the whole experience.

   The blast is a cinematic, not a scroll animation: the moment the
   user's scroll reaches the edge of the explosion (EXPLODE_AT) with
   their destination ahead of it and no backward scroll in progress,
   time takes over — the flash, the fireball, the shockwave and card
   1's arrival out of the embers to its stop play on their own clock
   (EXPLODE_DUR) and can't stall mid-blast with a resting hand. This
   is true for ANY forward destination, far scrolls included: card 1
   must always be shown, never skipped. Scrolling back out of the
   blast cancels it (the story reverses).

   Stopping points: the moment the cinematic lands — or the story
   crosses a card's arrival window on any forward scroll (fast or
   reading pace — the latch keys off the forward lead, never on how far
    past the park the destination lies, so no card is skipped) — the
    story HELDS at the card's park: it holds until the user
   deliberately scrolls on again (a fresh forward gesture once the
   stop has settled, or a scrollbar drag that keeps advancing), or
   scrolls back (always free). The hold is infinite: a resting hand
   never advances the story, and a flick to the end of the page lands
   on card 1's park, then card 2's, then card 3's — one scroll-on
   beat per card (shared/parkgate.js). While held, ctx.parked tells
   the frame loop to freeze the story clock — the card keeps floating
   on its own clock, and its details stay hover-only (card.js).

   Sticky park: when a project card sits in its viewing zone and the
   user has stopped scrolling (no input for SETTLE frames), the story
   holds perfectly still — the same complete stop as the gate's hold,
   for destinations that land naturally in the zone (no latch needed).

   (The standalone animation runs don't use this driver — they scrub a
   range with shared/rangescroll.js and play their segment on its own,
   with the same park gate when they pass the WIN table.) */
import { M } from '../shared/math.js';
import { config as C } from '../config.js';
import { createGate } from '../shared/parkgate.js';

var target = 0;
var progress = 0;

var SETTLE = 15;     // frames without scroll input that count as "stopped" (~250ms)
var frame = 0;       // frame counter (ticks in step)
var lastInput = 0;   // frame of the last scroll event

/* the blast cinematic: while active, progress is driven by time
   (ctx.rawDt) instead of the user's scroll position. Three beats:
   the blast plays through to the card's birth point, a hush of
   smoldering aftermath (hold) while card 1 is still hidden inside,
   then the slow arrival out of the embers to the park */
var auto = null;      // { to, hold }: hold = seconds left in the hush

/* the stopping points: every card's park is a mandatory stop — the
   gate latches the story to a card as it crosses the card's arrival
   window on ANY forward scroll (fast flicks and reading pace alike:
   the latch keys off the forward lead, not on how far past the park
   the destination lies), converges it onto the exact park, and holds
   it there until the user scrolls on again */
var gate = createGate({
  win: C.WIN,
  settleFrames: SETTLE,
  arriveK: C.PARK_ARRIVE_K
});

function readTarget() {
  var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  target = M.clamp(window.scrollY / max, 0, 1);
  lastInput = frame;
  gate.noteScroll(target, frame);
}

/* the keys that scroll the page forward: they also release a held
   stop (a keydown fires even at the bottom of the page, where no
   further scroll position exists) */
var SCROLL_KEYS = { ' ': 1, Spacebar: 1, PageDown: 1, ArrowDown: 1, End: 1 };

function init(ctx) {
  window.addEventListener('scroll', readTarget, { passive: true });
  /* forward scroll gestures: the "scroll on again" that releases a
     held stop (raw input, not scroll position — see parkgate.js) */
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
  readTarget();
  progress = target;
  ctx.p = progress;
}

function step(ctx) {
  frame++;

  /* hand off to the cinematic: the story is at the edge of the
     blast and the user's destination lies AHEAD of it — forward
     scrolling, resting forward, or a fast scroll far past the band.
     The stopping-point rule: the card must still be shown, so the
     arrival always plays on its own clock and the story latches at
     the park when it lands. Never while progress is descending
     toward a backward destination: then the story is reversing and
     must simply rewind. From here on time drives the story, so the
     whole explosion plays out even if the hand goes still */
  if (!auto && gate.state() === 'flow' &&
      progress >= C.EXPLODE_AT - 0.005 && progress < C.WIN[0].park &&
      target >= C.EXPLODE_AT && target > progress) {
    // already past the blast (arriving late) -> straight into the
    // arrival (the hush's job — hiding card 1 — is done if the
    // card's window has already started)
    auto = { to: C.WIN[0].park,
             hold: (progress >= C.WIN[0].in) ? 0 : C.EXPLODE_HOLD };
  }

  if (auto) {
    if (target < C.EXPLODE_AT - 0.015) {
      auto = null;   // a decisive scroll back: the story reverses
    } else {
      if (auto.hold > 0) {
        auto.hold -= ctx.rawDt;   // the hush: p waits, card 1 stays hidden
      } else if (progress < C.WIN[0].in) {
        // the blast: edge -> the card's birth point, at the original pace
        progress += ((C.WIN[0].park - C.EXPLODE_AT) / C.EXPLODE_DUR) * ctx.rawDt;
        if (progress >= C.WIN[0].in) {
          progress = C.WIN[0].in;
          auto.hold = C.EXPLODE_HOLD;
        }
      } else {
        // the arrival: a drift out of the embers to the stop point,
        // fast-forwarded when the user's destination is already
        // clearly past the park — scrolling moves the story on, it
        // never waits out the drift (the blast plays through either
        // way)
        var dur = (target > auto.to + C.PARK_MARGIN)
          ? C.ARRIVE_SKIP : C.ARRIVE_DUR;
        progress += ((C.WIN[0].park - C.WIN[0].in) / dur) * ctx.rawDt;
      }
      if (progress >= auto.to) {
        progress = auto.to;
        auto = null;
        gate.settleAt(0, target, frame);   // the story waits at the parked card
      }
    }
    if (auto) {
      ctx.p = progress;
      ctx.parked = false;
      return progress;
    }
    // the cinematic just landed: fall through to the gate (HELD now)
  }

  /* the stopping points: the gate clamps the target while inbound and
     freezes progress at the park while held */
  var g = gate.step({ target: target, progress: progress, frame: frame });
  if (g.held) {
    progress = g.snap;
    ctx.p = progress;
    ctx.parked = true;
    return progress;
  }

  // the sticky park (free flow only — the gate owns inbound/hold):
  // input has settled and both progress and the destination sit in a
  // viewing zone -> the story waits exactly where it is
  if (g.state === 'flow' && frame - lastInput > SETTLE) {
    for (var i = 0; i < C.WIN.length; i++) {
      var w = C.WIN[i];
      if (progress >= w.park && progress < w.out &&
          target >= w.park && target <= w.out) {
        ctx.p = progress;
        ctx.parked = true;
        return progress;
      }
    }
  }

  ctx.parked = false;
  var k = (g.k != null) ? g.k
        : (progress > C.F_IN && progress < C.F_OUT) ? 0.02
        : (progress > 0.52 && progress < 0.90) ? 0.035 : 0.06;
  progress += (g.et - progress) * k;
  ctx.p = progress;
  return progress;
}

const scroll = { init: init, step: step, readTarget: readTarget };

export default scroll;
