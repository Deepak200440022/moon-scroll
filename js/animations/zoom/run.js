/* Explore Beyond — standalone run: animation 1, the zoom.
   Scrub the page to play the station dolly -> planet full focus
   (story range 0.00-0.40). Served from the project root:
     /js/animations/zoom/run.html
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
import planet from '../blast/planet.js';
import zoom from './index.js';

var stage = createStage();
if (stage) {
  (function main() {
    var ctx = stage.ctx;

    /* shared world + the animation's preconditions + the animation itself */
    stars.init(ctx);
    planet.init(ctx);   // the moon is owned by the blast; the zoom frames it
    zoom.init(ctx);
    camera.init(ctx);

    var scroll = initRangeScroll(ctx, { from: C.RANGES.zoom[0], to: C.RANGES.zoom[1], k: 0.05 });

    window.addEventListener('resize', function () {
      stage.resize();
      camera.refreshDistance(ctx);
      zoom.resize(ctx);
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

      /* camera first: the shard flow and look targets depend on camZ */
      camera.update(ctx);

      stars.update(ctx);
      planet.update(ctx);
      zoom.update(ctx);

      dither.setMix(M.phase(0.91, 0.915, ctx.p));
      stage.render(ctx);
    }
    animate();

    /* small debug hook (used by test/standalone.js): the live run */
    window.__run = { ctx: ctx, stage: stage };
  })();
}
