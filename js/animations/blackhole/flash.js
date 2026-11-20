/* Explore Beyond — the white flash: the nova -> hole ramp (phase G->H).
   [animation: blackhole] The black hole owns the second flash beat —
   a longer ramp as project 3 leaves and the view snaps to the black
   hole (holds through the snap, fades by 0.94). The first beat (the
   detonation ping) lives in blast/flash.js. Both feed the shared
   sink (shared/flash.js), which writes the #flash overlay once per
   frame, so the two beats can never overwrite each other. */
import { M } from '../../shared/math.js';
import { flashSink } from '../../shared/flash.js';

function update(ctx) {
  var p = ctx.p;
  var f2 = 0;
  if (p >= 0.89 && p < 0.908) f2 = M.phase(0.89, 0.908, p);
  else if (p >= 0.908 && p < 0.91) f2 = 1;
  else if (p >= 0.91 && p < 0.94) f2 = 1 - M.phase(0.91, 0.94, p);
  if (f2 > 0) flashSink.add(f2);
}

const flash = {
  init: function () {},
  update: update
};

export default flash;
