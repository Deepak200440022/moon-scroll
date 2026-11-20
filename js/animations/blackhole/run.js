/* Explore Beyond — standalone run: animation 4, the black hole.
   Scrub the page to play the nova -> black hole transition (story
   range 0.875-1.0). Served from the project root:
     /js/animations/blackhole/run.html
   At the bottom of the page the run ends live on the orbit page:
   drag to orbit, wheel-down zooms in once the page can't scroll
   further (exactly like the main page), pinch on touch. The same
   modules the main page uses, driven by the shared range scrubber
   instead of the full-story scroll driver. */
import { createStage } from '../../shared/stage.js';
import { computeTimeline } from '../../shared/timeline.js';
import { initRangeScroll } from '../../shared/rangescroll.js';
import { dither } from '../../shared/dither.js';
import { M } from '../../shared/math.js';
import { config as C } from '../../config.js';
import camera from '../../shared/camera.js';
import stars from '../../shared/stars.js';
import blackhole from './index.js';

var stage = createStage();
if (stage) {
  (function main() {
    var ctx = stage.ctx;

    /* shared world + the animation */
    stars.init(ctx);
    blackhole.init(ctx);
    camera.init(ctx);

    var scroll = initRangeScroll(ctx, { from: C.RANGES.blackhole[0], to: C.RANGES.blackhole[1], k: 0.05 });

    window.addEventListener('resize', function () {
      stage.resize();
      camera.refreshDistance(ctx);
      blackhole.resize(ctx);
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

      /* camera first: the look target and the orbit pose depend on p */
      camera.update(ctx);

      stars.update(ctx);
      blackhole.update(ctx);

      dither.setMix(M.phase(0.91, 0.915, ctx.p));
      /* from p >= 0.91 the lensed black hole pass owns the screen */
      stage.render(ctx, blackhole.render);
    }
    animate();

    /* small debug hook (used by test/standalone.js): the live run */
    window.__run = { ctx: ctx, stage: stage };
  })();
}
