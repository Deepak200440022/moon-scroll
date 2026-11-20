/* Explore Beyond — deterministic PRNG (seeded) so the procedural worlds
   look identical on every load. */

function mulberry32(seed) {
  var s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const random = { mulberry32: mulberry32 };
