/* Explore Beyond — standalone run: animation 2, the blast.
   Scrub the page to play the moon's spin-up and detonation (story
   range 0.40-0.585: core glow, crack web, flash ping, fireball,
   shockwave, planet gone). Served from the project root:
     /js/animations/blast/run.html
   The same modules the main page uses, driven by the shared range
   scrubber instead of the full-story scroll driver. */
import { createStage } from '../../shared/stage.js';
import { computeTimeline } from '../../shared/timeline.js';
import { initRangeScroll } from '../../shared/rangescroll.js';
import { dither } from '../../shared/dither.js';
import { M } from '../../shared/math.js';
import { config as C } from '../../config.js';
import camera from '../../shared/camera.js';
import stars from '../../shared/stars.js';
import blast from './index.js';

var stage = createStage();
if (stage) {
  (function main() {
    var ctx = stage.ctx;

    /* shared world + the animation (the moon, the glow, the fireball,
       the shockwave and the flash ping all live in this folder) */
    stars.init(ctx);
    blast.init(ctx);
    camera.init(ctx);

    var scroll = initRangeScroll(ctx, { from: C.RANGES.blast[0], to: C.RANGES.blast[1], k: 0.05 });

    window.addEventListener('resize', function () {
      stage.resize();
      camera.refreshDistance(ctx);
      blast.resize(ctx);
      scroll.readTarget();
    });
    stage.mobileQ.addEventListener('change', function (e) {
      ctx.isMobile = e.matches;
      camera.onViewportChange(ctx);
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var delta = Math.min(clock.getDelta(), 0.05);
      ctx.rawDt = delta;
      ctx.t += delta;
      ctx.dt = delta;
      scroll.step(ctx);
      computeTimeline(ctx);

      /* camera first: the look targets and shake depend on camZ */
      camera.update(ctx);

      stars.update(ctx);
      blast.update(ctx);

      dither.setMix(M.phase(0.91, 0.915, ctx.p));
      stage.render(ctx);
    }
    animate();

    /* small debug hook (used by test/standalone.js): the live run */
    window.__run = { ctx: ctx, stage: stage };
  })();
}
