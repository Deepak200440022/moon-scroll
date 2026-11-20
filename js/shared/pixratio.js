/* Explore Beyond — the effective pixel ratio.
   Starts at min(devicePixelRatio, 2); the stage's adaptive governor
   (shared/stage.js) steps it down when frame times stay high and back
   up when they are fast, so high-DPR phones hold a stable frame rate.
   Everything that sizes point sprites or render targets from the
   pixel ratio (the dither pass, dust, fireballs, the black hole
   lens) reads from here instead of window.devicePixelRatio, and
   registers its resize() as a listener — so a governor step
   re-applies the new ratio without a window resize. */

var current = null;
var listeners = [];

function cap() {
  var dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 1), 2);
}

export function getPixelRatio() {
  if (current == null) current = cap();
  return current;
}

export function setPixelRatio(r) {
  current = r;
  for (var i = 0; i < listeners.length; i++) listeners[i](r);
}

export function onPixelRatio(fn) {
  listeners.push(fn);
  return fn;
}
