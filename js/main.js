/* Explore Beyond — bootstrap + frame orchestration.
   Builds the shared stage (renderer / scene / camera / lights), then
   runs the four animation folders in story order. No animation lives
   here: the timeline values are computed once per frame
   (shared/timeline.js), the camera updates first, and each animation
   folder updates its own parts. Structure:
     config.js      the story timing sheet (incl. RANGES per folder)
     data/          content (projects, final page)
     shared/        stage, camera, timeline, stars, dither, flash sink, utils
     story/         the main page's scroll driver + nav (the runs use
                    shared/rangescroll.js instead)
     animations/    the four animations, each in its own folder:
       zoom/        0.00-0.40   the station dolly -> planet focus
       blast/       0.40-0.585  the moon spin-up + detonation
       shards/      0.585-0.89  the shard stream, projects one by one
       blackhole/   0.875-1.00  nova -> black hole -> the orbit page
   The ranges overlap on purpose (the story's hand-offs live in the
   overlap). Each folder also runs standalone: open
   animations/<name>/run.html to scrub exactly its range. */
import { createStage } from './shared/stage.js';
import { computeTimeline } from './shared/timeline.js';
import { M } from './shared/math.js';
import { config as C } from './config.js';
import camera from './shared/camera.js';
import stars from './shared/stars.js';
import { dither } from './shared/dither.js';
import scroll from './story/scroll.js';
import nav from './story/nav.js';
import zoom from './animations/zoom/index.js';
import blast from './animations/blast/index.js';
import shards from './animations/shards/index.js';
import blackhole from './animations/blackhole/index.js';

var stage = createStage();
if (stage) {
  var ctx = stage.ctx;

  /* ---------------------------------------------------------- init (story order) */
  stars.init(ctx);
  var ANIMS = [zoom, blast, shards, blackhole];
  for (var i = 0; i < ANIMS.length; i++) ANIMS[i].init(ctx);
  nav.init(ctx);
  scroll.init(ctx);
  camera.init(ctx);

  /* ---------------------------------------------------------- resize / viewport class */
  window.addEventListener('resize', function () {
    stage.resize();
    for (var i = 0; i < ANIMS.length; i++) ANIMS[i].resize(ctx);
    camera.refreshDistance(ctx);
    scroll.readTarget();
  });

  stage.mobileQ.addEventListener('change', function (e) {
    ctx.isMobile = e.matches;
    camera.onViewportChange(ctx);
  });

  /* ---------------------------------------------------------- cursor
     (shared by the card hover and the black hole orbit grab) */
  var lastCursor = '';
  function setCursor(p) {
    var inHover = p >= C.F_IN && p < C.F_OUT;
    var wantCursor = (inHover && shards.card.hoverIndex() >= 0)
      ? 'pointer'
      : (p >= 0.95 ? (camera.dragging ? 'grabbing' : 'grab') : '');
    if (wantCursor !== lastCursor) {
      lastCursor = wantCursor;
      document.body.style.cursor = wantCursor;
    }
  }

  /* ---------------------------------------------------------- main loop */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    var delta = Math.min(clock.getDelta(), 0.05);
    /* rawDt always ticks: it feeds the blast cinematic (which must
       play on its own clock) and the parked card's idle float (which
       must breathe even while the story clock is frozen) */
    ctx.rawDt = delta;
    scroll.step(ctx);
    var p = ctx.p;
    /* the park is a complete stop: while a card is parked and the user
       has no scroll input pending, the story clock stops ticking —
       no rock tumble, no camera sway, nothing moves. The next scroll
       input resumes the clock and starts the card's fly-off. */
    if (ctx.parked) delta = 0;
    ctx.t += delta;
    ctx.dt = delta;

    /* per-frame timeline values: spin / ex / pop / pull / flowZ —
       the single place they are computed (shared/timeline.js) */
    computeTimeline(ctx);

    /* camera first: the shard flow and look targets depend on camZ */
    camera.update(ctx);

    for (var j = 0; j < ANIMS.length; j++) ANIMS[j].update(ctx);

    setCursor(p);

    /* dither -> color as the black hole takes over */
    dither.setMix(M.phase(0.91, 0.915, p));

    /* frame-end render: story scene -> dither pass, or the lensed
       black hole world from p >= 0.91 (the finale pass); the flash
       sink commits exactly once */
    stage.render(ctx, blackhole.render);
  }

  animate();

  /* small debug hook (used by the headless smoke test, handy in the
     console): window.__EB.ctx is the live per-frame context */
  window.__EB = {
    ctx: ctx,
    dither: stage.dither,
    setRatio: (r) => stage.setRatio(r),
    govOff: (b) => stage.govOff(b)
  };
}
