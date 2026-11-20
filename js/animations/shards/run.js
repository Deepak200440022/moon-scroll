/* Explore Beyond — standalone run: animation 3, the shards.
   Scrub the page to play the shard stream and the project cards,
   one by one (story range 0.585-0.89). Served from the project root:
     /js/animations/shards/run.html
   The same modules the main page uses, driven by the shared range
   scrubber instead of the full-story scroll driver — including the
   stopping points: the scrubber runs the same park gate as the main
   page (the WIN table), so a fast scrub can't skip a card's park
   either; each stop holds until the user scrolls on again. The
   blast's fireball is imported too: it is still lingering at the
   very start of the range (0.585-0.632), just as on the main page. */
import { createStage } from '../../shared/stage.js';
import { computeTimeline } from '../../shared/timeline.js';
import { initRangeScroll } from '../../shared/rangescroll.js';
import { dither } from '../../shared/dither.js';
import { M } from '../../shared/math.js';
import { config as C } from '../../config.js';
import camera from '../../shared/camera.js';
import stars from '../../shared/stars.js';
import planet from '../blast/planet.js';
import fireball from '../blast/fireball.js';
import shards from './index.js';

var stage = createStage();
if (stage) {
  (function main() {
    var ctx = stage.ctx;

    /* shared world + the range's preconditions + the animation */
    stars.init(ctx);
    planet.init(ctx);    // owned by the blast; still the scene's anchor early on
    fireball.init(ctx);  // the blast's fireball lingers into 0.585-0.632
    shards.init(ctx);
    camera.init(ctx);

    /* the range scrubber with the same stopping points as the main
       page: every card's park in the WIN table is a mandatory stop */
    var scroll = initRangeScroll(ctx, {
      from: C.RANGES.shards[0], to: C.RANGES.shards[1], k: 0.03,
      win: C.WIN, arriveK: C.PARK_ARRIVE_K
    });

    window.addEventListener('resize', function () {
      stage.resize();
      camera.refreshDistance(ctx);
      fireball.resize();
      shards.resize(ctx);
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
      scroll.step(ctx);
      /* the park is a complete stop, exactly like the main page:
         the story clock freezes, the card keeps floating on rawDt */
      if (ctx.parked) delta = 0;
      ctx.t += delta;
      ctx.dt = delta;
      computeTimeline(ctx);

      /* camera first: the shard flow and look targets depend on camZ */
      camera.update(ctx);

      stars.update(ctx);
      planet.update(ctx);
      fireball.update(ctx);
      shards.update(ctx);

      dither.setMix(M.phase(0.91, 0.915, ctx.p));
      stage.render(ctx);
    }
    animate();

    /* small debug hook (used by test/standalone.js): the live run */
    window.__run = { ctx: ctx, stage: stage };
  })();
}
