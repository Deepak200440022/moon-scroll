/* Explore Beyond — the park gate: the story's stopping points.
   Each project card's park (the WIN table) is a mandatory stop.
   When the story enters a card's arrival window heading forward —
   any real forward lead, fast flicks included — it is committed to
   that stop: it converges onto the exact park (at PARK_ARRIVE_K, so
   the card's burst keeps its pace) and HELDS there — the caller sets
   ctx.parked, which freezes the story clock while the card keeps
   floating on its own clock.
   The hold is infinite: it releases only when the user deliberately
   scrolls on again — a fresh forward gesture (wheel-down, swipe-up,
   scroll key) once the stop has settled, or a scrollbar drag that
   keeps advancing the target. Scrolling back is always free: the
   story simply rewinds. This is what makes "no matter how fast the
   user scrolled, the card gets its stopping point" true — a hard
   flick to the end of the page lands on card 1's park, and every
   scroll-on beat walks the story to the next card, in order.
   The latch keys off the forward LEAD (the destination ahead of the
   story), not off how far past the park the destination lies: a
   steady reading-pace scroll keeps the destination only a notch or
   two ahead of the story, and a "destination clearly past the park"
   rule let the story slip out of the window before the destination
   got far enough — mid cards (card 2) were skipped while cards 1
   (the cinematic) and 3 (the page bottom) still stopped. A resting
   hand never latches: with no input, destination and story converge
   to the same value (lead -> 0).
   Both story drivers use this: the main page (story/scroll.js) and
   the standalone range scrubber (shared/rangescroll.js, when given
   the WIN table). The gate is a pure state machine over
   (target, progress, frame) + input events — no DOM of its own, so
   the headless smoke test can drive it directly. */

var FLOW = 'flow';    // free: the story follows the scroll as usual
var INBOUND = 'inbound'; // committed to a stop: converging onto the park
var HELD = 'held';    // settled at the park: holding until scroll-on

export function createGate(opts) {
  var win = opts.win;                    // the WIN table: [{ in, park, out, off }]
  var settleFrames = opts.settleFrames || 15;
  var arriveK = opts.arriveK || 0.07;
  var holdEps = opts.holdEps || 0.004;   // target advance that releases a settled hold
  var reachEps = 0.0005;                 // "arrived" when within this of the park

  // the forward lead that commits a stop: bigger than the convergence
  // tail of a resting hand (which decays to 0 with no input), smaller
  // than one wheel notch of destination on the shortest scrub range
  var latchLead = (opts.latchLead != null) ? opts.latchLead : 0.0015;

  var N = win.length;
  var parks = [], ins = [], backGates = [];
  for (var i = 0; i < N; i++) {
    parks.push(win[i].park);
    ins.push(win[i].in);
    backGates.push(win[i].in - 0.015);   // the rewind gate for this card
  }

  var state = FLOW;
  var idx = -1;            // the gate being targeted / held
  var lastActive = -1e9;   // last frame with any scroll/input activity
  var holdTarget = 0;      // the user's destination captured when the hold began
  var lastP = 0;           // last-seen progress (the release re-arm test)
  var rearm = [];          // rearm[i]: a released gate stays disarmed until
  for (var j = 0; j < N; j++) rearm.push(false);
                             // the story has left its arrival window

  function settled(frame) { return frame - lastActive >= settleFrames; }
  function release() {
    // a released gate disarms: while the story still sits inside or
    // above the card's arrival window, the stop can't re-trigger —
    // otherwise a hold released by a small back-scroll would
    // immediately re-latch on its own convergence tail and the story
    // would ping-pong around the park. Latching resumes normally once
    // the story has left the window (progress back below `in`)
    if (idx >= 0 && lastP >= ins[idx]) rearm[idx] = true;
    state = FLOW; idx = -1;
  }

  /* ---- input events (the driver wires these from its listeners) ---- */

  // a scroll event (any): activity; the hold also releases when the
  // destination moved clearly forward — no settle quiet needed, so a
  // scrollbar drag (or a wheel that actually moves the page) keeps
  // working even during continuous input. The quiet requirement lives
  // on the raw-gesture path (noteForward): a finished flick produces
  // no further events, so it can never release its own stop
  function noteScroll(target, frame) {
    if (state === HELD && target > holdTarget + holdEps) release();
    lastActive = frame;
  }

  // a forward scroll gesture (wheel-down, swipe-up, scroll key): the
  // "scroll on again" that releases a settled hold. Raw input events
  // are used on purpose — they fire even when the page is already at
  // the bottom, where no further scroll position exists
  function noteForward(frame) {
    if (state === HELD && settled(frame)) release();
    lastActive = frame;
  }

  // the blast cinematic (driven on its own clock by the driver) has
  // landed the story exactly on gate 0's park: begin the hold
  function settleAt(i, target, frame) {
    state = HELD; idx = i; holdTarget = target; lastActive = frame;
  }

  function reset() {
    state = FLOW; idx = -1;
    for (var i = 0; i < N; i++) rearm[i] = false;
  }

  /* ---- per frame: returns the effective target + convergence
     factor; the driver applies progress += (et - progress) * k ---- */
  function step(o) {
    var target = o.target, progress = o.progress, frame = o.frame;
    lastP = progress;
    var et, k = null;   // k null = the driver uses its own zone factor

    if (state === FLOW) {
      // the story left a released gate's window: latching resumes
      for (var j = 0; j < N; j++) {
        if (rearm[j] && progress < ins[j]) rearm[j] = false;
      }
      // latch: the story enters a card's arrival window heading
      // forward — any real forward lead commits the stop (the lead,
      // not the destination's distance past the park, is the trigger)
      for (var i = 0; i < N; i++) {
        if (!rearm[i] && progress >= ins[i] && progress < parks[i] &&
            target > progress + latchLead) {
          state = INBOUND; idx = i; lastActive = frame;
          break;
        }
      }
    } else if (state === INBOUND) {
      var g = idx;
      // a decisive backward aim cancels the stop (rewind before the
      // card's birth — reverse is free). A destination merely short
      // of the park does NOT cancel: the stop converges onto the
      // park anyway; from a settled hold the user steps back off
      // with a small back-scroll
      if (target < backGates[g]) {
        release();
      } else if (progress >= parks[g] - reachEps) {
        state = HELD; holdTarget = target; lastActive = frame;
      }
    } else { // HELD
      // scrolling back releases the stop: the user's destination
      // moved back from where it was when the hold began (or a
      // decisive rewind before the card's birth) — the story rewinds
      // freely. A destination merely short of the park does NOT
      // release: the park is the stop even when the user's scroll
      // position sits a notch or two behind it (the next forward or
      // backward scroll releases the hold, as usual)
      if (target < holdTarget - holdEps || target < backGates[idx]) release();
    }

    switch (state) {
      case INBOUND:
        // always the exact park: the stop is the card's designed
        // resting place, even when the destination only leads by a
        // notch or sits just short of the park
        et = parks[idx];
        k = arriveK;
        break;
      case HELD:
        et = parks[idx];
        k = 0;
        break;
      default:
        et = target;
    }
    return {
      et: et,
      k: k,
      held: state === HELD,
      snap: (state === HELD) ? parks[idx] : null,
      parkCard: (state === HELD) ? idx : -1,
      state: state
    };
  }

  return {
    step: step,
    noteScroll: noteScroll,
    noteForward: noteForward,
    settleAt: settleAt,
    reset: reset,
    state: function () { return state; }
  };
}

export var GATE_FLOW = FLOW, GATE_INBOUND = INBOUND, GATE_HELD = HELD;
