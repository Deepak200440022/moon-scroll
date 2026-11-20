/* Explore Beyond — the white flash: the detonation ping (phase E).
   [animation: blast] The blast owns the first flash beat — a sharp
   ping as the planet detonates (peak at 0.535). The second beat (the
   longer ramp as the last project leaves and the view snaps to the
   black hole) lives in blackhole/flash.js. Both feed the shared sink
   (shared/flash.js), which writes the #flash overlay once per frame. */
import { M } from '../../shared/math.js';
import { flashSink } from '../../shared/flash.js';

function update(ctx) {
  var p = ctx.p;
  var ft1 = M.clamp((p - 0.52) / 0.03, 0, 1);
  if (ft1 > 0 && ft1 < 1) flashSink.add(1 - Math.abs(2 * ft1 - 1));
}

const flash = {
  init: function () {},
  update: update
};

export default flash;
