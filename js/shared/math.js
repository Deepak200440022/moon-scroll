/* Explore Beyond — math helpers shared by every module. */

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) {
  var t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
// smoothstep between two points of the scroll progress — the workhorse of
// the whole timeline (a "phase" is one of these ramps)
function phase(a, b, p) { return smoothstep(a, b, p); }
function easeInOut(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
function easeIn(x) { x = clamp(x, 0, 1); return x * x * x; }
function easeOut(x) { x = clamp(x, 0, 1); var i = 1 - x; return 1 - i * i * i; }
// quintic ease-out: a fast burst that settles gently (the card entries)
function easeOut5(x) { x = clamp(x, 0, 1); var i = 1 - x; return 1 - i * i * i * i * i; }

export const M = {
  clamp: clamp,
  lerp: lerp,
  smoothstep: smoothstep,
  phase: phase,
  easeInOut: easeInOut,
  easeIn: easeIn,
  easeOut: easeOut,
  easeOut5: easeOut5
};
