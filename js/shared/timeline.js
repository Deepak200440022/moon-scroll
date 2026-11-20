/* Explore Beyond — the per-frame timeline values.
   Extracted from the old monolith's main loop: every module reads
   spin/ex/pop/pull/flowZ from ctx, and this is the single place they
   are computed — the main page and every standalone animation run drive
   identical story math from it (they differ only in how ctx.p is fed:
   page scroll on the main page, range scrubbing on the standalone runs). */
import { M } from './math.js';
import { config as C } from '../config.js';

export function computeTimeline(ctx) {
  var p = ctx.p;
  /* timeline
     A 0.00-0.06 inside | B 0.06-0.16 exit
     C 0.16-0.40 zoom to full focus | D 0.40-0.52 spin-up
     E 0.52-0.58 explosion (the blast)
     F 0.56-0.90 projects, one by one in explicit segments:
       S1 blast->P1 (arrive, park) | S2 P1->P2 | S3 P2->P3 | S4 P3->nova
     G 0.875-0.91 second supernova (blooms as P3 flows off)
     H 0.91-0.95 black hole transition | I 0.95-1.00 black hole page */
  ctx.spin = Math.pow(M.phase(0.40, 0.52, p), 2.2);
  ctx.ex = M.easeOut(M.phase(0.535, 0.58, p));
  ctx.pop = M.phase(0.535, 0.54, p);
  ctx.pull = M.phase(0.87, 0.91, p);
  ctx.flowZ = (p > 0.58) ? (p - 0.58) * C.FLOW : 0;
}
