/* Explore Beyond — the stage: renderer / scene / camera / lights and the
   shared per-frame context, plus the frame-end render. The main page and
   every standalone animation run build their world on this, so an
   animation always runs against the exact same stage. Returns null (and
   shows the fallback overlay) when three.js or WebGL is unavailable, so
   the caller can stop bootstrapping quietly.
   The effective pixel ratio starts at min(devicePixelRatio, 2) and an
   adaptive governor steps it down on sustained slow frames (2 -> 1.5 ->
   1.25) and back up when frames are fast again — high-DPR phones keep a
   stable frame rate. Consumers of the ratio read shared/pixratio.js. */
import { dither } from './dither.js';
import { flashSink } from './flash.js';
import { getPixelRatio, setPixelRatio, onPixelRatio } from './pixratio.js';

export function createStage() {
  var fallbackEl = document.getElementById('fallback');
  if (!window.THREE) {
    if (fallbackEl) fallbackEl.style.display = 'flex';
    return null;
  }

  var canvas = document.getElementById('scene');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: false,
      /* the page is a full-bleed animation: ask for the discrete GPU on
         laptops and skip the stencil buffer (never stencilled) */
      powerPreference: 'high-performance',
      stencil: false
    });
  } catch (err) {
    if (fallbackEl) fallbackEl.style.display = 'flex';
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // far plane must reach the black-hole world: the orbit camera sits 1000-1250
  // units from the origin (up to 2200 zoomed out) and the lensed starfield lives
  // on a 900-1600 shell, so the horizon/disk/stars are all well beyond 900.
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);

  // story lights (the station + planet are lit; the black hole world is not)
  var planetSun = new THREE.DirectionalLight(0xffffff, 3);
  planetSun.position.set(-14, 16, 18);
  planetSun.target.position.set(0, 0, 0);
  scene.add(planetSun);
  scene.add(planetSun.target);
  scene.add(new THREE.AmbientLight(0x111122, 0.4));

  var mobileQ = window.matchMedia('(max-width: 768px)');

  /* the shared per-frame context: every module reads its inputs from
     here, and the camera publishes camZ/planetZ back into it */
  var ctx = {
    scene: scene,
    renderer: renderer,
    camera: camera,
    p: 0, t: 0, dt: 0, rawDt: 0,
    isMobile: mobileQ.matches,
    spin: 0, ex: 0, pop: 0, pull: 0, flowZ: 0,
    camZ: 3, camX: 0, camY: 0, planetZ: -40
  };

  dither.init(getPixelRatio());
  flashSink.init();

  function resize() {
    var pixelRatio = getPixelRatio();
    renderer.setPixelRatio(pixelRatio);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    dither.resize(pixelRatio);
  }

  /* the governor's listener: a ratio step resizes the renderer and the
     dither target; the point-sprite consumers re-apply theirs through
     their own onPixelRatio listeners (pixratio.js) */
  onPixelRatio(function (r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    dither.resize(r);
  });
  resize();

  /* ---- adaptive pixel-ratio governor ----
     EMA on the frame interval: sustained slow frames (>~24ms) step the
     ratio down, sustained fast frames (<~15ms for a while) step it back
     up, with hysteresis so it never flaps. Desktops rarely leave the
     top step; on phones it is the difference between 60fps and jank. */
  /* the ladder extends below 1.0: on machines whose only renderer is a
     software GL path (SwiftShader/llvmpipe, e.g. a headless VM) or a weak
     iGPU, full-resolution frames never reach 40fps, so internal render
     size is the only lever — the dithered look survives a size step and
     40fps at 0.75x beats 15fps at full res. Fast GPUs never leave the
     top step. */
  var govSteps = [getPixelRatio()];
  var LADDER = [1.5, 1.25, 1.0, 0.75, 0.6, 0.5];
  for (var li = 0; li < LADDER.length; li++) {
    if (govSteps[0] > LADDER[li]) govSteps.push(LADDER[li]);
  }
  var govIdx = 0, govEma = 0, govLast = 0, govFrames = 0, govFast = 0;
  var govOff = false; // manual freeze (debug / pinned quality): window.__EB.govOff(true)

  function tickGovernor() {
    if (govOff) return;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (govLast) {
      var ft = now - govLast;
      if (ft > 0 && ft < 1000) {          // a tab-switch gap is not a slow frame
        govEma = govEma ? govEma + (ft - govEma) * 0.1 : ft;
      }
    }
    govLast = now;
    if (++govFrames % 15 !== 0 || govSteps.length < 2) return;
    if (govEma > 24 && govIdx < govSteps.length - 1) {
      govIdx++;
      govFast = 0;
      setPixelRatio(govSteps[govIdx]);
    } else if (govEma < 15 && govIdx > 0) {
      if (++govFast >= 6) {
        govIdx--;
        govFast = 0;
        setPixelRatio(govSteps[govIdx]);
      }
    } else {
      govFast = 0;
    }
  }

  /* frame-end render: from p >= 0.91 the lensed black hole pass owns the
     screen (when a finale renderer is attached); otherwise the story
     scene goes through the dither post pass; the flash sink commits
     exactly once per frame.
     When the dither has fully blended to color (p >= 0.915) the post
     pass is an identity copy — the finale blits straight to the screen
     and the whole pass is skipped. */
  function render(ctx, finale) {
    tickGovernor();
    var direct = !!(finale && ctx.p >= 0.915);
    if (ctx.p >= 0.91 && finale) {
      finale(ctx, direct);
    } else {
      renderer.setRenderTarget(dither.rt);
      renderer.render(scene, camera);
    }
    if (!direct) {
      renderer.setRenderTarget(null);
      renderer.render(dither.postScene, dither.postCam);
    }
    flashSink.commit();
  }

  return {
    renderer: renderer,
    scene: scene,
    camera: camera,
    ctx: ctx,
    dither: dither,
    mobileQ: mobileQ,
    resize: resize,
    render: render,
    /* manual override (debug / future quality control): aligns the
       governor to the ladder step closest to the requested ratio */
    setRatio: function (r) {
      var want = Math.max(0.5, Math.min(2, r || getPixelRatio()));
      var best = 0, bd = Infinity;
      for (var i = 0; i < govSteps.length; i++) {
        var d = Math.abs(govSteps[i] - want);
        if (d < bd) { bd = d; best = i; }
      }
      govIdx = best;
      setPixelRatio(govSteps[best]);
    },
    govOff: function (b) { govOff = !!b; }
  };
}
